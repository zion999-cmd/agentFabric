#!/usr/bin/env python3
"""
Explorer Fabric — Page Analyzer
Analyzes a single page's DOM structure, extracts metrics, tables, filters, and components.

Usage:
    python scripts/analyze_page.py \
        --url https://jdsz.jd.com/szweb/view/tradeAnalysis/tradeSummary.html \
        --source-id jd_smart \
        --page-name 交易概况 \
        --cdp-port 9222 \
        --output sources/jd_smart/snapshots/analysis_trade.json

Configurable via:
    --cdp-port: Chrome CDP port (default: 9222)
    --timeout: Page load timeout in ms (default: 15000)
    --wait-after: Seconds to wait after page load (default: 3)
    --extract-jmt-components: Whether to extract JD Smart-specific components
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Page Analyzer")
    parser.add_argument("--url", required=True, help="Page URL to analyze")
    parser.add_argument("--source-id", required=True, help="Source identifier (e.g., jd_smart)")
    parser.add_argument("--page-name", required=True, help="Human-readable page name")
    parser.add_argument("--cdp-port", type=int, default=9222, help="Chrome CDP port")
    parser.add_argument("--timeout", type=int, default=15000, help="Page load timeout (ms)")
    parser.add_argument("--wait-after", type=float, default=3.0, help="Seconds to wait after load")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    parser.add_argument("--extract-jmt", action="store_true", help="Extract JD Smart-specific components")
    parser.add_argument("--screenshot", action="store_true", help="Take screenshot and save")
    return parser.parse_args()


async def connect_browser(cdp_port):
    """Connect to existing Chrome via CDP."""
    from playwright.async_api import async_playwright
    pw = await async_playwright().start()
    browser = await pw.chromium.connect_over_cdp(f"http://localhost:{cdp_port}")
    return pw, browser


async def analyze_page(url, source_id, page_name, cdp_port, timeout, wait_after, extract_jmt, take_screenshot):
    """Analyze a single page."""
    pw, browser = await connect_browser(cdp_port)
    
    try:
        # Find or navigate to the target page
        target_page = None
        for page in browser.contexts[0].pages:
            if url in page.url:
                target_page = page
                break
        
        if not target_page:
            # Navigate to the URL
            context = browser.contexts[0]
            target_page = await context.new_page()
            await target_page.goto(url, wait_until='domcontentloaded', timeout=timeout)
        
        await asyncio.sleep(wait_after)
        
        # Load the JS analyzer functions
        js_path = os.path.join(os.path.dirname(__file__), 'page_analyzer.js')
        with open(js_path, 'r') as f:
            js_code = f.read()
        await target_page.add_init_script(js_code)
        
        # Extract page structure
        structure = await target_page.evaluate(extractPageStructure)
        
        # Extract JD Smart components if requested
        jmt_components = None
        if extract_jmt:
            jmt_components = await target_page.evaluate(extractJMTComponents)
        
        # Extract frame info
        frame_info = await target_page.evaluate(extractFrameInfo)
        
        # Take screenshot if requested
        screenshot_path = None
        if take_screenshot:
            output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'sources', source_id, 'snapshots', 'screenshots')
            os.makedirs(output_dir, exist_ok=True)
            safe_name = page_name.replace('/', '_').replace('\\', '_')
            screenshot_path = os.path.join(output_dir, f"page_{safe_name}.png")
            await target_page.screenshot(path=screenshot_path, full_page=True)
        
        # Build result
        result = {
            "source_id": source_id,
            "page_name": page_name,
            "url": url,
            "analysis_time": datetime.now(timezone.utc).isoformat(),
            "structure": structure,
            "frames": frame_info,
            "jmt_components": jmt_components,
            "screenshot_path": screenshot_path
        }
        
        return result
    
    finally:
        await browser.close()
        await pw.stop()


async def main():
    args = parse_args()
    
    print(f"Explorer Fabric — Page Analyzer")
    print(f"  Source: {args.source_id}")
    print(f"  Page: {args.page_name}")
    print(f"  URL: {args.url}")
    print(f"  CDP Port: {args.cdp_port}")
    print(f"  Output: {args.output}")
    print()
    
    result = await analyze_page(
        args.url,
        args.source_id,
        args.page_name,
        args.cdp_port,
        args.timeout,
        args.wait_after,
        args.extract_jmt,
        args.screenshot
    )
    
    # Ensure output directory exists
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    
    # Write output
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"Page analysis complete:")
    print(f"  Title: {result['structure']['title']}")
    print(f"  Sections: {len(result['structure']['sections'])}")
    for s in result['structure']['sections'][:5]:
        print(f"    H{s['level']}: {s['text']}")
    print(f"  Metrics: {len(result['structure']['metrics'])}")
    for m in result['structure']['metrics'][:5]:
        print(f"    [{m['className'][:30]}] = {m['value']}")
    print(f"  Tables: {len(result['structure']['tables'])}")
    for t in result['structure']['tables'][:3]:
        print(f"    T[{t['index']}]: headers={t['headers'][:3]}, rows={t['rowCount']}")
    print(f"  Filters: {len(result['structure']['filters'])}")
    print(f"  Buttons: {len(result['structure']['buttons'])}")
    if result['jmt_components']:
        print(f"  JMT Components: {len(result['jmt_components']['links'])} links, {len(result['jmt_components']['cards'])} cards, {len(result['jmt_components']['tables'])} tables")
    if result['screenshot_path']:
        print(f"  Screenshot: {result['screenshot_path']}")
    print(f"  Saved to: {args.output}")


if __name__ == "__main__":
    asyncio.run(main())
