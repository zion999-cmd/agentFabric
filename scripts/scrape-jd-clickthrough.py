#!/usr/bin/env python3
"""
Click through JD 商智 help sidebar to capture dynamically-loaded feature descriptions.
Connects via CDP to an already-running Chrome.
"""
import asyncio
import json
import re
import time
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("/Users/bx/Workspace/agentFabric/data/jd_shangzhi_features")
CDP_URL = "http://127.0.0.1:9222"


async def get_page_content(page) -> dict:
    """Get the currently displayed help content."""
    await asyncio.sleep(0.8)
    content = await page.evaluate("""
        () => {
            // Try to find the main help content area
            const selectors = [
                '.help-content', '.help-detail', '.help-body', '.help-right',
                '.help-main', '.content-right', '.article-content',
                '[class*="help"][class*="content"]',
                '[class*="help"][class*="detail"]',
                '[class*="help"][class*="right"]',
                '.main-content', 'article', 'main',
                '.sz-help-content', '.help-text'
            ];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim().length > 100) {
                    // Get clean text
                    const clone = el.cloneNode(true);
                    for (const rm of clone.querySelectorAll('script, style, .nav, .sidebar, .header, .footer')) {
                        rm.remove();
                    }
                    return {
                        text: (clone.textContent || '').trim(),
                        html: clone.outerHTML || clone.innerHTML,
                        selector: sel,
                        length: (clone.textContent || '').trim().length
                    };
                }
            }
            // Fallback: whole page minus obvious chrome
            const body = document.body.cloneNode(true);
            for (const rm of body.querySelectorAll('script, style, nav, header, footer, .nav, .sidebar, .help-nav, .help-sidebar, iframe')) {
                rm.remove();
            }
            return {
                text: (body.textContent || '').trim(),
                html: body.innerHTML,
                selector: 'body (fallback)',
                length: (body.textContent || '').trim().length
            };
        }
    """)
    return content


async def get_sidebar_tree(page) -> list[dict]:
    """Get the full navigation tree from the sidebar."""
    tree = await page.evaluate("""
        () => {
            function buildTree(container) {
                const items = [];
                // Find all top-level navigation groups
                const groups = container.querySelectorAll(':scope > li, :scope > .nav-item, :scope > .menu-item, :scope > dl, :scope > div');
                if (groups.length === 0) {
                    // Direct links
                    const links = container.querySelectorAll(':scope > a');
                    for (const a of links) {
                        const text = (a.textContent || '').trim();
                        const href = a.getAttribute('href') || '';
                        if (text) items.push({ text, href, children: [] });
                    }
                    return items;
                }
                for (const g of groups) {
                    const link = g.querySelector(':scope > a, a:first-child');
                    const text = link ? (link.textContent || '').trim() : (g.textContent || '').trim().substring(0, 80);
                    const href = link ? (link.getAttribute('href') || '') : '';
                    if (!text) continue;
                    const item = { text, href, children: [] };
                    // Find sub-items
                    const sub = g.querySelector('ul, ol, .sub-menu, .sub-nav, dl dd');
                    if (sub) {
                        item.children = buildTree(sub);
                    }
                    items.push(item);
                }
                return items;
            }

            // Find the help sidebar / nav
            const sidebarSelectors = [
                '.help-nav', '.help-sidebar', '.help-menu',
                '.sz-nav', '.knowledge-nav',
                '[class*="help"][class*="nav"]',
                '[class*="help"][class*="side"]',
                'nav[class*="help"]', '.left-nav',
                '.catalog-nav', '.help-catalog',
                '.sz-sidebar', '#sidebar'
            ];
            let nav = null;
            for (const sel of sidebarSelectors) {
                nav = document.querySelector(sel + ' ul, ' + sel + ' .nav-list');
                if (!nav) nav = document.querySelector(sel);
                if (nav) break;
            }
            if (!nav) return { tree: [], selector: 'none' };
            return {
                tree: buildTree(nav),
                selector: nav.className || nav.tagName
            };
        }
    """)
    return tree


