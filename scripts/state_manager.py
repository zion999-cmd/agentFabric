#!/usr/bin/env python3
"""
Explorer Fabric — State Manager
Handles pagination, filter changes, and page state restoration during exploration.
Tracks URL parameters, form states, and DOM changes to ensure no data is missed.

Usage:
    python scripts/state_manager.py \\
        --url https://jdsz.jd.com/szweb/view/tradeAnalysis/tradeSummary.html \\
        --source-id jd_smart \\
        --output sources/jd_smart/snapshots/state_tracking.json \\
        --cdp-port 9222
"""

import argparse
import asyncio
import json
import logging
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class FormField:
    name: str
    type: str
    value: str
    placeholder: str = ""
    options: list = field(default_factory=list)
    is_active: bool = False

@dataclass
class PaginationState:
    current_page: int = 1
    total_pages: int = 1
    total_items: int = 0
    page_size: int = 20
    has_next: bool = False
    has_prev: bool = False

@dataclass
class FilterState:
    active_filters: list = field(default_factory=list)
    available_filters: list = field(default_factory=list)
    last_applied: Optional[str] = None

@dataclass
class PageSnapshot:
    url: str
    timestamp: str
    form_fields: list = field(default_factory=list)
    pagination: Optional[dict] = None
    filter_state: Optional[dict] = None
    dom_hash: str = ""
    table_count: int = 0
    metric_count: int = 0
    data_rows: int = 0

@dataclass
class StateResult:
    start_url: str
    snapshots: list = field(default_factory=list)
    state_transitions: list = field(default_factory=list)
    recommendations: list = field(default_factory=list)
    stats: dict = field(default_factory=dict)

def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — State Manager")
    parser.add_argument("--url", required=True, help="Page URL to analyze")
    parser.add_argument("--source-id", default="auto", help="Source identifier")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--cdp-port", type=int, default=9222, help="Chrome CDP port")
    parser.add_argument("--test-filters", action="store_true", help="Actually test filter changes")
    parser.add_argument("--test-pagination", action="store_true", help="Actually test pagination")
    return parser.parse_args()

async def capture_form_fields(page) -> list:
    """Extract all form fields and their states."""
    return await page.evaluate("""
    () => {
        const fields = [];
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.offsetParent !== null) { // Only visible elements
                const field = {
                    name: el.name || el.id || '',
                    type: el.type || el.tagName.toLowerCase(),
                    value: el.value || '',
                    placeholder: el.placeholder || '',
                    options: el.options ? Array.from(el.options).map(o => o.text) : [],
                    is_active: !el.disabled
                };
                fields.push(field);
            }
        });
        return fields;
    }
    """)

async def capture_pagination_state(page) -> dict:
    """Extract pagination controls and current state."""
    return await page.evaluate("""
    () => {
        const pagination = {
            current_page: 1,
            total_pages: 1,
            total_items: 0,
            page_size: 20,
            has_next: false,
            has_prev: false
        };
        
        // Look for common pagination patterns
        const pageElements = document.querySelectorAll('[class*="page"], [class*="pagination"], [class*="pager"]');
        pageElements.forEach(el => {
            const text = el.textContent;
            // Try to extract page numbers
            const pageNumMatch = text.match(/(\\d+)\\s*\\/\\s*(\\d+)/);
            if (pageNumMatch) {
                pagination.current_page = parseInt(pageNumMatch[1]);
                pagination.total_pages = parseInt(pageNumMatch[2]);
            }
            // Try to extract total items
            const totalMatch = text.match(/(\\d+)\\s*条/);
            if (totalMatch) {
                pagination.total_items = parseInt(totalMatch[1]);
            }
        });
        
        pagination.has_next = pagination.current_page < pagination.total_pages;
        pagination.has_prev = pagination.current_page > 1;
        
        return pagination;
    }
    """)

async def capture_dom_hash(page) -> str:
    """Generate a simple hash of the DOM structure for change detection."""
    return await page.evaluate("""
    () => {
        const elements = document.querySelectorAll('table, .metric-card, [class*="data-table"]');
        let hash = '';
        elements.forEach(el => {
            hash += el.outerHTML.substring(0, 100);
        });
        // Simple hash function
        let hashValue = 0;
        for (let i = 0; i < hash.length; i++) {
            const char = hash.charCodeAt(i);
            hashValue = ((hashValue << 5) - hashValue) + char;
            hashValue = hashValue & hashValue;
        }
        return Math.abs(hashValue).toString(16);
    }
    """)

async def capture_table_data(page) -> dict:
    """Extract table structure and data counts."""
    return await page.evaluate("""
    () => {
        const tables = {
            count: 0,
            metric_cards: 0,
            data_rows: 0
        };
        
        document.querySelectorAll('table').forEach(table => {
            tables.count++;
            const rows = table.querySelectorAll('tbody tr');
            tables.data_rows += rows.length;
        });
        
        document.querySelectorAll('[class*="metric"], [class*="card"], [class*="stat"]').forEach(card => {
            if (card.querySelector('span')?.textContent?.match(/\\d+/)) {
                tables.metric_cards++;
            }
        });
        
        return tables;
    }
    """)

