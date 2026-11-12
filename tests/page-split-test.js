// Each page answers a different question: the Dashboard is the selected
// certification, Analytics is the numbers across all of them, Settings is
// global data. These tests pin that split so a future edit cannot quietly
// re-duplicate a section or put exam-scoped content on a global page.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const DAY = 86400000;

let NODES = [];
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
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].forEach(m =>
    vm.runInContext(fs.readFileSync(P.resolve(m[1]), 'utf8'), ctx, { filename: m[1] }));
  vm.runInContext('globalThis.__x={renderDash,renderRevisit,renderAnalytics,renderSettings,'
    + 'poolFor,qDomainFor,statsFor,simAvailable,EXAM_ORDER,EXAMS,S,'
    + 'byId:id=>document.getElementById(id)};', ctx);
  return ctx.__x;
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);
const headings = () => NODES.filter(n => n._cls && n._cls.has('labsec')).map(n => n.textContent);
const by = c => NODES.filter(n => n._cls && n._cls.has(c));

function fixture() {
  const now = Date.now();
  const history = {}, sessions = [], read = {};
  // answers spread across CCAR-F and CCAO-F, so cross-exam leakage shows up
  const arIds = ['ar-d1-01','ar-d1-03','ar-d2-01','ar-d2-03','ar-d3-01','ar-d4-01'];
  const asIds = ['as-a1-01','as-a1-02','as-a3-01'];
  [10, 8, 5, 3, 1].forEach((d, s) => {
    const base = now - d * DAY;
    arIds.forEach((id, k) => {
      const good = (k / arIds.length) < (0.3 + s * 0.12);
      (history[id] = history[id] || []).push(
        { correct: good, conf: good ? 'sure' : 'guess', ts: base + k * 30000 });
    });
    sessions.push({ ts: base, exam: 'CCAR-F', mode: s % 2 ? 'quick' : 'domain',
                    total: 6, correct: 3, domain: s % 2 ? null : 'd3', ms: 200000 });
  });
  // CCAO-F answers that are all wrong: they must NOT appear on a CCAR-F page
  asIds.forEach(id => { history[id] = [{ correct: false, conf: 'guess', ts: now - 2 * DAY }]; });
  sessions.push({ ts: now - DAY, exam: 'CCAR-F', mode: 'exam', total: 60,
                  correct: 40, scaled: 700, domain: null, ms: 3000000 });
  read['CCAR-F/d1'] = now;
  return { exam: 'CCAR-F', history, sessions, seen: {}, flags: {}, labs: {},
           streak: { last: null, days: 0 }, read, cards: {}, notesOpen: {}, planOrder: 'blueprint' };
}

H('1. The Dashboard owns the selected certification');
{
  // Unlike the other pages, the Dashboard's section headings are static
  // markup that renderDash() fills in, so read them from index.html rather
  // than from the nodes created during a render.
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  const dash = /<section class="view" id="view-dash">([\s\S]*?)<\/section>/.exec(html)[1];
  const secs = [...dash.matchAll(/<h2 class="sec">([^<]+)<\/h2>/g)].map(m => m[1]);
  // "What to work on next" is the domain-level view; the revisit list is the
  // question-level view of the same idea. Both belong to one exam.
  ok(secs.includes('Questions to revisit'), 'the revisit list is here now');
  ok(secs.includes('Domains'), 'alongside the domain table it drills into');
  ok(secs.indexOf('Questions to revisit') > secs.indexOf('Domains'),
     'and it follows the domain table, drilling down rather than up');
  ok(/id="revisitList"/.test(dash), 'with a render target');
  console.log('     sections: ' + secs.join(' | '));

  // It must actually be populated, not just present in the markup.
  const A = boot(fixture());
  A.renderDash();
  ok(by('weakrow').length > 0, 'renderDash fills it in: ' + by('weakrow').length + ' rows');
}

H('2. The retired Progress page left nothing behind');
{
  // Its two pieces went to the pages that already owned their scope.
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  ok(!/id="view-progress"/.test(html), 'the view markup is gone');
  ok(!/id="progBody"/.test(html), 'and its render target');
  ok(typeof boot(fixture()).renderProgress === 'undefined', 'renderProgress no longer exists');
}

H('3. Analytics still has every stats section');
{
  const A = boot(fixture());
  A.renderAnalytics();
  const h = headings();
  ['Accuracy and confidence over time', 'By quiz type', 'Domain drills',
   'How sure you felt', 'Coverage by domain', 'Study material',
   'All certifications', 'Session log'].forEach(x =>
    ok(h.includes(x), x + ' present on Analytics'));
  ok(by('trendbox').length === 1, 'trend graph lives here');
  ok(by('statcard').length > 0, 'headline tiles live here');
}

