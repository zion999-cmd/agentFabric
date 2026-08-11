#!/usr/bin/env python3
"""
Click through ALL AngularJS category filters on JD 商智 help pages and capture content.
Connects via CDP to already-running Chrome.
"""
import asyncio
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("/Users/bx/Workspace/agentFabric/data/jd_shangzhi_features")
CDP_URL = "http://127.0.0.1:9222"

# Pages to scrape with their URLs
PAGES = [
    {
        "name": "功能介绍",
        "url": "https://sz.jd.com/sz/view/help/productDess.html",
    },
    {
        "name": "指标说明",
        "url": "https://sz.jd.com/sz/view/help/indexsDess.html",
    },
]


async def get_all_category_items(page) -> list[dict]:
    """Get all clickable category items from the AngularJS filter."""
    items = await page.evaluate("""
        () => {
            const items = [];
            const labels = document.querySelectorAll('.search-label');
            for (const label of labels) {
                const span = label.querySelector('span[ng-click]');
                if (span) {
                    const text = (span.textContent || '').trim();
                    const code = span.getAttribute('code') || '';
                    if (text && text.length > 1) {
                        items.push({ text, code });
                    }
                }
            }
            return items;
        }
    """)
    return items


async def click_category(page, text: str) -> bool:
    """Click a category span by text content."""
    result = await page.evaluate(f"""
        (text) => {{
            const labels = document.querySelectorAll('.search-label span[ng-click]');
            for (const span of labels) {{
                if ((span.textContent || '').trim() === text) {{
                    span.click();
                    // Also trigger Angular digest cycle
                    const scope = angular && angular.element(span).scope();
                    if (scope) {{
                        scope.$apply();
                    }}
                    return 'clicked';
                }}
            }}
            return 'not-found:' + labels.length;
        }}
    """, text)
    return result == 'clicked'


async def extract_main_content(page) -> str:
    """Extract the main help content, filtering out navigation."""
    text = await page.evaluate("""
        () => {
            // Try to find the main article/content area
            const selectors = [
                '.help-content', '.help-main', '.help-body', '.help-right',
                '[class*="help"][class*="content"]',
                '[class*="help"][class*="main"]',
                '.article-content', 'article', '.help-text',
                '.feature-detail', '.product-detail'
            ];
            let el = null;
            for (const sel of selectors) {
                el = document.querySelector(sel);
                if (el && el.textContent.trim().length > 100) break;
                el = null;
            }

            if (!el) {
                // Fallback: clone body and remove nav/chrome
                el = document.body.cloneNode(true);
                for (const rm of el.querySelectorAll(
                    'script, style, nav, header, .header, .help-nav, .help-sidebar, ' +
                    '.search-item, .search-list, .search-title, .search-label, ' +
                    '.flod, .up-down-icon, .up-down-text, .footer, .copyright-info, ' +
                    '.nav-bar, .breadcrumb, iframe, [class*="nav"]'
                )) {
                    rm.remove();
                }
            }

            const text = (el.textContent || '').trim();
            return text;
        }
    """)
    return text


async def wait_for_angular(page, wait_ms=2000):
    """Wait for AngularJS to update the DOM."""
    await asyncio.sleep(0.5)
    # Wait for network to settle
    try:
        await page.wait_for_load_state("networkidle", timeout=5000)
    except:
        pass
    # Wait for potential $http requests
    await asyncio.sleep(wait_ms / 1000.0)


async def scrape_page(browser, page_config: dict) -> dict:
    """Scrape all categories from a single page."""
    name = page_config["name"]
    url = page_config["url"]
    results = {}

    # Find an existing context page or create new one
    target_page = None
    for ctx in browser.contexts:
        for p in ctx.pages:
            if "sz.jd.com" in p.url:
                target_page = p
                break
        if target_page:
            break

    if not target_page:
        target_page = await browser.contexts[0].new_page()

    print(f"\n{'='*60}")
    print(f"📄 {name}: navigating to {url}")
    await target_page.goto(url, wait_until="networkidle", timeout=30000)
    await asyncio.sleep(2)

    # Extract all category items
    items = await get_all_category_items(target_page)
    print(f"   Found {len(items)} category items: {[i['text'] for i in items[:5]]}...")

    if not items:
        print("   ⚠️ No categories found! Page may not have loaded properly.")
        return results

    for i, item in enumerate(items):
        cat_text = item['text']
        cat_code = item['code']
        try:
            print(f"  [{i+1}/{len(items)}] {cat_text} ({cat_code})...", end=" ", flush=True)

            # Click the category
            ok = await click_category(target_page, cat_text)
            if not ok:
                # Try direct DOM click
                try:
                    await target_page.click(f'span[code="{cat_code}"]', timeout=3000)
                    ok = True
                except:
                    pass

            # Wait for content to update
            await wait_for_angular(target_page, wait_ms=1500)

            # Extract content
            content = await extract_main_content(target_page)

            # Clean up: remove tab header text that always appears
            prefixes = ['功能介绍', '指标说明', '帮助', '常见问题', '资费说明', '版本更新']
            clean = content
            for prefix in prefixes:
                if clean.startswith(prefix):
                    clean = clean[len(prefix):].strip()

            # Remove trailing copyright/footer text
            footer_markers = [
                'Copyright©', '需求和意见反馈', '京东商智商家反馈群',
                '用户协议|营业执照|注销流程', '京ICP证'
            ]
            for marker in footer_markers:
                idx = clean.find(marker)
                if idx > 200:
                    clean = clean[:idx].strip()

            results[cat_text] = {
                "code": cat_code,
                "text": clean[:8000],
                "length": len(clean),
            }

            if len(clean) > 50:
                print(f"✓ {len(clean)} chars")
                # Print first 150 chars as preview
                preview = clean[:150].replace('\n', ' ').strip()
                print(f"     📝 {preview}...")
            else:
                print(f"⚠️ {len(clean)} chars (may be empty)")

        except Exception as e:
            print(f"❌ {e}")
            results[cat_text] = {"code": cat_code, "text": "", "length": 0, "error": str(e)}

    return results


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        print("🔌 Connecting to Chrome CDP...")
        browser = await pw.chromium.connect_over_cdp(CDP_URL)
        print(f"   Connected. Contexts: {len(browser.contexts)}")

        for page_config in PAGES:
            results = await scrape_page(browser, page_config)

            # Save results
            output_file = OUTPUT_DIR / f"{page_config['name']}_all_categories.json"
            output_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"\n  ✅ Saved: {output_file} ({len(results)} categories)")

            # Also save a pretty markdown version
            md_lines = [f"# {page_config['name']} - JD 商智", ""]
            for cat, data in results.items():
                md_lines.append(f"## {cat}")
                md_lines.append("")
                md_lines.append(data.get("text", "_无内容_"))
                md_lines.append("")
            md_file = OUTPUT_DIR / f"{page_config['name']}_all_categories.md"
            md_file.write_text("\n".join(md_lines), encoding="utf-8")
            print(f"  ✅ Markdown saved: {md_file}")

            # Summary
            with_content = sum(1 for d in results.values() if d.get("length", 0) > 100)
            print(f"  📊 Categories with content: {with_content}/{len(results)}")

        await browser.close()
        print(f"\n{'='*60}")
        print(f"✅ Done! All data in: {OUTPUT_DIR}")
        for f in sorted(OUTPUT_DIR.iterdir()):
            if f.is_file():
                print(f"   {f.name} ({f.stat().st_size:,} bytes)")


if __name__ == "__main__":
    asyncio.run(main())
