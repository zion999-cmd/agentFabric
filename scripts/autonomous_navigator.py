#!/usr/bin/env python3
"""
Explorer Fabric — Autonomous Navigator
Automatically traverses a website by clicking all menu items, loading sub-pages,
and recording discovered URLs. Handles dynamic content and nested menus.

Usage:
    python scripts/autonomous_navigator.py \\
        --url https://jdsz.jd.com/szweb/view/index/home.html \\
        --source-id jd_smart \\
        --max-depth 3 \\
        --timeout 10000 \\
        --output sources/jd_smart/snapshots/autonomous_discovery.json
"""

import argparse
import asyncio
import json
import logging
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class DiscoveredPage:
    url: str
    title: str
    depth: int
    parent_url: Optional[str] = None
    parent_label: Optional[str] = None
    loaded: bool = False
    error: Optional[str] = None
    discovered_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@dataclass
class MenuItem:
    text: str
    url: str
    tag: str
    href: Optional[str] = None
    aria_haspopup: Optional[str] = None
    children: list = field(default_factory=list)

@dataclass
class NavigationResult:
    start_url: str
    discovered_pages: list = field(default_factory=list)
    menus_traversed: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    stats: dict = field(default_factory=dict)

def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Autonomous Navigator")
    parser.add_argument("--url", required=True, help="Starting URL")
    parser.add_argument("--source-id", default="auto", help="Source identifier")
    parser.add_argument("--max-depth", type=int, default=3, help="Maximum menu depth")
    parser.add_argument("--timeout", type=int, default=10000, help="Page load timeout (ms)")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between page loads (seconds)")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--cdp-port", type=int, default=9222, help="Chrome CDP port")
    parser.add_argument("--max-items-per-menu", type=int, default=100, help="Max items to click per menu")
    parser.add_argument("--skip-same-url", action="store_true", help="Skip clicking if URL hasn't changed")
    return parser.parse_args()

async def get_top_level_menu_items(page) -> list:
    """Get all top-level menu items from the current page."""
    return await page.evaluate(get_menu_js)

async def get_all_visible_menu_items(page) -> list:
    """Get all visible menu items (including expanded sub-menus)."""
    return await page.evaluate(get_all_menus_js)

async def click_menu_item(page, text: str) -> bool:
    """Click a menu item by its visible text."""
    return await page.evaluate(click_by_text_js, text)

async def get_current_url_info(page) -> dict:
    """Get current page URL and title."""
    return await page.evaluate("""
    () => ({
        url: window.location.href,
        title: document.title,
        path: window.location.pathname
    })""")

async def traverse_submenu(page, parent_item: dict, depth: int, max_depth: int, visited_urls: set) -> list:
    """Recursively traverse a submenu."""
    discovered = []
    
    if depth > max_depth:
        logger.info(f"  Max depth reached ({max_depth}), skipping")
        return discovered
    
    # Wait for sub-menu to appear
    await asyncio.sleep(0.5)
    
    # Get sub-menu items
    sub_items = await page.evaluate(get_submenus_js, parent_item.get("text", ""))
    
    if not sub_items:
        logger.info(f"  No sub-items for '{parent_item.get('text', '')}'")
        return discovered
    
    logger.info(f"  Found {len(sub_items)} sub-items for '{parent_item.get('text', '')}'")
    
    for sub_item in sub_items[:100]:  # Limit to prevent infinite loops
        item_text = sub_item.get("text", "")
        item_url = sub_item.get("href", "")
        
        if not item_text or item_text.strip() in ["展开", "收起", "更多"]:
            continue
        
        # Try to click and load the page
        try:
            current_info = await get_current_url_info(page)
            old_url = current_info["url"]
            
            clicked = await click_menu_item(page, item_text)
            if not clicked:
                logger.debug(f"    Could not click '{item_text}'")
                continue
            
            # Wait for page to settle
            await asyncio.sleep(1.5)
            
            new_info = await get_current_url_info(page)
            new_url = new_info["url"]
            
            if new_url == old_url and not item_url:
                # URL didn't change, might be a popup/modal
                logger.debug(f"    URL unchanged after clicking '{item_text}'")
                continue
            
            page_key = new_url or item_url or f"popup:{item_text}"
            if page_key in visited_urls:
                logger.debug(f"    Already visited: {page_key}")
                continue
            
            visited_urls.add(page_key)
            
            page_obj = DiscoveredPage(
                url=new_url or item_url,
                title=new_info["title"],
                depth=depth + 1,
                parent_url=old_url,
                parent_label=item_text,
                loaded=True
            )
            
            discovered.append(asdict(page_obj))
            logger.info(f"    Discovered: {item_text} -> {page_obj.url} ({page_obj.title})")
            
            # Recurse into this page's sub-menus
            sub_discovered = await traverse_submenu(
                page, {"text": item_text, "href": page_obj.url},
                depth + 1, max_depth, visited_urls
            )
            discovered.extend(sub_discovered)
            
        except Exception as e:
            logger.error(f"    Error clicking '{item_text}': {e}")
            continue
    
    return discovered

