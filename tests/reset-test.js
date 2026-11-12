// Per-certification reset. The dangerous case is a shared question: 60 are
// listed under both CCAR-F and CCDV-F, so resetting one must not touch the
// other's answers on the same question.
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
  n.style.setProperty = (k, v) => { n.style[k] = v; };
  Object.defineProperty(n, 'className', {
    get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(n, 'innerHTML', { get: () => n._h || '',
    set: v => { n._h = v; if (!v) n.children = []; } });
  NODES.push(n);
  return n;
}

let confirmed = true;
function boot(state) {
  NODES = [];
  const store = { 'claude-cert-trainer-v1': JSON.stringify(state) };
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const ctx = { console, structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
    parseInt, parseFloat, isFinite, setTimeout() {}, setInterval: () => 1, clearInterval() {},
    performance: { now: () => 0 }, alert() {}, confirm: () => confirmed,
    CSS: { escape: x => String(x) },
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
  vm.runInContext('globalThis.__r={examTally,resetExam,renderExamReset,renderGlobalReset,totalTally,answersFor,fullSittings,'
    + 'allAnswers,recordAnswer,QUESTIONS,LABS,EXAMS,S,getS:()=>S,readStore:()=>'
    + 'JSON.parse(localStorage.getItem("claude-cert-trainer-v1"))};', ctx);
  return { api: ctx.__r, store };
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

function blank(exam) {
  return { exam: exam || 'CCAR-F', history: {}, seen: {}, flags: {}, labs: {},
           streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {},
           planOrder: 'blueprint' };
}

// a question that belongs to BOTH CCAR-F and CCDV-F
function sharedQid(api) {
  const q = api.QUESTIONS.find(x => x.also && x.also['CCDV-F']
    && (Array.isArray(x.exam) ? x.exam : [x.exam]).includes('CCAR-F'));
  return q.id;
}

H('1. The reported symptom: a CCAR-F drill inflated CCDV-F');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  const shared = sharedQid(api);
  // answered while studying CCAR-F
  api.S.history[shared] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCAR-F' }];
  ok(api.answersFor('CCAR-F').length === 1, 'counts for the exam it was answered under');
  ok(api.answersFor('CCDV-F').length === 0,
     'does NOT count as CCDV-F activity, got ' + api.answersFor('CCDV-F').length);
}

H('2. History recorded before the fix still counts, by membership');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  const shared = sharedQid(api);
  // no exam field: a legacy record
  api.S.history[shared] = [{ correct: true, conf: 'sure', ts: Date.now() }];
  ok(api.answersFor('CCAR-F').length === 1, 'still counted for CCAR-F');
  ok(api.answersFor('CCDV-F').length === 1,
     'and for CCDV-F, since we cannot know which it was');
}

H('3. New answers record the exam being studied');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  const shared = sharedQid(api);
  api.recordAnswer(shared, true, 'sure');
  const rec = api.S.history[shared][0];
  ok(rec.exam === 'CCAR-F', 'the answer carries exam=CCAR-F, got ' + rec.exam);
}

H('4. The tally counts only this exam');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  const shared = sharedQid(api);
  const now = Date.now();
  api.S.history[shared] = [
    { correct: true,  conf: 'sure', ts: now - DAY, exam: 'CCAR-F' },
    { correct: false, conf: 'guess', ts: now,      exam: 'CCDV-F' },
  ];
  api.S.read['CCAR-F/d1'] = now;
  api.S.read['CCDV-F/v1'] = now;
  api.S.cards['CCAR-F/d1/x'] = { box: 2, ts: now };
  api.S.flags['CCAR-F/d3'] = true;
  api.S.sessions = [{ ts: now, exam: 'CCAR-F', mode: 'quick', total: 10, correct: 7 },
                    { ts: now, exam: 'CCDV-F', mode: 'quick', total: 10, correct: 5 }];
  const t = api.examTally('CCAR-F');
  ok(t.answers === 1, '1 CCAR-F answer on the shared question, got ' + t.answers);
  ok(t.read === 1, '1 read marker, got ' + t.read);
  ok(t.cards === 1, '1 card state, got ' + t.cards);
  ok(t.flags === 1, '1 flag, got ' + t.flags);
  ok(t.sessions === 1, '1 session, got ' + t.sessions);
  const t2 = api.examTally('CCDV-F');
  ok(t2.answers === 1 && t2.read === 1 && t2.sessions === 1, 'CCDV-F tallied separately');
}

