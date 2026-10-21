// Out-of-order logging + collapsible cards regression test at 390px.
const { chromium } = require('playwright-core');
const [url, out] = process.argv.slice(2);
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s','1'); localStorage.setItem('bag_tip_startweights_v1','1'); localStorage.setItem('bag_tracker_v1', JSON.stringify({ day: 1, logs: {}, scrollY: 0, resumeKey: null, headerCollapsed: true })); } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForSelector('article.card'); await p.waitForTimeout(800);
  const top = sel => p.evaluate(s => document.querySelector(s)?.getBoundingClientRect().top ?? null, sel);
  const putAt = async (sel, y) => { await p.evaluate(([s, y]) => { const r = document.querySelector(s).getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - y); }, [sel, y]); await p.waitForTimeout(400); };
  const doneOn = async (exId, idx) => { await p.click(`.set[data-focus-key="${exId}__${idx}"] .mark-done`); };
  const measure = async (label, sel, fn, shot) => {
    const t0 = await top(sel), y0 = await p.evaluate(() => scrollY);
    await fn();
    await p.waitForTimeout(80); const t1 = await top(sel);
    await p.waitForTimeout(900); const t2 = await top(sel), y2 = await p.evaluate(() => scrollY);
    if (shot) await p.screenshot({ path: `${out}-${shot}.png` });
    const d1 = Math.abs(t1 - t0), d2 = Math.abs(t2 - t0);
    if (d2 >= 20) {
      // Allowed only as the gentle in-card reveal: next set in the SAME card was hidden behind the rest timer.
      const g = await p.evaluate((s) => { const f = document.querySelector('.set.focus'); const c = document.querySelector(s); const h = document.getElementById('appHeader').getBoundingClientRect().bottom;
        return { inCard: !!(f && c.contains(f)), visible: f ? f.getBoundingClientRect().bottom <= innerHeight - 198 : false, cardBelowHeader: c.getBoundingClientRect().top >= h }; }, sel);
      check(label + ' [gentle in-card reveal]', g.inCard && g.visible && g.cardBelowHeader && (t0 - t2) < 120, `card top ${t0.toFixed(0)} → ${t2.toFixed(0)} (nudged ${(t0 - t2).toFixed(0)}px so next set in same card clears the rest timer); ${JSON.stringify(g)}`);
      return;
    }
    check(label, d1 < 20 && d2 < 20, `card top ${t0.toFixed(0)} → ${t1.toFixed(0)} (80ms) → ${t2.toFixed(0)} (1s); scrollY ${y0} → ${y2}`);
  };

  // ---- Day 1: exercise 5 (DB Flyes) while 2-4 untouched ----
  const fly = '.card[data-ex="d1-fly"]';
  await putAt(fly, 140);
  await p.screenshot({ path: `${out}-d1-before-done.png` });
  await measure('Day1 ex5 set1 Done (mid-exercise) keeps card anchored', fly, () => doneOn('d1-fly', 0), 'd1-after-set1');
  check('NEXT highlight moved to ex5 set2 (not program-order ex1)', await p.evaluate(() => !!document.querySelector('.set.focus[data-focus-key="d1-fly__1"]')));
  check('No NEXT highlight on exercise 1', await p.evaluate(() => !document.querySelector('.card[data-ex="d1-tread"] .set.focus')));
  await measure('Day1 ex5 last set Done (card auto-collapses) keeps card anchored', fly, () => doneOn('d1-fly', 1), 'd1-after-last-set-collapsed');
  check('Auto-collapse after all sets done', await p.evaluate(s => document.querySelector(s).classList.contains('collapsed'), fly));
  console.log('      collapsed summary:', (await p.textContent(`${fly} .cr-text small`)).trim());
  const fab = await p.evaluate(() => ({ text: document.getElementById('nextFab').textContent.trim(), shown: getComputedStyle(document.getElementById('nextFab')).display !== 'none' }));
  check('Next targets exercise BELOW (ex6 DB Concentration Curl)', /Concentration/.test(fab.text), JSON.stringify(fab));

  // manual toggle
  await measure('Manual expand of done card keeps top anchored', fly, () => p.click(`${fly} .collapsed-row`), 'd1-manual-expand');
  check('Card expanded', await p.evaluate(s => !document.querySelector(s).classList.contains('collapsed'), fly));
  await measure('Manual collapse via chevron keeps top anchored', fly, () => p.click(`${fly} .chev-btn`), 'd1-manual-collapse');
  const inc = '.card[data-ex="d1-incline"]';
  await putAt(inc, 160);
  await measure('Manual collapse of an unfinished card (header tap) keeps top anchored', inc, () => p.click(`${inc} .ex-meta h2`), 'd1-collapse-unfinished');
  check('Unfinished card collapsed manually', await p.evaluate(s => document.querySelector(s).classList.contains('collapsed'), inc));
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('bag_tracker_v1')));
  check('Collapse state persisted in state.collapsed', st.collapsed && st.collapsed['d1-incline'] === true && st.collapsed['d1-fly'] === true, JSON.stringify(st.collapsed));
  check('Logs format unchanged', JSON.stringify(st.logs['d1-fly__0']) === JSON.stringify({ weight: st.logs['d1-fly__0'].weight, reps: st.logs['d1-fly__0'].reps, done: true }), JSON.stringify(st.logs['d1-fly__0']));
  await p.reload(); await p.waitForSelector('article.card'); await p.waitForTimeout(600);
  check('Collapse state survives reload', await p.evaluate(() => document.querySelector('.card[data-ex="d1-incline"]').classList.contains('collapsed') && document.querySelector('.card[data-ex="d1-fly"]').classList.contains('collapsed')));
  // re-render during a session must not resume-scroll
  const yA = await p.evaluate(() => { window.scrollTo(0, 300); return scrollY; });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('startRest').click()); await p.waitForTimeout(500);
  check('Rest timer start does not move scroll', Math.abs((await p.evaluate(() => scrollY)) - yA) < 2);

  // ---- Day 4: Leg Press (exercise 7) while 2-6 untouched ----
  await p.click('.bottom-nav .day-btn[data-day="4"]'); await p.waitForTimeout(800);
  const lp = '.card[data-ex="d4-lpress"]';
  await putAt(lp, 120);
  await measure('Day4 Leg Press set1 Done keeps card anchored', lp, () => doneOn('d4-lpress', 0), 'd4-after-set1');
  await measure('Day4 Leg Press set2 Done keeps card anchored', lp, () => doneOn('d4-lpress', 1), 'd4-after-set2');
  await measure('Day4 Leg Press set3 (last) Done → collapse, anchored', lp, () => doneOn('d4-lpress', 2), 'd4-after-last-collapsed');
  check('Day4 Leg Press auto-collapsed', await p.evaluate(s => document.querySelector(s).classList.contains('collapsed'), lp));
  console.log('      collapsed summary:', (await p.textContent(`${lp} .cr-text small`)).trim());
  check('Next targets Hack Squat (below)', /Hack Squat/.test(await p.textContent('#nextFab')), (await p.textContent('#nextFab')).trim());
  // finish everything below to check wrap-around to skipped earlier ones
  await p.evaluate(() => { ['d4-hack','d4-lcurl','d4-sldl','d4-calf','d4-seatedcalf'].forEach(id => { for (let i=0;i<5;i++) state.logs[id+'__'+i] = { weight: '100', reps: '10', done: true }; }); save(); });
  await p.reload(); await p.waitForSelector('article.card'); await p.waitForTimeout(600);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(600);
  check('Wraps to earlier skipped exercise', /cardio|Leg Extension|Stretch/i.test(await p.textContent('#nextFab')), (await p.textContent('#nextFab')).trim());
  await p.screenshot({ path: `${out}-d4-wrap-next.png` });
  // reset clears collapse state for that day only
  await p.evaluate(() => { document.getElementById('headerToggle').click(); }); await p.waitForTimeout(200);
  await p.click('#resetDay'); await p.waitForTimeout(500);
  const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem('bag_tracker_v1')));
  check('Reset day clears Day 4 collapse state, keeps Day 1', !Object.keys(st2.collapsed || {}).some(k => k.startsWith('d4-')) && st2.collapsed['d1-incline'] === true, JSON.stringify(st2.collapsed));
  check('No page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
