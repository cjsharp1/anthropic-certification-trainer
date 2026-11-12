/* Readiness gates.
 *
 * The projected score answers "how well am I doing on what I have tried".
 * These six gates answer "is that number trustworthy yet", which is a
 * different question — a score of 850 drawn from forty questions answered
 * once, yesterday, in one sitting is not evidence of much.
 *
 * The tests that matter here are not that each gate computes: it is that
 * the set DISCRIMINATES. A gate everyone passes, or nobody can reach, is
 * noise on the dashboard.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const DAY = 86400000, HOUR = 3600000;

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

function mk(t) {
  const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', children: [], hidden: false, disabled: false, title: '',
    classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
      toggle: () => {}, contains: c => n._cls.has(c) },
    appendChild(c) { n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    addEventListener() {}, removeAttribute() {}, setAttribute(k, v) { n._attrs[k] = v; },
    focus() {}, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232, top: 0, bottom: 0 }), scrollIntoView() {} };
  n.style.setProperty = () => {};
  Object.defineProperty(n, 'className', { get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(n, 'innerHTML', { get: () => n._h || '',
    set: v => { n._h = v; if (!v) n.children = []; } });
  return n;
}

function boot(state) {
  const store = { 'claude-cert-trainer-v1': JSON.stringify(state) };
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const ctx = { console: { log() {}, warn() {}, error() {} },
    structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
    parseInt, parseFloat, isFinite, setTimeout() {}, setInterval: () => 1, clearInterval() {},
    performance: { now: () => 0 }, alert() {}, confirm: () => true,
    CSS: { escape: x => String(x) },
    localStorage: { getItem: k => (k in store ? store[k] : null),
      setItem(k, v) { store[k] = v; }, removeItem() {} },
    location: { hash: '' }, history: { pushState() {}, replaceState() {} },
    document: { documentElement: mk('html'), body: { classList: { add() {}, remove() {} } },
      getElementById: getId,
      querySelector: s => { const m = /^#([\w-]+)$/.exec(s); return m ? getId(m[1]) : null; },
      querySelectorAll: () => [], createElement: mk, createElementNS: (ns, t) => mk(t),
      addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {}, innerHeight: 900,
      matchMedia: () => ({ matches: false, addEventListener() {} }) },
    speechSynthesis: { cancel() {}, speak() {}, getVoices: () => [] } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  [...fs.readFileSync(P.resolve('index.html'), 'utf8')
    .matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])
    .forEach(f => vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f }));
  return { ctx, byId };
}

const blank = exam => ({ exam, history: {}, seen: {}, flags: {}, labs: {},
  streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {},
  simAttempts: [], planOrder: 'blueprint' });

/* Build a study history. Fills each domain proportionally, and scatters
   sessions across the span — giving every question the same offsets would
   produce N distinct days regardless of how long the span is, which is a
   property of the generator rather than of the habit being modelled. */