H('5. Resetting one exam leaves the other intact');
{
  const st = blank('CCDV-F');
  const { api } = boot(st);
  const shared = sharedQid(api);
  const now = Date.now();
  api.S.history[shared] = [
    { correct: true,  conf: 'sure',  ts: now - DAY, exam: 'CCAR-F' },
    { correct: false, conf: 'guess', ts: now,       exam: 'CCDV-F' },
  ];
  api.S.history['ar-d1-01'] = [{ correct: true, conf: 'sure', ts: now, exam: 'CCAR-F' }];
  api.S.read['CCAR-F/d1'] = now;
  api.S.read['CCDV-F/v1'] = now;
  api.S.cards['CCAR-F/d1/x'] = { box: 3, ts: now };
  api.S.cards['CCDV-F/v1/y'] = { box: 2, ts: now };
  api.S.sessions = [{ ts: now, exam: 'CCAR-F', mode: 'quick', total: 10, correct: 7 },
                    { ts: now, exam: 'CCDV-F', mode: 'quick', total: 10, correct: 5 }];

  api.resetExam('CCDV-F');

  ok(api.S.history[shared].length === 1, 'the shared question keeps one attempt');
  ok(api.S.history[shared][0].exam === 'CCAR-F', 'and it is the CCAR-F one');
  ok(!!api.S.history['ar-d1-01'], 'the CCAR-F-only question is untouched');
  ok(!!api.S.read['CCAR-F/d1'], 'CCAR-F read marker kept');
  ok(!api.S.read['CCDV-F/v1'], 'CCDV-F read marker gone');
  ok(!!api.S.cards['CCAR-F/d1/x'], 'CCAR-F card kept');
  ok(!api.S.cards['CCDV-F/v1/y'], 'CCDV-F card gone');
  ok(api.S.sessions.length === 1 && api.S.sessions[0].exam === 'CCAR-F',
     'only the CCDV-F session removed');
}

H('6. A question answered only under the reset exam is removed entirely');
{
  const st = blank('CCDV-F');
  const { api } = boot(st);
  const shared = sharedQid(api);
  api.S.history[shared] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCDV-F' }];
  api.S.seen[shared] = 1;
  api.resetExam('CCDV-F');
  ok(!api.S.history[shared], 'history entry removed');
  ok(!api.S.seen[shared], 'seen count removed too, so rotation restarts clean');
}

H('7. Legacy answers on a shared question are removed by membership');
{
  const st = blank('CCDV-F');
  const { api } = boot(st);
  const shared = sharedQid(api);
  // no exam field: belongs to both, so a CCDV-F reset clears it
  api.S.history[shared] = [{ correct: true, conf: 'sure', ts: Date.now() }];
  api.resetExam('CCDV-F');
  ok(!api.S.history[shared], 'an ambiguous record is cleared with the exam it belongs to');
}

H('8. A lab shared with another exam is kept');
{
  const st = blank('CCDV-F');
  const { api } = boot(st);
  const shared = api.LABS.find(l => l.exams.length > 1 && l.exams.includes('CCDV-F'));
  const only = api.LABS.find(l => l.exams.length === 1 && l.exams[0] === 'CCDV-F');
  if (!shared) { ok(true, '(no multi-exam lab to check)'); }
  else {
    api.S.labs[shared.id] = { checkpoints: { 0: true } };
    if (only) api.S.labs[only.id] = { checkpoints: { 0: true } };
    api.resetExam('CCDV-F');
    ok(!!api.S.labs[shared.id], 'a lab used by another exam survives: ' + shared.id);
    if (only) ok(!api.S.labs[only.id], 'a CCDV-F-only lab is cleared: ' + only.id);
  }
}

H('9. Resetting an empty exam is harmless');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  api.S.history['ar-d1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCAR-F' }];
  let threw = null;
  try { api.resetExam('CCAO-F'); } catch (e) { threw = e.message; }
  ok(!threw, 'no throw' + (threw ? ': ' + threw : ''));
  ok(!!api.S.history['ar-d1-01'], 'unrelated progress untouched');
}

