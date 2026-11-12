// The analytics page pulls from every store (quizzes, cards, notes, labs),
// so each case checks a number against data it was given.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const DAY = 86400000;

let NODES = [];
let LAST_CTX = null;   // the VM context boot() last built, so bootSim() can extend it
function mk(t) {
  const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', title: '', children: [], onclick: null,
    classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
                 toggle() {}, contains: c => n._cls.has(c) },
    appendChild(c) { n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    addEventListener() {}, removeAttribute() {}, setAttribute(k, v) { n._attrs[k] = v; },
    focus() {}, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232, top: 0, bottom: 0 }), scrollIntoView() {} };
  Object.defineProperty(n, 'className', {
    get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(n, 'innerHTML', { get: () => n._h || '', set: v => { n._h = v; } });
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
    localStorage: { getItem: k => store[k] ?? null, setItem(k, v) { store[k] = v; }, removeItem() {} },
    location: { hash: '' }, history: { pushState() {}, replaceState() {} },
    document: {
      documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {},
                         classList: { add() {}, remove() {} } },
      body: { classList: { add() {}, remove() {} } },
      getElementById: getId,
      querySelector: s => { const m = /^#([\w-]+)$/.exec(s); return m ? getId(m[1]) : null; },
      querySelectorAll: () => [], createElement: mk,
      createElementNS: (ns, t) => mk(t), addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {}, innerHeight: 900,
              matchMedia: () => ({ matches: false, addEventListener() {} }) } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['data-exams.js','data-questions.js','data-questions-2.js','data-questions-3.js',
                   'data-questions-4.js','data-questions-5.js','data-labs.js','data-starters.js',
                   'data-notes.js','app.js'])
    vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f });
  vm.runInContext('globalThis.__p={renderAnalytics,renderAllCerts,cardStats,noteStats,'
    + 'labStats,domainRollup,activityDays,ROUTES,CARDS,NOTES,LABS,EXAMS,EXAM_ORDER,S};', ctx);
  LAST_CTX = ctx;
  return ctx.__p;
}

/* A second boot that also loads the simulation data and sim.js.
   boot() deliberately leaves them out, which is what proves the analytics
   page still renders when they are absent; this one proves the simulation
   pool appears when they are present. */
function bootSim(state) {
  const p = boot(state);
  const ctx = LAST_CTX;
  for (const f of ['data-sim-questions.js', 'data-sim-objectives.js'])
    vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f });
  vm.runInContext('globalThis.__p2={renderAnalytics,renderExposure,simExposureData,'
    + 'simExposureAvailable,SIM_QUESTIONS,S};', ctx);
  return ctx.__p2;
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const by = c => NODES.filter(n => n._cls && n._cls.has(c));
const H = t => console.log(String.fromCharCode(10) + t);

function fixture() {
  const now = Date.now();
  const history = {}, sessions = [], cards = {}, read = {}, labs = {};
  const ids = ['ar-d1-01','ar-d1-03','ar-d2-01','ar-d2-03','ar-d3-01','ar-d4-01'];
  [12, 11, 8, 5, 4, 1, 0].forEach((d, s) => {
    const base = now - d * DAY, imp = s / 6;
    ids.forEach((id, k) => {
      const good = (k / ids.length) < (0.4 + imp * 0.5);
      (history[id] = history[id] || []).push(
        { correct: good, conf: good ? (imp > 0.5 ? 'sure' : 'unsure') : 'guess', ts: base + k * 30000 });
    });
    sessions.push({ ts: base, exam: 'CCAR-F', mode: s % 2 ? 'quick' : 'domain',
                    total: 6, correct: 4, domain: s % 2 ? null : 'd3', ms: 240000 });
  });
  sessions.push({ ts: now - DAY, exam: 'CCAR-F', mode: 'exam', total: 60,
                  correct: 46, scaled: 790, domain: null, ms: 3500000 });
  read['CCAR-F/d1'] = now;
  read['CCAR-F/d3'] = now;
  return { exam: 'CCAR-F', history, sessions, seen: {}, flags: {}, labs,
           streak: { last: null, days: 0 }, read, cards, notesOpen: {}, planOrder: 'blueprint' };
}

H('1. The route is registered');
{
  const A = boot(null);
  ok(A.ROUTES.includes('stats'), 'stats is a real route, so Back works');
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  ok(/id="view-stats"/.test(html), 'view container exists');
  ok(/data-view="stats"/.test(html), 'nav button exists');
  ok(/id="statsBody"/.test(html), 'render target exists');
}

