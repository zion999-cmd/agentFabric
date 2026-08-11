#!/usr/bin/env python3
"""
Scrape JD 商智 (sz.jd.com) product feature documentation via CDP.
Connect to an already-running Chrome with remote debugging on port 9222.
The user must be logged into JD 商智 in that browser.
"""
import asyncio
import json
import re
import time
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("/Users/bx/Workspace/agentFabric/data/jd_shangzhi_features")
CDP_URL = "http://127.0.0.1:9222"
TARGET_URL = "https://sz.jd.com/sz/view/help/productDess.html"


def sanitize_filename(s: str) -> str:
    """Remove unsafe chars from filenames."""
    s = re.sub(r"[^a-zA-Z0-9一-鿿\-_]", "_", s.strip())
    return s[:120]


async def extract_toc(page) -> list[dict]:
    """Extract the table of contents / navigation sidebar."""
    toc_items = await page.evaluate("""
        () => {
            const items = [];
            // Try common sidebar selectors
            const selectors = [
                '.help-nav a', '.help-sidebar a', '.help-menu a',
                '.sidebar a', '.nav-list a', '.menu-list a',
                '[class*="help"][class*="nav"] a',
                '[class*="side"] a', '[class*="menu"] a',
                '.help-left a', '.help-aside a',
                '.catalog a', '.catalog-nav a',
                'nav a[href*="help"]',
                '.help-content-nav a'
            ];
            for (const sel of selectors) {
                const links = document.querySelectorAll(sel);
                if (links.length > 0) {
                    for (const a of links) {
                        const href = a.getAttribute('href') || '';
                        const text = (a.textContent || '').trim();
                        if (text && text.length > 1) {
                            items.push({
                                text: text,
                                href: href,
                                tag: a.tagName
                            });
                        }
                    }
                    if (items.length > 0) break;
                }
            }
            return items;
        }
    """)
    return toc_items


async def extract_main_content(page) -> dict:
    """Extract the main content area."""
    content = await page.evaluate("""
        () => {
            // Try multiple content area selectors
            const selectors = [
                '.help-content', '.help-detail', '.help-body',
                '.content-area', '.main-content', '.article-content',
                '[class*="help"][class*="content"]',
                '[class*="help"][class*="detail"]',
                '[class*="help"][class*="body"]',
                'article', '.markdown-body',
                '.help-right', '.help-main',
                'main', '[role="main"]'
            ];
            let el = null;
            for (const sel of selectors) {
                el = document.querySelector(sel);
                if (el && el.textContent.trim().length > 50) break;
                el = null;
            }
            if (!el) {
                // fallback: grab body content minus obvious non-content
                el = document.body.cloneNode(true);
                for (const rm of el.querySelectorAll('script, style, nav, header, footer, .header, .footer, .nav, .sidebar, .help-nav, .help-sidebar')) {
                    rm.remove();
                }
            }
            return {
                html: el.outerHTML || el.innerHTML,
                text: (el.textContent || '').trim(),
                tag: el.tagName || 'BODY'
            };
        }
    """)
    return content


async def extract_sections(page) -> list[dict]:
    """Try to extract individual sections / feature blocks."""
    sections = await page.evaluate("""
        () => {
            const blocks = [];
            // Look for section-like elements
            const candidates = document.querySelectorAll(
                'h1, h2, h3, h4, .section, .feature, .module, ' +
                '[class*="section"], [class*="feature"], [class*="module"], ' +
                '[class*="card"], [class*="block"], [class*="panel"]'
            );
            for (const el of candidates) {
                const tag = el.tagName;
                const text = (el.textContent || '').trim();
                const cls = el.className || '';
                if (tag.match(/^H[1-4]$/) && text.length > 2) {
                    blocks.push({ type: 'heading', level: parseInt(tag[1]), text: text, cls: cls });
                } else if (text.length > 30 && text.length < 5000) {
                    blocks.push({ type: 'block', text: text.substring(0, 3000), cls: cls });
                }
            }
            return blocks;
        }
    """)
    return sections


async def extract_all_nav_links(page) -> list[dict]:
    """Find all navigation links that point to help pages."""
    links = await page.evaluate("""
        () => {
            const links = [];
            const seen = new Set();
            for (const a of document.querySelectorAll('a[href]')) {
                const href = a.getAttribute('href');
                const text = (a.textContent || '').trim();
                if (href && text && text.length > 1 && !seen.has(href)) {
                    seen.add(href);
                    links.push({ text, href });
                }
            }
            return links;
        }
    """)
    return links


