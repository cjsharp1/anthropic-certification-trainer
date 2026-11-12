// Drive renderStats against a realistic history and inspect the DOM it builds.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const DAY = 86400000;

let NODES = [];
function mk(tag) {
  const n = { tag: tag || 'div', _cls: new Set(), dataset: {}, style: {}, hidden: false,
    textContent: '', title: '', value: '', children: [], onclick: null, _attrs: {},
    classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
                 toggle() {}, contains: c => n._cls.has(c) },
    appendChild(c) { n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    addEventListener() {}, removeAttribute() {},
    setAttribute(k, v) { n._attrs[k] = v; }, focus() {},
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232, top: 0, bottom: 0 }), scrollIntoView() {} };
  // elements carry CSS custom properties (--v on history dots)
  n.style.setProperty = (k, v) => { n.style[k] = v; };
  Object.defineProperty(n, 'className', {
    get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  // Setting innerHTML to '' detaches the children, as a browser does;
  // without this a re-render leaves stale nodes behind.
  Object.defineProperty(n, 'innerHTML', { get: () => n._h || '',
    set: v => { n._h = v; if (!v) n.children = []; } });
  NODES.push(n);
  return n;
}

function boot(state) {
  NODES = [];
  const store = { 'claude-cert-trainer-v1': state ? JSON.stringify(state) : null };
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const ctx = { console, structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
    parseInt, parseFloat, isFinite, setTimeout() {}, setInterval: () => 1, clearInterval() {},
    performance: { now: () => 0 }, alert() {}, confirm: () => true, CSS: { escape: x => String(x) },
    localStorage: { getItem: k => store[k] ?? null, setItem(k, v) { store[k] = v; },
                    removeItem(k) { delete store[k]; } },
    location: { hash: '' }, history: { pushState() {}, replaceState() {} },
    document: {
      documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {},
                         classList: { add() {}, remove() {} } },
      body: { classList: { add() {}, remove() {} } },
      getElementById: getId,
      querySelector: s => { const m = /^#([\w-]+)$/.exec(s); return m ? getId(m[1]) : null; },
      querySelectorAll: () => [],
      createElement: mk,
      createElementNS: (ns, t) => mk(t),
      addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {}, innerHeight: 900,
              matchMedia: () => ({ matches: false, addEventListener() {} }) } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['data-exams.js','data-questions.js','data-questions-2.js','data-questions-3.js',
                   'data-questions-4.js','data-questions-5.js','data-labs.js','data-starters.js',
                   'data-notes.js','app.js'])
    vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f });
  vm.runInContext('globalThis.__r={renderStats,trendChart,confTrend,S};', ctx);
  return { api: ctx.__r, mk };
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const find = cls => NODES.filter(n => n._cls && n._cls.has(cls));

// A plausible three-week history across several modes.
function realistic() {
  const now = Date.now();
  const history = {}, sessions = [];
  const ids = ['ar-d1-01','ar-d1-03','ar-d2-01','ar-d2-03','ar-d3-01','ar-d4-01','ar-d5-01'];
  let day = 20;
  for (let s = 0; s < 6; s++, day -= 3) {
    const base = now - day * DAY;
    const improving = s / 5;                       // accuracy climbs over time
    ids.forEach((id, k) => {
      const correct = (k / ids.length) < (0.4 + improving * 0.5);
      const conf = correct ? (improving > 0.5 ? 'sure' : 'unsure') : 'guess';
      (history[id] = history[id] || []).push({ correct, conf, ts: base + k * 40000 });
    });
    sessions.push({ ts: base, exam: 'CCAR-F', mode: s % 3 === 0 ? 'domain' : 'quick',
                    total: ids.length, correct: ids.filter((_, k) => (k / ids.length) < (0.4 + improving * 0.5)).length,
                    domain: s % 3 === 0 ? 'd3' : null, ms: 7 * 45000 });
  }
  sessions.push({ ts: now - 2 * DAY, exam: 'CCAR-F', mode: 'exam', total: 60, correct: 44,
                  scaled: 760, domain: null, ms: 3600000 });
  return { exam: 'CCAR-F', history, sessions, seen: {}, flags: {}, labs: {},
           streak: { last: null, days: 0 }, read: {}, cards: {}, notesOpen: {},
           planOrder: 'blueprint' };
}

