#!/usr/bin/env python3
"""
Explorer Fabric — Anti-Bot Manager
Handles rate limiting, user-agent rotation, fingerprint evasion, and retry logic.
Designed for platforms with anti-scraping measures.

Usage:
    python scripts/anti_bot_manager.py \\
        --url https://jdsz.jd.com/szweb/view/index/home.html \\
        --source-id jd_smart \\
        --output sources/jd_smart/snapshots/anti_bot_config.json \\
        --cdp-port 9222 \\
        --rate-limit 0.5 \\
        --max-retries 3
"""

import argparse
import asyncio
import json
import logging
import random
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Common user agent strings
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

@dataclass
class AntiBotConfig:
    rate_limit: float = 0.5  # Seconds between requests
    max_retries: int = 3
    retry_delay: float = 2.0
    jitter_range: float = 0.5
    user_agent_rotation: bool = True
    fingerprint_evasion: bool = True
    block_detection: bool = True
    proxy_rotation: bool = False

@dataclass
class RequestAttempt:
    url: str
    attempt_number: int
    timestamp: str
    success: bool
    error: Optional[str] = None
    response_time: float = 0
    status_code: Optional[int] = None
    blocked: bool = False
    user_agent: str = ""

@dataclass
class AntiBotResult:
    config: dict = field(default_factory=dict)
    attempts: list = field(default_factory=list)
    statistics: dict = field(default_factory=dict)
    recommendations: list = field(default_factory=dict)

def parse_args():
    parser = argparse.ArgumentParser(description="Explorer Fabric — Anti-Bot Manager")
    parser.add_argument("--url", required=True, help="URL to test")
    parser.add_argument("--source-id", default="auto", help="Source identifier")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--cdp-port", type=int, default=9222, help="Chrome CDP port")
    parser.add_argument("--rate-limit", type=float, default=0.5, help="Rate limit in seconds")
    parser.add_argument("--max-retries", type=int, default=3, help="Maximum retry attempts")
    parser.add_argument("--user-agent", default=None, help="Specific user agent to use")
    parser.add_argument("--enable-fingerprint-evasion", action="store_true", help="Enable fingerprint evasion")
    parser.add_argument("--enable-block-detection", action="store_true", help="Enable block detection")
    return parser.parse_args()

class RateLimiter:
    """Token bucket rate limiter."""
    
    def __init__(self, rate: float, jitter: float = 0.5):
        self.rate = rate
        self.jitter = jitter
        self.last_request_time = 0
    
    async def acquire(self):
        """Wait until we can make a request."""
        now = time.time()
        elapsed = now - self.last_request_time
        
        if elapsed < self.rate:
            wait_time = self.rate - elapsed + random.uniform(0, self.jitter)
            logger.debug(f"Rate limiting: waiting {wait_time:.2f}s")
            await asyncio.sleep(wait_time)
        
        self.last_request_time = time.time()

