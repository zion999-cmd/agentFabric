#!/usr/bin/env python3
"""
Click through ALL category options on JD 商智 功能介绍 & 指标说明 pages.
Captures dynamically-loaded content for each category via CDP.
"""
import asyncio
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("/Users/bx/Workspace/agentFabric/data/jd_shangzhi_features")
CDP_URL = "http://127.0.0.1:9222"

# All categories from the page
CATEGORIES = [
    "首页", "实时总览", "实时大屏", "实时监控", "活动分析",
    "流量概览", "热力图", "推荐分析", "搜索分析", "内容营销",
    "商品分析", "爆款孵化", "PLUS会员", "交易分析", "服务分析",
    "营销分析", "供应链分析", "客户总览", "客户分析", "关注店铺用户",
    "品牌会员", "大盘动态", "行业关键词", "品牌分析", "属性分析",
    "产品分析", "行业客户", "竞争分析", "购物车营销", "客户营销",
    "报表分析", "业务专区", "智能选品", "京速推",
]

PAGES_TO_SCRAPE = [
    {
        "name": "功能介绍",
        "url": "https://sz.jd.com/sz/view/help/productDess.html",
        "category_label": "类别",
    },
    {
        "name": "指标说明",
        "url": "https://sz.jd.com/sz/view/help/indexsDess.html",
        "category_label": "类别",
    },
]


async def click_category(page, category_name: str) -> bool:
    """Click a category option in the dropdown/filter to trigger content load."""
    # Try multiple strategies to select the category
    result = await page.evaluate(f"""
        (category) => {{
            // Strategy 1: Find a link/span/li with exact text match
            const elements = document.querySelectorAll('a, span, li, div, option');
            for (const el of elements) {{
                const text = (el.textContent || '').trim();
                if (text === category && el.offsetParent !== null) {{
                    el.click();
                    return 'clicked:' + el.tagName;
                }}
            }}

            // Strategy 2: Find inside a dropdown/filter container
            const containers = document.querySelectorAll('[class*="category"], [class*="filter"], [class*="select"], [class*="dropdown"], .category-list, .filter-list');
            for (const container of containers) {{
                const items = container.querySelectorAll('a, span, li, div');
                for (const item of items) {{
                    if ((item.textContent || '').trim() === category) {{
                        item.click();
                        return 'container-clicked:' + item.tagName;
                    }}
                }}
            }}

            // Strategy 3: Find select option
            const selects = document.querySelectorAll('select');
            for (const s of selects) {{
                for (const opt of s.options) {{
                    if ((opt.textContent || '').trim() === category) {{
                        s.value = opt.value;
                        s.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        return 'select-changed:' + opt.value;
                    }}
                }}
            }}

            return 'not-found';
        }}
    """, category_name)
    return result


async def get_content_after_click(page, wait_ms=2000) -> str:
    """Wait for dynamic content and return the main text."""
    await asyncio.sleep(wait_ms / 1000.0)

    # Wait for possible loading state
    try:
        await page.wait_for_load_state("networkidle", timeout=5000)
    except:
        pass
    await asyncio.sleep(0.5)

    text = await page.evaluate("""
        () => {
            // Remove nav/footer/script/style
            const body = document.body.cloneNode(true);
            for (const rm of body.querySelectorAll('script, style, nav, .header, .footer, iframe, .nav-bar, .top-bar, .side-bar')) {
                rm.remove();
            }

            // Try content-specific selectors
            const contentSelectors = [
                '.help-content', '.help-detail', '.help-body', '.help-right',
                '.help-main', '.article-content', '.content-right',
                '[class*="help"][class*="content"]', '[class*="help"][class*="detail"]',
                '.sz-help-content', '.product-desc', '.feature-desc',
                '.help-text', 'article', 'main'
            ];
            for (const sel of contentSelectors) {
                const el = body.querySelector(sel);
                if (el) {
                    const text = (el.textContent || '').trim();
                    if (text.length > 200) return text;
                }
            }

            // Fallback: get everything in body minus obvious chrome
            // Remove common non-content elements
            for (const rm of body.querySelectorAll(
                '.help-nav, .help-sidebar, .help-menu, .category-list, .filter-bar, ' +
                '.page-nav, .breadcrumb, [class*="nav"], [class*="side"], ' +
                '.copyright, .footer-info'
            )) { rm.remove(); }

            return (body.textContent || '').trim();
        }
    """)
    return text


