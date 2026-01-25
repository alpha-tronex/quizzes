#!/usr/bin/env node

/**
 * Console Log Collection Script
 * 
 * This script uses Puppeteer (headless Chrome) to visit the application and collect
 * all browser console output, errors, and network issues for debugging purposes.
 * 
 * Purpose:
 *   - Captures all console.log, console.error, console.warn messages
 *   - Detects JavaScript runtime errors (pageerror events)
 *   - Identifies failed network requests
 *   - Reports HTTP error responses (4xx, 5xx status codes)
 * 
 * Usage:
 *   1. Start your application server (node server/server.js or npm start)
 *   2. Ensure the app is running on http://localhost:3000
 *   3. Run this script: node scripts/collect_console.js
 * 
 * Output:
 *   JSON array of log entries with the following types:
 *   - console: Browser console messages (log, error, warn, info)
 *   - pageerror: JavaScript errors with stack traces
 *   - requestfailed: Failed HTTP requests
 *   - response: HTTP responses with error status codes (≥400)
 * 
 * Requirements:
 *   - puppeteer package installed (npm install puppeteer)
 *   - Application running on localhost:3000
 * 
 * Example Output:
 *   [
 *     { "type": "console", "level": "log", "text": "Angular app loaded", "args": [...] },
 *     { "type": "pageerror", "message": "TypeError: ...", "stack": "..." },
 *     { "type": "response", "url": "http://...", "status": 404 }
 *   ]
 * 
 * Use Cases:
 *   - Debugging deployment issues
 *   - CI/CD integration testing
 *   - Monitoring for console errors during automated tests
 *   - Capturing browser-specific issues in headless environment
 */

const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const logs = [];

    page.on('console', async msg => {
      try {
        const args = await Promise.all(msg.args().map(async h => {
          try {
            return await h.evaluate(a => {
              if (a && a.message && a.stack) return { __isError: true, message: a.message, stack: a.stack };
              return a;
            });
          } catch (e) {
            try { return await h.jsonValue(); } catch { return String(h); }
          }
        }));
        logs.push({ type: 'console', level: msg.type(), text: msg.text(), args });
      } catch (e) {
        logs.push({ type: 'console', text: String(msg) });
      }
    });

    page.on('pageerror', err => {
      logs.push({ type: 'pageerror', message: err.message, stack: err.stack });
    });

    page.on('requestfailed', req => {
      const f = req.failure && req.failure();
      logs.push({ type: 'requestfailed', url: req.url(), errorText: f ? f.errorText : undefined });
    });

    page.on('response', res => {
      const status = res.status();
      if (status >= 400) logs.push({ type: 'response', url: res.url(), status });
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 3000));

    console.log(JSON.stringify(logs, null, 2));
    await browser.close();
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
})();