H('4. The Dashboard does not repeat the Analytics sections');
{
  const A = boot(fixture());
  A.renderDash();
  const h = headings();
  ['Your numbers', 'Accuracy and confidence over time', 'By quiz type',
   'How sure you felt', 'All certifications', 'Session log'].forEach(x =>
    ok(!h.includes(x), x + ' stays on Analytics'));
  ok(by('trendbox').length === 0, 'no trend graph on the Dashboard');
}

H('5. No heading appears twice on any page');
{
  [['Dashboard', 'renderDash'], ['Analytics', 'renderAnalytics'],
   ['Settings', 'renderSettings']].forEach(([name, fn]) => {
    const A = boot(fixture());
    A[fn]();
    const h = headings();
    const dup = h.filter((v, i, a) => a.indexOf(v) !== i);
    ok(dup.length === 0, dup.length ? name + ' repeats: ' + dup.join(', ')
                                    : name + ' has no repeats');
  });
}

H('6. Questions to revisit is scoped to the selected certification');
{
  const A = boot(fixture());
  A.renderRevisit(A.byId('revisitList'));
  const rows = by('weakrow');
  ok(rows.length > 0, rows.length + ' weak questions listed');
  const pool = new Set(A.poolFor('CCAR-F').map(q => q.q));
  const texts = rows.map(r => {
    const col = r.children[0];
    const qt = col.children.find(c => c.innerHTML) || { innerHTML: '' };
    return qt.innerHTML;
  });
  const foreign = texts.filter(t => !pool.has(t));
  ok(foreign.length === 0, foreign.length
    ? foreign.length + ' questions from another exam leaked in'
    : 'every row belongs to CCAR-F');
  ok(by('weakdom').length === rows.length, 'each row is tagged with its domain');
  // The list should be actionable, not just diagnostic.
  const drill = NODES.find(n => n.tag === 'button' && n.textContent === 'Drill');
  ok(!!drill && typeof drill.onclick === 'function', 'each row offers a drill shortcut');
}

H('7. Switching certification changes the revisit list');
{
  const st = fixture();
  st.exam = 'CCAO-F';
  const A = boot(st);
  A.renderRevisit(A.byId('revisitList'));
  const pool = new Set(A.poolFor('CCAO-F').map(q => q.q));
  const rows = by('weakrow');
  ok(rows.length > 0, rows.length + ' weak CCAO-F questions');
  const texts = rows.map(r => {
    const col = r.children[0];
    return (col.children.find(c => c.innerHTML) || {}).innerHTML;
  });
  ok(texts.every(t => pool.has(t)), 'all rows are CCAO-F questions');
}

H('8. Each reset sits on exactly one page, matched to its scope');
{
  let A = boot(fixture());
  A.renderAnalytics();
  let txt = NODES.map(n => n.textContent).join(' ');
  ok(/Reset CCAR-F/.test(txt), 'Analytics offers the per-exam reset');
  ok(!/Reset everything/.test(txt), 'but not the global one');
  A = boot(fixture());
  A.renderSettings();
  txt = NODES.map(n => n.textContent).join(' ');
  ok(/Reset everything/.test(txt), 'Settings offers the global reset');
  ok(!/Reset CCAR-F progress/.test(txt), 'but not the per-exam one');
  A = boot(fixture());
  A.renderDash();
  txt = NODES.map(n => n.textContent).join(' ');
  ok(!/Reset /.test(txt), 'the Dashboard offers neither');
}

H('9. Every page survives an empty state');
{
  [['Dashboard', 'renderDash'], ['Analytics', 'renderAnalytics'],
   ['Settings', 'renderSettings']].forEach(([name, fn]) => {
    const A = boot(null);
    let threw = null;
    try { A[fn](); } catch (e) { threw = e.message; }
    ok(!threw, name + ' renders empty' + (threw ? ': ' + threw : ''));
  });
}

/* One gate drives four separate things: the simulation nav entry, the two
   retired full-length buttons, and the hard-tier button. They must agree,
   because a certification offering a "Timed mock" button next to an Exam
   Simulation — or hiding both and leaving no full-length mode — is the
   failure this consolidation exists to prevent. */
H('The simulation gate drives every mode control consistently');
{
  const A = boot(null);
  A.EXAM_ORDER.forEach(code => {
    A.S.exam = code;
    A.renderDash();
    const here = A.simAvailable(code);
    const hidden = id => { const n = A.byId(id); return n ? !!n.hidden : null; };
    ok(hidden('btnMock') === here,
       code + ': full-length practice ' + (here ? 'hidden' : 'shown'));
    ok(hidden('btnExam') === here,
       code + ': timed mock ' + (here ? 'hidden' : 'shown'));
    if (here) ok(hidden('btnHard') === true,
       code + ': hard tier hidden, its questions are in the simulation');
  });
  /* Exactly one certification has a bank today. If that ever changes the
     count below should be updated deliberately, not silently. */
  ok(A.EXAM_ORDER.filter(c => A.simAvailable(c)).length === 1,
     'one certification has a simulation bank');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Page split tests passed');
process.exit(fail ? 1 : 0);
