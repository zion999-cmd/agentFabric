#!/usr/bin/env python3
"""
Explorer Fabric — Navigation Scanner
Generic navigation tree scanner for any business platform.

Usage:
    python scripts/explore_navigation.py \
        --url https://jdsz.jd.com/szweb/view/index/home.html \
        --source-id jd_smart \
        --cdp-port 9222 \
        --output sources/jd_smart/snapshots/navigation.json

Configurable via:
    --cdp-port: Chrome CDP port (default: 9222)
    --timeout: Page load timeout in ms (default: 15000)
    --wait-after: Seconds to wait after page load (default: 2)
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Navigation Scanner")
    parser.add_argument("--url", required=True, help="Starting URL of the platform")
    parser.add_argument("--source-id", required=True, help="Source identifier (e.g., jd_smart)")
    parser.add_argument("--cdp-port", type=int, default=9222, help="Chrome CDP port")
    parser.add_argument("--timeout", type=int, default=15000, help="Page load timeout (ms)")
    parser.add_argument("--wait-after", type=float, default=2.0, help="Seconds to wait after load")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    parser.add_argument("--max-depth", type=int, default=3, help="Max menu depth to explore")
    return parser.parse_args()


async def connect_browser(cdp_port):
    """Connect to existing Chrome via CDP."""
    from playwright.async_api import async_playwright
    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(f"http://localhost:{cdp_port}")
    return pw, browser


async def find_target_page(browser, url_pattern):
    """Find the existing page matching the URL pattern."""
    for page in browser.contexts[0].pages:
        if url_pattern in page.url:
            return page
    return None


async def extract_top_menu(page, wait_seconds=1):
    """Extract top-level navigation menu items."""
    await asyncio.sleep(wait_seconds)
    
    return await page.evaluate("""
    () => {
        const result = { links: [], buttons: [], menu_items: [] };
        
        // Method 1: Find all navigation links
        document.querySelectorAll('a[href]').forEach(a => {
            const text = (a.textContent || '').trim();
            const href = a.href || '';
            if (text && text.length > 0 && text.length < 50 && !text.includes('京东') && !text.includes('登录') && !text.includes('退出')) {
                result.links.push({ text, href });
            }
        });
        
        // Method 2: Find menu/nav/sider containers
        document.querySelectorAll('[class*="menu"], [class*="nav"], [class*="sider"], [class*="aside"]').forEach(container => {
            container.querySelectorAll('a, [role="menuitem"]').forEach(item => {
                const text = (item.textContent || '').trim();
                const href = item.href || '';
                if (text && text.length > 0 && text.length < 50 && !text.includes('京东') && !text.includes('登录')) {
                    result.menu_items.push({ text, href });
                }
            });
        });
        
        // Method 3: Find buttons that look like menu items
        document.querySelectorAll('button, [role="button"]').forEach(btn => {
            const text = (btn.textContent || '').trim();
            if (text && text.length > 1 && text.length < 30 && !text.includes('class')) {
                result.buttons.push({ text });
            }
        });
        
        return result;
    }
    """)


async def extract_sub_menu(page, parent_name, wait_seconds=2):
    """Extract sub-menu items for a given parent."""
    await asyncio.sleep(wait_seconds)
    
    return await page.evaluate(extractSubMenus, parent_name)


async def scan_navigation(start_url, source_id, cdp_port, timeout, wait_after, max_depth):
    """Main navigation scanning function."""
    pw, browser = await connect_browser(cdp_port)
    
    try:
        # Find or navigate to the target page
        page = await find_target_page(browser, start_url.split('/')[-1])
        if not page:
            # Navigate to the URL if page not found
            context = browser.contexts[0]
            page = await context.new_page()
            await page.goto(start_url, wait_until='domcontentloaded', timeout=timeout)
        
        # Extract top-level menu
        top_menu = await extract_top_menu(page, wait_after)
        
        # Build navigation tree
        nav_tree = {
            "source_id": source_id,
            "scan_time": datetime.now(timezone.utc).isoformat(),
            "start_url": start_url,
            "top_level": [],
            "sub_menus": {},
            "discovered_pages": [],
            "notes": {
                "popup_pages": [],
                "empty_menus": [],
                "permission_issues": []
            }
        }
        
        # Process each top-level link
        seen_urls = set()
        for link in top_menu["links"]:
            if link["href"] and link["href"] not in seen_urls:
                seen_urls.add(link["href"])
                nav_tree["top_level"].append({
                    "text": link["text"],
                    "href": link["href"],
                    "has_data": True  # Assume true until proven otherwise
                })
        
        # Try to extract sub-menus by clicking each top-level item
        for item in nav_tree["top_level"]:
            # Click the menu item to expand sub-menu
            await page.evaluate(clickMenuItem, item["text"])
            
            await asyncio.sleep(1)
            
            # Extract sub-menus
            sub_menus = await extract_sub_menu(page, item["text"], 1)
            if sub_menus:
                nav_tree["sub_menus"][item["text"]] = [s["text"] for s in sub_menus]
        
        # Scan for iframes (popup/modal pages)
        frames = await page.frames
        for frame in frames:
            try:
                frame_url = frame.url
                if frame_url and frame_url != page.url and 'jdsz' in frame_url:
                    nav_tree["notes"]["popup_pages"].append(frame_url)
            except:
                pass
        
        return nav_tree
    
    finally:
        await browser.close()
        await pw.stop()


async def main():
    args = parse_args()
    
    print(f"Explorer Fabric — Navigation Scanner")
    print(f"  Source: {args.source_id}")
    print(f"  URL: {args.url}")
    print(f"  CDP Port: {args.cdp_port}")
    print(f"  Timeout: {args.timeout}ms")
    print(f"  Wait After: {args.wait_after}s")
    print(f"  Output: {args.output}")
    print()
    
    nav_tree = await scan_navigation(
        args.url,
        args.source_id,
        args.cdp_port,
        args.timeout,
        args.wait_after,
        args.max_depth
    )
    
    # Ensure output directory exists
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    
    # Write output
    with open(args.output, 'w') as f:
        json.dump(nav_tree, f, indent=2, ensure_ascii=False)
    
    print(f"Navigation scan complete:")
    print(f"  Top-level menus: {len(nav_tree['top_level'])}")
    print(f"  Sub-menus: {len(nav_tree['sub_menus'])}")
    print(f"  Popup pages: {len(nav_tree['notes']['popup_pages'])}")
    print(f"  Saved to: {args.output}")


if __name__ == "__main__":
    asyncio.run(main())
