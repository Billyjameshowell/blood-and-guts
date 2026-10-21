// Smoke test: logging sets out of program order must not move the page.
// Usage: node qa/smoke.mjs <url>   (runs WebKit iPhone 13 + Chromium; screenshots to qa/)
import { webkit, chromium, devices } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/';
const seed = { day: 1, logs: {}, scrollY: 0, resumeKey: null, headerCollapsed: true, collapsed: {} };
let failed = 0;

for (const [name, browser, device, opts] of [['webkit-iphone13', webkit, devices['iPhone 13'], {}], ['chrome', chromium, devices['Pixel 7'], { channel: 'chrome' }]]) {
  const b = await browser.launch(opts);
  const ctx = await b.newContext({ ...device });
  await ctx.addInitScript(s => { if (!sessionStorage.seeded) { sessionStorage.seeded = 1; localStorage.bag_tracker_v1 = s; } }, JSON.stringify(seed));
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForSelector('#card-d1-fly');
  // Skip ahead: DB Flyes (exercise 5) while 2-4 are untouched.
  await p.evaluate(() => { const r = document.getElementById('card-d1-fly').getBoundingClientRect(); scrollTo(0, scrollY + r.top - 140); });
  await p.waitForTimeout(400);
  const top = () => p.evaluate(() => document.getElementById('card-d1-fly').getBoundingClientRect().top);
  for (const i of [0, 1]) {
    const set = `#set-d1-fly__${i}`;
    await p.tap(`${set} input[aria-label="weight"]`); // keyboard open
    await p.keyboard.type('35');
    const t0 = await top();
    await p.tap(`${set} button:text-is("Done")`);
    await p.waitForTimeout(900);
    const d = Math.abs((await top()) - t0);
    const ok = d < 2;
    failed += !ok;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: Done on set ${i + 1}${i ? ' (last, card collapses)' : ''} moved card ${d.toFixed(1)}px`);
  }
  await p.screenshot({ path: `qa/smoke-${name}.png` });
  // Empty weight stays empty; stepper starts at the suggestion.
  await p.fill('#set-d1-conc__0 input[aria-label="weight"]', '');
  await p.waitForTimeout(100);
  const empty = await p.inputValue('#set-d1-conc__0 input[aria-label="weight"]');
  await p.tap('#set-d1-conc__0 button[aria-label="Increase reps"]');
  const reps = await p.inputValue('#set-d1-conc__0 input[aria-label="reps"]');
  const ok2 = empty === '' && reps === '10';
  failed += !ok2;
  console.log(`${ok2 ? 'PASS' : 'FAIL'} ${name}: cleared weight stays '${empty}', first reps + gives ${reps} (target 10-12)`);
  // Skipping counts the exercise's sets toward progress; unskip removes them.
  const count = () => p.textContent('header button span.tabular-nums');
  const before = await count();
  await p.tap('#card-d1-conc button:text-is("Skip exercise")');
  const skipped = await count();
  await p.tap('#card-d1-conc button[aria-expanded]');
  await p.tap('#card-d1-conc button:text-is("Unskip exercise")');
  const after = await count();
  const ok3 = before === '2/13' && skipped === '4/13' && after === '2/13';
  failed += !ok3;
  console.log(`${ok3 ? 'PASS' : 'FAIL'} ${name}: progress ${before} → skip ${skipped} → unskip ${after}`);
  await b.close();
}
process.exit(failed ? 1 : 0);
