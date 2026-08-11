#!/usr/bin/env python3
"""
Historical data collector for JD Shangzhi.
Uses CDP to navigate to each page with date parameters in the URL.

This script:
1. Connects to Chrome via CDP
2. For each date, navigates to all pages with date parameters in the URL
3. Captures API responses
4. Persists to SQLite

Usage:
  python scripts/collect_jd_historical.py --cdp-port 9222 --from 2026-01-01 --to 2026-07-12 --db data/agentfabric.db
  python scripts/collect_jd_historical.py --cdp-port 9222 --from 2026-01-01 --to 2026-07-12 --db data/agentfabric.db --batch-size 30
"""

import argparse
import asyncio
import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path


# Define all pages to visit
PAGES_TO_VISIT = [
    {'name': '首页', 'url': '/szweb/view/index/home.html', 'params': 'date={date}&compareDate={compare_date}'},
    {'name': '交易分析', 'url': '/szweb/view/tradeAnalysis/tradeSummary.html', 'params': 'date={date}&compareDate={compare_date}'},
    {'name': '流量分析', 'url': '/szweb/view/flowSummary/flowAnalysis.html', 'params': 'date={date}&compareDate={compare_date}'},
    {'name': '服务分析', 'url': '/szweb/view/service/serviceSummary.html', 'params': 'date={date}&compareDate={compare_date}'},
    {'name': '行业分析', 'url': '/szweb/view/industry/industrySummary.html', 'params': 'date={date}&compareDate={compare_date}'},
    {'name': '商品分析', 'url': '/szweb/view/productAnalysis/productAnalysis.html', 'params': 'date={date}&compareDate={compare_date}'},
]