H('2. Renders on a full fixture without throwing');
{
  const A = boot(fixture());
  let threw = null;
  try { A.renderAnalytics(); } catch (e) { threw = e.message; }
  ok(!threw, 'renderAnalytics completed' + (threw ? ': ' + threw : ''));
  ok(by('statcard').length >= 6, by('statcard').length + ' headline tiles');
  ok(by('statstable').length === 5, 'five tables, got ' + by('statstable').length);
  ok(by('matcard').length === 4, 'four study-material cards');
  ok(by('actcell').length === 30, '30-day activity strip');
  ok(by('trendbox').length === 1, 'trend chart present');
  ok(by('statstab').length === 4, 'one tab per certification');
}

H('3. No tile is printed twice');
{
  const A = boot(fixture());
  A.renderAnalytics();
  const labels = by('statcard').map(c =>
    (c.children.find(x => x._cls && x._cls.has('statlabel')) || {}).textContent);
  const dup = labels.filter((v, i, a) => a.indexOf(v) !== i);
  ok(dup.length === 0, dup.length ? 'duplicated: ' + dup.join(', ') : 'all tile labels unique');
}

H('4. Card stats follow the Leitner boxes');
{
  const st = fixture();
  const A0 = boot(st);
  const deck = A0.CARDS.filter(c => c.exam === 'CCAR-F');
  const keys = deck.slice(0, 5).map(c => c.exam + '/' + c.d + '/' + c.f.slice(0, 40));
  const now = Date.now();
  st.cards[keys[0]] = { box: 1, ts: now };
  st.cards[keys[1]] = { box: 4, ts: now - 30 * DAY };   // overdue
  st.cards[keys[2]] = { box: 5, ts: now };              // not due
  const A = boot(st);
  const cs = A.cardStats('CCAR-F');
  ok(cs.total === deck.length, 'deck size ' + deck.length);
  ok(cs.started === 3, '3 cards started, got ' + cs.started);
  ok(cs.boxes[0] === 1 && cs.boxes[3] === 1 && cs.boxes[4] === 1, 'boxes 1/4/5 each hold one');
  ok(cs.mature === 2, '2 mature (boxes 4-5), got ' + cs.mature);
  ok(cs.due === 2, 'box 1 (0d) and the overdue box 4 are due, got ' + cs.due);
}

H('5. Note and lab stats match the data');
{
  const A = boot(fixture());
  const ns = A.noteStats('CCAR-F');
  const total = A.NOTES.filter(n => n.exam === 'CCAR-F').length;
  ok(ns.total === total, total + ' notes for the exam');
  ok(ns.read === 2, '2 marked read, got ' + ns.read);
  ok(ns.mins > 0 && ns.readMins > 0 && ns.readMins < ns.mins, 'reading minutes are a subset');
  const ls = A.labStats('CCAR-F');
  ok(ls.total === A.LABS.filter(l => l.exams.includes('CCAR-F')).length, 'lab count matches');
  ok(ls.cps === 0 && ls.done === 0, 'no checkpoints hit in this fixture');
  ok(ls.cpTotal > 0, 'checkpoint total is real: ' + ls.cpTotal);
}

H('6. Lab checkpoints are counted when present');
{
  const st = fixture();
  const A0 = boot(st);
  const lab = A0.LABS.find(l => l.exams.includes('CCAR-F'));
  st.labs[lab.id] = { checkpoints: { 0: true, 1: true } };
  const A = boot(st);
  const ls = A.labStats('CCAR-F');
  ok(ls.cps === 2, '2 checkpoints counted, got ' + ls.cps);
  ok(ls.touched === 1, '1 lab touched, got ' + ls.touched);
  ok(ls.done === (lab.checkpoints.length === 2 ? 1 : 0), 'done only when every checkpoint is hit');
}

H('7. Activity strip is the right length and lands on today');
{
  const A = boot(fixture());
  const days = A.activityDays('CCAR-F', 30);
  ok(days.length === 30, '30 entries');
  const today = new Date().setHours(0, 0, 0, 0);
  ok(days[29].ts === today, 'last cell is today');
  ok(days[0].ts === today - 29 * DAY, 'first cell is 29 days back');
  ok(days.some(d => d.n > 0), 'some days have answers');
  ok(days.every(d => d.n >= 0), 'no negative counts');
}

H('8. Domain rollup covers every domain');
{
  const A = boot(fixture());
  const roll = A.domainRollup('CCAR-F');
  ok(roll.length === A.EXAMS['CCAR-F'].domains.length, 'one row per domain');
  ok(roll.every(x => x.m && typeof x.m.coverage === 'number'), 'mastery resolved for each');
  const d3 = roll.find(x => x.d.id === 'd3');
  ok(d3.drills === 4, 'd3 drilled 4 times in the fixture, got ' + d3.drills);
  ok(d3.read === true, 'd3 note marked read');
  const d2 = roll.find(x => x.d.id === 'd2');
  ok(d2.drills === 0, 'd2 never drilled alone');
  ok(roll.every(x => x.gap >= 0), 'gap is never negative');
}

