#!/usr/bin/env python3
"""
Explorer Fabric — Blueprint Builder
Builds the canonical blueprint.yaml from exploration data.

Usage:
    python scripts/build_blueprint.py \
        --source-id jd_smart \
        --nav-data sources/jd_smart/snapshots/navigation_tree.json \
        --page-data sources/jd_smart/snapshots/all_pages_survey.json \
        --metrics-data sources/jd_smart/snapshots/metrics_extracted.json \
        --output sources/jd_smart/blueprint.yaml

Configurable via:
    --source-id: Source identifier (e.g., jd_smart)
    --nav-data: Navigation tree JSON
    --page-data: Page analysis JSON
    --metrics-data: Metrics extraction JSON
    --output: Output YAML file path
"""

import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Warning: PyYAML not installed. Blueprint will be saved as JSON.")
    yaml = None


def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Blueprint Builder")
    parser.add_argument("--source-id", required=True, help="Source identifier")
    parser.add_argument("--nav-data", required=True, help="Navigation tree JSON")
    parser.add_argument("--page-data", required=True, help="Page analysis JSON")
    parser.add_argument("--metrics-data", required=True, help="Metrics extraction JSON")
    parser.add_argument("--output", required=True, help="Output YAML/JSON file path")
    parser.add_argument("--shop-info", type=str, default="", help="Shop info JSON (optional)")
    parser.add_argument("--tech-stack", type=str, default="", help="Tech stack JSON (optional)")
    return parser.parse_args()


