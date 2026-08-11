#!/usr/bin/env python3
"""
D0002 — JD Capability Discovery Crawler

Systematically crawl ALL JD 商智 pages via CDP, capturing:
1. Page inventory (URLs, screenshots, DOM)
2. API inventory (all XHR/fetch requests + responses)
3. Response schemas (field names, types, example values)
4. Indicator dictionary (jdr_xxx → canonical names)

Principle: NEVER infer from page names. All context from real API data.
"""
import asyncio
import json
import hashlib
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright, Page

OUTPUT_DIR = Path("/Users/bx/Workspace/agentFabric/discovery/jd-capability")
CDP_URL = "http://127.0.0.1:9222"
SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"
DOM_DIR = OUTPUT_DIR / "dom"
API_DIR = OUTPUT_DIR / "api-responses"
RAW_DIR = OUTPUT_DIR / "raw"

# JD 商智 top-level pages (from the app sidebar)
TOP_PAGES = [
    {"name": "首页", "url": "https://jdsz.jd.com/szweb/view/index/home.html"},
    {"name": "实时-实时总览", "url": "https://jdsz.jd.com/szweb/view/realTime/realSummarysNew.html"},
    {"name": "流量-流量概览", "url": "https://jdsz.jd.com/szweb/view/viewflow/viewStats.html"},
    {"name": "商品-商品概况", "url": "https://jdsz.jd.com/sz/view/productAnalysis/productSummarys.html"},
    {"name": "交易-交易概况", "url": "https://jdsz.jd.com/sz/view/dealAnalysis/dealSummarys.html"},
    {"name": "服务-服务分析", "url": "https://jdsz.jd.com/szweb/view/serviceAnalysis/afterSalesServiceAnalysis.html"},
    {"name": "营销-营销概览", "url": "https://jdsz.jd.com/marketweb/sz/view/marketing/marketingOverview.html"},
    {"name": "供应链-库存预警", "url": "https://jdsz.jd.com/stockweb/sz/view/ihs/InventoryHealth.html"},
    {"name": "客户-客户总览", "url": "https://jdsz.jd.com/szweb/sz/view/growth/summary.html"},
    {"name": "行业-大盘动态", "url": "https://jdsz.jd.com/szweb/sz/view/industryMarket/industryRealTimeNew.html"},
    {"name": "竞争-竞店概况", "url": "https://jdsz.jd.com/sz/view/competitionAnalysis/shopOverviews.html"},
    {"name": "揽客-购物车营销", "url": "https://jdsz.jd.com/sz/view/vender/shopping/activityLists.html"},
    {"name": "报表-我的报表", "url": "https://jdsz.jd.com/sz/view/selfHelp/reportLists.html"},
    {"name": "业务专区", "url": "https://jdsz.jd.com/sz/view/businessZone/wanjia.html"},
    {"name": "智能工具-智能选品", "url": "https://jdsz.jd.com/szweb/sz/view/facilitator/smartSelection.html"},
]


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def safe_filename(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9一-鿿\-_]", "_", name)[:100]


def extract_response_schema(data, prefix="") -> dict:
    """Recursively extract field names, types, and example values from a JSON response."""
    schema = {}
    if isinstance(data, dict):
        for key, value in data.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                schema.update(extract_response_schema(value, full_key))
            elif isinstance(value, list):
                schema[full_key] = {
                    "type": "array",
                    "length": len(value),
                }
                if value and isinstance(value[0], dict):
                    schema.update(extract_response_schema(value[0], f"{full_key}[]"))
                elif value:
                    schema[f"{full_key}[]"] = {
                        "type": type(value[0]).__name__,
                        "example": str(value[0])[:100],
                    }
            else:
                schema[full_key] = {
                    "type": type(value).__name__,
                    "example": str(value)[:200] if value is not None else "null",
                }
    return schema


