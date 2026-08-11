#!/usr/bin/env python3
"""
Advanced debug script to capture ALL network activity from JD Shangzhi SPA.
Uses CDP Network.enable to capture everything, including XHR, Fetch, WebSocket, etc.
"""

import asyncio
import json


async def debug_all_network():
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
        await asyncio.sleep(3)

        # Capture ALL network activity
        all_requests = []
        all_responses = []

        async def on_request(request):
            url = request.url
            if 'szgateway.jd.com' in url:
                all_requests.append({
                    'url': url,
                    'method': request.method,
                    'headers': request.headers,
                })

        async def on_response(response):
            url = response.url
            if 'szgateway.jd.com' in url:
                try:
                    body = await response.text()
                    all_responses.append({
                        'url': url,
                        'status': response.status,
                        'body': body,
                    })
                except Exception:
                    pass

        sz_page.on('request', on_request)
        sz_page.on('response', on_response)

        # Wait for initial data load
        await asyncio.sleep(5)

        sz_page.remove_listener('request', on_request)
        sz_page.remove_listener('response', on_response)

        print(f"\nCaptured {len(all_requests)} requests and {len(all_responses)} responses")
        
        if all_requests:
            print("\nRequests:")
            for req in all_requests:
                print(f"  {req['method']} {req['url'][:100]}...")
        
        if all_responses:
            print("\nResponses:")
            for resp in all_responses:
                print(f"  {resp['url'][:100]}...")
                try:
                    body = json.loads(resp['body'])
                    data = body.get('body', {}).get('data', [])
                    if isinstance(data, list):
                        print(f"    Data items: {len(data)}")
                        if data:
                            print(f"    First item: {json.dumps(data[0], ensure_ascii=False)[:200]}")
                except Exception:
                    print(f"    Body: {resp['body'][:200]}")

        # Now try to navigate to a different date
        print("\n--- Trying to navigate to different date ---")
        
        all_requests.clear()
        all_responses.clear()
        
        # Set up listeners again
        sz_page.on('request', on_request)
        sz_page.on('response', on_response)
        
        # Try to manually construct a URL with historical date parameter
        test_date = '2026-01-01'
        test_compare = '2025-12-25'
        
        # Navigate to the trade page with date parameter in URL
        await sz_page.goto(
            f'https://jdsz.jd.com/szweb/view/tradeAnalysis/tradeSummary.html?date={test_date}&compareDate={test_compare}',
            wait_until='domcontentloaded', timeout=15000)
        await asyncio.sleep(5)
        
        sz_page.remove_listener('request', on_request)
        sz_page.remove_listener('response', on_response)
        
        print(f"After URL change: {len(all_requests)} requests and {len(all_responses)} responses")
        
        if all_requests:
            print("\nNew Requests:")
            for req in all_requests:
                print(f"  {req['method']} {req['url'][:100]}...")
        
        if all_responses:
            print("\nNew Responses:")
            for resp in all_responses:
                print(f"  {resp['url'][:100]}...")
                try:
                    body = json.loads(resp['body'])
                    data = body.get('body', {}).get('data', [])
                    if isinstance(data, list):
                        print(f"    Data items: {len(data)}")
                        if data:
                            print(f"    First item: {json.dumps(data[0], ensure_ascii=False)[:200]}")
                except Exception:
                    print(f"    Body: {resp['body'][:200]}")

        await browser.close()


if __name__ == '__main__':
    asyncio.run(debug_all_network())