async def find_clickable_items(page) -> list[dict]:
    """Find all clickable nav items in the help sidebar."""
    items = await page.evaluate("""
        () => {
            const items = [];
            // Find the sidebar container
            const sideSelectors = [
                '.help-nav', '.help-sidebar', '.help-menu',
                '[class*="help"][class*="nav"]', '[class*="help"][class*="side"]',
                '.sz-sidebar', '.catalog-nav', 'nav'
            ];
            let sidebar = null;
            for (const sel of sideSelectors) {
                sidebar = document.querySelector(sel);
                if (sidebar) break;
            }

            const container = sidebar || document;

            // Find all top-level links that look like category items
            const links = container.querySelectorAll('a');
            for (const a of links) {
                const text = (a.textContent || '').trim();
                const href = a.getAttribute('href') || '';
                // Filter to help/documentation links
                if (text && text.length >= 2 && text.length < 50) {
                    items.push({
                        text: text,
                        href: href,
                        className: a.className || '',
                        id: a.id || ''
                    });
                }
            }
            return items;
        }
    """)
    return items


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp(CDP_URL)

        # Find the JD help page
        target_page = None
        for ctx in browser.contexts:
            for page in ctx.pages:
                if "sz.jd.com" in page.url and "help" in page.url:
                    target_page = page
                    break
            if target_page:
                break

        if not target_page:
            print("Page not found!")
            return

        print(f"📄 On: {target_page.url}")
        print(f"   Title: {await target_page.title()}")

        # First, get the full sidebar tree structure
        print("\n🌳 Getting sidebar navigation tree...")
        tree = await get_sidebar_tree(target_page)
        tree_path = OUTPUT_DIR / "sidebar_tree.json"
        tree_path.write_text(json.dumps(tree, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ Tree saved ({len(tree.get('tree', [])) if isinstance(tree, dict) else len(tree)} items)")

        # Get clickable nav items
        nav_items = await find_clickable_items(target_page)
        print(f"\n📍 Found {len(nav_items)} clickable nav items")

        # Try to click through each category in the main content dropdown
        # First, let's check if there's a category selector/dropdown
        dropdown_info = await target_page.evaluate("""
            () => {
                const selects = document.querySelectorAll('select');
                const result = [];
                for (const s of selects) {
                    const options = Array.from(s.querySelectorAll('option')).map(o => ({
                        text: (o.textContent||'').trim(),
                        value: o.value
                    }));
                    result.push({ name: s.name || s.className, options });
                }
                return result;
            }
        """)
        print(f"\n📋 Dropdown selects: {json.dumps(dropdown_info, ensure_ascii=False)[:500]}")

        # Look for category filter tabs
        category_tabs = await target_page.evaluate("""
            () => {
                const tabs = document.querySelectorAll('[class*="tab"], [class*="category"], [class*="filter"], .filter-item, .category-item');
                return Array.from(tabs).map(t => ({
                    text: (t.textContent||'').trim().substring(0, 80),
                    className: t.className || '',
                    tag: t.tagName
                }));
            }
        """)
        print(f"🔖 Category tabs: {json.dumps(category_tabs, ensure_ascii=False)[:1000]}")

        # Now let's click through the main sidebar categories
        # The sidebar has top-level categories that, when clicked, show their content
        print("\n🖱️  Clicking through sidebar categories to capture content...")

        # Get the current sidebar navigation structure
        all_captured = {}
        sidebar_links = await target_page.evaluate("""
            () => {
                const links = [];
                const nav = document.querySelector('.help-nav, .help-sidebar, .help-menu, .sz-nav, nav[class*="help"], .left-nav');
                const container = nav || document;
                const anchors = container.querySelectorAll('a[href*="help"]');
                for (const a of anchors) {
                    const text = (a.textContent || '').trim();
                    if (text && text.length >= 2 && text.length < 60) {
                        links.push({
                            text: text,
                            href: a.getAttribute('href'),
                            selector: a.className || a.tagName
                        });
                    }
                }
                return links;
            }
        """)

        print(f"  Found {len(sidebar_links)} help links")

        # Focus on what seem to be main category links
        # Filter to ones that look like they'd show feature content
        feature_links = []
        for link in sidebar_links:
            text = link['text']
            if text in ['首页', '实时', '流量', '商品', '交易', '服务', '营销',
                       '供应链', '客户', '行业', '竞争', '揽客', '报表',
                       '业务专区', '智能工具', '培训', '帮助', '常见问题',
                       '指标说明', '功能介绍', '资费说明', '版本更新']:
                feature_links.append(link)

        print(f"  Key category links: {[l['text'] for l in feature_links]}")

        # Try clicking each main category link and capture content
        feature_docs = {}
        for i, link_info in enumerate(feature_links[:20]):
            try:
                text = link_info['text']
                print(f"  [{i+1}/{len(feature_links[:20])}] Clicking: {text}...")

                # Try to click this link
                clicked = await target_page.evaluate(f"""
                    (text) => {{
                        const anchors = document.querySelectorAll('a');
                        for (const a of anchors) {{
                            if ((a.textContent || '').trim() === text) {{
                                a.click();
                                return true;
                            }}
                        }}
                        return false;
                    }}
                """, text)

                if not clicked:
                    # Try clicking by href
                    if link_info['href']:
                        await target_page.evaluate(f"""
                            (href) => {{
                                const a = document.querySelector('a[href="{href}"]');
                                if (a) a.click();
                            }}
                        """, link_info['href'])

                await asyncio.sleep(1.5)

                # Capture content
                content = await get_page_content(target_page)
                feature_docs[text] = {
                    'title': text,
                    'href': link_info.get('href', ''),
                    'text': content['text'][:5000],
                    'length': content['length']
                }
                print(f"      Captured {content['length']} chars from {content.get('selector', '?')}")

            except Exception as e:
                print(f"      ⚠️ Error: {e}")

        # Save captured docs
        docs_path = OUTPUT_DIR / "feature_descriptions.json"
        docs_path.write_text(json.dumps(feature_docs, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n  ✓ Feature descriptions saved: {docs_path} ({len(feature_docs)} sections)")

        # Also try to directly navigate to help sub-pages
        print("\n📖 Trying to access sub-feature pages directly...")
        sub_feature_links = [
            {"text": "实时总览", "url": "https://sz.jd.com/sz/view/help/productDess.html?category=realTime"},
            {"text": "流量概览", "url": "https://sz.jd.com/sz/view/help/productDess.html?category=traffic"},
            {"text": "商品分析", "url": "https://sz.jd.com/sz/view/help/productDess.html?category=product"},
        ]

        await browser.close()
        print("\n✅ Done!")


if __name__ == "__main__":
    asyncio.run(main())
