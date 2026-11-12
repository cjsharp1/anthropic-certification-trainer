// Per-question confidence history. The subtle requirement: the attempt you
// have just rated must already be in the picture when it renders.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const DAY = 86400000;

let NODES = [];
function mk(t) {
  const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', title: '', value: '', children: [], onclick: null,
    hidden: false, disabled: false, open: false, type: '',
    classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
                 toggle: (c, f) => { const on = f === undefined ? !n._cls.has(c) : f;
                                     if (on) n._cls.add(c); else n._cls.delete(c); return on; },
                 contains: c => n._cls.has(c) },
    appendChild(c) { n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    addEventListener() {}, removeAttribute() {}, setAttribute(k, v) { n._attrs[k] = v; },
    focus() {}, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232 }), scrollIntoView() {} };
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
  vm.runInContext('globalThis.__h={questionHistory,questionHistoryNote,attemptValue,'
    + 'attemptLabel,agoShort,statsFor,startQuiz,answerConf,grade,answersOf,'
    + 'S,getQ:()=>Q,setQ:v=>{Q=v;}};', ctx);
  return { api: ctx.__h, byId, qOpts, ctx };
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);
const by = (root, cls) => {
  const out = [];
  (function walk(n) { if (!n) return;
    if (n._cls && n._cls.has(cls)) out.push(n);
    (n.children || []).forEach(walk); })(root);
  return out;
};
const text = n => {
  let s = n.textContent || '';
  (n.children || []).forEach(c => { s += ' ' + text(c); });
  return s;
};

function blank(history) {
  return { exam: 'CCAR-F', history: history || {}, seen: {}, flags: {}, labs: {},
           streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {},
           planOrder: 'blueprint' };
}
const QID = 'ar-d1-01';

H('1. One attempt is not a trend');
{
  const { api } = boot(blank({ [QID]: [{ correct: true, conf: 'sure', ts: Date.now() }] }));
  ok(api.questionHistory(QID) === null, 'nothing rendered for a single attempt');
  ok(api.questionHistory('never-answered') === null, 'nothing for an unanswered question');
}

H('2. A dot per attempt, oldest first');
{
  const now = Date.now();
  const h = [
    { correct: false, conf: 'guess',  ts: now - 9 * DAY },
    { correct: false, conf: 'sure',   ts: now - 6 * DAY },
    { correct: true,  conf: 'unsure', ts: now - 2 * DAY },
    { correct: true,  conf: 'sure',   ts: now },
  ];
  const { api } = boot(blank({ [QID]: h }));
  const box = api.questionHistory(QID);
  const dots = by(box, 'qhdot');
  ok(dots.length === 4, '4 dots for 4 attempts, got ' + dots.length);
  ok(dots[0]._cls.has('wrong') && dots[3]._cls.has('right'), 'first wrong, last right');
  ok(dots[1]._cls.has('blind'), 'the confidently-wrong attempt is flagged');
  ok(dots[0]._cls.has('lucky') === false, 'a wrong guess is not marked lucky');
  // dot size encodes how well it went
  const v = dots.map(d => Number(d.style['--v']));
  // Not monotonic by design: a confidently wrong answer (v=0) scores BELOW
  // a wrong guess (0.12), because the false certainty is the worse signal.
  ok(v[1] < v[0], 'confidently wrong dips below a wrong guess (' + v[1] + ' < ' + v[0] + ')');
  ok(v[2] > v[1] && v[3] > v[2], 'then recovers as answers become right and surer: ' + v.join(', '));
}

H('3. A lucky guess is distinguishable from a solid answer');
{
  const now = Date.now();
  const { api } = boot(blank({ [QID]: [
    { correct: true, conf: 'guess', ts: now - DAY },
    { correct: true, conf: 'sure',  ts: now },
  ]}));
  const dots = by(api.questionHistory(QID), 'qhdot');
  ok(dots[0]._cls.has('lucky'), 'the guess is marked lucky');
  ok(!dots[1]._cls.has('lucky'), 'the confident answer is not');
  ok(api.attemptValue({ correct: true, conf: 'guess' })
     < api.attemptValue({ correct: true, conf: 'sure' }), 'and scores lower');
}

H('4. Confidently wrong scores below an honest guess');
{
  const { api } = boot(blank());
  ok(api.attemptValue({ correct: false, conf: 'sure' })
     < api.attemptValue({ correct: false, conf: 'guess' }),
     'wrong-and-sure is the floor');
  ok(api.attemptValue({ correct: true, conf: 'sure' }) === 1, 'right-and-sure tops out');
}

