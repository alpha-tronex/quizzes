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
