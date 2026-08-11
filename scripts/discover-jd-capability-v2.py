#!/usr/bin/env python3
"""
D0002 — JD Capability Discovery v2
Uses Playwright page.on('response') for reliable network capture.
Fixes: CDP body capture, page timeouts, URL resolution.
"""
import asyncio
import json
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path("/Users/bx/Workspace/agentFabric/discovery/jd-capability")
CDP_URL = "http://127.0.0.1:9222"

# Pages — use the live app URLs (jdsz.jd.com) not help center
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


def safe_filename(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9一-鿿\-_]", "_", name)[:100]


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()[:16]


async def navigate_and_capture(page, page_name: str, url: str, output_dir: Path) -> dict:
    """Navigate, capture ALL network responses, screenshot, and DOM."""
    ss_dir = output_dir / "screenshots"
    dom_dir = output_dir / "dom"
    api_dir = output_dir / "api-responses"
    for d in [ss_dir, dom_dir, api_dir]:
        d.mkdir(parents=True, exist_ok=True)

    print(f"\n  📍 {page_name}")
    print(f"     URL: {url}")

    result = {
        "page": page_name,
        "url": url,
        "status": "unknown",
        "apis": [],
        "jdr_keys": [],
        "screenshot": None,
        "dom": None,
        "error": None,
        "text_preview": "",
    }

    # Set up response capture using Playwright's native handler
    captured_responses = []

    async def on_response(response):
        resp_url = response.url
        if "szgateway" in resp_url and ".ajax" in resp_url:
            try:
                body = await response.text()
                captured_responses.append({
                    "url": resp_url,
                    "status": response.status,
                    "headers": dict(response.headers),
                    "body": body,
                    "size": len(body),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            except Exception:
                pass

    page.on("response", on_response)

    try:
        # Navigate — use domcontentloaded for SPA pages, shorter timeout
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            result["http_status"] = resp.status if resp else None
        except Exception as e:
            # Try with 'load' instead
            print(f"     ⚠️  domcontentloaded timeout, trying 'load'...")
            resp = await page.goto(url, wait_until="load", timeout=30000)
            result["http_status"] = resp.status if resp else None

        # Wait for SPA JS to execute
        await asyncio.sleep(4)

        # Try to dismiss any modal dialogs
        try:
            await page.evaluate("""
                () => {
                    const modals = document.querySelectorAll('.modal, .dialog, .popup, [class*="modal"], [class*="dialog"], [class*="popup"]');
                    for (const m of modals) {
                        const close = m.querySelector('.close, [class*="close"], .cancel, [class*="cancel"]');
                        if (close) close.click();
                    }
                }
            """)
        except:
            pass

        # Scroll to trigger lazy load
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
        await asyncio.sleep(1.5)
        await page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(1.5)

        # Wait for SPA API polling cycles (typically 5-10s intervals)
        print(f"     Waiting for API polling (12s)...")
        await asyncio.sleep(12)

        # Collect results
        result["apis"] = captured_responses

        # Screenshot
        ss_name = safe_filename(page_name)
        ss_path = ss_dir / f"{ss_name}.png"
        await page.screenshot(path=str(ss_path), full_page=True)
        result["screenshot"] = str(ss_path.relative_to(output_dir))

        # DOM
        dom_html = await page.content()
        dom_path = dom_dir / f"{ss_name}.html"
        dom_path.write_text(dom_html, encoding="utf-8")
        result["dom"] = str(dom_path.relative_to(output_dir))
        result["dom_size"] = len(dom_html)

        # Extract JDR keys
        jdr_keys = set(re.findall(r'jdr_[a-zA-Z0-9_]+', dom_html))
        # Also try to find them in API responses
        for cap in captured_responses:
            try:
                body_text = cap.get("body", "")
                if isinstance(body_text, str):
                    jdr_keys.update(re.findall(r'jdr_[a-zA-Z0-9_]+', body_text))
            except:
                pass
        result["jdr_keys"] = sorted(jdr_keys)

        # Visible text
        visible_text = await page.evaluate("""
            () => {
                const body = document.body.cloneNode(true);
                for (const el of body.querySelectorAll('script, style, nav, .nav, .sidebar, .menu, .header, .footer')) {
                    el.remove();
                }
                return (body.textContent || '').trim();
            }
        """)
        result["text_length"] = len(visible_text)
        result["text_preview"] = visible_text[:500]

        # Determine status
        has_real_data = any(kw in visible_text for kw in [
            '成交金额', '访客数', '浏览量', 'GMV', '转化率', '订单',
            '销售额', '搜索', '排行', '行业', '竞争'
        ])
        if has_real_data and len(captured_responses) > 0:
            result["status"] = "data_present"
        elif has_real_data:
            result["status"] = "content_present"
        elif len(visible_text) > 200:
            result["status"] = "content_present"
        elif len(visible_text) < 100:
            result["status"] = "empty_or_error"
        else:
            result["status"] = "minimal"

        print(f"     APIs: {len(captured_responses)} | JDR: {len(jdr_keys)} | DOM: {len(dom_html):,}B | Text: {len(visible_text):,}B | {result['status']}")

        # Print discovered API endpoints
        api_urls = set()
        for cap in captured_responses:
            try:
                endpoint = cap["url"].split(".ajax")[0].split("/api/")[-1] + ".ajax"
                api_urls.add(endpoint)
            except:
                pass
        for ep in sorted(api_urls):
            matching = [c for c in captured_responses if ep in c["url"]]
            total_size = sum(c.get("size", 0) for c in matching)
            print(f"       └─ {ep} [{matching[0]['status']}] {total_size:,}B")

        # Save API responses
        if captured_responses:
            api_path = api_dir / f"{ss_name}_apis.json"
            # Save metadata + truncated bodies (full bodies to separate files)
            api_meta = []
            for cap in captured_responses:
                body = cap.pop("body", None)
                body_hash = hash_content(body) if body else "empty"
                cap["body_hash"] = body_hash
                cap["body_preview"] = body[:500] if body else ""
                api_meta.append(cap)
                # Save full body to separate file
                if body:
                    ep_name = cap["url"].split(".ajax")[0].split("/")[-1][:40]
                    body_path = api_dir / f"{ss_name}_{ep_name}_{body_hash}.json"
                    body_path.write_text(body, encoding="utf-8")

            api_path.write_text(json.dumps(api_meta, ensure_ascii=False, indent=2), encoding="utf-8")

    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
        print(f"     ❌ Error: {e}")

    return result


async def extract_api_schemas(output_dir: Path) -> dict:
    """Parse captured API responses to extract field-level schemas."""
    api_dir = output_dir / "api-responses"
    schemas = {}

    for body_file in sorted(api_dir.glob("*_*.json")):
        if body_file.name.endswith("_apis.json"):
            continue
        try:
            body = body_file.read_text(encoding="utf-8")
            data = json.loads(body)

            # Extract schema recursively
            def walk(obj, prefix="", depth=0):
                if depth > 8:
                    return {}
                result = {}
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        full_key = f"{prefix}.{k}" if prefix else k
                        vtype = type(v).__name__
                        if isinstance(v, (dict, list)):
                            result[full_key] = {"type": "array" if isinstance(v, list) else "object"}
                            sub = walk(v[0] if isinstance(v, list) and v else v, full_key, depth + 1)
                            result.update(sub)
                        elif v is not None:
                            result[full_key] = {
                                "type": vtype,
                                "example": str(v)[:200],
                            }
                return result

            schema = walk(data.get("body", data))
            endpoint = body_file.stem.split("_")[-2] if "_" in body_file.stem else body_file.stem
            if endpoint not in schemas:
                schemas[endpoint] = {
                    "files": [],
                    "fields": {},
                    "field_count": 0,
                }
            schemas[endpoint]["files"].append(body_file.name)
            for k, v in schema.items():
                if k not in schemas[endpoint]["fields"]:
                    schemas[endpoint]["fields"][k] = v
            schemas[endpoint]["field_count"] = len(schemas[endpoint]["fields"])
        except Exception:
            pass

    return schemas


async def build_indicator_dictionary(output_dir: Path) -> dict:
    """Build comprehensive indicator dictionary from all captured data."""
    all_keys = set()

    # From DOM files
    for dom_file in (output_dir / "dom").glob("*.html"):
        html = dom_file.read_text(encoding="utf-8")
        all_keys.update(re.findall(r'jdr_[a-zA-Z0-9_]+', html))

    # From API responses
    for api_file in (output_dir / "api-responses").glob("*.json"):
        if api_file.name.endswith("_apis.json"):
            continue
        try:
            body = api_file.read_text(encoding="utf-8")
            all_keys.update(re.findall(r'jdr_[a-zA-Z0-9_]+', body))
        except:
            pass

    # Try to map jdr keys to readable names (extract from surrounding context)
    indicator_map = {}
    for key in sorted(all_keys):
        # Try to infer name from key suffix
        parts = key.split("_")
        readable = " ".join(p for p in parts if p not in ("jdr", "sz", "sch"))

        # Common mappings
        KNOWN_MAP = {
            "trade": "交易",
            "deal": "成交",
            "ord": "订单",
            "amt": "金额",
            "uv": "访客",
            "pv": "浏览",
            "cv": "转化",
            "cust": "客户",
            "sku": "SKU",
            "spu": "SPU",
            "gmv": "GMV",
        }
        for jd_term, cn_term in KNOWN_MAP.items():
            readable = readable.replace(jd_term, cn_term)

        indicator_map[key] = {
            "jd_key": key,
            "inferred_name": readable,
            "verified": False,
        }

    return {
        "total_keys": len(indicator_map),
        "keys": indicator_map,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
    }


async def main():
    for d in [OUTPUT_DIR, OUTPUT_DIR / "screenshots", OUTPUT_DIR / "dom", OUTPUT_DIR / "api-responses"]:
        d.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp(CDP_URL)
        print(f"🔌 Connected. Contexts: {len(browser.contexts)}")

        # Find existing JD page or create new
        page = None
        for ctx in browser.contexts:
            for p in ctx.pages:
                if "jdsz.jd.com" in p.url or "sz.jd.com" in p.url:
                    if "help" not in p.url:
                        page = p
                        break
            if page:
                break

        if not page:
            page = await browser.contexts[0].new_page()
        print(f"📄 Using: {page.url[:100]}")

        # ---- Phase 1: Page Inventory with Network Capture ----
        page_inventory = []
        print(f"\n{'='*60}")
        print(f"Phase 1: Page Discovery ({len(TOP_PAGES)} pages)")
        print(f"{'='*60}")

        for i, page_info in enumerate(TOP_PAGES):
            result = await navigate_and_capture(page, page_info["name"], page_info["url"], OUTPUT_DIR)
            page_inventory.append(result)

        inventory_path = OUTPUT_DIR / "page_inventory.json"
        inventory_path.write_text(json.dumps(page_inventory, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n✅ Page inventory saved: {inventory_path}")

        # ---- Phase 2: API Schema Extraction ----
        print(f"\n📊 Phase 2: Schema Extraction")
        schemas = await extract_api_schemas(OUTPUT_DIR)
        schema_path = OUTPUT_DIR / "api_inventory.json"
        schema_path.write_text(json.dumps(schemas, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✅ API schemas saved: {schema_path}")
        for ep, info in sorted(schemas.items()):
            print(f"   {ep}: {info['field_count']} fields from {len(info['files'])} responses")

        # ---- Phase 3: Indicator Dictionary ----
        print(f"\n🔤 Phase 3: Indicator Dictionary")
        indicators = await build_indicator_dictionary(OUTPUT_DIR)
        indicator_path = OUTPUT_DIR / "indicator_dictionary.json"
        indicator_path.write_text(json.dumps(indicators, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✅ Indicator dictionary: {indicators['total_keys']} unique JDR keys")

        # ---- Phase 4: Capability Matrix ----
        print(f"\n📋 Phase 4: Capability Matrix")
        pages_with_data = [p for p in page_inventory if p["status"] == "data_present"]
        pages_ok = [p for p in page_inventory if p["status"] in ("data_present", "content_present")]
        pages_err = [p for p in page_inventory if p["status"] == "error"]
        total_apis = sum(len(p["apis"]) for p in page_inventory)
        all_jdr = set()
        for p in page_inventory:
            all_jdr.update(p.get("jdr_keys", []))

        # Build capability matrix: page -> API -> data fields
        page_api_map = {}
        for p in page_inventory:
            page_apis = set()
            for a in p["apis"]:
                try:
                    ep = a["url"].split(".ajax")[0].split("/")[-1] + ".ajax"
                    page_apis.add(ep)
                except:
                    pass
            page_api_map[p["page"]] = sorted(page_apis)

        capability_matrix = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "pages_total": len(page_inventory),
                "pages_with_live_data": len(pages_with_data),
                "pages_with_content": len(pages_ok),
                "pages_with_errors": len(pages_err),
                "total_api_calls_captured": total_apis,
                "unique_api_endpoints": len(schemas),
                "unique_jdr_indicators": len(all_jdr),
            },
            "page_status": {p["page"]: p["status"] for p in page_inventory},
            "page_api_map": page_api_map,
            "error_pages": [
                {"page": p["page"], "error": p.get("error", "")} for p in pages_err
            ],
        }
        matrix_path = OUTPUT_DIR / "capability_matrix.json"
        matrix_path.write_text(json.dumps(capability_matrix, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✅ Capability matrix: {matrix_path}")

        # ---- Phase 5: Business Context Candidates ----
        print(f"\n🔗 Phase 5: Business Context Candidates")
        # Group APIs by their module prefix
        api_groups = {}
        for ep in schemas:
            parts = ep.split("/")
            module = parts[-2] if len(parts) > 1 else parts[0]
            if module not in api_groups:
                api_groups[module] = []
            api_groups[module].append(ep)

        # Map to business contexts based on actual data fields
        business_contexts = {}
        for module, endpoints in sorted(api_groups.items()):
            all_fields = set()
            for ep in endpoints:
                if ep in schemas:
                    all_fields.update(schemas[ep]["fields"].keys())

            # Infer context from field names (NOT from module name)
            field_str = " ".join(all_fields).lower()
            contexts = []
            if any(t in field_str for t in ["gmv", "trade", "amt", "deal", "ord"]):
                contexts.append("TransactionContext")
            if any(t in field_str for t in ["uv", "pv", "visit", "flow", "traffic"]):
                contexts.append("TrafficContext")
            if any(t in field_str for t in ["sku", "spu", "product", "item"]):
                contexts.append("ProductContext")
            if any(t in field_str for t in ["cust", "user", "buyer", "member"]):
                contexts.append("CustomerContext")
            if any(t in field_str for t in ["keyword", "search"]):
                contexts.append("SearchContext")
            if any(t in field_str for t in ["industry", "market", "rank"]):
                contexts.append("IndustryContext")
            if any(t in field_str for t in ["compete", "competitor"]):
                contexts.append("CompetitionContext")
            if any(t in field_str for t in ["roi", "ad", "campaign", "promot"]):
                contexts.append("AdvertisingContext")

            business_contexts[module] = {
                "endpoints": endpoints,
                "total_fields": len(all_fields),
                "candidate_contexts": contexts or ["UnknownContext"],
                "field_sample": sorted(all_fields)[:20],
            }

        context_path = OUTPUT_DIR / "business_context_candidates.json"
        context_path.write_text(json.dumps(business_contexts, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✅ Business context candidates: {context_path}")
        for module, info in business_contexts.items():
            print(f"   {module}: {info['candidate_contexts']} ({info['total_fields']} fields, {len(info['endpoints'])} endpoints)")

        await browser.close()

        print(f"\n{'='*60}")
        print(f"✅ D0002 Discovery Complete!")
        print(f"   Pages: {len(page_inventory)}")
        print(f"   With live data: {len(pages_with_data)}")
        print(f"   APIs captured: {total_apis}")
        print(f"   Unique endpoints: {len(schemas)}")
        print(f"   JDR indicators: {len(all_jdr)}")
        print(f"   Business contexts: {len(business_contexts)}")
        print(f"   Output: {OUTPUT_DIR}")
        print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
