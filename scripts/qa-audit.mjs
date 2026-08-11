#!/usr/bin/env node
//
// Responsive + accessibility audit for the static site.
//
//   python3 -m http.server 8000          # from the repo root
//   node scripts/qa-audit.mjs            # audits staging/
//   node scripts/qa-audit.mjs --live     # audits the published pages instead
//
// Requires playwright + axe-core. They are not repo dependencies (there is no
// build step here); install them ad hoc when you want to run this:
//
//   npm install --no-save playwright axe-core && npx playwright install chromium
//
// What it checks, per page × viewport:
//   - horizontal document overflow (the classic "why does my phone scroll sideways")
//   - elements rendering outside the viewport
//   - unintended overlap between major layout blocks
//   - text overflowing its own box
//   - WCAG 2.5.8 target size (24×24 CSS px minimum)
//   - uncaught JS errors
// Plus, once per page: axe-core violations with every disclosure menu opened,
// and a portrait→landscape→portrait rotation trace.

import { chromium } from 'playwright';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const ORIGIN = process.env.QA_ORIGIN || 'http://localhost:8000';
const ROOT = process.argv.includes('--live') ? ORIGIN : `${ORIGIN}/staging`;

const PAGES = [
  ['landing', `${ROOT}/index.html`],
  ['directora', `${ROOT}/directora.html`],
  ['proyecto (con video)', `${ROOT}/proyectos/erade-kafi.html`],
  ['proyecto (sin video)', `${ROOT}/proyectos/la-verticalidad-desahuciada.html`],
];

// Rotation pairs are deliberately adjacent so a phone flip is covered both ways.
const VIEWPORTS = [
  ['iphone-se portrait', 320, 568],
  ['iphone-se landscape', 568, 320],
  ['iphone-14 portrait', 390, 844],
  ['iphone-14 landscape', 844, 390],
  ['ipad portrait', 768, 1024],
  ['ipad landscape', 1024, 768],
  ['laptop', 1280, 800],
  ['desktop', 1920, 1080],
  ['narrow window', 500, 900],
  ['short landscape', 1280, 400],
];

const LAYOUT_PROBE = () => {
  const de = document.documentElement;
  const sel = (el) =>
    el.tagName.toLowerCase() +
    (el.id ? `#${el.id}` : '') +
    (typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).join('.')
      : '');

  const out = { hOverflow: de.scrollWidth - de.clientWidth, bleeders: [], smallTargets: [], overlaps: [], clipped: [] };

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right > de.clientWidth + 1 || r.left < -1) {
      out.bleeders.push(`${sel(el)} [${Math.round(r.left)}..${Math.round(r.right)}] vw=${de.clientWidth}`);
    }
  }

  for (const el of document.querySelectorAll('a, button, input, select, [role="option"]')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.width < 24 || r.height < 24) {
      out.smallTargets.push(`${sel(el)} "${el.textContent.trim().slice(0, 24)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
  }

  const boxes = [];
  for (const el of document.querySelectorAll(
    '.proyecto-tile, .proyectos-filter, .proyectos-category, .hero, .stills-toolbar, .proyecto-titulo, .ficha-tecnica, .proyecto-video, .media-progressive, .back-link, footer, .staging-nav'
  )) {
    if (getComputedStyle(el).display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.height) boxes.push({ el, r, s: sel(el) });
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox > 1 && oy > 1) out.overlaps.push(`${a.s} ∩ ${b.s} = ${Math.round(ox)}×${Math.round(oy)}`);
    }
  }

  for (const el of document.querySelectorAll(
    '.proyecto-text, .proyecto-titulo-title, .proyecto-titulo-artist, .role, .proyectos-category-title, dd, dt, .staging-nav a, .staging-nav button'
  )) {
    if (el.scrollWidth > el.clientWidth + 1) {
      out.clipped.push(`${sel(el)} "${el.textContent.trim().slice(0, 30)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
  }
  return out;
};

const browser = await chromium.launch();
let failures = 0;