async def test_filter_change(page, field: dict) -> bool:
    """Test changing a filter field and observe the effect."""
    try:
        # Get current URL
        current_url = page.url
        
        # Find and interact with the field
        selector = f'input[name="{field["name"]}"], select[name="{field["name"]}"]'
        element = await page.query_selector(selector)
        
        if not element:
            return False
        
        # Get original value
        original_value = await element.get_attribute("value")
        
        # Try to change the value
        if field["type"] == "select-one":
            # Select first option if available
            if field.get("options"):
                await element.select_option(value=field["options"][0])
        else:
            # Clear and type new value
            await element.fill("test")
        
        # Wait for any triggered events
        await asyncio.sleep(1)
        
        # Check if URL changed (indicates auto-submit)
        new_url = page.url
        url_changed = new_url != current_url
        
        # Restore original value
        if original_value:
            if field["type"] == "select-one":
                await element.select_option(value=original_value)
            else:
                await element.fill(original_value)
        
        return url_changed
        
    except Exception as e:
        logger.debug(f"Filter test error: {e}")
        return False

async def test_pagination(page, direction: str) -> bool:
    """Test pagination and return whether it changed."""
    try:
        current_url = page.url
        
        # Find pagination buttons
        if direction == "next":
            selector = '[class*="next"], [class*="page-next"], button:has-text(">")'
        else:
            selector = '[class*="prev"], [class*="page-prev"], button:has-text("<")'
        
        button = await page.query_selector(selector)
        if not button:
            return False
        
        await button.click()
        await asyncio.sleep(1)
        
        new_url = page.url
        return new_url != current_url
        
    except Exception as e:
        logger.debug(f"Pagination test error: {e}")
        return False

async def main():
    args = parse_args()
    
    logger.info(f"Explorer Fabric — State Manager")
    logger.info(f"  URL: {args.url}")
    logger.info(f"  Test Filters: {args.test_filters}")
    logger.info(f"  Test Pagination: {args.test_pagination}")
    logger.info("")
    
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(
            f'http://localhost:{args.cdp_port}'
        )
        
        pages = await browser.pages
        if not pages:
            logger.error("No pages found.")
            return
        
        target_page = None
        for page in pages:
            if args.url in page.url:
                target_page = page
                break
        
        if not target_page:
            target_page = pages[0]
        
        logger.info(f"Using page: {target_page.url}")
        
        # Initial state capture
        logger.info("Capturing initial state...")
        initial_snapshot = PageSnapshot(
            url=target_page.url,
            timestamp=datetime.now(timezone.utc).isoformat(),
            form_fields=await capture_form_fields(target_page),
            pagination=await capture_pagination_state(target_page),
            dom_hash=await capture_dom_hash(target_page),
            table_count=(await capture_table_data(target_page))["count"],
            metric_count=(await capture_table_data(target_page))["metric_cards"],
            data_rows=(await capture_table_data(target_page))["data_rows"]
        )
        
        snapshots = [asdict(initial_snapshot)]
        state_transitions = []
        recommendations = []
        
        # Test filters if requested
        if args.test_filters:
            logger.info("Testing filter changes...")
            for field in initial_snapshot.form_fields:
                if field.get("is_active") and field.get("name"):
                    url_changed = await test_filter_change(target_page, field)
                    if url_changed:
                        state_transitions.append({
                            "type": "filter_change",
                            "field": field["name"],
                            "effect": "url_changed"
                        })
                        recommendations.append(f"Filter '{field['name']}' triggers URL change — may support deep linking")
                    else:
                        state_transitions.append({
                            "type": "filter_change",
                            "field": field["name"],
                            "effect": "dom_update"
                        })
        
        # Test pagination if requested
        if args.test_pagination and initial_snapshot.pagination:
            logger.info("Testing pagination...")
            if initial_snapshot.pagination.get("has_next"):
                changed = await test_pagination(target_page, "next")
                if changed:
                    state_transitions.append({
                        "type": "pagination",
                        "direction": "next",
                        "effect": "page_changed"
                    })
                    recommendations.append("Pagination changes URL — supports deep linking and bookmarking")
                else:
                    state_transitions.append({
                        "type": "pagination",
                        "direction": "next",
                        "effect": "dom_update"
                    })
                    recommendations.append("Pagination updates DOM without URL change — may use AJAX")
        
        # Build result
        result = StateResult(
            start_url=args.url,
            snapshots=snapshots,
            state_transitions=state_transitions,
            recommendations=recommendations,
            stats={
                "total_snapshots": len(snapshots),
                "form_fields_found": len(initial_snapshot.form_fields),
                "pagination_detected": bool(initial_snapshot.pagination),
                "state_transitions": len(state_transitions),
                "recommendations": len(recommendations),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        )
        
        # Save result
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(asdict(result), f, indent=2, ensure_ascii=False)
        
        logger.info("")
        logger.info(f"State analysis complete!")
        logger.info(f"  Snapshots: {result.stats['total_snapshots']}")
        logger.info(f"  Form fields: {result.stats['form_fields_found']}")
        logger.info(f"  Pagination: {'detected' if result.stats['pagination_detected'] else 'not detected'}")
        logger.info(f"  State transitions: {result.stats['state_transitions']}")
        logger.info(f"  Recommendations: {result.stats['recommendations']}")
        logger.info(f"  Output: {output_path}")
        
        # Print recommendations
        if recommendations:
            logger.info("")
            logger.info("Recommendations:")
            for rec in recommendations:
                logger.info(f"  - {rec}")

if __name__ == "__main__":
    asyncio.run(main())