/* Helpers for the type-to-confirm gate. The control starts as a single
   button; pressing it reveals a field, and nothing is erased until the
   field holds the exact phrase. */
const dangerBtns = () => NODES.filter(n => n.tag === 'button' && n._cls.has('danger-btn'));
const findInput = () => NODES.filter(n => n._cls.has('resetinput'))[0];
const byLabel = re => NODES.filter(n => n.tag === 'button' && re.test(n.textContent))[0];
/* renderExamReset draws two armed controls where a simulation exists: the
   simulation-only reset and the full exam reset. Target by label so a test
   says which one it means instead of depending on their order. */
const dangerBtn = re => dangerBtns().filter(n => re.test(n.textContent))[0];
const examResetBtn = () => dangerBtn(/^Reset CCAR-F$|^Reset CCDV-F$|^Reset [A-Z-]+$/);

H('10. The per-exam reset renders on its own, disabled when there is nothing to erase');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  api.renderExamReset(mk('div'));
  const btns = dangerBtns();
  /* Two exam-scoped controls where a simulation exists: the simulation-only
     reset and the full exam reset. The point this guards is that the GLOBAL
     reset is not among them — wiping every certification from a page about
     one of them is too easy to do by accident. */
  ok(btns.length === 2, 'the exam-scoped controls, got ' + btns.length);
  ok(!btns.some(b => /Reset everything/.test(b.textContent)),
     'and the global reset is not one of them');
  ok(!!examResetBtn(), 'one of them names the exam');
  ok(!!dangerBtn(/exam results/),
     'and one resets exam results on their own');
  ok(btns.every(b => b.disabled === true), 'both disabled with nothing recorded');
  ok(!findInput(), 'and no confirmation field is offered for a no-op');

  api.S.history['ar-d1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCAR-F' }];
  NODES = [];
  api.renderExamReset(mk('div'));
  ok(examResetBtn().disabled === false, 'enabled once there is something to erase');
}

H('11. Erasing takes two deliberate steps, and persists');
{
  const st = blank('CCDV-F');
  const { api } = boot(st);
  api.S.history['dv-v1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCDV-F' }];
  api.S.read['CCDV-F/v1'] = Date.now();
  NODES = [];
  api.renderExamReset(mk('div'));

  // step one: arming only reveals the gate
  const arm = examResetBtn();
  arm.onclick();
  ok(!!api.S.history['dv-v1-01'], 'arming alone erases nothing');
  const field = findInput();
  ok(!!field, 'a confirmation field appeared');
  const go = byLabel(/^Erase$/);
  ok(go && go.disabled === true, 'the erase button starts disabled');

  // step two: the phrase has to match
  field.value = 'CCDV-F';
  field.oninput();
  ok(go.disabled === false, 'typing the exam code enables it');
  go.onclick();
  ok(!api.S.history['dv-v1-01'], 'history cleared');
  ok(!api.S.read['CCDV-F/v1'], 'read marker cleared');
  ok(!api.readStore().history['dv-v1-01'], 'and the change was saved to storage');
}

H('12. A wrong or partial phrase erases nothing');
{
  const st = blank('CCDV-F');
  const { api } = boot(st);
  api.S.history['dv-v1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCDV-F' }];
  NODES = [];
  api.renderExamReset(mk('div'));
  examResetBtn().onclick();
  const field = findInput(), go = byLabel(/^Erase$/);

  ['', 'CCDV', 'ccdv-f', 'DELETE', 'CCAR-F'].forEach(v => {
    field.value = v; field.oninput();
    ok(go.disabled === true, JSON.stringify(v) + ' does not unlock it');
  });
  // even forced, the handler refuses while disabled
  go.onclick();
  ok(!!api.S.history['dv-v1-01'], 'clicking a disabled erase button does nothing');
}

H('13. Cancelling closes the gate and clears what was typed');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  api.S.history['ar-d1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCAR-F' }];
  NODES = [];
  api.renderExamReset(mk('div'));
  const arm = examResetBtn();
  arm.onclick();
  const field = findInput();
  field.value = 'CCAR-F'; field.oninput();
  byLabel(/^Cancel$/).onclick();
  ok(field.value === '', 'the field was cleared');
  ok(arm.hidden === false, 'the original button is back');
  ok(!!api.S.history['ar-d1-01'], 'and nothing was erased');
  // re-arming must not come back pre-confirmed
  arm.onclick();
  ok(byLabel(/^Erase$/).disabled === true, 'the gate is closed again on re-arm');
}