class RetryHandler:
    """Handles retry logic with exponential backoff."""
    
    def __init__(self, max_retries: int, base_delay: float = 2.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number."""
        return self.base_delay * (2 ** attempt) + random.uniform(0, 1)

async def test_rate_limiting(url: str, rate_limiter: RateLimiter, max_requests: int = 5) -> list:
    """Test if a URL responds consistently under rate limiting."""
    attempts = []
    
    for i in range(max_requests):
        start_time = time.time()
        await rate_limiter.acquire()
        
        # Simulate request (in real usage, this would be actual navigation)
        await asyncio.sleep(0.1)  # Simulate network latency
        
        elapsed = time.time() - start_time
        attempts.append({
            "request_number": i + 1,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "response_time": elapsed,
            "success": True
        })
    
    return attempts

async def test_user_agent_rotation(page, user_agents: list) -> dict:
    """Test different user agents and their effects."""
    results = {}
    
    for ua in user_agents[:3]:  # Test first 3 UAs
        try:
            # Set user agent
            await page.set_extra_http_headers({
                "User-Agent": ua
            })
            
            # Try to load a test page
            start_time = time.time()
            await page.goto("about:blank", timeout=5000)
            response_time = time.time() - start_time
            
            results[ua[:50]] = {
                "response_time": response_time,
                "success": True,
                "blocked": False
            }
        except Exception as e:
            results[ua[:50]] = {
                "error": str(e),
                "success": False,
                "blocked": True
            }
    
    return results

async def detect_blocking(page) -> dict:
    """Check if the page has been blocked or challenged."""
    return await page.evaluate("""
    () => {
        const result = {
            blocked: false,
            captcha: false,
            redirect: false,
            indicators: []
        };
        
        // Check for common blocking indicators
        const bodyText = document.body?.innerText || '';
        
        if (bodyText.includes('验证码') || bodyText.includes('captcha') || bodyText.includes('verify')) {
            result.captcha = true;
            result.indicators.push('captcha_detected');
        }
        
        if (bodyText.includes('被封禁') || bodyText.includes('blocked') || bodyText.includes('forbidden')) {
            result.blocked = true;
            result.indicators.push('account_blocked');
        }
        
        if (window.location.href !== window.location.origin + window.location.pathname) {
            result.redirect = true;
            result.indicators.push('unexpected_redirect');
        }
        
        // Check for invisible CAPTCHA elements
        const invisibleElements = document.querySelectorAll('[style*="visibility: hidden"], [style*="display: none"]');
        if (invisibleElements.length > 10) {
            result.indicators.push('many_hidden_elements');
        }
        
        return result;
    }
    """)

async def apply_fingerprint_evasion(page) -> dict:
    """Apply techniques to reduce fingerprint detection."""
    return await page.evaluate("""
    () => {
        const results = {
            webdriver_removed: false,
            permissions_mocked: false,
            navigator_properties_fixed: false
        };
        
        // Remove WebDriver property
        try {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            results.webdriver_removed = true;
        } catch (e) {
            results.webdriver_error = e.message;
        }
        
        // Mock permissions
        try {
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            results.permissions_mocked = true;
        } catch (e) {
            results.permissions_error = e.message;
        }
        
        // Fix navigator properties
        try {
            const plugins = {
                length: 1,
                item: function(index) { return this[index]; },
                namedItem: function(name) { return this[name]; }
            };
            Object.defineProperty(navigator, 'plugins', { get: () => plugins });
            results.navigator_properties_fixed = true;
        } catch (e) {
            results.navigator_error = e.message;
        }
        
        return results;
    }
    """)

async def main():
    args = parse_args()
    
    logger.info(f"Explorer Fabric — Anti-Bot Manager")
    logger.info(f"  URL: {args.url}")
    logger.info(f"  Rate Limit: {args.rate_limit}s")
    logger.info(f"  Max Retries: {args.max_retries}")
    logger.info("")
    
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        # Configure browser with anti-detection settings
        launch_args = [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-dev-shm-usage',
        ]
        
        if args.enable_fingerprint_evasion:
            launch_args.append('--disable-features=WebRtcHideLocalIps')
            launch_args.append('--disable-features=IdentifyComputers')
        
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
        
        # Apply fingerprint evasion if enabled
        evasion_results = {}
        if args.enable_fingerprint_evasion:
            logger.info("Applying fingerprint evasion...")
            evasion_results = await apply_fingerprint_evasion(target_page)
            logger.info(f"Evasion results: {evasion_results}")
        
        # Test rate limiting
        logger.info("Testing rate limiting...")
        rate_limiter = RateLimiter(rate=args.rate_limit, jitter=0.5)
        rate_tests = await test_rate_limiting(args.url, rate_limiter)
        
        # Test user agent rotation
        logger.info("Testing user agent rotation...")
        ua_results = await test_user_agent_rotation(target_page, USER_AGENTS)
        
        # Detect blocking
        logger.info("Checking for blocking indicators...")
        block_detection = await detect_blocking(target_page)
        logger.info(f"Block detection: {block_detection}")
        
        # Build result
        config = AntiBotConfig(
            rate_limit=args.rate_limit,
            max_retries=args.max_retries,
            user_agent_rotation=args.user_agent,
            fingerprint_evasion=args.enable_fingerprint_evasion,
            block_detection=args.enable_block_detection
        )
        
        result = AntiBotResult(
            config=asdict(config),
            attempts=[],
            statistics={
                "rate_tests": len(rate_tests),
                "ua_tests": len(ua_results),
                "block_indicators": len(block_detection.get("indicators", [])),
                "evasion_applied": bool(evasion_results),
                "completed_at": datetime.now(timezone.utc).isoformat()
            },
            recommendations=[]
        )
        
        # Generate recommendations
        if block_detection.get("captcha"):
            result.recommendations.append("CAPTCHA detected — consider using human-like interaction patterns")
        if block_detection.get("blocked"):
            result.recommendations.append("Account appears blocked — check authentication status")
        if ua_results:
            failed_uas = [ua for ua, res in ua_results.items() if not res.get("success")]
            if failed_uas:
                result.recommendations.append(f"Some user agents failed — try rotating more frequently")
        
        # Save result
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(asdict(result), f, indent=2, ensure_ascii=False)
        
        logger.info("")
        logger.info(f"Anti-bot analysis complete!")
        logger.info(f"  Rate tests: {result.statistics['rate_tests']}")
        logger.info(f"  UA tests: {result.statistics['ua_tests']}")
        logger.info(f"  Block indicators: {result.statistics['block_indicators']}")
        logger.info(f"  Evasion applied: {result.statistics['evasion_applied']}")
        
        if result.recommendations:
            logger.info("")
            logger.info("Recommendations:")
            for rec in result.recommendations:
                logger.info(f"  - {rec}")
        
        logger.info(f"  Output: {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