H('5. The direction tag reflects the actual trend');
{
  const now = Date.now();
  const up = [{ correct: false, conf: 'sure', ts: now - DAY }, { correct: true, conf: 'sure', ts: now }];
  const down = [{ correct: true, conf: 'sure', ts: now - DAY }, { correct: false, conf: 'sure', ts: now }];
  const flat = [{ correct: true, conf: 'sure', ts: now - DAY }, { correct: true, conf: 'sure', ts: now }];
  const tag = h => {
    const { api } = boot(blank({ [QID]: h }));
    return by(api.questionHistory(QID), 'qhtag')[0].textContent;
  };
  ok(tag(up) === 'improving', 'wrong then right reads as improving, got ' + tag(up));
  ok(tag(down) === 'slipping', 'right then wrong reads as slipping, got ' + tag(down));
  ok(tag(flat) === 'steady', 'unchanged reads as steady, got ' + tag(flat));
}

H('6. The note names the pattern worth acting on');
{
  const now = Date.now();
  const note = h => {
    const { api } = boot(blank({ [QID]: h }));
    return api.questionHistoryNote(h);
  };
  const blind = note([{ correct: false, conf: 'sure', ts: now - DAY },
                      { correct: true,  conf: 'sure', ts: now }]);
  ok(/confidently wrong/i.test(blind || ''), 'past blind spot is called out');
  const nowWrong = note([{ correct: true,  conf: 'sure', ts: now - DAY },
                         { correct: false, conf: 'sure', ts: now }]);
  ok(/confident/i.test(nowWrong || ''), 'currently confidently wrong is called out');
  const lucky = note([{ correct: true, conf: 'guess', ts: now - 2 * DAY },
                      { correct: true, conf: 'guess', ts: now - DAY },
                      { correct: true, conf: 'sure',  ts: now }]);
  ok(/guess/i.test(lucky || ''), 'repeated lucky guesses are called out');
  const learned = note([{ correct: false, conf: 'unsure', ts: now - DAY },
                        { correct: true,  conf: 'sure',   ts: now }]);
  ok(/learned/i.test(learned || ''), 'ordinary learning is named');
  const dull = note([{ correct: true, conf: 'sure', ts: now - DAY },
                     { correct: true, conf: 'sure', ts: now }]);
  ok(dull === null, 'a dull history adds no sentence');
}

H('7. The recent list spells out what the dots cannot');
{
  const now = Date.now();
  const h = [];
  for (let i = 7; i >= 0; i--) h.push({ correct: i % 2 === 0, conf: 'unsure', ts: now - i * DAY });
  const { api } = boot(blank({ [QID]: h }));
  const box = api.questionHistory(QID);
  ok(by(box, 'qhdot').length === 8, 'all 8 attempts in the track');
  ok(by(box, 'qhrow').length === 5, 'the list shows the latest 5, got ' + by(box, 'qhrow').length);
  const first = by(box, 'qhrow')[0];
  ok(/now|m ago/.test(text(first)), 'newest row is first: ' + text(first).trim());
}

H('8. It appears after rating, with the new attempt included');
{
  // Two prior attempts, so the third makes three.
  const now = Date.now();
  const st = blank();
  const { api, byId } = boot(st);
  api.startQuiz('domain', { domain: 'd1' });
  const Q = api.getQ();
  const q = Q.list[0];
  // seed two earlier attempts for whichever question came up
  api.S.history[q.id] = [
    { correct: false, conf: 'guess', ts: now - 3 * DAY },
    { correct: true,  conf: 'unsure', ts: now - DAY },
  ];
  // answer it, then rate confidence
  Q.lastOK = true;
  Q.picked = [api.answersOf(q)[0]];
  const explain = byId['qExplain'];
  explain.children = [];
  api.answerConf('sure');
  const box = by(explain, 'qhist')[0];
  ok(!!box, 'history rendered into the explanation');
  ok(by(box, 'qhdot').length === 3, 'includes the attempt just rated (3 dots), got '
     + (box ? by(box, 'qhdot').length : 0));
  const last = by(box, 'qhdot')[2];
  ok(last._cls.has('right'), 'and it is recorded as correct');
}

H('9. Exam mode shows nothing per question');
{
  const now = Date.now();
  const st = blank();
  const { api, byId } = boot(st);
  api.startQuiz('domain', { domain: 'd1' });
  const Q = api.getQ();
  Q.mode = 'exam';
  const q = Q.list[0];
  api.S.history[q.id] = [
    { correct: true, conf: 'sure', ts: now - DAY },
    { correct: true, conf: 'sure', ts: now - 2 * DAY },
  ];
  Q.lastOK = true;
  const explain = byId['qExplain'];
  explain.children = [];
  api.answerConf('sure');
  ok(by(explain, 'qhist').length === 0, 'no history block during a practice exam');
}

H('10. Relative times read sensibly');
{
  const { api } = boot(blank());
  const now = Date.now();
  ok(api.agoShort(now) === 'now', 'just now');
  ok(api.agoShort(now - 5 * 60000) === '5m ago', 'minutes');
  ok(api.agoShort(now - 3 * 3600000) === '3h ago', 'hours');
  ok(api.agoShort(now - 4 * DAY) === '4d ago', 'days');
  ok(/mo ago$/.test(api.agoShort(now - 70 * DAY)), 'months: ' + api.agoShort(now - 70 * DAY));
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Question history tests passed');
process.exit(fail ? 1 : 0);
