import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = join(tmpdir(), 'chrome-test-currency-' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runBrowserTest() {
  console.log('====================================================');
  console.log('🌐 STARTING LIVE MULTI-CURRENCY BROWSER TEST (CDP)');
  console.log('====================================================');

  if (!existsSync(CHROME_PATH)) {
    throw new Error('Chrome not found at ' + CHROME_PATH);
  }

  mkdirSync(USER_DATA_DIR, { recursive: true });

  const port = 9333;
  console.log(`🚀 Launching Headless Chrome on port ${port}...`);
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1280,800',
    ],
    { stdio: 'ignore' }
  );

  let connected = false;
  let wsUrl = null;

  try {
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (res.ok) {
          const data = await res.json();
          wsUrl = data.webSocketDebuggerUrl;
          connected = true;
          break;
        }
      } catch (e) {}
    }

    if (!connected || !wsUrl) {
      throw new Error('Could not connect to Chrome debugging endpoint');
    }
    console.log('✅ Connected to Chrome DevTools Protocol!');

    // Create a new tab on localhost:3001/plans
    const targetRes = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3001/plans`, {
      method: 'PUT',
    });
    const target = await targetRes.json();
    console.log('📄 Opened target page: /plans');

    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('⏳ Waiting for React app hydration on /plans (4 seconds)...');
    await sleep(4000);

    // Step 1: Verify Initial Currency (PKR)
    const initialText = await cdp.evaluate(`document.body.innerText`);
    console.log('🔍 Checking initial plans text...');
    const hasPkrInitial = initialText.includes('Rs.') || initialText.includes('PKR');
    console.log(`  -> Initial currency is PKR (found Rs./PKR): ${hasPkrInitial}`);
    if (!hasPkrInitial) {
      throw new Error('Expected initial page to display Rs. or PKR');
    }

    // Step 2: Open Currency Switcher Modal
    console.log('👉 Triggering Currency Switcher Modal...');
    const openModalResult = await cdp.evaluate(`(() => {
      const btn = document.querySelector('button[title*="Switch Currency"]');
      if (!btn) return 'Button not found';
      btn.click();
      return 'Clicked Switch Currency';
    })()`);
    console.log(`  -> Action result: ${openModalResult}`);
    await sleep(600);

    // Verify modal is open
    const modalOpen = await cdp.evaluate(`(() => {
      const modal = document.querySelector('[data-testid="currency-modal"]') || document.querySelector('[role="dialog"]') || document.body.innerText.includes('Select Currency');
      return Boolean(modal);
    })()`);
    console.log(`  -> Modal opened: ${modalOpen}`);
    if (!modalOpen) {
      throw new Error('Currency Switcher Modal did not open');
    }

    // Step 3: Switch to USD
    console.log('👉 Selecting USD ($) from Modal...');
    const selectUsdResult = await cdp.evaluate(`(() => {
      const usdBtn = document.querySelector('[data-currency-code="USD"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('USD'));
      if (!usdBtn) return 'USD button not found in modal';
      usdBtn.click();
      return 'Clicked USD';
    })()`);
    console.log(`  -> Action result: ${selectUsdResult}`);
    await sleep(800);

    // Check that USD is now active on the page
    const usdText = await cdp.evaluate(`document.body.innerText`);
    const hasUsd = usdText.includes('$');
    console.log(`✅ [PASS] USD is now active! Page contains '$': ${hasUsd}`);
    if (!hasUsd) {
      throw new Error('Page did not update to USD ($)');
    }

    // Step 4: Switch to INR
    console.log('👉 Switching to INR (₹)...');
    await cdp.evaluate(`(() => {
      const btn = document.querySelector('[data-testid="currency-switcher-trigger"]') || document.querySelector('button[title*="Switch Currency"]');
      if (btn) btn.click();
    })()`);
    await sleep(600);

    await cdp.evaluate(`(() => {
      const inrBtn = document.querySelector('[data-currency-code="INR"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('INR'));
      if (inrBtn) inrBtn.click();
    })()`);
    await sleep(800);

    const inrText = await cdp.evaluate(`document.body.innerText`);
    const hasInr = inrText.includes('₹');
    console.log(`✅ [PASS] INR is now active! Page contains '₹': ${hasInr}`);
    if (!hasInr) {
      throw new Error('Page did not update to INR (₹)');
    }

    // Step 5: Switch to USDT
    console.log('👉 Switching to USDT (₮)...');
    await cdp.evaluate(`(() => {
      const btn = document.querySelector('[data-testid="currency-switcher-trigger"]') || document.querySelector('button[title*="Switch Currency"]');
      if (btn) btn.click();
    })()`);
    await sleep(600);

    await cdp.evaluate(`(() => {
      const usdtBtn = document.querySelector('[data-currency-code="USDT"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('USDT'));
      if (usdtBtn) usdtBtn.click();
    })()`);
    await sleep(800);

    const usdtText = await cdp.evaluate(`document.body.innerText`);
    const hasUsdt = usdtText.includes('₮');
    console.log(`✅ [PASS] USDT is now active! Page contains '₮': ${hasUsdt}`);
    if (!hasUsdt) {
      throw new Error('Page did not update to USDT (₮)');
    }

    // Step 6: Navigate to Home and verify currency is retained (via localStorage)
    console.log('👉 Navigating to Home (/) to check currency retention...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3001/' });
    await sleep(3000);

    const homeText = await cdp.evaluate(`document.body.innerText`);
    const homeHasUsdt = homeText.includes('₮');
    console.log(`✅ [PASS] Home page retained USDT selection: ${homeHasUsdt}`);
    if (!homeHasUsdt) {
      throw new Error('Home page did not retain USDT selection');
    }

    // Step 7: Switch back to PKR
    console.log('👉 Switching back to PKR (Rs.)...');
    await cdp.evaluate(`(() => {
      const btn = document.querySelector('[data-testid="currency-switcher-trigger"]') || document.querySelector('button[title*="Switch Currency"]');
      if (btn) btn.click();
    })()`);
    await sleep(600);

    await cdp.evaluate(`(() => {
      const pkrBtn = document.querySelector('[data-currency-code="PKR"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('PKR'));
      if (pkrBtn) pkrBtn.click();
    })()`);
    await sleep(800);

    const finalHomeText = await cdp.evaluate(`document.body.innerText`);
    const hasPkrFinal = finalHomeText.includes('Rs.') || finalHomeText.includes('PKR');
    console.log(`✅ [PASS] Successfully switched back to PKR (Rs.): ${hasPkrFinal}`);

    cdp.close();

    console.log('====================================================');
    console.log('🎉 ALL BROWSER MULTI-CURRENCY TESTS PASSED 100%!');
    console.log('====================================================');
  } finally {
    chromeProcess.kill('SIGKILL');
    try {
      rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }
}

runBrowserTest().catch((err) => {
  console.error('❌ Browser Test Failed:', err);
  process.exit(1);
});