H('14. The global reset clears every certification, behind its own phrase');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  api.S.history['ar-d1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCAR-F' }];
  api.S.history['dv-v1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCDV-F' }];
  api.S.read['CCAO-F/a1'] = Date.now();
  NODES = [];
  api.renderGlobalReset(mk('div'));
  /* Settings draws two controls: the targeted exam-results reset and the
     full one. Target by label so this test says which it means. */
  const arm = dangerBtn(/everything/i);
  ok(!!arm && /everything/i.test(arm.textContent),
     'it is the global control: ' + (arm && arm.textContent));
  arm.onclick();
  const field = findInput(), go = byLabel(/^Erase$/);
  // the exam code must NOT work here — the phrase is deliberately different
  field.value = 'CCAR-F'; field.oninput();
  ok(go.disabled === true, 'an exam code does not unlock the global reset');
  field.value = 'DELETE'; field.oninput();
  ok(go.disabled === false, 'DELETE does');
  go.onclick();
  // The global reset REBINDS S rather than mutating it, so read it live —
  // the reference captured at boot still points at the discarded object.
  const now = api.getS();
  ok(Object.keys(now.history).length === 0, 'all history gone');
  ok(Object.keys(now.read).length === 0, 'all read markers gone');
  ok(now.exam === 'CCAR-F', 'but you stay on the exam you were studying');
  ok(Object.keys(api.readStore().history).length === 0, 'and it persisted');
}

H('15. Enter submits only once the phrase matches');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  api.S.history['ar-d1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCAR-F' }];
  NODES = [];
  api.renderExamReset(mk('div'));
  examResetBtn().onclick();
  const field = findInput();
  let prevented = 0;
  const ev = k => ({ key: k, preventDefault() { prevented++; } });
  field.value = 'CCAR'; field.oninput();
  field.onkeydown(ev('Enter'));
  ok(!!api.S.history['ar-d1-01'], 'Enter on a partial phrase does nothing');
  field.value = 'CCAR-F'; field.oninput();
  field.onkeydown(ev('Enter'));
  ok(!api.S.history['ar-d1-01'], 'Enter on the full phrase erases');
  ok(prevented === 1, 'and it suppressed the default only when it acted');
}

/* The simulation reset exists so the projected score can be re-baselined
   when the question bank changes, without losing a study history that is
   still perfectly good. Its whole value is in what it does NOT touch. */
H('16. The exam-results reset clears both sitting sources and nothing else');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  api.S.history['ar-d1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCAR-F' }];
  api.S.cards['CCAR-F/d1/some card front'] = { box: 3, due: 0 };
  api.S.read['CCAR-F/d1'] = true;
  api.S.labs['lab-1'] = { checkpoints: { a: true } };
  api.S.simAttempts = [
    { ts: 1, exam: 'CCAR-F', mode: 'exam', total: 60, correct: 44, byDom: {}, answers: {} },
    { ts: 2, exam: 'CCDV-F', mode: 'exam', total: 53, correct: 40, byDom: {}, answers: {} }
  ];
  /* The "a full timed sitting" gate reads two sources. A reset that cleared
     only simAttempts left these behind, and the gate went on reporting
     sittings and a best score after a reset that looked like it cleared
     exactly that. A drill session for the same exam must survive. */
  api.S.sessions = [
    { ts: 3, exam: 'CCAR-F', mode: 'exam', total: 60, correct: 50, scaled: 925 },
    { ts: 4, exam: 'CCAR-F', mode: 'domain', total: 10, correct: 8, domain: 'd1' },
    { ts: 5, exam: 'CCDV-F', mode: 'exam', total: 53, correct: 44, scaled: 880 }
  ];
  NODES = [];
  api.renderExamReset(mk('div'));
  const arm = dangerBtn(/exam results/);
  ok(!!arm && arm.disabled === false, 'the control is offered and enabled');
  arm.onclick();
  const field = findInput();
  field.value = 'SIM'; field.oninput();
  byLabel(/^Erase$/).onclick();

  ok(api.S.simAttempts.length === 1, 'the CCAR-F simulation attempt is gone');
  ok(api.S.simAttempts[0].exam === 'CCDV-F',
     "and another certification's attempt survives");
  ok(!api.S.sessions.some(x => x.exam === 'CCAR-F' && x.mode === 'exam'),
     'the retired timed mock sitting is gone too');
  ok(api.S.sessions.some(x => x.exam === 'CCAR-F' && x.mode === 'domain'),
     'but a CCAR-F drill session survives');
  ok(api.S.sessions.some(x => x.exam === 'CCDV-F' && x.mode === 'exam'),
     "and another certification's sitting survives");
  ok(api.fullSittings('CCAR-F').length === 0,
     'so the timed-sitting gate now sees nothing, got '
     + api.fullSittings('CCAR-F').length);
  ok(!!api.S.history['ar-d1-01'], 'drill answers are untouched');
  ok(!!api.S.cards['CCAR-F/d1/some card front'], 'flashcard state is untouched');
  ok(api.S.read['CCAR-F/d1'] === true, 'read markers are untouched');
  ok(!!api.S.labs['lab-1'], 'lab checkpoints are untouched');
}