async def main():
    args = parse_args()
    
    logger.info(f"Explorer Fabric — Autonomous Navigator")
    logger.info(f"  URL: {args.url}")
    logger.info(f"  Max Depth: {args.max_depth}")
    logger.info(f"  Timeout: {args.timeout}ms")
    logger.info(f"  Delay: {args.delay}s")
    logger.info("")
    
    # Connect to Chrome
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(
            f'http://localhost:{args.cdp_port}'
        )
        
        # Find or create a target tab
        targets = browser.ws.connections[0].loop.create_task(
            browser.contexts[0].browser.pages
        )
        pages = await targets
        
        if not pages:
            logger.error("No pages found. Make sure Chrome is running with --remote-debugging-port=9222")
            return
        
        # Use the first page (or the one with our URL)
        target_page = None
        for page in pages:
            if args.url in page.url:
                target_page = page
                break
        
        if not target_page:
            target_page = pages[0]
        
        logger.info(f"Using page: {target_page.url}")
        page = target_page
        
        visited_urls = set()
        all_discovered = []
        menus_traversed = []
        errors = []
        
        # Step 1: Get initial navigation state
        logger.info("Step 1: Capturing initial navigation state...")
        initial_info = await get_current_url_info(page)
        initial_url = initial_info["url"]
        visited_urls.add(initial_url)
        
        initial_page = DiscoveredPage(
            url=initial_url,
            title=initial_info["title"],
            depth=0,
            loaded=True
        )
        all_discovered.append(asdict(initial_page))
        
        # Step 2: Get top-level menu items
        logger.info("Step 2: Discovering top-level menus...")
        top_menus = await get_top_level_menu_items(page)
        logger.info(f"Found {len(top_menus)} top-level menus")
        
        for menu in top_menus:
            menu_text = menu.get("text", "")
            menu_url = menu.get("href", "")
            
            if not menu_text or menu_text.strip() in ["展开", "收起", "更多", ""]:
                continue
            
            logger.info(f"Exploring menu: {menu_text}")
            
            # Store menu traversal info
            menus_traversed.append({
                "text": menu_text,
                "url": menu_url,
                "depth": 0,
                "children_found": True
            })
            
            # Try to click to load the page
            try:
                old_url = await get_current_url_info(page)
                
                clicked = await click_menu_item(page, menu_text)
                if not clicked:
                    logger.warning(f"  Could not click '{menu_text}'")
                    continue
                
                await asyncio.sleep(args.delay)
                
                new_url_info = await get_current_url_info(page)
                new_url = new_url_info["url"]
                
                if new_url not in visited_urls:
                    visited_urls.add(new_url)
                    page_obj = DiscoveredPage(
                        url=new_url,
                        title=new_url_info["title"],
                        depth=1,
                        parent_url=old_url["url"],
                        parent_label=menu_text,
                        loaded=True
                    )
                    all_discovered.append(asdict(page_obj))
                    logger.info(f"  Loaded: {menu_text} -> {page_obj.url}")
                    
                    # Try to traverse sub-menus
                    sub_menus = await traverse_submenu(
                        page, menu, 1, args.max_depth, visited_urls
                    )
                    all_discovered.extend(sub_menus)
                else:
                    logger.info(f"  Already visited: {menu_text}")
                
                # Go back to start
                await page.goto(initial_url, wait_until="load")
                await asyncio.sleep(1)
                
            except Exception as e:
                error_msg = f"Error exploring '{menu_text}': {str(e)}"
                logger.error(error_msg)
                errors.append({"menu": menu_text, "error": str(e)})
                continue
        
        # Build result
        result = NavigationResult(
            start_url=args.url,
            discovered_pages=all_discovered,
            menus_traversed=menus_traversed,
            errors=errors,
            stats={
                "total_discovered": len(all_discovered),
                "unique_urls": len(visited_urls),
                "menus_explored": len(menus_traversed),
                "errors": len(errors),
                "max_depth_reached": max(
                    [p.get("depth", 0) for p in all_discovered], default=0
                ),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        )
        
        # Save result
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(asdict(result), f, indent=2, ensure_ascii=False)
        
        logger.info("")
        logger.info(f"Discovery complete!")
        logger.info(f"  Discovered pages: {result.stats['total_discovered']}")
        logger.info(f"  Unique URLs: {result.stats['unique_urls']}")
        logger.info(f"  Menus explored: {result.stats['menus_explored']}")
        logger.info(f"  Errors: {result.stats['errors']}")
        logger.info(f"  Max depth reached: {result.stats['max_depth_reached']}")
        logger.info(f"  Output: {output_path}")

# JavaScript functions to inject into browser context
get_menu_js = """
() => {
    const menus = [];
    // Look for common menu patterns
    const selectors = [
        '[class*="nav-menu"] a',
        '[class*="side-menu"] a',
        '[class*="left-menu"] a',
        '[class*="menu-list"] a',
        '.nav-item a',
        '.menu-item a',
        'ul[class*="menu"] a',
        'div[class*="menu"] > a',
        'aside a',
        'nav a'
    ];
    
    for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
            const text = el.textContent?.trim();
            const href = el.href || '';
            if (text && !text.includes('退出') && !text.includes('登出')) {
                menus.push({
                    text: text,
                    href: href,
                    tag: el.tagName,
                    className: el.className,
                    ariaHaspopup: el.getAttribute('aria-haspopup')
                });
            }
        });
    }
    
    return menus;
}
"""

get_all_menus_js = """
() => {
    const menus = [];
    document.querySelectorAll('a').forEach(el => {
        const text = el.textContent?.trim();
        const href = el.href || '';
        if (text && text.length < 50 && !text.includes('退出') && !text.includes('登出')) {
            menus.push({
                text: text,
                href: href,
                tag: el.tagName,
                className: el.className
            });
        }
    });
    return menus;
}
"""

click_by_text_js = """
(text, ) => {
    const els = document.querySelectorAll('a, button, [role="menuitem"], [class*="menu"] span, [class*="nav"] span');
    for (const el of els) {
        if (el.textContent?.trim() === text) {
            el.click();
            return true;
        }
    }
    return false;
}
"""

get_submenus_js = """
(parentText, ) => {
    const results = [];
    // Look for dropdown/expandable content near the parent
    const parentElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.trim() === parentText
    );
    
    for (const parent of parentElements) {
        // Check siblings and children for sub-items
        const siblings = parent.parentElement?.querySelectorAll('a, li a, span a');
        if (siblings) {
            siblings.forEach(el => {
                const text = el.textContent?.trim();
                const href = el.href || '';
                if (text && text !== parentText && !text.includes('退出') && !text.includes('登出')) {
                    results.push({
                        text: text,
                        href: href,
                        tag: el.tagName,
                        className: el.className
                    });
                }
            });
        }
        
        // Check for nested UL/OL
        const nestedLists = parent.parentElement?.querySelectorAll('ul a, ol a');
        if (nestedLists) {
            nestedLists.forEach(el => {
                const text = el.textContent?.trim();
                const href = el.href || '';
                if (text && text !== parentText && !results.find(r => r.text === text)) {
                    results.push({
                        text: text,
                        href: href,
                        tag: el.tagName,
                        className: el.className
                    });
                }
            });
        }
    }
    
    return results;
}
"""

if __name__ == "__main__":
    asyncio.run(main())
