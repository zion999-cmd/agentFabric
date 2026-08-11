#!/usr/bin/env python3
"""
Explorer Fabric — Presentation Generator
Auto-generates Markdown presentation files from blueprint.yaml.

Usage:
    python scripts/generate_presentation.py \
        --blueprint sources/jd_smart/blueprint.yaml \
        --output-dir sources/jd_smart/presentation/

Configurable via:
    --blueprint: Input blueprint YAML/JSON file
    --output-dir: Output directory for generated Markdown files
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
    print("Warning: PyYAML not installed. Only JSON blueprints supported.")
    yaml = None


def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Presentation Generator")
    parser.add_argument("--blueprint", required=True, help="Input blueprint YAML/JSON file")
    parser.add_argument("--output-dir", required=True, help="Output directory for Markdown files")
    return parser.parse_args()


def load_blueprint(path):
    """Load blueprint from YAML or JSON."""
    if path.endswith('.yaml') or path.endswith('.yml'):
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    else:
        with open(path, 'r') as f:
            return json.load(f)


def generate_navigation_md(blueprint):
    """Generate navigation graph Markdown."""
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
    """Generate business knowledge graph Markdown."""
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
    """Generate metrics dictionary Markdown."""
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
    """Generate relationships graph Markdown."""
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
    """Generate acquisition strategy Markdown."""
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
    
    print(f"Explorer Fabric — Presentation Generator")
    print(f"  Blueprint: {args.blueprint}")
    print(f"  Output Dir: {args.output_dir}")
    print()
    
    # Load blueprint
    blueprint = load_blueprint(args.blueprint)
    
    # Generate presentation files
    generators = [
        ("01_navigation.md", generate_navigation_md),
        ("02_knowledge_graph.md", generate_knowledge_graph_md),
        ("03_metrics_dictionary.md", generate_metrics_dictionary_md),
        ("04_relationships.md", generate_relationships_md),
        ("05_acquisition_strategy.md", generate_acquisition_strategy_md),
    ]
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for filename, generator in generators:
        md_content = generator(blueprint)
        output_path = output_dir / filename
        with open(output_path, 'w') as f:
            f.write(md_content)
        print(f"Generated: {output_path}")
    
    print(f"\nPresentation generation complete: {len(generators)} files")


if __name__ == "__main__":
    asyncio.run(main())