class JDCapabilityCrawler:
    def __init__(self):
        self.page_inventory = []
        self.api_inventory = {}  # url -> details
        self.captured_apis = []  # raw captures
        self.indicator_keys = set()
        self.all_schemas = {}
        self.browser = None
        self.main_page = None

    async def setup(self):
        """Connect to Chrome CDP and find the JD 商智 page."""
        for d in [OUTPUT_DIR, SCREENSHOT_DIR, DOM_DIR, API_DIR, RAW_DIR]:
            d.mkdir(parents=True, exist_ok=True)

        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.connect_over_cdp(CDP_URL)
        print(f"🔌 Connected. Contexts: {len(self.browser.contexts)}")

        # Find the JD 商智 home page
        for ctx in self.browser.contexts:
            for page in ctx.pages:
                if "jdsz.jd.com" in page.url or "sz.jd.com" in page.url:
                    if "help" not in page.url:
                        self.main_page = page
                        break
            if self.main_page:
                break

        if not self.main_page:
            # Create new page
            self.main_page = await self.browser.contexts[0].new_page()

        print(f"📄 Main page: {self.main_page.url[:100]}")

    async def setup_network_monitoring(self):
        """Enable capture of ALL XHR/fetch responses on the page."""
        # Use CDP to capture all network responses
        cdp = await self.main_page.context.new_cdp_session(self.main_page)
        await cdp.send("Network.enable")

        # Listen for response received events
        cdp.on("Network.responseReceived", lambda params: self._on_response_received(params))
        # Store cdp reference
        self._cdp_session = cdp
        self._response_bodies = {}

    async def _on_response_received(self, params):
        """Handle CDP Network.responseReceived event."""
        response = params.get("response", {})
        url = response.get("url", "")
        mime_type = response.get("mimeType", "")
        status = response.get("status", 0)

        # Only capture API calls (JSON responses)
        if "json" in mime_type or "szgateway" in url or "api" in url.lower():
            request_id = params.get("requestId", "")
            self._response_bodies[request_id] = {
                "url": url,
                "mimeType": mime_type,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    async def capture_response_bodies(self):
        """Fetch response bodies for all captured requests."""
        if not hasattr(self, '_cdp_session'):
            return

        for request_id, info in list(self._response_bodies.items()):
            try:
                result = await self._cdp_session.send("Network.getResponseBody", {
                    "requestId": request_id
                })
                body = result.get("body", "")
                info["body"] = body
                info["size"] = len(body)
            except Exception:
                info["body"] = None
                info["size"] = 0

    async def navigate_and_capture(self, page_name: str, url: str) -> dict:
        """Navigate to a page and capture all evidence."""
        print(f"\n  📍 {page_name}")
        print(f"     URL: {url}")

        result = {
            "page": page_name,
            "url": url,
            "status": "unknown",
            "apis": [],
            "screenshot": None,
            "dom": None,
            "error": None,
        }

        try:
            # Navigate
            resp = await self.main_page.goto(url, wait_until="networkidle", timeout=30000)
            result["http_status"] = resp.status if resp else None

            # Wait for SPA to render
            await asyncio.sleep(3)

            # Try to wait for any loading spinners to disappear
            try:
                await self.main_page.wait_for_load_state("networkidle", timeout=10000)
            except:
                pass
            await asyncio.sleep(2)

            # Enable response monitoring
            self._response_bodies.clear()

            # Scroll to trigger any lazy-loaded data
            await self.main_page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
            await asyncio.sleep(1)
            await self.main_page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(1)

            # Wait for SPA polling cycle (~9s)
            print(f"     Waiting for API polling cycle...")
            await asyncio.sleep(10)

            # Capture response bodies
            await self.capture_response_bodies()

            # Extract captured APIs
            apis = []
            for rid, info in self._response_bodies.items():
                if info.get("body") and "szgateway" in info.get("url", ""):
                    api_data = {
                        "url": info["url"],
                        "status": info["status"],
                        "size": info.get("size", 0),
                        "timestamp": info["timestamp"],
                    }
                    # Try to parse body
                    try:
                        parsed = json.loads(info["body"])
                        api_data["parsed"] = True
                        api_data["has_header"] = "header" in parsed
                        api_data["header_code"] = parsed.get("header", {}).get("code", "N/A") if "header" in parsed else "N/A"
                        # Extract top-level body keys
                        body = parsed.get("body", {})
                        if isinstance(body, dict):
                            api_data["body_keys"] = list(body.keys())[:20]
                            api_data["body_data_keys"] = list(body.get("data", {}).keys())[:20] if isinstance(body.get("data"), dict) else []
                        elif isinstance(body, list):
                            api_data["body_type"] = "array"
                            api_data["body_length"] = len(body)
                    except:
                        api_data["parsed"] = False

                    apis.append(api_data)

            result["apis"] = apis

            # Screenshot
            ss_name = safe_filename(page_name)
            ss_path = SCREENSHOT_DIR / f"{ss_name}.png"
            await self.main_page.screenshot(path=str(ss_path), full_page=True)
            result["screenshot"] = str(ss_path.relative_to(OUTPUT_DIR))

            # DOM snapshot
            dom_html = await self.main_page.content()
            dom_path = DOM_DIR / f"{ss_name}.html"
            dom_path.write_text(dom_html, encoding="utf-8")
            result["dom"] = str(dom_path.relative_to(OUTPUT_DIR))
            result["dom_size"] = len(dom_html)

            # Extract indicators from DOM (look for jdr_xxx patterns)
            jdr_keys = set(re.findall(r'jdr_[a-zA-Z0-9_]+', dom_html))
            result["jdr_keys_found"] = sorted(jdr_keys)
            self.indicator_keys.update(jdr_keys)

            # Extract visible text for page content verification
            visible_text = await self.main_page.evaluate("""
                () => {
                    const body = document.body.cloneNode(true);
                    for (const el of body.querySelectorAll('script, style, nav, .nav, .sidebar, .menu')) {
                        el.remove();
                    }
                    return (body.textContent || '').trim();
                }
            """)
            result["text_length"] = len(visible_text)
            result["text_preview"] = visible_text[:500]

            # Save API responses
            if apis:
                api_file = API_DIR / f"{ss_name}_apis.json"
                api_file.write_text(json.dumps(apis, ensure_ascii=False, indent=2), encoding="utf-8")

            # Check if page has meaningful content
            if any(kw in visible_text for kw in ['成交金额', '访客数', '浏览量', 'GMV']):
                result["status"] = "data_present"
            elif len(visible_text) > 200:
                result["status"] = "content_present"
            elif len(visible_text) < 100:
                result["status"] = "empty_or_loading"
            else:
                result["status"] = "minimal"

            print(f"     APIs: {len(apis)} | JDR keys: {len(jdr_keys)} | DOM: {len(dom_html):,}B | Text: {len(visible_text):,}B | Status: {result['status']}")

            for api in apis[:5]:
                api_name = api["url"].split("/")[-1].split("?")[0][:50]
                print(f"       └─ {api_name} [{api['status']}] {api.get('size',0):,}B")

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            print(f"     ❌ Error: {e}")

        return result

    async def extract_schemas(self):
        """Extract response schemas from all captured APIs."""
        schemas = {}
        for api_file in API_DIR.glob("*_apis.json"):
            try:
                apis = json.loads(api_file.read_text(encoding="utf-8"))
                for api in apis:
                    url = api.get("url", "")
                    api_key = url.split("?")[0].split("/api/")[-1] if "/api/" in url else url
                    if api_key not in schemas:
                        schemas[api_key] = {
                            "url": url,
                            "count": 0,
                            "status_codes": set(),
                            "body_keys": [],
                            "schema": {},
                        }
                    schemas[api_key]["count"] += 1
                    schemas[api_key]["status_codes"].add(api.get("status", 0))
                    for k in api.get("body_keys", []):
                        if k not in schemas[api_key]["body_keys"]:
                            schemas[api_key]["body_keys"].append(k)
            except:
                pass

        # Convert sets to lists for JSON
        for v in schemas.values():
            v["status_codes"] = sorted(v["status_codes"])

        return schemas

    async def close(self):
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'pw'):
            await self.pw.stop()