console.log(`\n══════ LAYOUT (${PAGES.length} pages × ${VIEWPORTS.length} viewports) ══════\n`);
for (const [pname, url] of PAGES) {
  for (const [vname, w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(250);
    const r = await page.evaluate(LAYOUT_PROBE);

    const issues = [];
    if (r.hOverflow > 0) issues.push(`! HORIZONTAL SCROLL +${r.hOverflow}px`);
    r.bleeders.forEach((b) => issues.push(`! off-viewport: ${b}`));
    r.overlaps.forEach((o) => issues.push(`! OVERLAP: ${o}`));
    r.clipped.forEach((c) => issues.push(`! text overflow: ${c}`));
    r.smallTargets.forEach((t) => issues.push(`~ target <24px: ${t}`));
    errors.forEach((e) => issues.push(`! JS ERROR: ${e.slice(0, 120)}`));

    if (issues.length) {
      failures++;
      console.log(`── ${pname} @ ${vname} ${w}×${h}`);
      console.log([...new Set(issues)].map((i) => '   ' + i).join('\n') + '\n');
    }
    await ctx.close();
  }
}
if (!failures) console.log('   all clean\n');

console.log('══════ ACCESSIBILITY (axe-core, menus opened) ══════\n');
for (const [pname, url] of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  // Open every disclosure so axe sees the menu contents (it skips hidden subtrees).
  for (const s of ['#projects-toggle', '#lang-toggle']) await page.click(s).catch(() => {});
  await page.waitForTimeout(200);
  await page.addScriptTag({ content: axeSrc });
  const res = await page.evaluate(async () => await window.axe.run(document, { resultTypes: ['violations'] }));
  console.log(`── ${pname}`);
  if (!res.violations.length) console.log('   none\n');
  for (const v of res.violations) {
    failures++;
    console.log(`   [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node${v.nodes.length > 1 ? 's' : ''})`);
    for (const n of v.nodes.slice(0, 2)) console.log(`      • ${n.html.slice(0, 120).replace(/\s+/g, ' ')}`);
  }
  console.log('');
  await ctx.close();
}

console.log('══════ MOTION ══════\n');
{
  // Everything that moves on its own must stop under prefers-reduced-motion,
  // and anything looping >5s needs a pause affordance (WCAG 2.2.2 / 2.3.1).
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${ROOT}/proyectos/erade-kafi.html`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  const v = await page.evaluate(() => {
    const vids = [...document.querySelectorAll('.media-video')];
    return { total: vids.length, playing: vids.filter((x) => !x.paused).length, withControls: vids.filter((x) => x.controls).length };
  });
  console.log(`── prefers-reduced-motion: ${v.playing}/${v.total} clips still autoplaying, ${v.withControls} with controls`);
  if (v.playing) { failures++; console.log('   ! motion not suppressed under reduced-motion'); }

  await page.goto(`${ROOT}/index.html`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(500);
  const r1 = await page.evaluate(() => document.querySelector('.role')?.textContent);
  await page.waitForTimeout(5000);
  const r2 = await page.evaluate(() => document.querySelector('.role')?.textContent);
  console.log(`── role rotator under reduced-motion: "${r1}" → "${r2}"`);
  if (r1 !== r2) { failures++; console.log('   ! role text still rotating'); }
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ROOT}/directora.html`, { waitUntil: 'networkidle' }).catch(() => {});
  const tile = page.locator('.proyecto-tile[data-posters]').first();
  if (await tile.count()) {
    await tile.hover();
    await page.waitForTimeout(1200);
    const c = await page.evaluate(async () => {
      const t = document.querySelector('.proyecto-tile[data-posters]');
      let n = 0, last = t.style.backgroundImage;
      const t0 = performance.now();
      await new Promise((res) => {
        const id = setInterval(() => {
          if (t.style.backgroundImage !== last) { n++; last = t.style.backgroundImage; }
          if (performance.now() - t0 > 2000) { clearInterval(id); res(); }
        }, 10);
      });
      return { n, s: (performance.now() - t0) / 1000 };
    });
    const hz = c.n / c.s;
    console.log(`── tile poster-flash: ${hz.toFixed(2)} Hz (WCAG 2.3.1 threshold is 3 Hz)`);
    if (hz > 3) { failures++; console.log('   ! above the general flash threshold'); }
  }
  await ctx.close();
}

console.log('\n══════ ROTATION (portrait → landscape → portrait) ══════\n');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${ROOT}/directora.html`, { waitUntil: 'networkidle' }).catch(() => {});
  const snap = async (label) => {
    const s = await page.evaluate(() => ({
      vw: innerWidth, vh: innerHeight,
      filterBar: getComputedStyle(document.querySelector('.proyectos-filter')).display !== 'none',
      dataFilter: document.querySelector('.proyectos-categories').dataset.filter,
      visibleTiles: [...document.querySelectorAll('.proyecto-tile')].filter((t) => t.getBoundingClientRect().width > 0).length,
    }));
    console.log(`   ${label.padEnd(34)} ${s.vw}×${s.vh}  filterBar=${String(s.filterBar).padEnd(5)} filter=${s.dataFilter.padEnd(10)} tiles=${s.visibleTiles}`);
  };
  await snap('initial');
  await page.click('.proyectos-filter button[data-filter="no-ficcion"]').catch(() => {});
  await snap('filtered to no-ficcion');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(200);
  await snap('ROTATED to landscape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await snap('rotated back to portrait');
  await ctx.close();
}

await browser.close();
console.log(`\n${failures ? `${failures} issue group(s) found` : 'no issues found'}\n`);
process.exit(failures ? 1 : 0);
