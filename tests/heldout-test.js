/* The held-out pool, under its current contract.
 *
 * It was originally reserved: no drill could serve one, because the
 * full-length recall sittings were built from it and a question already
 * drilled is no test. Those sittings are retired wherever an Exam Simulation
 * exists, so for those certifications the reservation has been lifted and the
 * quick quiz draws from both pools.
 *
 * What still holds everywhere, and is what these tests pin:
 *   - the two pools stay disjoint as DATA — a question is in one or the other;
 *   - domain and weak drills are drill-only, so working a domain cannot be
 *     diluted by questions reserved for a sitting;
 *   - where no simulation exists, the old reservation is untouched.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const DAY = 86400000;

function mk(t) {
  const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', title: '', children: [], onclick: null, hidden: false, disabled: false,
    classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
                 toggle() {}, contains: c => n._cls.has(c) },
    appendChild(c) { n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    addEventListener() {}, removeAttribute() {}, setAttribute() {}, focus() {},
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232 }), scrollIntoView() {} };
  n.style.setProperty = (k, v) => { n.style[k] = v; };
  Object.defineProperty(n, 'className', { get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(n, 'innerHTML', { get: () => n._h || '',
    set: v => { n._h = v; if (!v) n.children = []; } });
  return n;
}

function boot(state) {
  const store = { 'claude-cert-trainer-v1': state ? JSON.stringify(state) : null };
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const ctx = { console, structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
    parseInt, parseFloat, isFinite, setTimeout() {}, setInterval: () => 1, clearInterval() {},
    performance: { now: () => 0 }, alert() {}, confirm: () => true, CSS: { escape: x => String(x) },
    localStorage: { getItem: k => store[k] ?? null, setItem(k, v) { store[k] = v; }, removeItem() {} },
    location: { hash: '' }, history: { pushState() {}, replaceState() {} },
    document: { documentElement: { style: { setProperty() {} }, setAttribute() {},
        removeAttribute() {}, classList: { add() {}, remove() {} } },
      body: { classList: { add() {}, remove() {} } }, getElementById: getId,
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
  vm.runInContext('globalThis.__h={poolFor,allFor,reachableFor,hardFor,planFor,pickQuestions,domainMastery,simAvailable,'
    + 'exposureData,exposureChart,QUESTIONS,EXAMS,EXAM_ORDER,S};', ctx);
  return ctx.__h;
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

H('1. The two pools are disjoint');
{
  const A = boot(null);
  const drill = A.poolFor('CCAR-F');
  const held = A.poolFor('CCAR-F', { held: true });
  const ids = new Set(drill.map(q => q.id));
  const overlap = held.filter(q => ids.has(q.id));
  ok(overlap.length === 0, 'no question appears in both, drill ' + drill.length
     + ' / held ' + held.length);
  ok(held.length > 0, held.length + ' held-out questions exist');
  ok(held.every(q => q.heldOut === true), 'every held question carries the flag');
  ok(drill.every(q => !q.heldOut), 'no drill question carries the flag');
}

H('2. The held-out set can fill a full sitting, by blueprint weight');
{
  const A = boot(null);
  const need = A.EXAMS['CCAR-F'].questions;
  const held = A.poolFor('CCAR-F', { held: true });
  ok(held.length >= need, held.length + ' held questions for a ' + need + '-question exam');
  const byDom = {};
  held.forEach(q => { byDom[q.d] = (byDom[q.d] || 0) + 1; });
  let short = [];
  A.EXAMS['CCAR-F'].domains.forEach(d => {
    const want = Math.floor(need * d.weight / 100);
    const have = byDom[d.id] || 0;
    if (have < want) short.push(d.id + ' needs ' + want + ' has ' + have);
  });
  ok(short.length === 0, short.length ? short.join('; ')
     : 'every domain has enough for its blueprint share');
}

H('3. Domain and weak drills stay drill-only');
{
  const A = boot(null);
  let leaked = 0;
  for (let i = 0; i < 40; i++) {
    [['domain', { domain: 'd3' }], ['weak', { weakOnly: true }]].forEach(([, opts]) => {
      leaked += A.pickQuestions('CCAR-F', 10, opts).filter(q => q.heldOut).length;
    });
  }
  ok(leaked === 0, leaked ? leaked + ' held questions leaked into a domain or weak drill'
                          : 'none leaked over 80 drills');
}

H('3b. Quick quiz draws both pools where a simulation exists');
{
  const A = boot(null);
  /* poolFor is the seam the quick branch uses. Asserting on it rather than on
     a sampled quiz keeps this deterministic — a 10-question draw from 219
     could miss the held-out ones by chance and fail intermittently. */
  const both  = A.poolFor('CCAR-F', { held: 'any' });
  const drill = A.poolFor('CCAR-F', { held: false });
  const held  = A.poolFor('CCAR-F', { held: true });
  ok(both.length === drill.length + held.length,
     'held:any spans both pools: ' + drill.length + ' + ' + held.length + ' = ' + both.length);
  ok(both.some(q => q.heldOut) && both.some(q => !q.heldOut),
     'and genuinely contains questions from each');
  ok(A.simAvailable('CCAR-F'), 'CCAR-F has a simulation, so its quick quiz uses that pool');

  /* An exam with no simulation keeps the old reservation, because its
     full-length mock is still the only full-length sitting it has. CCDV-F
     joined CCAR-F with a simulation on 2026-11-24, so two remain without. */
  ok(A.simAvailable('CCDV-F'), 'CCDV-F has a simulation too, so its quick quiz uses that pool');
  const noSim = ['CCAO-F', 'CCAR-P'].filter(c => !A.simAvailable(c));
  ok(noSim.length === 2, 'the other two have no simulation bank yet');
}