function makeState(exam, o) {
  const { ctx } = boot(blank(exam));
  const Q = vm.runInContext('QUESTIONS', ctx);
  const EX = vm.runInContext('EXAMS', ctx)[exam];
  const qE = q => Array.isArray(q.exam) ? q.exam : [q.exam];
  const drill = Q.filter(q => qE(q).includes(exam) && !q.heldOut && q.difficulty !== 'hard');
  const st = blank(exam);
  const now = Date.now();
  let i = 0;
  EX.domains.forEach(d => {
    drill.filter(q => q.d === d.id)
      .slice(0, Math.round(drill.filter(q => q.d === d.id).length * o.coverage))
      .forEach(q => {
        const recs = [];
        for (let r = 0; r < o.repeats; r++) {
          const p = o.improving ? Math.min(0.96, o.acc + r * 0.18) : o.acc;
          const correct = ((i * 7 + r * 31) % 100) / 100 < p;
          const sessionDay = (i * 3 + r * 7) % Math.max(1, o.spanDays);
          recs.push({ correct, conf: correct ? 'sure' : 'unsure',
            ts: now - o.spanDays * DAY + sessionDay * DAY + r * o.gapHours * HOUR + i * 30000,
            exam });
        }
        st.history[q.id] = recs;
        st.seen[q.id] = recs.length;
        i++;
      });
  });
  /* Where a simulation bank exists, the projected score is computed from
     simulation attempts rather than drill history, so a profile that sits
     exams has to produce them — a fixture with only `sessions` rows would
     project zero and could never pass the accuracy gate. Each sitting is
     recorded both ways: the retired timed mock (sessions) and the current
     route (simAttempts), which is also what a real upgraded profile looks
     like. byDom carries the per-domain tally the projection reads. */
  const SIMQ = vm.runInContext(
    "typeof SIM_QUESTIONS === 'undefined' ? [] : SIM_QUESTIONS", ctx);
  const simPool = SIMQ.filter(q => q.exam === exam);
  for (let k = 0; k < o.sittings; k++) {
    const ts = now - (k + 1) * 2 * DAY;
    st.sessions.push({ ts, exam, mode: 'exam',
      total: EX.questions, correct: Math.round(EX.questions * o.examAcc),
      scaled: Math.round(100 + o.examAcc * 900), domain: null, ms: 95 * 60000 });

    if (simPool.length) {
      /* Cover each domain in proportion to the profile's coverage, at its
         exam accuracy, so the projection and its coverage figure both have
         something real behind them. */
      const byDom = {}, answers = {};
      let correct = 0, total = 0, j = 0;
      EX.domains.forEach(d => {
        const qs = simPool.filter(q => (q.domains || []).includes(d.id));
        const take = qs.slice(0, Math.max(1, Math.round(qs.length * o.coverage)));
        take.forEach(q => {
          const ok = ((j * 7 + k * 13) % 100) / 100 < o.examAcc;
          j++; total++; if (ok) correct++;
          byDom[d.id] = byDom[d.id] || { n: 0, ok: 0 };
          byDom[d.id].n++; if (ok) byDom[d.id].ok++;
          answers[q.id] = { picked: q.correct, ok };
        });
      });
      st.simAttempts.push({ ts, exam, mode: 'exam', total, correct,
        ms: 95 * 60000, filled: 0, target: total, auto: false, drill: null,
        byObj: {}, byDom, byScn: {}, answers });
    }
  }
  return st;
}

const EXAM = 'CCAR-F';
const PROFILES = {
  'just started': { coverage: 0.15, repeats: 1, acc: 0.60, sittings: 0, examAcc: 0,    spanDays: 2,  gapHours: 0,   improving: false },
  'crammer':      { coverage: 0.95, repeats: 2, acc: 0.82, sittings: 1, examAcc: 0.80, spanDays: 1,  gapHours: 1,   improving: false },
  'narrow deep':  { coverage: 0.40, repeats: 4, acc: 0.88, sittings: 1, examAcc: 0.85, spanDays: 20, gapHours: 60,  improving: false },
  'steady':       { coverage: 0.75, repeats: 3, acc: 0.68, sittings: 2, examAcc: 0.82, spanDays: 28, gapHours: 96,  improving: true },
  'ready':        { coverage: 0.90, repeats: 3, acc: 0.80, sittings: 2, examAcc: 0.86, spanDays: 35, gapHours: 120, improving: true }
};
const score = name => {
  const { ctx } = boot(makeState(EXAM, PROFILES[name]));
  return vm.runInContext('readinessGates("' + EXAM + '")', ctx);
};

H('1. Six gates, each reporting what it wants');
{
  const r = score('steady');
  ok(r.total === 6, 'six gates, got ' + r.total);
  const ids = r.gates.map(g => g.id).join(',');
  ok(ids === 'breadth,accuracy,durable,recovery,exam,spacing', 'ids: ' + ids);
  const bad = r.gates.filter(g => !g.label || !g.need || typeof g.pass !== 'boolean'
    || !g.detail);
  ok(bad.length === 0, bad.length ? bad.map(g => g.id).join(', ') + ' incomplete'
    : 'each carries a label, a requirement, a reading and a verdict');
}