def build_blueprint(source_id, nav_data, page_data, metrics_data, shop_info="", tech_stack=""):
    """Build the canonical blueprint from exploration data."""
    
    # Parse nav_data
    if isinstance(nav_data, str):
        with open(nav_data, 'r') as f:
            nav_data = json.load(f)
    
    # Parse page_data
    if isinstance(page_data, str):
        with open(page_data, 'r') as f:
            page_data = json.load(f)
    
    # Parse metrics_data
    if isinstance(metrics_data, str):
        with open(metrics_data, 'r') as f:
            metrics_data = json.load(f)
    
    # Parse shop_info and tech_stack
    if isinstance(shop_info, str) and shop_info:
        with open(shop_info, 'r') as f:
            shop_info = json.load(f)
    else:
        shop_info = {}
    
    if isinstance(tech_stack, str) and tech_stack:
        with open(tech_stack, 'r') as f:
            tech_stack = json.load(f)
    else:
        tech_stack = {}
    
    # Build navigation
    top_level_menus = []
    sub_menus = {}
    discovered_pages = []
    
    if 'top_level' in nav_data:
        for menu in nav_data['top_level']:
            top_level_menus.append({
                "id": menu.get('text', '').lower().replace(' ', '_'),
                "name": menu.get('text', ''),
                "url": menu.get('href', ''),
                "has_data": menu.get('has_data', True)
            })
    
    if 'sub_menus' in nav_data:
        sub_menus = nav_data['sub_menus']
    
    # Build datasets from page analysis
    datasets = []
    metrics_discovered = []
    dimensions_discovered = []
    filters_discovered = []
    
    for page_item in page_data:
        if isinstance(page_item, dict) and 'data' in page_item:
            page_name = page_item.get('name', page_item.get('title', ''))
            data = page_item.get('data', {})
            
            if isinstance(data, dict):
                # Extract metrics from metric_cards
                for card in data.get('metric_cards', []):
                    if isinstance(card, dict):
                        metrics_discovered.append({
                            "name": card.get('label', card.get('class', '')),
                            "page": page_name,
                            "class": card.get('class', ''),
                            "contains_number": any(c.isdigit() for c in card.get('value', ''))
                        })
                
                # Extract tables (first row is usually header)
                table_rows = data.get('table_rows', [])
                for idx, rows in enumerate(table_rows):
                    if rows and isinstance(rows, list):
                        headers = rows[0] if isinstance(rows[0], list) else [rows[0]]
                        data_rows = rows[1:] if isinstance(rows[0], list) else rows
                        
                        datasets.append({
                            "id": f"{page_name}_table_{idx}",
                            "name": headers[0] if headers else f"{page_name} Table {idx}",
                            "source_page": page_name,
                            "grain": "unknown",
                            "columns": headers,
                            "row_count": len(data_rows),
                            "parent_class": "",
                            "table_class": ""
                        })
                
                # Extract dimensions from filter_controls
                for filt in data.get('filter_controls', []):
                    if isinstance(filt, dict):
                        dimensions_discovered.append({
                            "name": filt.get('placeholder', filt.get('label', '')),
                            "type": filt.get('type', 'text'),
                            "page": page_name
                        })
                
                # Extract buttons as filters
                for btn in data.get('buttons', []):
                    if isinstance(btn, dict) and btn.get('text') in ['查询', '重置', '导出', '下载', '刷新']:
                        filters_discovered.append({
                            "name": btn.get('text'),
                            "type": "button",
                            "page": page_name
                        })
    
    # Build relationships
    relationships = []
    
    # Cross-dataset relationships
    metric_names = set(m['name'] for m in metrics_discovered)
    for metric_name in metric_names:
        pages = [m['page'] for m in metrics_discovered if m['name'] == metric_name]
        if len(pages) > 1:
            relationships.append({
                "type": "metric_overlap",
                "description": f"Metric '{metric_name}' appears in multiple pages",
                "entities": pages,
                "shared_metric": metric_name,
                "confidence": 0.85
            })
    
    # Build acquisition strategy
    acquisition = {
        "strategy": "hybrid",
        "methods": [
            {
                "type": "cdp_browser",
                "description": "Connect to existing Chrome instance via CDP",
                "reliable": True
            },
            {
                "type": "dom_extraction",
                "description": "Extract data from rendered DOM",
                "reliable": True
            },
            {
                "type": "xhr_capture",
                "description": "Capture XHR/Fetch responses",
                "reliable": True
            }
        ],
        "recommended_frequency": {
            "trade_summary": "daily",
            "product_performance": "daily",
            "traffic_source": "daily",
            "industry_trend": "weekly",
            "service_metrics": "daily"
        }
    }
    
    # Build health status
    health = {
        "status": "discovering",
        "pages_discovered": len(page_data),
        "pages_with_data": sum(1 for p in page_data.values() if isinstance(p, dict) and 'structure' in p),
        "total_datasets": len(datasets),
        "total_metrics": len(metrics_discovered),
        "total_dimensions": len(dimensions_discovered),
        "total_filters": len(filters_discovered),
        "relationships_inferred": len(relationships),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    # Assemble blueprint
    blueprint = {
        "$schema": "https://agentfabric.dev/schemas/source-blueprint/v1",
        "source": {
            "id": source_id,
            "name": source_id.replace('_', ' ').title(),
            "display_name": source_id.replace('_', ' ').title(),
            "platform": source_id.split('_')[0] if '_' in source_id else source_id,
            "version": "1.0.0",
            "discovered_at": datetime.now(timezone.utc).isoformat(),
            "base_url": nav_data.get('start_url', ''),
            "tech_stack": tech_stack,
            "authentication": {
                "method": "Cookie-based",
                "note": "Requires active session; explorer connects via CDP"
            },
            "shop_info": shop_info
        },
        "navigation": {
            "top_level_menus": top_level_menus,
            "sub_menus": sub_menus,
            "discovered_pages": discovered_pages
        },
        "datasets": datasets,
        "metrics_discovered": metrics_discovered,
        "dimensions_discovered": dimensions_discovered,
        "filters_discovered": filters_discovered,
        "relationships": relationships,
        "acquisition": acquisition,
        "health": health
    }
    
    return blueprint


async def main():
    args = parse_args()
    
    print(f"Explorer Fabric — Blueprint Builder")
    print(f"  Source: {args.source_id}")
    print(f"  Nav Data: {args.nav_data}")
    print(f"  Page Data: {args.page_data}")
    print(f"  Metrics Data: {args.metrics_data}")
    print(f"  Output: {args.output}")
    print()
    
    blueprint = build_blueprint(
        args.source_id,
        args.nav_data,
        args.page_data,
        args.metrics_data,
        args.shop_info,
        args.tech_stack
    )
    
    # Ensure output directory exists
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    
    # Write output
    if yaml:
        with open(args.output, 'w') as f:
            yaml.dump(blueprint, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        print(f"Blueprint saved as YAML: {args.output}")
    else:
        with open(args.output, 'w') as f:
            json.dump(blueprint, f, indent=2, ensure_ascii=False)
        print(f"Blueprint saved as JSON: {args.output}")
    
    print(f"Blueprint summary:")
    print(f"  Datasets: {len(blueprint['datasets'])}")
    print(f"  Metrics: {len(blueprint['metrics_discovered'])}")
    print(f"  Dimensions: {len(blueprint['dimensions_discovered'])}")
    print(f"  Filters: {len(blueprint['filters_discovered'])}")
    print(f"  Relationships: {len(blueprint['relationships'])}")


if __name__ == "__main__":
    asyncio.run(main())