async def scroll_and_wait(page, delay=0.3):
    """Scroll through page to trigger lazy loading."""
    await page.evaluate("window.scrollTo(0, 0)")
    await asyncio.sleep(delay)
    prev_height = 0
    for _ in range(20):
        await page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
        await asyncio.sleep(delay)
        new_height = await page.evaluate("document.body.scrollHeight")
        if new_height == prev_height:
            break
        prev_height = new_height
    await page.evaluate("window.scrollTo(0, 0)")
    await asyncio.sleep(0.5)


async def take_full_page_screenshot(page, output_path: Path):
    """Take a full-page screenshot."""
    await page.screenshot(path=str(output_path), full_page=True)
    print(f"  ✓ Screenshot saved: {output_path}")


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        print("Connecting to Chrome CDP at", CDP_URL)
        browser = await pw.chromium.connect_over_cdp(CDP_URL)
        print(f"  Connected. Contexts: {len(browser.contexts)}")

        # Find the JD 商智 page
        target_page = None
        for ctx in browser.contexts:
            for page in ctx.pages:
                url = page.url
                print(f"  Page: {page.url[:100]}")
                if "sz.jd.com" in url and "help" in url:
                    target_page = page
                    break
            if target_page:
                break

        if not target_page:
            print("JD 商智 help page not found in open pages. Opening a new one...")
            # Use the first available context
            ctx = browser.contexts[0] if browser.contexts else await browser.new_context()
            target_page = await ctx.new_page()
            await target_page.goto(TARGET_URL, wait_until="networkidle", timeout=30000)

        print(f"\n📄 Target page: {target_page.url}")
        print(f"   Title: {await target_page.title()}")

        # Ensure we're on the right page
        if "productDess.html" not in target_page.url:
            print("  Navigating to productDess.html...")
            await target_page.goto(TARGET_URL, wait_until="networkidle", timeout=30000)

        await target_page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        # Scroll to trigger lazy loading
        print("\n📜 Scrolling to load all content...")
        await scroll_and_wait(target_page)

        # Extract full page HTML
        print("\n📥 Extracting page content...")
        full_html = await target_page.content()
        page_title = await target_page.title()
        page_url = target_page.url

        # Save raw HTML
        html_path = OUTPUT_DIR / "productDess_full.html"
        html_path.write_text(full_html, encoding="utf-8")
        print(f"  ✓ Full HTML saved: {html_path} ({len(full_html)} chars)")

        # Extract TOC / navigation
        toc = await extract_toc(target_page)
        toc_path = OUTPUT_DIR / "toc_navigation.json"
        toc_path.write_text(json.dumps(toc, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ TOC saved: {toc_path} ({len(toc)} items)")

        # Extract main content
        content = await extract_main_content(target_page)
        text_path = OUTPUT_DIR / "main_content.txt"
        text_path.write_text(content["text"], encoding="utf-8")
        print(f"  ✓ Main text saved: {text_path} ({len(content['text'])} chars)")

        main_html_path = OUTPUT_DIR / "main_content.html"
        main_html_path.write_text(content["html"], encoding="utf-8")
        print(f"  ✓ Main HTML saved: {main_html_path} ({len(content['html'])} chars)")

        # Extract sections
        sections = await extract_sections(target_page)
        sections_path = OUTPUT_DIR / "sections.json"
        sections_path.write_text(json.dumps(sections, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ Sections saved: {sections_path} ({len(sections)} sections)")

        # Extract all nav links
        nav_links = await extract_all_nav_links(target_page)
        links_path = OUTPUT_DIR / "all_nav_links.json"
        links_path.write_text(json.dumps(nav_links, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ All nav links saved: {links_path} ({len(nav_links)} links)")

        # Take full-page screenshot
        print("\n📸 Taking screenshot...")
        await take_full_page_screenshot(target_page, OUTPUT_DIR / "productDess_screenshot.png")

        # Try to extract structured feature blocks
        print("\n🔍 Analyzing page structure...")
        structure = await target_page.evaluate("""
            () => {
                const info = {
                    headings: [],
                    images: [],
                    tables: [],
                    lists: [],
                    iframes: []
                };
                document.querySelectorAll('h1, h2, h3, h4').forEach(h => {
                    info.headings.push({ level: h.tagName, text: (h.textContent||'').trim().substring(0,300) });
                });
                document.querySelectorAll('img[src]').forEach(img => {
                    info.images.push({ src: img.getAttribute('src'), alt: img.getAttribute('alt')||'' });
                });
                document.querySelectorAll('table').forEach(t => {
                    const rows = t.querySelectorAll('tr');
                    info.tables.push({ rows: rows.length, preview: (t.textContent||'').trim().substring(0,500) });
                });
                document.querySelectorAll('ul, ol').forEach(l => {
                    const items = l.querySelectorAll('li');
                    if (items.length >= 3) {
                        info.lists.push({ tag: l.tagName, items: items.length, preview: Array.from(items).slice(0,5).map(li => li.textContent.trim().substring(0,200)) });
                    }
                });
                return info;
            }
        """)
        structure_path = OUTPUT_DIR / "page_structure.json"
        structure_path.write_text(json.dumps(structure, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ Structure saved: {structure_path}")
        print(f"    Headings: {len(structure['headings'])}")
        print(f"    Images: {len(structure['images'])}")
        print(f"    Tables: {len(structure['tables'])}")
        print(f"    Lists: {len(structure['lists'])}")

        # If there are sub-pages linked from TOC, try to crawl them too
        help_links = [l for l in nav_links if 'help' in l.get('href', '')]
        toc_links = [l for l in toc if l.get('href') and 'help' in l['href']]
        all_sub_links = []
        seen_urls = {page_url}

        # Prioritize TOC links first, then supplement with nav links
        for link in toc_links + help_links:
            href = link.get('href', '')
            if not href or href.startswith('#') or href.startswith('javascript'):
                continue
            # Resolve relative URLs
            if href.startswith('/'):
                full_url = f"https://sz.jd.com{href}"
            elif href.startswith('http'):
                full_url = href
            else:
                full_url = f"https://sz.jd.com/sz/view/help/{href}"
            if full_url not in seen_urls and 'sz.jd.com' in full_url:
                seen_urls.add(full_url)
                all_sub_links.append({**link, 'full_url': full_url})

        if all_sub_links:
            print(f"\n📑 Found {len(all_sub_links)} sub-pages. Crawling (max 30)...")
            sub_pages_dir = OUTPUT_DIR / "sub_pages"
            sub_pages_dir.mkdir(exist_ok=True)

            crawled = 0
            for i, link_info in enumerate(all_sub_links[:30]):
                try:
                    url = link_info['full_url']
                    title_hint = link_info.get('text', '')[:60]
                    print(f"  [{i+1}/{min(len(all_sub_links), 30)}] {title_hint}...")

                    # Open in new tab
                    sub_page = await browser.contexts[0].new_page()
                    await sub_page.goto(url, wait_until="networkidle", timeout=15000)
                    await asyncio.sleep(1)
                    await scroll_and_wait(sub_page, delay=0.2)

                    sub_html = await sub_page.content()
                    sub_title = await sub_page.title()
                    sub_text = await sub_page.evaluate("() => document.body.textContent || ''")

                    fname = sanitize_filename(title_hint or sub_title)
                    if not fname or len(fname) < 2:
                        fname = f"page_{i}"

                    # Save
                    (sub_pages_dir / f"{fname}.html").write_text(sub_html, encoding="utf-8")
                    (sub_pages_dir / f"{fname}.txt").write_text(sub_text, encoding="utf-8")
                    crawled += 1

                    await sub_page.close()
                except Exception as e:
                    print(f"    ⚠️ Failed: {e}")
                    try:
                        await sub_page.close()
                    except:
                        pass

            print(f"  ✓ Crawled {crawled} sub-pages")

            # Build index of sub-pages
            index = []
            for f in sorted(sub_pages_dir.iterdir()):
                if f.suffix == '.html':
                    index.append({
                        'file': f.name,
                        'size': f.stat().st_size,
                        'title': f.stem
                    })
            (sub_pages_dir / "_index.json").write_text(
                json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
            )

        await browser.close()
        print(f"\n✅ Done! All data saved to: {OUTPUT_DIR}")
        print(f"   Files: {list(sorted(f.name for f in OUTPUT_DIR.iterdir()))}")


if __name__ == "__main__":
    asyncio.run(main())