/* The Settings page carries the same exam-results reset widened to every
   certification. Its value, like the per-exam one, is in what it spares. */
H('17. The global exam-results reset spans certifications and spares the rest');
{
  const st = blank('CCAR-F');
  const { api } = boot(st);
  api.S.history['ar-d1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCAR-F' }];
  api.S.history['dv-v1-01'] = [{ correct: true, conf: 'sure', ts: Date.now(), exam: 'CCDV-F' }];
  api.S.cards['CCAR-F/d1/a front'] = { box: 2, due: 0 };
  api.S.read['CCAO-F/a1'] = Date.now();
  api.S.labs['lab-1'] = { checkpoints: { a: true } };
  api.S.simAttempts = [
    { ts: 1, exam: 'CCAR-F', mode: 'exam', total: 60, correct: 44, byDom: {}, answers: {} },
    { ts: 2, exam: 'CCDV-F', mode: 'exam', total: 53, correct: 40, byDom: {}, answers: {} }
  ];
  api.S.sessions = [
    { ts: 3, exam: 'CCAR-F', mode: 'exam', total: 60, correct: 50, scaled: 925 },
    { ts: 4, exam: 'CCAO-F', mode: 'exam', total: 60, correct: 48, scaled: 880 },
    { ts: 5, exam: 'CCAR-F', mode: 'domain', total: 10, correct: 8, domain: 'd1' }
  ];
  NODES = [];
  api.renderGlobalReset(mk('div'));
  const arm = dangerBtn(/^Reset exam results$/);
  ok(!!arm && arm.disabled === false, 'the control is offered and enabled');
  arm.onclick();
  const field = findInput(), go = byLabel(/^Erase$/);
  // DELETE belongs to the full reset; this one has its own phrase
  field.value = 'DELETE'; field.oninput();
  ok(go.disabled === true, 'the full reset phrase does not unlock this one');
  field.value = 'RESULTS'; field.oninput();
  ok(go.disabled === false, 'RESULTS does');
  go.onclick();

  const now = api.getS();
  ok(now.simAttempts.length === 0, 'simulation attempts gone for every certification');
  ok(!now.sessions.some(x => x.mode === 'exam'), 'and every timed mock sitting too');
  ok(now.sessions.some(x => x.mode === 'domain'), 'but drill sessions survive');
  ok(api.fullSittings('CCAR-F').length === 0, 'CCAR-F shows no sittings');
  ok(api.fullSittings('CCAO-F').length === 0, 'nor does CCAO-F');
  ok(Object.keys(now.history).length === 2, 'drill answers untouched for both exams');
  ok(!!now.cards['CCAR-F/d1/a front'], 'flashcard state untouched');
  ok(!!now.read['CCAO-F/a1'], 'read markers untouched');
  ok(!!now.labs['lab-1'], 'lab checkpoints untouched');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Per-exam reset tests passed');
process.exit(fail ? 1 : 0);
