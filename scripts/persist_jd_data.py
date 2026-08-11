#!/usr/bin/env python3
"""
Persist JD Shangzhi live data to SQLite.
Reads from collect_jd_data.py output and writes to jd-schema tables.
"""

import argparse
import json
import sqlite3
import time
from pathlib import Path


def persist(data_path: str, db_path: str):
    with open(data_path) as f:
        raw = json.load(f)

    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    # Create tables if not exist
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS jd_raw_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_id TEXT NOT NULL,
            dataset_name TEXT NOT NULL,
            source_page TEXT NOT NULL,
            row_index INTEGER NOT NULL,
            fields TEXT NOT NULL,
            collected_at TEXT NOT NULL,
            data_date TEXT NOT NULL,
            UNIQUE(dataset_id, source_page, row_index, data_date)
        );
        CREATE INDEX IF NOT EXISTS idx_raw_lookup
            ON jd_raw_data(dataset_id, source_page, row_index, data_date);

        CREATE TABLE IF NOT EXISTS jd_collection_runs (
            run_id TEXT PRIMARY KEY,
            shop_id TEXT NOT NULL,
            run_type TEXT NOT NULL,
            date_range_start TEXT NOT NULL,
            date_range_end TEXT NOT NULL,
            datasets_collected TEXT NOT NULL,
            total_rows INTEGER NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            completed_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jd_dataset_metadata (
            dataset_id TEXT PRIMARY KEY,
            dataset_name TEXT NOT NULL,
            grain TEXT,
            blueprint_version TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jd_metric_timeseries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_id TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            entity_name TEXT NOT NULL,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            data_date TEXT NOT NULL,
            collected_at TEXT NOT NULL,
            UNIQUE(dataset_id, entity_id, metric_name, data_date)
        );
    """)

    now = time.strftime('%Y-%m-%dT%H:%M:%SZ')
    rows_inserted = 0
    metrics_inserted = 0
    datasets = set()
    date_str = raw.get('collected_at', now)[:10]

    # Map API names to dataset names
    dataset_names = {
        'summary': '交易概况',
        'trend': '趋势数据',
        'productTop': '热销商品排行榜',
        'getFlowAnalysisData': '流量分析',
        'getProductAnalysisData': '商品分析',
        'getBrandTable': '品牌构成',
        'getServiceSummary': '体验概况',
        'getServiceTrend': '体验趋势',
        'getFlowTrend': '流量趋势',
        'getFlowDetail': '流量明细',
        'getProductTop': '商品流量排行',
    }

    for api_name, resp_info in raw.get('responses', {}).items():
        sample = resp_info.get('sample')
        if not sample:
            continue

        raw_body = sample.get('raw_body', {})
        header = raw_body.get('header', {})
        if header.get('code') != 0:
            continue

        body = raw_body.get('body', {})
        data = body.get('data', [])
        if not data or not isinstance(data, list):
            continue

        dataset_id = api_name
        dataset_name = dataset_names.get(api_name, api_name)
        datasets.add(dataset_id)

        # Insert each item as a raw row
        for idx, item in enumerate(data):
            if not isinstance(item, dict):
                continue

            # Extract numeric/string fields
            fields = {}
            for k, v in item.items():
                if isinstance(v, (int, float)):
                    fields[k] = v
                elif isinstance(v, str):
                    # Try to parse numbers from strings
                    cleaned = v.replace('￥', '').replace(',', '').strip()
                    try:
                        fields[k] = float(cleaned)
                    except ValueError:
                        fields[k] = v
                else:
                    fields[k] = str(v) if v is not None else None

            cur.execute(
                "INSERT OR REPLACE INTO jd_raw_data "
                "(dataset_id, dataset_name, source_page, row_index, fields, collected_at, data_date) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (dataset_id, dataset_name, 'API', idx, json.dumps(fields, ensure_ascii=False), now, date_str)
            )
            rows_inserted += 1

            # Extract metrics (numeric fields, skip identifiers)
            for k, v in fields.items():
                if isinstance(v, (int, float)) and not k.endswith('##compare') and not k.endswith('##compareValue'):
                    # Determine entity from item
                    entity_id = str(item.get('sku_id') or item.get('rank', idx))
                    entity_name = str(item.get('sku_id#name_cn', '') or item.get('name', ''))

                    cur.execute(
                        "INSERT OR REPLACE INTO jd_metric_timeseries "
                        "(dataset_id, entity_id, entity_name, metric_name, metric_value, data_date, collected_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (dataset_id, entity_id, entity_name, k, v, date_str, now)
                    )
                    metrics_inserted += 1

    # Seed dataset metadata
    for ds_id in datasets:
        ds_name = dataset_names.get(ds_id, ds_id)
        cur.execute(
            "INSERT OR REPLACE INTO jd_dataset_metadata "
            "(dataset_id, dataset_name, grain, blueprint_version, created_at, updated_at) "
            "VALUES (?, ?, ?, '1.0.0', ?, ?)",
            (ds_id, ds_name, 'api_response', now, now)
        )

    # Record run
    run_id = f'jd-{date_str.replace("-", "")}-{int(time.time())}'
    cur.execute(
        "INSERT INTO jd_collection_runs "
        "(run_id, shop_id, run_type, date_range_start, date_range_end, "
        " datasets_collected, total_rows, status, started_at, completed_at, created_at) "
        "VALUES (?, 'jd_smart', 'snapshot', ?, ?, ?, ?, 'completed', ?, ?, ?)",
        (run_id, date_str, date_str, json.dumps(list(datasets)), rows_inserted, now, now, now)
    )

    conn.commit()
    conn.close()

    print(f"Persisted to {db_path}:")
    print(f"  Raw rows: {rows_inserted}")
    print(f"  Metric points: {metrics_inserted}")
    print(f"  Datasets: {len(datasets)} ({', '.join(sorted(datasets))})")
    print(f"  Date: {date_str}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', '-i', default='data/jd_live_data.json')
    parser.add_argument('--db', '-d', default='./data/agentfabric.db')
    args = parser.parse_args()
    persist(args.input, args.db)


if __name__ == '__main__':
    main()
