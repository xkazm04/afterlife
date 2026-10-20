#!/usr/bin/env node
// Layout smoke check: every route x three window widths x three text sizes, against a running app.
// Fails on a page or console error, a toolbar whose controls are clipped or whose inspector toggle is out of reach,
// or anything in the content pane that scrolls sideways (a table may; mark another deliberate one data-scroll-x).
//
//   npm run dev            # or npm start, in another terminal
//   npm run smoke          # SMOKE_BASE=http://localhost:3000 by default; SMOKE_QUICK=1 checks 1440 x standard only
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const QUICK = process.env.SMOKE_QUICK === '1';
const ROUTES = ['/fleet', '/monitor', '/needs-you', '/ladder', '/maturity', '/cycles', '/cycles?scope=estate', '/task', '/onboard', '/setup', '/theater', '/settings'];
const DOOR = '/?quality=lite';
const WIDTHS = QUICK ? [1440] : [1280, 1440, 1920];
const SIZES = QUICK ? ['standard'] : ['smaller', 'standard', 'larger'];

/** What one windowed screen looks like to the checks; runs in the page. */
function probe() {
  const out = [];
  const header = document.querySelector('header');
  if (header) {
    const mid = header.children[1];
    const end = header.lastElementChild?.getBoundingClientRect();
    const hb = header.getBoundingClientRect();
    if (mid && mid.scrollWidth - mid.clientWidth > 1) out.push(`toolbar clips ${mid.scrollWidth - mid.clientWidth}px of its controls`);
    if (!end || end.width === 0 || end.right > hb.right + 1) out.push('toolbar end (inspector toggle) out of reach');
  }
  // any scroller in the content pane that scrolls sideways, except a table (it scrolls by design) or one marked
  // data-scroll-x (a deliberate horizontal scroller)
  const pane = document.querySelector('[class*="Window-module"][class*="pane"]');
  for (const el of pane ? [pane, ...pane.querySelectorAll('*')] : []) {
    const ox = getComputedStyle(el).overflowX;
    if (ox !== 'auto' && ox !== 'scroll') continue;
    if (el.closest('[role="treegrid"],[role="table"],[role="grid"],[data-scroll-x]')) continue;
    const spill = el.scrollWidth - el.clientWidth;
    if (spill > 1) out.push(`${(el.className || el.tagName).toString().split(' ')[0].slice(0, 40)} scrolls ${spill}px sideways`);
  }
  return out;
}

const browser = await chromium.launch();
const problems = [];
let checked = 0;
try {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    for (const route of [DOOR, ...ROUTES]) {
      errors = [];
      const res = await page.goto(BASE + route, { waitUntil: 'networkidle' });
      if (!res || !res.ok()) problems.push(`${route} @${width}: HTTP ${res?.status() ?? 'no response'}`);
      for (const size of SIZES) {
        await page.evaluate((s) => document.documentElement.setAttribute('data-text-size', s), size);
        await page.waitForTimeout(150);
        const found = route === DOOR ? [] : await page.evaluate(probe);
        for (const f of found) problems.push(`${route} @${width} ${size}: ${f}`);
        checked++;
      }
      for (const e of errors) problems.push(`${route} @${width}: ${e.slice(0, 160)}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`smoke: ${checked} checks over ${ROUTES.length + 1} routes, ${WIDTHS.length} widths, ${SIZES.length} text sizes`);
if (problems.length) {
  console.log(`smoke: ${problems.length} problem(s)`);
  for (const p of problems) console.log(`  ${p}`);
  process.exitCode = 1;
} else {
  console.log('smoke: ok');
}