H('4. Exam modes draw only from the held-out pool');
{
  const A = boot(null);
  let drilled = 0, total = 0;
  for (let i = 0; i < 10; i++) {
    const list = A.pickQuestions('CCAR-F', 60, { weighted: true, held: true });
    total += list.length;
    drilled += list.filter(q => !q.heldOut).length;
  }
  ok(drilled === 0, drilled ? drilled + ' drill questions appeared in an exam' : 'every exam question is held-out');
  ok(total > 0, 'exams drew ' + Math.round(total / 10) + ' questions on average');
}

H('5. A held-out answer still counts toward mastery');
{
  const A0 = boot(null);
  const h = A0.poolFor('CCAR-F', { held: true }).find(q => q.d === 'd1');
  const st = { exam: 'CCAR-F', history: { [h.id]: [{ correct: true, conf: 'sure',
    ts: Date.now(), exam: 'CCAR-F' }] }, seen: {}, flags: {}, labs: {},
    streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {}, planOrder: 'blueprint' };
  const A = boot(st);
  const m = A.domainMastery('CCAR-F', 'd1');
  ok(m.answered === 1, 'the held-out answer is counted, got ' + m.answered);
  ok(m.total > A.poolFor('CCAR-F').filter(q => q.d === 'd1').length,
     'the domain total spans both pools (' + m.total + ')');
}

H('6. Every exam can start a sitting, with or without a held-out set');
{
  const A = boot(null);
  let bad = [];
  A.EXAM_ORDER.forEach(code => {
    const held = A.poolFor(code, { held: true });
    const drill = A.poolFor(code);
    if (!drill.length) bad.push(code + ' has no drill pool');
    // an exam with no held-out set must still produce a sitting
    const list = A.pickQuestions(code, A.EXAMS[code].questions, { weighted: true, held: held.length > 0 });
    if (held.length === 0 && list.length === 0) bad.push(code + ' cannot produce an exam');
  });
  ok(bad.length === 0, bad.length ? bad.join('; ') : 'every exam can still start a sitting');
}

H('6b. Each held-out pool is deep enough for a full sitting');
{
  // All four exams now have a held-out bank. The point of the bank is that a
  // practice exam never reuses a drilled question, so the pool has to cover a
  // whole sitting on its own — otherwise pickQuestions falls back and the
  // guarantee quietly lapses.
  const A = boot(null);
  let bad = [];
  A.EXAM_ORDER.forEach(code => {
    const n = A.poolFor(code, { held: true }).length;
    const need = A.EXAMS[code].questions;
    if (n < need) bad.push(code + ' has ' + n + ' held for a ' + need + '-question sitting');
  });
  ok(bad.length === 0, bad.length ? bad.join('; ') : 'every exam has a full sitting held back');
}

H('6c. A held-out sitting draws nothing from the drill pool');
{
  const A = boot(null);
  let bad = [];
  A.EXAM_ORDER.forEach(code => {
    const drilled = new Set(A.poolFor(code).map(q => q.id));
    const list = A.pickQuestions(code, A.EXAMS[code].questions, { weighted: true, held: true });
    const leaked = list.filter(q => drilled.has(q.id));
    if (leaked.length) bad.push(code + ' leaked ' + leaked.length + ' drilled question(s)');
    if (!list.length) bad.push(code + ' produced an empty sitting');
  });
  ok(bad.length === 0, bad.length ? bad.join('; ') : 'no drilled question appears in a held-out sitting');
}

H('7. No held-out bank has a length tell of its own');
{
  const A = boot(null);
  const len = s => String(s).replace(/<[^>]+>/g, '').length;
  let bad = [];
  A.EXAM_ORDER.forEach(code => {
    const held = A.poolFor(code, { held: true }).filter(q => !q.multi);
    if (!held.length) return;
    let longest = 0;
    const gaps = [];
    held.forEach(q => {
      const a = Array.isArray(q.a) ? q.a[0] : q.a;
      const L = q.opts.map(len);
      const g = L[a] - Math.max(...L.filter((_, i) => i !== a));
      gaps.push(g);
      if (g > 0) longest++;
    });
    gaps.sort((a, b) => a - b);
    const share = Math.round(longest / held.length * 100);
    const max = gaps[gaps.length - 1];
    console.log('     ' + code + '  longest-is-correct ' + share + '%, median gap '
      + gaps[Math.floor(gaps.length / 2)] + ', max ' + max);
    if (share > 55) bad.push(code + ' at ' + share + '%');
    if (max >= 60) bad.push(code + ' has a ' + max + ' char tell');
  });
  ok(bad.length === 0, bad.length ? bad.join('; ') : 'every held-out bank is inside 55% and under a 60-char gap');
}