async def collect_and_persist(cdp_port: int, from_date: str, to_date: str,
                               db_path: str, batch_size: int = 30):
    """Collect historical JD data via CDP and persist to SQLite."""
    from playwright.async_api import async_playwright
    import sqlite3

    # Parse date range
    start = datetime.strptime(from_date, '%Y-%m-%d')
    end = datetime.strptime(to_date, '%Y-%m-%d')
    dates = []
    d = start
    while d <= end:
        dates.append(d.strftime('%Y-%m-%d'))
        d += timedelta(days=1)

    print(f"[HIST] Collecting {len(dates)} days of data ({from_date} to {to_date})")
    print(f"[HIST] Batch size: {batch_size} days per batch")

    # Connect to Chrome via CDP
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(f'http://127.0.0.1:{cdp_port}')
        pages = browser.contexts[0].pages

        # Find existing 商智 page or open one
        sz_page = None
        for pg in pages:
            if 'sz.jd.com' in pg.url or 'jdsz.jd.com' in pg.url:
                sz_page = pg
                break

        if not sz_page:
            print("[HIST] Opening 商智 home page...")
            ctx = browser.contexts[0]
            sz_page = await ctx.new_page()
            await sz_page.goto('https://jdsz.jd.com/szweb/view/index/home.html',
                             wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(3)

        print(f"[HIST] Using page: {sz_page.url[:80]}")

        # Connect to SQLite
        conn = sqlite3.connect(db_path)
        conn.execute('PRAGMA journal_mode=WAL')
        cur = conn.cursor()

        # Ensure tables exist
        cur.executescript('''
            CREATE TABLE IF NOT EXISTS jd_raw_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_id TEXT NOT NULL, dataset_name TEXT NOT NULL,
                source_page TEXT NOT NULL, row_index INTEGER NOT NULL,
                fields TEXT NOT NULL, collected_at TEXT NOT NULL, data_date TEXT NOT NULL,
                UNIQUE(dataset_id, source_page, row_index, data_date)
            );
            CREATE TABLE IF NOT EXISTS jd_collection_runs (
                run_id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, run_type TEXT NOT NULL,
                date_range_start TEXT NOT NULL, date_range_end TEXT NOT NULL,
                datasets_collected TEXT NOT NULL, total_rows INTEGER NOT NULL,
                status TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS jd_dataset_metadata (
                dataset_id TEXT PRIMARY KEY, dataset_name TEXT NOT NULL, grain TEXT,
                blueprint_version TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS jd_metric_timeseries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_id TEXT NOT NULL, entity_id TEXT NOT NULL, entity_name TEXT NOT NULL,
                metric_name TEXT NOT NULL, metric_value REAL NOT NULL, data_date TEXT NOT NULL,
                collected_at TEXT NOT NULL,
                UNIQUE(dataset_id, entity_id, metric_name, data_date)
            );
        ''')

        # Process dates in batches
        total_batches = (len(dates) + batch_size - 1) // batch_size
        batch_num = 0
        total_rows = 0
        total_metrics = 0
        datasets_seen = set()

        for batch_start in range(0, len(dates), batch_size):
            batch_dates = dates[batch_start:batch_start + batch_size]
            batch_num += 1
            print(f"\n[HIST] Batch {batch_num}/{total_batches}: {len(batch_dates)} days")

            for date_str in batch_dates:
                try:
                    # Calculate compare date (same day last week)
                    dt = datetime.strptime(date_str, '%Y-%m-%d')
                    compare_dt = dt - timedelta(days=7)
                    compare_date = compare_dt.strftime('%Y-%m-%d')

                    # Visit each page
                    for page_info in PAGES_TO_VISIT:
                        url = f"https://jdsz.jd.com{page_info['url']}?{page_info['params'].format(date=date_str, compare_date=compare_date)}"
                        
                        # Capture responses during navigation
                        responses = []
                        
                        async def on_response(response):
                            resp_url = response.url
                            if 'szgateway.jd.com' in resp_url:
                                try:
                                    body = await response.text()
                                    parsed = json.loads(body)
                                    responses.append({
                                        'url': resp_url,
                                        'status': response.status,
                                        'body': parsed.get('body', parsed),
                                        'header': parsed.get('header', {}),
                                    })
                                except Exception:
                                    pass
                        
                        # Set up response capture before navigation
                        sz_page.on('response', on_response)
                        
                        # Navigate to the page
                        await sz_page.goto(url, wait_until='domcontentloaded', timeout=15000)
                        await asyncio.sleep(3)  # Wait for SPA data loading
                        
                        # Remove listener
                        sz_page.remove_listener('response', on_response)
                        
                        # Persist captured responses to SQLite
                        now = time.strftime('%Y-%m-%dT%H:%M:%SZ')
                        dataset_names = {
                            'getSummary': '交易概况', 'getTrend': '趋势数据', 'getProductTop': '热销商品排行榜',
                            'getFlowAnalysisData': '流量分析', 'getProductAnalysisData': '商品分析',
                            'getBrandTable': '品牌构成', 'getServiceSummary': '体验概况',
                            'getServiceTrend': '体验趋势', 'getFlowTrend': '流量趋势',
                            'getFlowDetail': '流量明细',
                        }

                        for resp in responses:
                            body = resp.get('body', {})
                            if not body or not isinstance(body, dict):
                                continue
                            data = body.get('data', [])
                            if not data or not isinstance(data, list):
                                continue

                            api_name = resp['url'].split('/')[-1].split('?')[0].replace('.ajax', '')
                            if not api_name:
                                api_name = 'unknown'
                                
                            dataset_id = api_name
                            dataset_name = dataset_names.get(api_name, api_name)
                            datasets_seen.add(dataset_id)

                            for idx, item in enumerate(data):
                                if not isinstance(item, dict):
                                    continue

                                fields = {}
                                for k, v in item.items():
                                    if isinstance(v, (int, float)):
                                        fields[k] = v
                                    elif isinstance(v, str):
                                        cleaned = v.replace('\uffe5', '').replace(',', '').strip()
                                        try:
                                            fields[k] = float(cleaned)
                                        except ValueError:
                                            fields[k] = v
                                    else:
                                        fields[k] = str(v) if v is not None else None

                                cur.execute(
                                    'INSERT OR REPLACE INTO jd_raw_data '
                                    '(dataset_id, dataset_name, source_page, row_index, fields, collected_at, data_date) '
                                    'VALUES (?, ?, ?, ?, ?, ?, ?)',
                                    (dataset_id, dataset_name, page_info['name'], idx, json.dumps(fields, ensure_ascii=False), now, date_str))
                                total_rows += 1

                                for k, v in fields.items():
                                    if isinstance(v, (int, float)) and not k.endswith('##compare') and not k.endswith('##compareValue'):
                                        entity_id = str(item.get('sku_id') or item.get('rank', idx))
                                        entity_name = str(item.get('sku_id#name_cn', '') or item.get('name', ''))
                                        cur.execute(
                                            'INSERT OR REPLACE INTO jd_metric_timeseries '
                                            '(dataset_id, entity_id, entity_name, metric_name, metric_value, data_date, collected_at) '
                                            'VALUES (?, ?, ?, ?, ?, ?, ?)',
                                            (dataset_id, entity_id, entity_name, k, v, date_str, now))
                                        total_metrics += 1

                    print(f"  [HIST] {date_str} ✓ ({len(PAGES_TO_VISIT)} pages)", end='\r')
                except Exception as e:
                    print(f"  [HIST] {date_str} ✗ ({str(e)[:50]})", end='\r')

            print()  # New line after batch

        # Record collection run
        run_id = f'hist-{from_date.replace("-", "")}-to-{to_date.replace("-", "")}'
        cur.execute(
            'INSERT OR REPLACE INTO jd_collection_runs '
            '(run_id, shop_id, run_type, date_range_start, date_range_end, datasets_collected, total_rows, status, started_at, completed_at, created_at) '
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (run_id, 'jd_smart', 'full', from_date, to_date, json.dumps(list(datasets_seen)), total_rows, 'completed', now, now, now))

        conn.commit()
        conn.close()

        print(f"\n[HIST] Done.")
        print(f"  Total days processed: {len(dates)}")
        print(f"  Raw rows inserted: {total_rows}")
        print(f"  Metric points inserted: {total_metrics}")
        print(f"  Datasets: {len(datasets_seen)} ({', '.join(sorted(datasets_seen))})")

        await browser.close()


def main():
    parser = argparse.ArgumentParser(description='Collect JD Shangzhi historical data via CDP')
    parser.add_argument('--cdp-port', type=int, default=9222)
    parser.add_argument('--from', dest='from_date', type=str, default='2026-01-01',
                       help='Start date (YYYY-MM-DD)')
    parser.add_argument('--to', dest='to_date', type=str, default='2026-07-12',
                       help='End date (YYYY-MM-DD)')
    parser.add_argument('--db', type=str, default='data/agentfabric.db',
                       help='SQLite database path')
    parser.add_argument('--batch-size', type=int, default=30,
                       help='Days per batch (default: 30)')
    args = parser.parse_args()

    asyncio.run(collect_and_persist(args.cdp_port, args.from_date, args.to_date,
                                    args.db, args.batch_size))


if __name__ == '__main__':
    main()