H('2. The set discriminates between study habits');
{
  // This is the whole point. Gates that read the same for a beginner and
  // someone ready are decoration.
  const got = {};
  Object.keys(PROFILES).forEach(n => got[n] = score(n).passed);
  console.log('     ' + Object.entries(got).map(([k, v]) => k + ' ' + v + '/6').join('   '));
  ok(got['just started'] <= 1, 'a beginner scores at most 1, got ' + got['just started']);
  ok(got['ready'] === 6, 'a well-prepared profile scores 6, got ' + got['ready']);
  ok(got['crammer'] < got['steady'],
     'cramming scores below steady study: ' + got['crammer'] + ' vs ' + got['steady']);
  ok(new Set(Object.values(got)).size >= 3,
     'the five profiles produce at least 3 distinct scores, got '
       + [...new Set(Object.values(got))].sort().join('/'));
}

H('3. Cramming fails exactly the gates it should');
{
  // High coverage, high accuracy, one sitting — but all in a day, with no
  // question revisited after a night and nothing turned around.
  const g = {};
  score('crammer').gates.forEach(x => g[x.id] = x.pass);
  ok(g.breadth, 'the crammer covered the bank');
  ok(g.accuracy, 'and projects a passing score');
  ok(!g.durable, 'but nothing survived a night');
  ok(!g.recovery, 'and nothing was turned around');
  ok(!g.spacing, 'and it all happened in one day');
}

H('4. Every gate is reachable');
{
  // A gate nobody can meet is worse than no gate: it tells the user they
  // are permanently not ready. Breadth is the one at risk, because the
  // held-out and hard pools are reserved and cannot be drilled.
  const r = score('ready');
  const unreachable = r.gates.filter(g => !g.pass);
  ok(unreachable.length === 0, unreachable.length
    ? 'unreachable even when fully prepared: ' + unreachable.map(g => g.id).join(', ')
    : 'all six are met by a fully-prepared profile');

  // specifically: breadth must measure the DRILL pool
  const app = fs.readFileSync(P.resolve('app.js'), 'utf8');
  ok(/poolFor\(exam\)\.filter\(q => qDomainFor\(q, exam\) === d\.id\)/.test(app),
     'breadth counts the drill pool, not every question in the domain');
}

H('5. Thin evidence does not pass a gate');
{
  // The projected score is reported from 8% coverage, which is enough to
  // show a trend and not enough to stake a gate on.
  const { ctx } = boot(makeState(EXAM, PROFILES['just started']));
  const r = vm.runInContext('readinessGates("' + EXAM + '")', ctx);
  const acc = r.gates.find(g => g.id === 'accuracy');
  ok(!acc.pass, 'accuracy does not pass on a handful of questions');
  ok(/behind the estimate/.test(acc.detail),
     'and says why: ' + acc.detail);
  const dur = r.gates.find(g => g.id === 'durable');
  ok(!dur.pass, 'durability does not pass on same-day answers: ' + dur.detail);
  const rec = r.gates.find(g => g.id === 'recovery');
  ok(!rec.pass, 'nor recovery with nothing turned around: ' + rec.detail);

  // and with genuinely too little to judge, they say so rather than failing
  // on the merits — a different message, because it is a different state.
  const tiny = boot(makeState(EXAM, { coverage: 0.04, repeats: 1, acc: 0.5,
    sittings: 0, examAcc: 0, spanDays: 1, gapHours: 0, improving: false }));
  const t = vm.runInContext('readinessGates("' + EXAM + '")', tiny.ctx);
  ok(/too few/.test(t.gates.find(g => g.id === 'durable').detail),
     'durability withholds judgement when there is too little: '
       + t.gates.find(g => g.id === 'durable').detail);
  ok(/not enough/.test(t.gates.find(g => g.id === 'recovery').detail),
     'so does recovery: ' + t.gates.find(g => g.id === 'recovery').detail);
}