console.log('\n1. Renders without throwing, on real data');
{
  const { api } = boot(realistic());
  const wrap = mk('div');
  let threw = null;
  try { api.renderStats(wrap, 'CCAR-F'); } catch (e) { threw = e.message; }
  ok(!threw, 'renderStats completed' + (threw ? ': ' + threw : ''));
  ok(find('statcard').length >= 5, find('statcard').length + ' stat tiles rendered');
  ok(find('statstable').length === 2, 'two tables (by type, by domain), got ' + find('statstable').length);
  ok(find('trendbox').length === 1, 'trend box rendered');
  ok(find('confmix').length === 1, 'confidence mix bar rendered');
}

console.log('\n2. The graph has real geometry');
{
  const { api } = boot(realistic());
  const pts = api.confTrend('CCAR-F');
  ok(pts.length >= 3, pts.length + ' sittings plotted');
  NODES = [];
  const svg = api.trendChart(pts);
  const paths = NODES.filter(n => n.tag === 'path');
  ok(paths.length === 2, 'two series drawn, got ' + paths.length);
  paths.forEach((p, i) => {
    const d = p._attrs.d || '';
    const nums = d.match(/-?\d+(\.\d+)?/g) || [];
    ok(nums.length === pts.length * 2, 'series ' + i + ' has a point per sitting');
    ok(!/NaN|Infinity/.test(d), 'series ' + i + ' has no NaN in its path');
  });
  const dots = NODES.filter(n => n.tag === 'circle');
  ok(dots.length === pts.length, 'one dot per sitting, got ' + dots.length);
  ok(NODES.filter(n => n.tag === 'title').length === pts.length, 'each dot has a tooltip');
  ok(svg._attrs.viewBox === '0 0 720 210', 'viewBox set');
}

console.log('\n3. Values stay inside the plot area');
{
  const { api } = boot(realistic());
  const pts = api.confTrend('CCAR-F');
  NODES = [];
  api.trendChart(pts);
  const ys = NODES.filter(n => n.tag === 'circle').map(n => Number(n._attrs.cy));
  ok(ys.every(v => v >= 14 && v <= 184), 'all dots within the 14..184 band');
  const xs = NODES.filter(n => n.tag === 'circle').map(n => Number(n._attrs.cx));
  ok(xs.every(v => v >= 38 && v <= 706), 'all dots within the horizontal padding');
  ok(xs.every((v, i) => i === 0 || v > xs[i - 1]), 'x increases monotonically');
}

console.log('\n4. A single sitting degrades to a message, not a broken chart');
{
  const now = Date.now();
  const { api } = boot({ exam: 'CCAR-F', sessions: [], history: {
    'ar-d1-01': [{ correct: true, conf: 'sure', ts: now - DAY }] } });
  const wrap = mk('div');
  api.renderStats(wrap, 'CCAR-F');
  ok(find('trendbox').length === 0, 'no chart with one sitting');
  ok(find('statcard').length > 0, 'tiles still render');
}

console.log('\n5. Empty state is handled');
{
  const { api } = boot(null);
  const wrap = mk('div');
  let threw = null;
  try { api.renderStats(wrap, 'CCAR-F'); } catch (e) { threw = e.message; }
  ok(!threw, 'no throw on empty state' + (threw ? ': ' + threw : ''));
  ok(find('statcard').length === 0, 'no tiles');
  ok(find('trendbox').length === 0, 'no chart');
}

console.log('\n6. Numbers shown match the underlying data');
{
  const st = realistic();
  const { api } = boot(st);
  const wrap = mk('div');
  api.renderStats(wrap, 'CCAR-F');
  const total = Object.values(st.history).reduce((n, h) => n + h.length, 0);
  const nums = find('statnum').map(n => n.textContent);
  ok(nums.includes(String(total)), 'answer count ' + total + ' appears, saw ' + nums.join('/'));
  // the by-type table should list the practice exam exactly once
  const cells = NODES.filter(n => n.tag === 'td').map(n => n.textContent);
  ok(cells.includes('Practice exam'), 'practice exam row present');
  ok(cells.includes('Domain drill'), 'domain drill row present');
}

console.log(fail ? '\n' + fail + ' FAILURES' : '\nRender tests passed');
process.exit(fail ? 1 : 0);