async def scrape_page(browser, page_config: dict) -> dict:
    """Scrape all categories from one page type."""
    name = page_config["name"]
    url = page_config["url"]
    results = {}

    # Find or create the page
    target_page = None
    for ctx in browser.contexts:
        for page in ctx.pages:
            if "sz.jd.com" in page.url and "help" in page.url:
                target_page = page
                break
        if target_page:
            break

    if not target_page:
        ctx = browser.contexts[0]
        target_page = await ctx.new_page()

    # Navigate to the page
    print(f"\n{'='*60}")
    print(f"📄 Navigating to: {name} ({url})")
    await target_page.goto(url, wait_until="networkidle", timeout=20000)
    await asyncio.sleep(2)

    title = await target_page.title()
    print(f"   Title: {title}")

    for i, category in enumerate(CATEGORIES):
        try:
            print(f"  [{i+1}/{len(CATEGORIES)}] Selecting: {category}...", end=" ", flush=True)

            # Click the category
            click_result = await click_category(target_page, category)

            if click_result == 'not-found':
                print(f"⚠️ Not found (trying alternate method)")
                # Try to click via text content match
                await target_page.evaluate(f"""
                    () => {{
                        const walker = document.createTreeWalker(
                            document.body, NodeFilter.SHOW_ELEMENT,
                            {{ acceptNode: n => n.textContent.trim() === '{category}' && n.children.length === 0 ?
                                NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP }}
                        );
                        let node;
                        while (node = walker.nextNode()) {{
                            if (node.offsetParent !== null) {{
                                node.click();
                                break;
                            }}
                        }}
                    }}
                """)

            # Wait for content to load
            text = await get_content_after_click(target_page, wait_ms=1500)

            # Clean the text: remove repeated nav/chrome text
            text_lines = [l.strip() for l in text.split('\n') if l.strip()]
            # Filter out lines that are clearly navigation
            nav_texts = ['常见问题', '指标说明', '功能介绍', '资费说明', '版本更新',
                        '帮助', '首页', '实时', '流量', '商品', '交易', '服务', '营销',
                        '供应链', '客户', '行业', '竞争', '揽客', '报表', '业务专区', '智能工具', '培训']
            cleaned_lines = []
            for line in text_lines:
                # Skip pure navigation lines
                if line in nav_texts and len(line) <= 6:
                    continue
                cleaned_lines.append(line)

            clean_text = '\n'.join(cleaned_lines)

            results[category] = {
                "text": clean_text[:10000],  # Cap at 10K chars per category
                "length": len(clean_text),
                "click_result": click_result,
            }

            # Check if content actually changed
            if len(clean_text) < 50:
                print(f"⚠️ Only {len(clean_text)} chars - content may not have loaded")
            else:
                print(f"✓ {len(clean_text)} chars")

        except Exception as e:
            print(f"❌ Error: {e}")
            results[category] = {"text": "", "length": 0, "error": str(e)}

    return results


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        print("Connecting to Chrome CDP...")
        browser = await pw.chromium.connect_over_cdp(CDP_URL)

        for page_config in PAGES_TO_SCRAPE:
            results = await scrape_page(browser, page_config)

            # Save results
            output_file = OUTPUT_DIR / f"{page_config['name']}_all_categories.json"
            output_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"\n  ✅ Saved: {output_file} ({len(results)} categories)")

            # Print summary
            for cat, data in results.items():
                length = data.get("length", 0)
                status = "✓" if length > 100 else "⚠️"
                print(f"    {status} {cat}: {length} chars")

        await browser.close()
        print("\n" + "="*60)
        print("✅ All done! Feature documentation scraped successfully.")
        print(f"   Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
