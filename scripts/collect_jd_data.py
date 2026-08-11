#!/usr/bin/env python3
"""
Explorer Fabric — JD Shangzhi Data Collector
Connects to Chrome CDP, navigates to each page in the blueprint,
captures API responses, and saves structured data.

Usage:
  python scripts/collect_jd_data.py --cdp-port 9222 --shop-id 11855009 --output data/jd_live_data.json
  python scripts/collect_jd_data.py --cdp-port 9222 --shop-id 11855009 --output data/jd_live_data.json --days 7
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path


async def collect_via_cdp(cdp_port: int, shop_id: str, output_path: str, days: int = 1):
    """Connect to Chrome, visit each blueprint page, capture API responses."""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(f'http://127.0.0.1:{cdp_port}')
        pages = browser.contexts[0].pages

        # Find or open 商智 page
        sz_page = None
        for pg in pages:
            if 'sz.jd.com' in pg.url or 'jdsz.jd.com' in pg.url:
                sz_page = pg
                break

        if not sz_page:
            print("[CDP] No 商智 page found, opening home...")
            ctx = browser.contexts[0]
            sz_page = await ctx.new_page()
            await sz_page.goto('https://jdsz.jd.com/szweb/view/index/home.html', wait_until='domcontentloaded')

        print(f"[CDP] Using page: {sz_page.url[:100]}")

        # Load blueprint to get known pages
        bp_path = Path('sources/jd_smart/blueprint.yaml')
        if bp_path.exists():
            import yaml
            with open(bp_path) as f:
                blueprint = yaml.safe_load(f)
            nav_pages = blueprint.get('navigation', {}).get('top_level_menus', [])
            sub_menus = blueprint.get('navigation', {}).get('sub_menus', {})
        else:
            nav_pages = []
            sub_menus = {}

        # Build list of page URLs to visit
        pages_to_visit = []
        for menu in nav_pages:
            if menu.get('has_data'):
                url = menu.get('url', '')
                if url:
                    pages_to_visit.append({'name': menu['name'], 'url': url, 'source': 'top_level'})

        # Add sub-menu pages (we'll need to click to reach them)
        for parent, subs in sub_menus.items():
            for sub in subs:
                pages_to_visit.append({'name': sub, 'parent': parent, 'source': 'submenu'})

        # Capture API responses
        api_responses = {}
        response_lock = asyncio.Lock()

        # Set up response capture on the page
        async def on_response(response):
            url = response.url
            if 'szgateway.jd.com' in url:
                try:
                    body = await response.text()
                    parsed = json.loads(body)
                    api_name = url.split('/')[-1].split('?')[0].replace('.ajax', '')
                    async with response_lock:
                        if api_name not in api_responses:
                            api_responses[api_name] = []
                        api_responses[api_name].append({
                            'url': url,
                            'status': response.status,
                            'header': parsed.get('header', {}),
                            'body_preview': str(parsed.get('body', {}))[:500] if parsed.get('body') else '',
                            'raw_body': parsed,
                        })
                except Exception:
                    pass

        sz_page.on('response', on_response)

        # Navigate to each top-level page
        visited_urls = set()
        for page_info in pages_to_visit:
            if page_info['source'] != 'top_level':
                continue
            url = page_info['url']
            if url in visited_urls:
                continue
            visited_urls.add(url)

            full_url = f'https://jdsz.jd.com{url}'
            print(f"[CDP] Navigating to {page_info['name']} ({url[:60]}...)")

            try:
                await sz_page.goto(full_url, wait_until='domcontentloaded', timeout=15000)
                # Wait for SPA data loading
                await asyncio.sleep(5)
                # Also wait for any AJAX calls
                await asyncio.sleep(3)
            except Exception as e:
                print(f"[CDP] Error loading {page_info['name']}: {e}")
                continue

        # Give time for any remaining AJAX
        await asyncio.sleep(3)

        # Stop capturing
        sz_page.remove_listener('response', on_response)

        # Save results
        output = {
            'collected_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'shop_id': shop_id,
            'cdp_port': cdp_port,
            'pages_visited': len(visited_urls),
            'api_endpoints': len(api_responses),
            'responses': {},
        }

        for api_name, responses in api_responses.items():
            output['responses'][api_name] = {
                'count': len(responses),
                'sample': responses[0] if responses else None,
            }

        # Save full data
        output_path_obj = Path(output_path)
        output_path_obj.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"\n[CDP] Done. Saved to {output_path}")
        print(f"  Pages visited: {len(visited_urls)}")
        print(f"  API endpoints captured: {len(api_responses)}")
        for api, info in output['responses'].items():
            print(f"    {api}: {info['count']} responses")

        await browser.close()


def main():
    parser = argparse.ArgumentParser(description='Collect JD Shangzhi data via CDP')
    parser.add_argument('--cdp-port', type=int, default=9222)
    parser.add_argument('--shop-id', type=str, default='11855009')
    parser.add_argument('--output', type=str, default='data/jd_live_data.json')
    parser.add_argument('--days', type=int, default=1, help='Days to look back (informational)')
    args = parser.parse_args()

    asyncio.run(collect_via_cdp(args.cdp_port, args.shop_id, args.output, args.days))


if __name__ == '__main__':
    main()
