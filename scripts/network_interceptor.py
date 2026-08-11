#!/usr/bin/env python3
"""
Explorer Fabric — Network Interceptor
Captures all XHR/Fetch requests and responses during page navigation.
Handles dynamic data loading, API endpoint discovery, and response schema extraction.

Usage:
    python scripts/network_interceptor.py \\
        --url https://jdsz.jd.com/szweb/view/index/home.html \\
        --source-id jd_smart \\
        --output sources/jd_smart/snapshots/network_capture.json \\
        --cdp-port 9222 \\
        --max-response-size 1048576
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
class NetworkRequest:
    url: str
    method: str
    request_headers: dict = field(default_factory=dict)
    response_status: Optional[int] = None
    response_headers: dict = field(default_factory=dict)
    response_body_preview: Optional[str] = None
    response_size: int = 0
    response_type: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    page_url: str = ""
    is_xhr: bool = False
    is_fetch: bool = False
    resource_type: str = ""

@dataclass
class NetworkResult:
    start_url: str
    requests: list = field(default_factory=list)
    api_endpoints: list = field(default_factory=list)
    response_schemas: dict = field(default_factory=dict)
    stats: dict = field(default_factory=dict)

def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Network Interceptor")
    parser.add_argument("--url", required=True, help="Starting URL")
    parser.add_argument("--source-id", default="auto", help="Source identifier")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--cdp-port", type=int, default=9222, help="Chrome CDP port")
    parser.add_argument("--max-response-size", type=int, default=1048576, help="Max response body to capture (bytes)")
    parser.add_argument("--include-static", action="store_true", help="Include static resources (CSS, JS, images)")
    parser.add_argument("--follow-redirects", action="store_true", help="Follow redirects and capture final URL")
    return parser.parse_args()

async def capture_network(page, args):
    """Capture all network requests during page load."""
    requests = []
    
    # Enable network domain
    await page._client.send('Network.enable')
    
    # Set up request/response handlers
    async def on_request(request):
        if not args.include_static:
            # Skip static resources
            resource_type = request.resource_type
            if resource_type in ['stylesheet', 'script', 'image', 'font', 'media', 'websocket']:
                return
        
        req_info = {
            "url": request.url,
            "method": request.method,
            "headers": dict(request.headers) if hasattr(request, 'headers') else {},
            "is_xhr": request.resource_type in ['xhr', 'fetch'],
            "is_fetch": request.resource_type == 'fetch',
            "resource_type": request.resource_type,
            "page_url": page.url
        }
        requests.append(req_info)
    
    async def on_response(response):
        if not requests:
            return
        
        # Match with last request
        if requests and not requests[-1].get("response_status"):
            requests[-1]["response_status"] = response.status
            requests[-1]["response_headers"] = dict(response.headers) if hasattr(response, 'headers') else {}
    
    # Inject interceptor script
    await page.evaluate("""
        // Intercept fetch
        const origFetch = window.fetch;
        window.fetch = async function(...args) {
            const url = args[0]?.url || args[0];
            const method = args[1]?.method || 'GET';
            window.__EXPLORER_FETCH__ = { url, method, timestamp: Date.now() };
            return origFetch.apply(this, args);
        };
        
        // Intercept XMLHttpRequest
        const origXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            window.__EXPLORER_XHR__ = { method, url, timestamp: Date.now() };
            return origXHROpen.apply(this, arguments);
        };
        
        const origXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;
            xhr.addEventListener('load', function() {
                window.__EXPLORER_XHR_RESPONSE__ = {
                    status: xhr.status,
                    response: typeof xhr.response === 'string' ? xhr.response.substring(0, 1000) : 'binary',
                    timestamp: Date.now()
                };
            });
            return origXHRSend.apply(this, arguments);
        };
    """)
    
    # Navigate and capture
    try:
        await page.goto(args.url, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)  # Wait for any delayed requests
    except Exception as e:
        logger.warning(f"Navigation error: {e}")
    
    # Collect intercepted data
    fetch_data = await page.evaluate("window.__EXPLORER_FETCH__ || null")
    xhr_data = await page.evaluate("window.__EXPLORER_XHR__ || null")
    xhr_response = await page.evaluate("window.__EXPLORER_XHR_RESPONSE__ || null")
    
    if fetch_data:
        requests.append({
            "url": fetch_data.get("url"),
            "method": fetch_data.get("method"),
            "is_fetch": True,
            "response": fetch_response
        })
    
    if xhr_data:
        requests.append({
            "url": xhr_data.get("url"),
            "method": xhr_data.get("method"),
            "is_xhr": True,
            "response": xhr_response
        })
    
    return requests

def extract_api_endpoints(requests):
    """Extract API endpoints from captured requests."""
    api_endpoints = []
    for req in requests:
        if req.get("is_xhr") or req.get("is_fetch") or req.get("resource_type") in ["xhr", "fetch"]:
            url = req.get("url", "")
            if any(keyword in url.lower() for keyword in ["api", "ajax", "query", "search", "list", "data"]):
                api_endpoints.append({
                    "url": url,
                    "method": req.get("method", "GET"),
                    "type": "xhr" if req.get("is_xhr") else "fetch"
                })
    return api_endpoints

def extract_response_schemas(requests):
    """Try to extract JSON response schemas."""
    schemas = {}
    for req in requests:
        url = req.get("url", "")
        response = req.get("response")
        
        if response and isinstance(response, dict) and "response" in response:
            resp_body = response.get("response", "")
            if resp_body.startswith("{") or resp_body.startswith("["):
                try:
                    parsed = json.loads(resp_body)
                    # Extract top-level keys
                    if isinstance(parsed, dict):
                        schemas[url] = {
                            "type": "object",
                            "keys": list(parsed.keys())[:20],
                            "sample": str(parsed)[:500]
                        }
                    elif isinstance(parsed, list):
                        schemas[url] = {
                            "type": "array",
                            "length": len(parsed),
                            "first_item_keys": list(parsed[0].keys())[:20] if parsed and isinstance(parsed[0], dict) else [],
                            "sample": str(parsed[:3])[:500]
                        }
                except json.JSONDecodeError:
                    pass
    return schemas

async def main():
    args = parse_args()
    
    logger.info(f"Explorer Fabric — Network Interceptor")
    logger.info(f"  URL: {args.url}")
    logger.info(f"  Max Response Size: {args.max_response_size}")
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
        
        # Capture network
        logger.info("Capturing network requests...")
        requests = await capture_network(target_page, args)
        
        # Extract API endpoints
        api_endpoints = extract_api_endpoints(requests)
        logger.info(f"Found {len(api_endpoints)} API endpoints")
        
        # Extract response schemas
        response_schemas = extract_response_schemas(requests)
        logger.info(f"Found {len(response_schemas)} response schemas")
        
        # Build result
        result = NetworkResult(
            start_url=args.url,
            requests=requests,
            api_endpoints=api_endpoints,
            response_schemas=response_schemas,
            stats={
                "total_requests": len(requests),
                "api_endpoints": len(api_endpoints),
                "response_schemas": len(response_schemas),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        )
        
        # Save result
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(asdict(result), f, indent=2, ensure_ascii=False)
        
        logger.info("")
        logger.info(f"Capture complete!")
        logger.info(f"  Total requests: {result.stats['total_requests']}")
        logger.info(f"  API endpoints: {result.stats['api_endpoints']}")
        logger.info(f"  Response schemas: {result.stats['response_schemas']}")
        logger.info(f"  Output: {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