H('6. An unmet gate says what to do next');
{
  const r = score('just started');
  ok(r.next, 'a next step is named');
  ok(r.next.todo && r.next.todo.length > 5,
     'and it is actionable: ' + (r.next.todo || r.next.need));
  const met = score('ready');
  ok(!met.next, 'nothing is suggested once every gate is met');
}

H('7. It renders on the dashboard');
{
  const { ctx, byId } = boot(makeState(EXAM, PROFILES['steady']));
  vm.runInContext('renderDash();', ctx);
  const list = byId['gateList'];
  /* The list interleaves group headings with gate rows, so count the rows. */
  const gateRows = n => (n.children || []).filter(
    c => c._cls && c._cls.has('gaterow'));
  const heads = n => (n.children || []).filter(
    c => c._cls && c._cls.has('gategroup'));
  ok(list && gateRows(list).length === 6,
     'six gate rows rendered, got ' + (list ? gateRows(list).length : 0));
  ok(list && heads(list).length === 3,
     'under three group headings, got ' + (list ? heads(list).length : 0));
  const met = list.children.filter(r => r._cls.has('met')).length;
  ok(met === score('steady').passed,
     'met rows match the score: ' + met + ' vs ' + score('steady').passed);
  ok(/of 6$/.test(byId['readyVal'].textContent),
     'the tile reads N of 6: ' + byId['readyVal'].textContent);
  // Every control must carry its own accessible description. A live row is
  // a button and names itself; a met row is an inert div read as text, with
  // its own labelled keep-sharp button inside.
  const unlabelled = list.children.filter(
    r => r._cls.has('live') && !r._attrs['aria-label']);
  ok(unlabelled.length === 0, 'every live row is labelled for assistive tech');
  const headsUnlabelled = heads(list).filter(r => !r._attrs['aria-label']);
  ok(headsUnlabelled.length === 0, 'and so is every group heading');
}

H('8. Gates are scoped to the selected exam');
{
  // 60 questions are shared between CCAR-F and CCDV-F. Drilling one must
  // not fill the other's gates.
  const st = makeState('CCAR-F', PROFILES['ready']);
  const { ctx } = boot(st);
  const a = vm.runInContext('readinessGates("CCAR-F")', ctx);
  const b = vm.runInContext('readinessGates("CCDV-F")', ctx);
  ok(a.passed === 6, 'CCAR-F is ready, got ' + a.passed);
  ok(b.passed < a.passed,
     'CCDV-F is not carried along by it: ' + b.passed + ' of 6');
}

H('9. An unmet gate takes you where you can close it');
{
  const { ctx, byId } = boot(makeState(EXAM, PROFILES['just started']));
  const r = vm.runInContext('readinessGates("' + EXAM + '")', ctx);
  // every gate that can be acted on carries an action; spacing cannot be,
  // because the only remedy is another day passing.
  const actionable = r.gates.filter(g => g.act);
  ok(actionable.length === 5, '5 gates offer an action, got ' + actionable.length);
  ok(!r.gates.find(g => g.id === 'spacing').act,
     'spacing offers none — no button can make a day pass');
  const bad = actionable.filter(g => !g.act.label || typeof g.act.run !== 'function');
  ok(bad.length === 0, 'each action has a label and something to run');

  vm.runInContext('renderDash();', ctx);
  const rows = byId['gateList'].children;
  const live = rows.filter(x => x._cls.has('live'));
  ok(live.length === 5, '5 rows render as live buttons, got ' + live.length);
  ok(live.every(x => x.tag === 'button'), 'and they are real buttons');
  ok(live.every(x => typeof x.onclick === 'function'), 'each one is wired');
  ok(live.every(x => /Opens /.test(x._attrs['aria-label'] || '')),
     'and says where it goes for assistive tech');
}

