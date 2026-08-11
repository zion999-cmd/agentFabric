#!/usr/bin/env python3
"""
Explorer Fabric — Metric Extractor
Extracts and categorizes metrics from analyzed page data.

Usage:
    python scripts/extract_metrics.py \
        --input sources/jd_smart/snapshots/all_pages_survey.json \
        --source-id jd_smart \
        --output sources/jd_smart/snapshots/metrics_extracted.json

Configurable via:
    --input: Input JSON file from page analysis
    --source-id: Source identifier
    --output: Output JSON file path
"""

import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Metric Extractor")
    parser.add_argument("--input", required=True, help="Input JSON file from page analysis")
    parser.add_argument("--source-id", required=True, help="Source identifier")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    return parser.parse_args()


def extract_and_categorize_metrics(page_data):
    """Extract and categorize metrics from page analysis data."""
    metrics = []
    tables = []
    dimensions = []
    filters = []
    
    # Extract metrics from structure
    structure = page_data.get('structure', {})
    
    for metric in structure.get('metrics', []):
        metrics.append({
            "name": metric.get('className', ''),
            "value": metric.get('value', ''),
            "css_class": metric.get('className', ''),
            "contains_number": any(c.isdigit() for c in metric.get('value', '')),
            "page": page_data.get('page_name', '')
        })
    
    # Extract tables
    for table in structure.get('tables', []):
        tables.append({
            "id": f"{page_data.get('page_name', '')}_table_{table.get('index', 0)}",
            "page": page_data.get('page_name', ''),
            "row_count": table.get('rowCount', 0),
            "header_count": table.get('headerCount', 0),
            "headers": table.get('headers', []),
            "first_row": table.get('firstRow', []),
            "css_class": table.get('className', ''),
            "tag": table.get('tag', '')
        })
    
    # Extract dimensions from filters
    for filt in structure.get('filters', []):
        dimensions.append({
            "name": filt.get('placeholder', ''),
            "type": filt.get('type', 'text'),
            "page": page_data.get('page_name', '')
        })
    
    # Extract buttons as action indicators
    for btn in structure.get('buttons', []):
        if btn.get('text') in ['查询', '重置', '导出', '下载', '刷新']:
            filters.append({
                "name": btn.get('text'),
                "type": "button",
                "page": page_data.get('page_name', '')
            })
    
    return {
        "metrics": metrics,
        "tables": tables,
        "dimensions": dimensions,
        "filters": filters
    }


async def main():
    args = parse_args()
    
    print(f"Explorer Fabric — Metric Extractor")
    print(f"  Source: {args.source_id}")
    print(f"  Input: {args.input}")
    print(f"  Output: {args.output}")
    print()
    
    # Load input data
    with open(args.input, 'r') as f:
        all_data = json.load(f)
    
    # Process each page
    results = {}
    total_metrics = 0
    total_tables = 0
    
    for page_name, page_data in all_data.items():
        if isinstance(page_data, dict) and 'structure' in page_data:
            extracted = extract_and_categorize_metrics(page_data)
            results[page_name] = extracted
            total_metrics += len(extracted['metrics'])
            total_tables += len(extracted['tables'])
    
    # Build output
    output = {
        "source_id": args.source_id,
        "extraction_time": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "pages_processed": len(results),
            "total_metrics": total_metrics,
            "total_tables": total_tables
        },
        "results": results
    }
    
    # Ensure output directory exists
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    
    # Write output
    with open(args.output, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Metric extraction complete:")
    print(f"  Pages processed: {len(results)}")
    print(f"  Total metrics: {total_metrics}")
    print(f"  Total tables: {total_tables}")
    print(f"  Saved to: {args.output}")


if __name__ == "__main__":
    asyncio.run(main())
