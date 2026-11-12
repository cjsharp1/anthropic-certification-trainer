// Two fixes under test: repeated drills must stop serving the same set, and
// option order must vary without breaking grading.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const DAY = 86400000;

let NODES = [];
function mk(t) {
  const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', title: '', children: [], onclick: null, hidden: false, disabled: false,
    classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
                 toggle: (c, f) => { const on = f === undefined ? !n._cls.has(c) : f;
                                     if (on) n._cls.add(c); else n._cls.delete(c); return on; },
                 contains: c => n._cls.has(c) },
    appendChild(c) { n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    addEventListener() {}, removeAttribute() {}, setAttribute(k, v) { n._attrs[k] = v; },
    focus() {}, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232 }), scrollIntoView() {} };
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
  const store = { 'claude-cert-trainer-v1': JSON.stringify(state) };
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const qOpts = getId('qOpts');
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
      querySelectorAll: s => (s === '#qOpts .opt' ? qOpts.children : []),
      createElement: mk, createElementNS: (ns, t) => mk(t), addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {}, innerHeight: 900,
              matchMedia: () => ({ matches: false, addEventListener() {} }) } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].forEach(m =>
    vm.runInContext(fs.readFileSync(P.resolve(m[1]), 'utf8'), ctx, { filename: m[1] }));
  vm.runInContext('globalThis.__t={pickQuestions,priorityShuffle,shuffleOptions,poolFor,'
    + 'startQuiz,renderQuiz,grade,answersOf,QUESTIONS,S,getQ:()=>Q,setQ:v=>{Q=v;}};', ctx);
  return { api: ctx.__t, qOpts, ctx };
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

function blank() {
  return { exam: 'CCAR-F', history: {}, seen: {}, flags: {}, labs: {},
           streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {},
           notesOpen: {}, planOrder: 'blueprint' };
}

H('1. Repeated drills keep circulating the pool');
{
  // Answer a third wrong each round, all in one sitting -- the case that
  // previously locked onto the same ten questions every time.
  //
  // Selection is randomised now, so one 6-round trial is far too small a
  // sample to assert on: a single round legitimately spikes to 8 or 9.
  // Average over several trials instead, which is what actually
  // characterises the behaviour.
  const TRIALS = 12;
  const now = Date.now();
  const allReps = [];
  const distincts = [];
  let firstRun = null;
  for (let t = 0; t < TRIALS; t++) {
    const st = blank();
    const rounds = [];
    for (let r = 0; r < 6; r++) {
      const { api } = boot(st);
      const list = api.pickQuestions('CCAR-F', 10, { domain: 'd3' });
      rounds.push(list.map(q => q.id));
      list.forEach((q, i) => {
        const good = (i % 3) !== 0;
        (st.history[q.id] = st.history[q.id] || []).push(
          { correct: good, conf: good ? 'sure' : 'guess', ts: now });
        st.seen[q.id] = (st.seen[q.id] || 0) + 1;
      });
    }
    const reps = [];
    for (let i = 1; i < rounds.length; i++) {
      const prev = new Set(rounds[i - 1]);
      reps.push(rounds[i].filter(x => prev.has(x)).length);
    }
    if (!firstRun) firstRun = reps;
    allReps.push(...reps);
    distincts.push(new Set(rounds.flat()).size);
  }
  const avg = allReps.reduce((a, b) => a + b, 0) / allReps.length;
  const worst = Math.max(...allReps);
  const avgDistinct = distincts.reduce((a, b) => a + b, 0) / distincts.length;
  console.log('     one trial: ' + firstRun.join(', ') + '   (before the fix: 0,1,4,10,9)');
  console.log('     over ' + TRIALS + ' trials: mean overlap ' + avg.toFixed(1)
    + '/10, worst single round ' + worst + ', mean distinct ' + avgDistinct.toFixed(1) + '/28');
  // A uniform draw of 10 from 28 would repeat 3.6/10 on average. Beating that
  // shows just-answered questions really are pushed down, not merely shuffled.
  ok(avg < 3.6, 'mean overlap ' + avg.toFixed(1) + '/10 beats a uniform draw (3.6)');
  // No round should ever come back wholesale, which is the reported bug.
  ok(worst < 10, 'no round is a complete repeat, worst was ' + worst);
  ok(avgDistinct >= 20, 'most of the 28-question pool is reached, mean ' + avgDistinct.toFixed(1));
}

H('2. Selection is not deterministic');
{
  const st = blank();
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    const { api } = boot(st);
    seen.add(api.pickQuestions('CCAR-F', 10, { domain: 'd3' }).map(q => q.id).join(','));
  }
  ok(seen.size >= 6, seen.size + ' distinct selections from 8 identical calls');
}

