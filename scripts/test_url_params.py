#!/usr/bin/env python3
"""
Quick test to verify URL parameter method works for historical data.
"""

import asyncio
import json
from datetime import datetime, timedelta


async def test_url_params():
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp('http://127.0.0.1:9222')
        pages = browser.contexts[0].pages

        # Find existing 商智 page
        sz_page = None
        for pg in pages:
            if 'sz.jd.com' in pg.url or 'jdsz.jd.com' in pg.url:
                sz_page = pg
                break

        if not sz_page:
            print("No 商智 page found")
            return

        print(f"Using page: {sz_page.url[:80]}")

        # Capture responses
        all_responses = {}

        async def on_response(response):
            url = response.url
            if 'szgateway.jd.com' not in url:
                return
            try:
                body = await response.text()
                parsed = json.loads(body)
                api_name = url.split('/')[-1].split('?')[0].replace('.ajax', '')
                if not api_name:
                    api_name = 'unknown'
                if api_name not in all_responses:
                    all_responses[api_name] = []
                all_responses[api_name].append({
                    'url': url,
                    'status': response.status,
                    'body': parsed.get('body', parsed),
                })
            except Exception:
                pass

        sz_page.on('response', on_response)

        # Test with historical date
        test_date = '2026-01-01'
        compare_date = '2025-12-25'
        
        url = f'https://jdsz.jd.com/szweb/view/tradeAnalysis/tradeSummary.html?date={test_date}&compareDate={compare_date}'
        print(f"\nNavigating to: {url[:100]}...")
        
        await sz_page.goto(url, wait_until='domcontentloaded', timeout=15000)
        await asyncio.sleep(5)

        sz_page.remove_listener('response', on_response)

        print(f"\nCaptured {len(all_responses)} API responses")
        
        for api_name, responses in all_responses.items():
            print(f"  {api_name}: {len(responses)} responses")
            for resp in responses:
                body = resp['body']
                if isinstance(body, dict):
                    data = body.get('data', [])
                    if isinstance(data, list) and data:
                        print(f"    Data items: {len(data)}")
                        print(f"    First item: {json.dumps(data[0], ensure_ascii=False)[:200]}")

        await browser.close()


if __name__ == '__main__':
    asyncio.run(test_url_params())