H('10. A met gate is not a button, but still offers its action');
{
  // A row that looks clickable and does nothing is worse than an inert one,
  // so the row itself stays a div. The action survives as a link inside it:
  // passing a gate does not mean the subject is finished with.
  const { ctx, byId } = boot(makeState(EXAM, PROFILES['ready']));
  vm.runInContext('renderDash();', ctx);
  const rows = byId['gateList'].children.filter(
    c => c._cls && c._cls.has('gaterow'));
  ok(rows.length === 6, 'six gate rows, got ' + rows.length);
  ok(rows.every(x => x._cls.has('met')), 'all met for a ready profile');
  ok(rows.every(x => !x._cls.has('live')), 'no row is itself clickable');
  ok(rows.every(x => x.tag === 'div'), 'and none is a button');

  // Find the keep-sharp link nested in each row's .gatemid.
  const keepOf = row => {
    const mid = (row.children || []).find(c => c._cls && c._cls.has('gatemid'));
    return mid && (mid.children || []).find(
      c => c._cls && c._cls.has('gatekeep'));
  };
  const keeps = rows.map(keepOf).filter(Boolean);
  // Five of the six gates carry an action; spacing cannot, because the only
  // remedy is another day passing.
  ok(keeps.length === 5,
     '5 met rows offer a keep-sharp link, got ' + keeps.length);
  ok(keeps.every(x => x.tag === 'button'), 'each link is a real button');
  ok(keeps.every(x => typeof x.onclick === 'function'), 'each one is wired');
  ok(keeps.every(x => /Already met/.test(x._attrs['aria-label'] || '')),
     'and says it is already met for assistive tech');

  const r = vm.runInContext('readinessGates("' + EXAM + '")', ctx);
  ok(!r.gates.find(g => g.id === 'spacing').act,
     'spacing still offers no action, met or not');
}

/* The "full timed sitting" gate now has two sources. A simulation attempt is
   the current route; a mode:'exam' session is the retired timed mock, still
   counted because people have real history under it.

   The trap worth pinning: S.simAttempts rows carry no `scaled` field — the
   results screen computes it when it renders — so a gate that read a.scaled
   would see 0 for every simulation and could never be passed. */
H('7. The timed-sitting gate counts both sources');
{
  const mk1 = extra => {
    const st = blank('CCAR-F');
    return Object.assign(st, extra);
  };
  const sittings = st => {
    const { ctx } = boot(st);
    return vm.runInContext("fullSittings('CCAR-F')", ctx);
  };

  const simRow = o => Object.assign(
    { ts: Date.now(), exam: 'CCAR-F', mode: 'exam', total: 60, correct: 50 }, o || {});

  const legacyOnly = sittings(mk1({ sessions: [
    { ts: 1, exam: 'CCAR-F', mode: 'exam', total: 60, correct: 48, scaled: 820 }] }));
  ok(legacyOnly.length === 1 && legacyOnly[0].scaled === 820,
     'a retired timed mock still counts, scaled ' + (legacyOnly[0] || {}).scaled);

  const simOnly = sittings(mk1({ simAttempts: [simRow()] }));
  ok(simOnly.length === 1, 'a simulation sitting counts, got ' + simOnly.length);
  ok(simOnly.length === 1 && simOnly[0].scaled > 0,
     'and its scaled score is derived, not read from a missing field: '
     + (simOnly[0] || {}).scaled);

  ok(sittings(mk1({ simAttempts: [simRow({ mode: 'practice', correct: 60 })] })).length === 0,
     'a practice run does not count, however well it went');
  ok(sittings(mk1({ simAttempts: [simRow({ drill: ['O01'], total: 20, correct: 20 })] })).length === 0,
     'an objective drill does not count');
  ok(sittings(mk1({ simAttempts: [simRow({ exam: 'CCDV-F' })] })).length === 0,
     'a sitting for another certification does not count');

  const both = sittings(mk1({
    sessions: [{ ts: 1, exam: 'CCAR-F', mode: 'exam', total: 60, correct: 40, scaled: 700 }],
    simAttempts: [simRow({ ts: 2 })] }));
  ok(both.length === 2, 'both sources together, got ' + both.length);
  ok(both[0].ts < both[1].ts, 'and they come back oldest first');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Readiness tests passed');
process.exit(fail ? 1 : 0);