H('3. Weak questions are favoured over solid ones');
{
  // Every question gets history, so nothing is "unseen" -- unseen items
  // legitimately outrank everything and would mask the comparison.
  const st = blank();
  const now = Date.now();
  const { api: probe } = boot(st);
  // drill pool only: held-out questions are never served here
  const pool = probe.poolFor('CCAR-F').filter(q => q.d === 'd3');
  const weak = pool.slice(0, 4).map(q => q.id);
  const solid = pool.slice(4).map(q => q.id);
  weak.forEach(id => { st.history[id] = [{ correct: false, conf: 'guess', ts: now - 7 * DAY }]; });
  solid.forEach(id => { st.history[id] = [{ correct: true, conf: 'sure', ts: now - 7 * DAY }]; });
  let weakHits = 0, solidHits = 0, runs = 40;
  for (let i = 0; i < runs; i++) {
    const { api } = boot(st);
    const got = api.pickQuestions('CCAR-F', 10, { domain: 'd3' }).map(q => q.id);
    weakHits += got.filter(id => weak.includes(id)).length;
    solidHits += got.filter(id => solid.includes(id)).length;
  }
  const weakRate = weakHits / (runs * weak.length);
  const solidRate = solidHits / (runs * solid.length);
  console.log('     weak appear ' + Math.round(weakRate * 100) + '% of their chances, solid '
              + Math.round(solidRate * 100) + '%');
  ok(weakRate > solidRate * 1.8, 'weak questions are at least 1.8x likelier than solid ones');
  // 4 weak questions competing for 10 slots: a purely weighted draw would
  // still take them nearly always, so only assert they do not crowd out
  // the rest of the pool entirely.
  // 4 weak questions compete for 10 slots against the rest of the pool, so
  // the solid rate is roughly (10-4)/(pool-4). The threshold tracks the pool
  // size rather than a fixed number, which broke when the bank grew.
  const expected = 6 / (pool.length - 4);
  ok(solidRate > expected * 0.6, 'solid questions still fill the remaining slots ('
     + Math.round(solidRate*100) + '%, expected about ' + Math.round(expected*100) + '%)');
  ok(solidRate > 0.02, 'solid questions still resurface occasionally for retention');
}

H('4. A question answered moments ago is pushed down');
{
  const st = blank();
  const now = Date.now();
  const { api: probe } = boot(st);
  const pool = probe.QUESTIONS.filter(q =>
    (Array.isArray(q.exam) ? q.exam : [q.exam]).includes('CCAR-F') && q.d === 'd3');
  const justDone = pool.slice(0, 10).map(q => q.id);
  justDone.forEach(id => { st.history[id] = [{ correct: false, conf: 'guess', ts: now }];
                           st.seen[id] = 1; });
  let hits = 0, runs = 30;
  for (let i = 0; i < runs; i++) {
    const { api } = boot(st);
    hits += api.pickQuestions('CCAR-F', 10, { domain: 'd3' })
      .filter(q => justDone.includes(q.id)).length;
  }
  const avg = hits / runs;
  console.log('     of 10 just-answered questions, ' + avg.toFixed(1) + ' come back next round');
  ok(avg < 6, 'fewer than 6 of the 10 just-answered return immediately');
}

H('5. Option order varies but stays internally consistent');
{
  const { api } = boot(blank());
  const q = api.QUESTIONS.find(x => x.opts.length === 4 && !x.multi);
  const orders = new Set();
  for (let i = 0; i < 30; i++) orders.add(api.shuffleOptions(q).join(''));
  ok(orders.size > 1, orders.size + ' distinct option orders produced');
  [...orders].forEach(o => {
    const sorted = o.split('').map(Number).sort().join('');
    if (sorted !== '0123') { ok(false, 'order ' + o + ' is not a permutation'); }
  });
  ok(true, 'every order is a complete permutation, no option lost or duplicated');
}

H('6. Grading still works with shuffled options');
{
  const { api, qOpts } = boot(blank());
  api.startQuiz('domain', { domain: 'd3' });
  const Q = api.getQ();
  // Clicking one option only grades a single-answer question; on a
  // multi-select it just toggles selection. Advance to a single-answer
  // question rather than depending on which one was drawn.
  while (Q.list[Q.i].multi && Q.i < Q.list.length - 1) { Q.i++; api.renderQuiz(); }
  const q = Q.list[Q.i];
  const order = Q.order[Q.i];
  ok(!!order, 'an order was recorded for the question');
  ok(qOpts.children.length === q.opts.length, 'every option rendered');

  // click the button whose ORIGINAL index is the correct answer
  const correct = api.answersOf(q)[0];
  const pos = order.indexOf(correct);
  ok(pos >= 0, 'the correct answer is somewhere in the shuffled list (position ' + pos + ')');
  qOpts.children[pos].onclick();
  ok(api.getQ().lastOK === true, 'clicking the right answer grades as correct');
  // and the button painted 'right' is the one at that display position
  ok(qOpts.children[pos]._cls.has('right'), 'the clicked button is marked right');
  const wrongMarked = qOpts.children.filter((b, i) => i !== pos && b._cls.has('right'));
  ok(wrongMarked.length === 0, 'no other button is marked right');
}

H('7. Picking a wrong answer grades as wrong');
{
  const { api, qOpts } = boot(blank());
  api.startQuiz('domain', { domain: 'd3' });
  const Q = api.getQ();
  // Clicking one option only grades a single-answer question; on a
  // multi-select it just toggles selection. Advance to a single-answer
  // question rather than depending on which one was drawn.
  while (Q.list[Q.i].multi && Q.i < Q.list.length - 1) { Q.i++; api.renderQuiz(); }
  const q = Q.list[Q.i];
  const order = Q.order[Q.i];
  const correct = api.answersOf(q)[0];
  const pos = order.findIndex(idx => idx !== correct);
  qOpts.children[pos].onclick();
  ok(api.getQ().lastOK === false, 'a wrong click grades as incorrect');
  ok(qOpts.children[pos]._cls.has('wrong'), 'the clicked button is marked wrong');
  const rightPos = order.indexOf(correct);
  ok(qOpts.children[rightPos]._cls.has('right'), 'the real answer is still revealed');
}

H('8. Re-rendering does not reshuffle mid-question');
{
  const { api } = boot(blank());
  api.startQuiz('domain', { domain: 'd3' });
  const first = api.getQ().order[0].join('');
  api.renderQuiz();
  api.renderQuiz();
  ok(api.getQ().order[0].join('') === first, 'order is stable across re-renders');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Selection and shuffle tests passed');
process.exit(fail ? 1 : 0);