H('8. Exposure charts, one per pool');
{
  const now = Date.now();
  const A0 = boot(null);
  const drill = A0.poolFor('CCAR-F');
  const held = A0.poolFor('CCAR-F', { held: true });
  const history = {};
  // three drill questions asked twice, two held asked once
  drill.slice(0, 3).forEach(q => { history[q.id] = [
    { correct: false, conf: 'guess', ts: now - 2 * DAY, exam: 'CCAR-F' },
    { correct: true,  conf: 'sure',  ts: now - DAY,     exam: 'CCAR-F' }]; });
  held.slice(0, 2).forEach(q => { history[q.id] = [
    { correct: false, conf: 'guess', ts: now, exam: 'CCAR-F' }]; });
  const st = { exam: 'CCAR-F', history, sessions: [], seen: {}, flags: {}, labs: {},
    streak: { last: null, days: 0 }, read: {}, cards: {}, planOrder: 'blueprint' };
  const A = boot(st);
  const d = A.exposureData('CCAR-F', false);
  const two = d.find(b => b.n === 2);
  ok(two && two.total === 3, '3 drill questions in the "asked twice" bucket');
  ok(two && two.right === 3 && two.wrong === 0,
     'split by the LATEST attempt, so all 3 count as right');
  // The chart counts the hard tier too — those are questions you can be
  // asked, so leaving them out would understate the bank. Compare against
  // the pool the chart actually draws from, not the default drill pool.
  const drillAll = A.poolFor('CCAR-F', { hard: 'any' }).length;
  const zero = d.find(b => b.n === 0);
  ok(zero.total === drillAll - 3, 'the rest sit in the unseen column');
  ok(d.reduce((s, b) => s + b.total, 0) === drillAll,
     'every drill question appears exactly once across the buckets');
  const h = A.exposureData('CCAR-F', true);
  const one = h.find(b => b.n === 1);
  ok(one && one.total === 2 && one.wrong === 2, 'held pool counted separately, 2 wrong');
  ok(h.reduce((s, b) => s + b.total, 0)
       === A.poolFor('CCAR-F', { held: true, hard: 'any' }).length,
     'every held question appears exactly once');
  // the two pools must not bleed into each other
  ok(!d.some((b, i) => i > 0 && b.total && h[i] && b.total === h[i].total && b.total > 2),
     'the two charts are built from different pools');
}

H('9. Coverage is measured against what can be served');
{
  /* Coverage used to divide by every question in the domain. The domain
     drill serves only the drill pool, so on CCAR-P D1 drilling all fifteen
     drill questions read as 48% — and the study plan's quiz step, which
     wanted half, could never be ticked by quizzing the domain. Users read
     the stuck figure as questions never being served. */
  const A0 = boot(null);
  const drill = A0.poolFor('CCAR-P').filter(q => q.d === 'p1');
  const hist = {};
  drill.forEach(q => { hist[q.id] = [{ correct: true, conf: 'sure', ts: Date.now() - 86400000, exam: 'CCAR-P' }]; });
  const A = boot({ exam: 'CCAR-P', history: hist, seen: {}, flags: {}, labs: {},
    streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {}, planOrder: 'blueprint' });
  const m = A.domainMastery('CCAR-P', 'p1');
  ok(m.drill.answered === drill.length && m.drill.coverage === 1,
     'every drill question answered reads as ' + Math.round(m.drill.coverage * 100) + '% of the drill pool');
  ok(m.coverage < 1 && m.total > m.drill.total,
     'while whole-domain coverage still counts the held-out remainder (' + m.answered + '/' + m.total + ')');
  const step = A.planFor('CCAR-P').find(r => r.d.id === 'p1').steps.find(st => st.k === 'quiz');
  ok(step && step.done, 'and the study plan\'s quiz step can be completed by drilling the domain');

  /* Where a simulation has retired the hard mode, its questions have no entry
     point, so they leave the denominator; elsewhere the mode is offered and
     they stay in. The button and the coverage figure share one rule. */
  const noHard = A0.reachableFor('CCAR-F');
  ok(A0.hardFor('CCAR-F').length > 0 && !noHard.some(q => q.difficulty === 'hard' || q.difficulty === 'expert'),
     'CCAR-F coverage leaves out the ' + A0.hardFor('CCAR-F').length + ' hard questions no mode serves');
  ok(noHard.some(q => q.heldOut), 'but keeps its held-out questions, which the quick quiz serves');
  ok(A0.reachableFor('CCDV-F').length === A0.allFor('CCDV-F').length,
     'an exam with the hard mode on offer counts every question');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Held-out pool tests passed');
process.exit(fail ? 1 : 0);