H('9. Empty state offers a way in rather than a blank page');
{
  const A = boot(null);
  let threw = null;
  try { A.renderAnalytics(); } catch (e) { threw = e.message; }
  ok(!threw, 'no throw on empty state' + (threw ? ': ' + threw : ''));
  ok(by('emptybox').length === 1, 'empty-state box shown');
  ok(by('statcard').length === 0, 'no tiles');
  ok(by('statstab').length === 4, 'exam tabs still render, so you can switch');
  const btn = NODES.find(n => n.tag === 'button' && typeof n.onclick === 'function'
                              && n.textContent === 'Start a quick mock');
  ok(!!btn, 'a start button is offered');
}

H('10. Every certification renders, not just the selected one');
{
  const st = fixture();
  let bad = [];
  boot(st).EXAM_ORDER.forEach(code => {
    const s2 = JSON.parse(JSON.stringify(st));
    s2.exam = code;
    const A = boot(s2);
    try { A.renderAnalytics(); } catch (e) { bad.push(code + ': ' + e.message); }
  });
  ok(bad.length === 0, bad.length ? bad.join(' | ') : 'all four exams render');
}

H('11. The session log names the domain that was drilled');
{
  const now = Date.now();
  const st = fixture();
  st.sessions = [
    // legacy row: recorded before the domain field existed
    { ts: now - 5 * DAY, exam: 'CCAR-F', mode: 'domain', total: 10, correct: 6 },
    { ts: now - 3 * DAY, exam: 'CCAR-F', mode: 'domain', total: 10, correct: 7,
      domain: 'd3', ms: 360000 },
    { ts: now - 2 * DAY, exam: 'CCAR-F', mode: 'quick', total: 10, correct: 7,
      domain: null, ms: 300000 },
  ];
  const A = boot(st);
  A.renderAnalytics();
  const tables = by('statstable');
  const log = tables.find(t => t.children[0] && t.children[0].children[0]
    && t.children[0].children[0].textContent === 'When');
  ok(!!log, 'session log rendered');
  const rows = log.children.slice(1);
  const typeCell = r => r.children[1];
  const sub = r => (typeCell(r).children[1] || {});
  // newest first
  const drill = rows.find(r => sub(r).title);
  ok(!!drill, 'a drilled row carries the full domain name as a tooltip');
  ok(/^D3/.test(sub(drill).textContent || ''), 'the cell shows the short form: '
     + sub(drill).textContent);
  ok(/Claude Code/.test(sub(drill).title || ''), 'the tooltip has the full name: '
     + sub(drill).title);
  ok(/min/.test(sub(drill).textContent || ''), 'duration still shown alongside');
  // The label matches the button, which says "Quick quiz".
  const quick = rows.find(r => typeCell(r).children[0].textContent === 'Quick quiz');
  ok(!!quick && !sub(quick).title, 'a non-domain session has no domain tooltip');
  const legacy = rows[rows.length - 1];
  ok(typeCell(legacy).children[0].textContent === 'Domain drill',
     'a legacy row still names its type');
  ok(!sub(legacy).title, 'and degrades without a domain rather than guessing');
}

H('The certification table opens the page, above the exam switcher');
{
  // It is the only cross-exam thing here, so it comes before everything
  // that describes a single exam. Compare positions in render order.
  const A = boot(fixture());
  A.renderAnalytics();
  const order = NODES.filter(n =>
    (n._cls && (n._cls.has('certtable') || n._cls.has('statstabs'))));
  const first = order[0];
  ok(!!first && first._cls.has('certtable'),
     'the table renders before the tab strip');
  ok(order.some(n => n._cls.has('statstabs')), 'the tab strip is still there');
}

H('The table is read-only reference, not a second switcher');
{
  // Rows used to be clickable, duplicating the tab strip. Keeping both
  // meant two controls doing one job.
  const A = boot(fixture());
  A.renderAllCerts(mk('div'));
  const rows = NODES.filter(n => n.tag === 'tr');
  const clickable = rows.filter(r => typeof r.onclick === 'function');
  ok(clickable.length === 0, 'no row carries a click handler, got ' + clickable.length);
  const roled = rows.filter(r => r._attrs && r._attrs.role === 'button');
  ok(roled.length === 0, 'and none claims to be a button');
  ok(by('certrow').length === 0, 'the clickable-row class is gone');
  // The selected exam is still marked, so you can see which one is showing.
  ok(rows.some(r => r._cls && r._cls.has('rowon')), 'the current exam is still highlighted');
}

