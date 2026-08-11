#!/usr/bin/env python3
"""
Explorer Fabric — End-to-End Pipeline Runner
Runs the full exploration pipeline on an existing source.

Usage:
    python scripts/run_pipeline.py \
        --source-id jd_smart \
        --nav-data sources/jd_smart/snapshots/navigation_tree.json \
        --page-data sources/jd_smart/snapshots/all_pages_survey.json \
        --metrics-data sources/jd_smart/snapshots/metrics_extracted.json \
        --blueprint-output sources/jd_smart/blueprint.yaml \
        --presentation-output sources/jd_smart/presentation/
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None


def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Pipeline Runner")
    parser.add_argument("--source-id", required=True, help="Source identifier")
    parser.add_argument("--nav-data", required=True, help="Navigation tree JSON")
    parser.add_argument("--page-data", required=True, help="Page analysis JSON")
    parser.add_argument("--metrics-data", required=True, help="Metrics extraction JSON")
    parser.add_argument("--blueprint-output", required=True, help="Output blueprint YAML/JSON")
    parser.add_argument("--presentation-output", required=True, help="Output presentation directory")
    return parser.parse_args()


async def run_pipeline(args):
    print(f"Explorer Fabric — Pipeline Runner")
    print(f"  Source: {args.source_id}")
    print(f"  Nav Data: {args.nav_data}")
    print(f"  Page Data: {args.page_data}")
    print(f"  Metrics Data: {args.metrics_data}")
    print(f"  Blueprint Output: {args.blueprint_output}")
    print(f"  Presentation Output: {args.presentation_output}")
    print()
    
    # Step 1: Build blueprint
    print("Step 1: Building blueprint...")
    blueprint = build_blueprint_from_data(
        args.source_id,
        args.nav_data,
        args.page_data,
        args.metrics_data
    )
    
    # Save blueprint
    Path(args.blueprint_output).parent.mkdir(parents=True, exist_ok=True)
    if yaml:
        with open(args.blueprint_output, 'w') as f:
            yaml.dump(blueprint, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        print(f"  Saved YAML: {args.blueprint_output}")
    else:
        with open(args.blueprint_output, 'w') as f:
            json.dump(blueprint, f, indent=2, ensure_ascii=False)
        print(f"  Saved JSON: {args.blueprint_output}")
    
    # Step 2: Generate presentation
    print("\nStep 2: Generating presentation...")
    presentation_dir = Path(args.presentation_output)
    presentation_dir.mkdir(parents=True, exist_ok=True)
    
    generators = [
        ("01_navigation.md", generate_navigation_md),
        ("02_knowledge_graph.md", generate_knowledge_graph_md),
        ("03_metrics_dictionary.md", generate_metrics_dictionary_md),
        ("04_relationships.md", generate_relationships_md),
        ("05_acquisition_strategy.md", generate_acquisition_strategy_md),
    ]
    
    for filename, generator in generators:
        md_content = generator(blueprint)
        output_path = presentation_dir / filename
        with open(output_path, 'w') as f:
            f.write(md_content)
        print(f"  Generated: {output_path}")
    
    print("\nPipeline complete!")
    print(f"  Blueprint: {args.blueprint_output}")
    print(f"  Presentation: {args.presentation_output}/")
    print(f"  Datasets: {len(blueprint['datasets'])}")
    print(f"  Metrics: {len(blueprint['metrics_discovered'])}")
    print(f"  Relationships: {len(blueprint['relationships'])}")


def build_blueprint_from_data(source_id, nav_data_path, page_data_path, metrics_data_path):
    """Build blueprint from exploration data files."""
    with open(nav_data_path, 'r') as f:
        nav_data = json.load(f)
    with open(page_data_path, 'r') as f:
        page_data = json.load(f)
    with open(metrics_data_path, 'r') as f:
        metrics_data = json.load(f)
    
    # Build navigation
    top_level_menus = []
    sub_menus = {}
    
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
            {"type": "cdp_browser", "description": "Connect to existing Chrome instance via CDP", "reliable": True},
            {"type": "dom_extraction", "description": "Extract data from rendered DOM", "reliable": True},
            {"type": "xhr_capture", "description": "Capture XHR/Fetch responses", "reliable": True}
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
            "tech_stack": {},
            "authentication": {"method": "Cookie-based", "note": "Requires active session; explorer connects via CDP"},
            "shop_info": {}
        },
        "navigation": {
            "top_level_menus": top_level_menus,
            "sub_menus": sub_menus,
            "discovered_pages": []
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


def generate_navigation_md(blueprint):
    md = "# Navigation Graph\n\n"
    md += "## Top-Level Menus\n\n"
    md += "| Menu | URL | Has Data |\n"
    md += "|------|-----|----------|\n"
    for menu in blueprint.get('navigation', {}).get('top_level_menus', []):
        has_data = "✅" if menu.get('has_data') else "❌"
        md += f"| {menu['name']} | `{menu.get('url', '')}` | {has_data} |\n"
    md += "\n## Sub-Menus\n\n"
    for parent, children in blueprint.get('navigation', {}).get('sub_menus', {}).items():
        md += f"### {parent}\n\n"
        for child in children:
            md += f"- {child}\n"
        md += "\n"
    return md


def generate_knowledge_graph_md(blueprint):
    md = "# Business Knowledge Graph\n\n"
    md += "## Datasets Overview\n\n"
    md += "| Dataset ID | Name | Source Page | Grain | Rows |\n"
    md += "|------------|------|-------------|-------|------|\n"
    for ds in blueprint.get('datasets', []):
        md += f"| {ds['id']} | {ds['name']} | {ds['source_page']} | {ds['grain']} | {ds['row_count']} |\n"
    md += "\n## Dataset Field Details\n\n"
    for ds in blueprint.get('datasets', []):
        md += f"### {ds['id']} - {ds['name']}\n\n"
        md += "| Field |\n"
        md += "|-------|\n"
        for col in ds.get('columns', []):
            md += f"| {col} |\n"
        md += "\n"
    return md


def generate_metrics_dictionary_md(blueprint):
    md = "# Metrics Dictionary\n\n"
    md += "## Discovered Metrics\n\n"
    md += "| Metric Name | Page | CSS Class |\n"
    md += "|-------------|------|-----------|\n"
    for m in blueprint.get('metrics_discovered', []):
        md += f"| {m['name']} | {m['page']} | `{m.get('class', '')}` |\n"
    md += "\n## Dimensions & Filters\n\n"
    for dim in blueprint.get('dimensions_discovered', []):
        md += f"- **{dim['name']}** ({dim['type']}) — Page: {dim['page']}\n"
    md += "\n## Filters\n\n"
    for filt in blueprint.get('filters_discovered', []):
        md += f"- **{filt['name']}** ({filt['type']}) — Page: {filt['page']}\n"
    return md


def generate_relationships_md(blueprint):
    md = "# Relationships Graph\n\n"
    md += "## Cross-Dataset Metric Overlaps\n\n"
    md += "| Shared Metric | Pages | Confidence |\n"
    md += "|---------------|-------|------------|\n"
    for rel in blueprint.get('relationships', []):
        if rel.get('type') == 'metric_overlap':
            md += f"| {rel['shared_metric']} | {', '.join(rel['entities'])} | {rel['confidence']} |\n"
    md += "\n## Business Entity Hierarchies\n\n"
    for rel in blueprint.get('relationships', []):
        if rel.get('type') == 'hierarchy':
            md += f"### {rel['description']}\n\n"
            md += f"- Entity Type: `{rel.get('entity_type', '')}`\n"
            md += f"- Datasets: {', '.join(rel['entities'])}\n"
            md += f"- Confidence: {rel['confidence']}\n\n"
    return md


def generate_acquisition_strategy_md(blueprint):
    md = "# Acquisition Strategy\n\n"
    md += "## Collection Methods\n\n"
    md += "| Method | Description | Reliable |\n"
    md += "|--------|-------------|----------|\n"
    for method in blueprint.get('acquisition', {}).get('methods', []):
        reliable = "✅" if method.get('reliable') else "⚠️"
        md += f"| {method['type']} | {method.get('description', '')} | {reliable} |\n"
    md += "\n## Recommended Frequencies\n\n"
    md += "| Dataset | Frequency |\n"
    md += "|---------|-----------|\n"
    for freq, rate in blueprint.get('acquisition', {}).get('recommended_frequency', {}).items():
        md += f"| {freq} | {rate} |\n"
    return md


async def main():
    args = parse_args()
    await run_pipeline(args)


if __name__ == "__main__":
    asyncio.run(main())