async def main():
    crawler = JDCapabilityCrawler()
    await crawler.setup()

    # Setup CDP-based network monitoring
    await crawler.setup_network_monitoring()

    print(f"\n{'='*60}")
    print(f"D0002: JD Capability Discovery")
    print(f"{'='*60}")
    print(f"Target pages: {len(TOP_PAGES)}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Start: {datetime.now(timezone.utc).isoformat()}")

    # Phase 1: Page Inventory
    print(f"\n📋 Phase 1: Page Inventory")
    for i, page_info in enumerate(TOP_PAGES):
        result = await crawler.navigate_and_capture(page_info["name"], page_info["url"])
        crawler.page_inventory.append(result)

    # Save page inventory
    inventory_path = OUTPUT_DIR / "page_inventory.json"
    inventory_path.write_text(json.dumps(crawler.page_inventory, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ Page inventory saved: {inventory_path}")

    # Phase 2: Extract schemas
    print(f"\n📊 Phase 2: Schema Extraction")
    schemas = await crawler.extract_schemas()
    schema_path = OUTPUT_DIR / "api_inventory.json"
    schema_path.write_text(json.dumps(schemas, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ API inventory saved: {schema_path} ({len(schemas)} unique API endpoints)")

    # Phase 3: Indicator Dictionary
    print(f"\n🔤 Phase 3: Indicator Dictionary")
    sorted_indicators = sorted(crawler.indicator_keys)
    indicator_dict = {
        "total_unique_keys": len(sorted_indicators),
        "keys": sorted_indicators,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
    }
    indicator_path = OUTPUT_DIR / "indicator_dictionary.json"
    indicator_path.write_text(json.dumps(indicator_dict, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ Indicator dictionary saved: {indicator_path} ({len(sorted_indicators)} unique JDR keys)")

    # Phase 4: Summary
    pages_with_data = [p for p in crawler.page_inventory if p["status"] == "data_present"]
    pages_with_content = [p for p in crawler.page_inventory if p["status"] in ("data_present", "content_present")]
    total_apis = sum(len(p["apis"]) for p in crawler.page_inventory)

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pages_crawled": len(crawler.page_inventory),
        "pages_with_data": len(pages_with_data),
        "pages_with_content": len(pages_with_content),
        "pages_with_errors": len([p for p in crawler.page_inventory if p["status"] == "error"]),
        "total_api_calls_captured": total_apis,
        "unique_api_endpoints": len(schemas),
        "unique_jdr_indicators": len(sorted_indicators),
        "page_statuses": {p["page"]: p["status"] for p in crawler.page_inventory},
    }
    summary_path = OUTPUT_DIR / "capability_matrix.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ Capability matrix saved: {summary_path}")

    print(f"\n{'='*60}")
    print(f"✅ D0002 Discovery Complete!")
    print(f"   Pages: {len(crawler.page_inventory)}")
    print(f"   With data: {len(pages_with_data)}")
    print(f"   APIs captured: {total_apis}")
    print(f"   Unique endpoints: {len(schemas)}")
    print(f"   JDR indicators: {len(sorted_indicators)}")
    print(f"{'='*60}")

    await crawler.close()


if __name__ == "__main__":
    asyncio.run(main())