H('The table is simplified to the comparable figures');
{
  const A = boot(fixture());
  A.renderAllCerts(mk('div'));
  // Level bands and the recommended-experience line were pathway detail;
  // they do not help compare the numbers.
  ok(by('lvlrow').length === 0, 'no level band rows');
  ok(by('pexp').length === 0, 'no recommended-experience lines');
  const heads = NODES.filter(n => n.tag === 'th').map(n => n.textContent);
  ok(heads.length === 6, '6 columns, got ' + heads.length + ': ' + heads.join(', '));
  ok(heads[0] === 'Certification' && heads[heads.length - 1] === 'Fee',
     'from Certification to Fee');
  // one row per exam, plus the header
  const rows = NODES.filter(n => n.tag === 'tr');
  ok(rows.length === A.EXAM_ORDER.length + 1,
     'one row per certification plus a header, got ' + rows.length);
}

H('The tab strip is a labelled, accessible switcher');
{
  const A = boot(fixture());
  A.renderAnalytics();
  const tabs = NODES.filter(n => n._cls && n._cls.has('statstab'));
  ok(tabs.length === A.EXAM_ORDER.length, 'one tab per exam, got ' + tabs.length);
  ok(tabs.every(t => typeof t.onclick === 'function'), 'every tab switches');
  const strip = by('statstabs')[0];
  ok(strip && strip._attrs.role === 'tablist', 'the strip is a tablist');
  ok(strip && /certification/i.test(strip._attrs['aria-label'] || ''),
     'with a label saying what it selects');
  const on = tabs.filter(t => t._attrs['aria-selected'] === 'true');
  ok(on.length === 1, 'exactly one tab is marked selected, got ' + on.length);
  ok(by('statslabel').length === 1, 'the strip carries a visible caption');
}

H('The Exam Simulation bank appears as a third exposure pool');
{
  const A = bootSim(fixture());
  ok(A.SIM_QUESTIONS.length > 0, 'the simulation bank loaded (' + A.SIM_QUESTIONS.length + ' questions)');
  ok(A.simExposureAvailable('CCAR-F'), 'the pool is offered for CCAR-F');
  ok(!A.simExposureAvailable('CCDV-F'),
     'and not for the other certifications, which have no simulation bank');

  // With nothing attempted, every question sits in the "never asked" bucket.
  const fresh = A.simExposureData();
  ok(fresh[0].total === A.SIM_QUESTIONS.length,
     'with no sittings, the whole bank is unseen (' + fresh[0].total + ')');
  ok(fresh.reduce((n, b) => n + b.total, 0) === A.SIM_QUESTIONS.length,
     'the buckets account for every question exactly once');

  /* Two sittings over the same questions. The point of the check: the bar a
     question lands in is how many sittings asked it, and right/wrong follows
     the MOST RECENT sitting — so a question answered wrong and then right
     counts as right. */
  const ids = A.SIM_QUESTIONS.slice(0, 4).map(q => q.id);
  A.S.simAttempts = [
    { ts: 1000, exam: 'CCAR-F', answers: { [ids[0]]: { ok: false }, [ids[1]]: { ok: true }, [ids[2]]: { ok: true } } },
    { ts: 2000, exam: 'CCAR-F', answers: { [ids[0]]: { ok: true }, [ids[1]]: { ok: false }, [ids[3]]: { ok: true } } },
    { ts: 3000, exam: 'CCDV-F', answers: { [ids[2]]: { ok: false } } }
  ];
  const d = A.simExposureData();
  ok(d[2].total === 2, 'two questions were asked in both sittings, got ' + d[2].total);
  ok(d[2].right === 1 && d[2].wrong === 1,
     'the latest sitting decides right/wrong, got ' + d[2].right + ' right / ' + d[2].wrong + ' wrong');
  ok(d[1].total === 2 && d[1].right === 2,
     'two questions were asked once and are right, got ' + d[1].total + '/' + d[1].right);
  ok(d.reduce((n, b) => n + b.total, 0) === A.SIM_QUESTIONS.length,
     'the totals still cover the whole bank after attempts');

  // A simulation attempt under another exam must not leak into this pool.
  const asked = d.reduce((n, b, i) => i ? n + b.total : n, 0);
  ok(asked === 4, 'only the CCAR-F sittings are counted, got ' + asked + ' questions asked');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Analytics page tests passed');
process.exit(fail ? 1 : 0);
