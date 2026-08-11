#!/usr/bin/env python3
"""
Test script to verify if modifying date selector triggers historical data load.
"""

import asyncio
import json
from datetime import datetime, timedelta


async def test_historical_date():
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

        # Navigate to trade page
        await sz_page.goto(
            'https://jdsz.jd.com/szweb/view/tradeAnalysis/tradeSummary.html',
            wait_until='domcontentloaded', timeout=15000)
        await asyncio.sleep(2)

        # Capture responses
        responses = []

        async def on_response(response):
            url = response.url
            if 'szgateway.jd.com' in url and 'getSummary' in url:
                try:
                    body = await response.text()
                    parsed = json.loads(body)
                    responses.append({
                        'url': url,
                        'status': response.status,
                        'body': parsed.get('body', parsed),
                    })
                except Exception:
                    pass

        sz_page.on('response', on_response)

        # Try to modify date selector
        test_date = '2026-01-01'
        compare_date = '2025-12-25'

        result = await sz_page.evaluate('''
            (params) => {
                const { date, compareDate } = params;
                
                // Log all date-related elements
                const dateElements = document.querySelectorAll('input, select, [class*="date"], [class*="time"]');
                console.log(`Found ${dateElements.length} date-related elements`);
                
                for (const el of dateElements) {
                    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                        console.log(`Element: ${el.type || 'unknown'}, value: "${el.value}", class: "${el.className}"`);
                    }
                }
                
                return { found: dateElements.length };
            }
        ''', {'date': test_date, 'compareDate': compare_date})

        print(f"Found {result['found']} date-related elements")

        # Wait for API responses
        await asyncio.sleep(5)

        sz_page.remove_listener('response', on_response)

        print(f"\nCaptured {len(responses)} getSummary responses")
        for i, resp in enumerate(responses):
            print(f"  Response {i+1}:")
            print(f"    URL: {resp['url'][:100]}...")
            body = resp['body']
            if isinstance(body, dict):
                data = body.get('data', {})
                if isinstance(data, dict):
                    print(f"    Data keys: {list(data.keys())[:5]}")
                elif isinstance(data, list):
                    print(f"    Data items: {len(data)}")
                    if data:
                        print(f"    First item: {json.dumps(data[0], ensure_ascii=False)[:200]}")

        await browser.close()


if __name__ == '__main__':
    asyncio.run(test_historical_date())
