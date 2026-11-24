/* Exam simulation: data, importer and sitting logic.
 *
 * Loads the generated data files and sim.js in a VM with just enough of a
 * browser and of app.js to exercise the logic that does not touch the DOM —
 * building a sitting, scoring one, and the objective rollups.
 *
 * The data files are hand-maintained source: the importer that generated them
 * was retired once the question sets were final, so section 12 checks the
 * integrity the importer used to enforce on every run.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const PATHS = require('../tools/paths');
const dir = PATHS.ROOT;

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

const need = ['data-sim-questions.js', 'data-sim-questions-dv.js', 'data-sim-objectives.js',
              'data-sim-objectives-dv.js', 'sim.js', 'data-exams.js'];
for (const f of need) {
  if (!fs.existsSync(PATHS.resolve(f))) {
    console.log(f + ' not found');
    process.exit(1);
  }
}

/* ---------- a minimal host for sim.js ---------- */
const noop = () => {};
const stubEl = () => {
  const e = {
    children: [], className: '', style: {}, dataset: {}, hidden: false,
    textContent: '', innerHTML: '', title: '',
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild(c) { this.children.push(c); return c; },
    append(...c) { this.children.push(...c); },
    setAttribute: noop, addEventListener: noop, focus: noop,
    querySelector: () => stubEl(), querySelectorAll: () => []
  };
  return e;
};
const ctx = {
  console, structuredClone, Date, Math, JSON, Object, Array, String, Number,
  setInterval: () => 0, clearInterval: noop, alert: noop, confirm: () => true,
  document: { createElement: stubEl, createElementNS: stubEl,
              createTextNode: () => stubEl(), addEventListener: noop,
              querySelector: () => stubEl(), querySelectorAll: () => [] },
  window: { scrollTo: noop, addEventListener: noop },
  localStorage: { getItem: () => null, setItem: noop }
};
ctx.globalThis = ctx;
vm.createContext(ctx);

// app.js pieces sim.js leans on, kept deliberately small so this suite tests
// sim.js rather than a copy of the app.
const shim = `
  var PASS_MARK = 720;
  var S = { exam:'CCAR-F', simAttempts:[], simObjSel:[] };
  function save(){}
  function go(){}
  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
  function $(){ return document.querySelector(); }
  function fmtClock(ms){ var t=Math.floor(ms/1000); return Math.floor(t/60)+':'+String(t%60).padStart(2,'0'); }
`;
const src = [
  fs.readFileSync(PATHS.resolve('data-exams.js'), 'utf8'),
  fs.readFileSync(PATHS.resolve('data-sim-questions.js'), 'utf8'),
  fs.readFileSync(PATHS.resolve('data-sim-questions-dv.js'), 'utf8'),
  fs.readFileSync(PATHS.resolve('data-sim-objectives.js'), 'utf8'),
  fs.readFileSync(PATHS.resolve('data-sim-objectives-dv.js'), 'utf8'),
  shim,
  fs.readFileSync(PATHS.resolve('sim.js'), 'utf8'),
  ';globalThis.__o={SIM_QUESTIONS,SIM_OBJECTIVES,SIM_SOURCES,EXAMS,'
  + 'buildSitting,simSubmit,simStart,simBank,simObjectives,simConfig,simDomainQuotas,'
  + 'simIsCorrect,simIsMulti,simCorrectKeys,'
  + 'simScenarioName,S,getSIM:function(){return SIM;},setSIM:function(v){SIM=v;}};'
].join('\n;\n');

try { vm.runInContext(src, ctx, { filename: 'sim-bundle.js' }); }
catch (e) { console.log('sim.js failed to load:', e.message); process.exit(1); }

const O = ctx.__o;
const { SIM_QUESTIONS: QS, SIM_OBJECTIVES: OBJ, EXAMS } = O;
/* The pool holds two exams since CCDV-F set 1 arrived on 2026-11-24. The
   rules below that describe CCAR-F's shape (four options, a scenario on
   every question, the per-objective floor) read the CCAR-F slice; CCDV-F's
   own shape is checked in section 12. */
const AR = QS.filter(q => q.exam === 'CCAR-F');
const DVQ = QS.filter(q => q.exam === 'CCDV-F');
const AR_OBJ = OBJ.filter(o => o.exam === 'CCAR-F');
const DV_OBJ = OBJ.filter(o => o.exam === 'CCDV-F');
/* No score report ships; section 5 asserts that. */
const REP = ctx.SIM_SCORE_REPORT !== undefined ? ctx.SIM_SCORE_REPORT : undefined;

H('1. The imported bank');
/* 283 since 2026-11-18. That day's accuracy review removed objectives that had
   been copied wholesale onto REF-018, REF-089, REF-090, REF-116, REF-117,
   REF-047, REF-053 and REF-057. Thirteen objective_balance questions
   (BAL-063 to BAL-075) were added so O01, O03, O06, O14 and O31 kept the floor
   section 12 enforces. 303 since 2026-11-20, when the ci_depth set (CI-001 to
   CI-020) was added because the CI scenario held only 19 questions against a
   15-question block, so nearly every sitting repeated the same ones. A changed
   count means questions arrived or vanished: update this deliberately, not to
   make the suite pass. */
ok(AR.length === 303, 'holds 303 CCAR-F questions, found ' + AR.length);
ok(AR_OBJ.length === 37, 'holds 37 CCAR-F test objectives, found ' + AR_OBJ.length);
/* 62 CCDV-F questions and 25 sub-skills since 2026-11-24 (set 1 from the
   architect handoff). The same rule applies: a changed count means
   questions arrived or vanished, so update it deliberately. */
ok(DVQ.length === 62, 'holds 62 CCDV-F questions, found ' + DVQ.length);
ok(DV_OBJ.length === 25, 'holds 25 CCDV-F sub-skills, found ' + DV_OBJ.length);
ok(AR.length + DVQ.length === QS.length, 'and nothing from any other exam');
ok(new Set(QS.map(q => q.id)).size === QS.length, 'every question id is unique across both exams');
ok(new Set(OBJ.map(o => o.id)).size === OBJ.length, 'every objective id is unique across both exams');
/* CCAR-F's real paper is all single-select. CCDV-F states on every item how
   many to select, and mixes the two. */
ok(AR.every(q => q.format === 'single_select'), 'every CCAR-F question is single-select');
ok(DVQ.every(q => q.format === 'single_select' || q.format === 'multi_select'),
   'every CCDV-F question is single_select or multi_select');

H('2. Every question obeys the import rules');
const bad = [];
AR.forEach(q => {
  if (!q.options || q.options.length !== 4) bad.push(q.id + ': not 4 options');
  if (!q.options.some(o => o.key === q.correct)) bad.push(q.id + ': correct key not among options');
  if (q.options.some(o => !o.text || !o.explanation)) bad.push(q.id + ': option missing text/explanation');
  if (q.options.map(o => o.key).join('') !== 'ABCD') bad.push(q.id + ': option keys not ABCD');
  if (!q.tiebreaker || !q.rationale) bad.push(q.id + ': missing tiebreaker/rationale');
  if (!q.sources || !q.sources.length) bad.push(q.id + ': no sources');
});
ok(!bad.length, 'all ' + AR.length + ' CCAR-F questions pass structural validation' + (bad.length ? ' — ' + bad.slice(0, 5).join('; ') : ''));

H('3. Scenarios and domains resolve against the exam guide');
const scnIds = (EXAMS['CCAR-F'].scenarios || []).map(s => s.id);
const domIds = (EXAMS['CCAR-F'].domains || []).map(d => d.id);
ok(AR.every(q => scnIds.includes(q.scn)), 'every CCAR-F question maps to a known scenario id');
ok(AR.every(q => q.domains.every(d => domIds.includes(d))), 'every CCAR-F domain maps to a known domain id');
const dvDomIds = (EXAMS['CCDV-F'].domains || []).map(d => d.id);
ok(DVQ.every(q => q.scn === null), 'no CCDV-F question claims a scenario: the exam names none');
ok(DVQ.every(q => q.domains.length && q.domains.every(d => dvDomIds.includes(d))),
   'every CCDV-F domain maps to a known CCDV-F domain id');
// The handoff names this scenario differently from the exam guide; if the
// alias is ever dropped its questions silently vanish from their block. 19
// since 2026-11-18: BAL-073 (a CI review prompt) joined, and REF-070, REF-071,
// REF-075 and REF-127 left, because nothing in their stems involves CI. 39
// since 2026-11-20: the twenty ci_depth questions joined.
const ci = AR.filter(q => q.scn === 'ci');
ok(ci.length === 39, '"Claude Code for CI/CD" maps onto the guide\'s ci scenario (' + ci.length + ' questions)');
{ /* Two spellings now resolve to the same id: the first sitting's data
     says "Claude Code for CI/CD" and the reference set uses the guide's
     own "Claude Code for Continuous Integration". Both must land on ci,
     and each must keep the wording its own source used. */
  const spellings = new Set(ci.map(q => q.scenario));
  ok(spellings.has('Claude Code for CI/CD') && spellings.has('Claude Code for Continuous Integration'),
     'both source spellings resolve to ci, found: ' + [...spellings].join(' / ')); }

H('4. Objectives line up with the questions');
const objIds = new Set(OBJ.map(o => o.id));
ok(QS.every(q => q.objectives.every(o => objIds.has(o))), 'no question cites an unknown objective');
const mismatched = OBJ.filter(o => {
  const actual = QS.filter(q => q.objectives.includes(o.id)).map(q => q.id).sort().join(',');
  return actual !== o.questions.slice().sort().join(',');
});
ok(!mismatched.length, 'each objective lists exactly the questions tagged to it');
ok(AR_OBJ.filter(o => o.questions.length).length === 37, 'all 37 CCAR-F objectives have at least one question, found ' + AR_OBJ.filter(o => o.questions.length).length);
ok(OBJ.filter(o => !o.questions.length).length === 0, 'none are left uncovered, found ' + OBJ.filter(o => !o.questions.length).length);
/* An objective must belong to the exam of every question that cites it, or
   the drill picker for one exam would draw another's questions. */
const byId = Object.fromEntries(OBJ.map(o => [o.id, o]));
ok(QS.every(q => q.objectives.every(o => byId[o].exam === q.exam)),
   'every question cites only its own exam\'s objectives');
ok(DVQ.every(q => q.objectives.every(o => byId[o].domain === q.domains[0])),
   'every CCDV-F sub-skill a question cites belongs to that question\'s domain');

// Strip comments first: sim.js's own header says it touches neither, and a
// naive search would match that sentence and pass for the wrong reason.
const simCode = fs.readFileSync(PATHS.resolve('sim.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
H('5. No score report is bundled');
/* The bank is shared. One candidate's percentages say what that person needed
   to study, not what a colleague does, so none ship and nothing derived from
   them can pre-select objectives. */
ok(typeof REP === 'undefined' || REP === null, 'no SIM_SCORE_REPORT is defined');
ok(!/SIM_SCORE_REPORT|simReport/.test(simCode), 'sim.js does not read a bundled score report');
ok(!/at or below 50%/.test(simCode), 'the "at or below 50%" preset is gone');
ok(Array.isArray(O.S.simObjSel) && O.S.simObjSel.length === 0,
   'nothing is pre-selected for the drill on a fresh profile');

H('6. Building a sitting');
const sit = O.buildSitting({});
ok(sit.total === 60, 'a full sitting is ' + sit.total + ' questions');
ok(sit.minutes === 120, 'the clock is ' + sit.minutes + ' minutes');
ok(sit.list.length === 60, 'the paper holds 60 items');
ok(new Set(sit.list.map(i => i.q.id)).size === 60, 'no question appears twice in one paper');
const trueBlocks = sit.blocks.filter(b => !b.filler);
ok(trueBlocks.length === 4, 'it draws 4 scenario blocks, found ' + trueBlocks.length);
ok(trueBlocks.every(b => b.questions.length <= 15), 'no block exceeds 15 questions');
ok(trueBlocks.every(b => b.questions.every(q => q.scn === b.scn)),
   'every question in a block belongs to that block\'s scenario');
/* Top-up only happens when a drawn scenario has fewer than 15 questions.
   Five of the six scenarios now clear 15, so a given sitting may need no
   top-up at all — but when it does, the count must be reported honestly and
   the extras must sit in their own block rather than being passed off as
   part of a scenario. Both states are correct; silence about a shortfall is
   not, so this checks the accounting holds either way. */
ok(sit.filled === 60 - trueBlocks.reduce((n, b) => n + b.questions.length, 0),
   'the top-up count (' + sit.filled + ') accounts for the shortfall exactly');
ok(sit.filled > 0 ? sit.blocks.some(b => b.filler) : !sit.blocks.some(b => b.filler),
   sit.filled > 0 ? 'top-ups sit in their own block rather than a scenario'
                  : 'no shortfall this draw, so no filler block was invented');
/* Every scenario now has a briefing. Five come from `ctx` on the blueprint's
   scenario list; the extraction one arrived on the handoff questions as
   scenarioContext and is still carried there. The blueprint wins where both
   exist, so a block is briefed either way and none renders an empty box. */
const scnDefs = EXAMS['CCAR-F'].scenarios;
ok(scnDefs.every(x => x.ctx && x.ctx.length > 80),
   'every scenario in the blueprint carries a briefing');
ok(trueBlocks.every(b => !!b.context && b.context.length > 80),
   'and every drawn block gets one');
const haveCtx = new Set(AR.filter(q => q.scenarioContext).map(q => q.scn));
ok([...haveCtx].join() === 'extract',
   'the handoff scenarioContext is still carried on the extraction questions');
const extractDef = scnDefs.find(x => x.id === 'extract');
const extractBlock = trueBlocks.find(b => b.scn === 'extract');
ok(!extractBlock || extractBlock.context === extractDef.ctx,
   'and the blueprint briefing wins where a question also carries one');

H('7. Option order is shuffled but answers are keyed');
ok(sit.list.every(i => i.order.length === 4), 'each item carries a 4-key order');
ok(sit.list.every(i => i.order.slice().sort().join('') === 'ABCD'),
   'a shuffled order is still exactly A-D');
let shuffled = 0;
for (let n = 0; n < 40; n++) {
  const s2 = O.buildSitting({});
  if (s2.list.some(i => i.order.join('') !== 'ABCD')) shuffled++;
}
ok(shuffled > 0, 'order actually varies between attempts');
// The real point: whatever the order, the correct answer is a key, so a
// shuffle can never change which answer is right.
ok(sit.list.every(i => i.q.options.find(o => o.key === i.q.correct)),
   'the correct option is found by key, never by position');

H('8. A drill draws only the objectives asked for');
const drill = O.buildSitting({ objectives: ['O01', 'O04'], blocks: 6, perBlock: 99, target: 99 });
ok(drill.list.length > 0, 'a drill on O01+O04 returns ' + drill.list.length + ' questions');
ok(drill.list.every(i => i.q.objectives.some(o => o === 'O01' || o === 'O04')),
   'every question drawn carries one of the chosen objectives');
const expect = AR.filter(q => q.objectives.includes('O01') || q.objectives.includes('O04')).length;
ok(drill.list.length === expect, 'it draws all ' + expect + ' matching questions');

H('8b. Repeated sittings rotate through the bank');
{
  /* Sittings used to be independent shuffles. The bank is uneven — two
     scenarios hold over 70 questions, two about 22, and a block takes 15 — so
     a small-scenario question appeared in nearly half of all papers and a
     big-scenario one in about one in eight. Twelve sittings still left a
     tenth of the bank unseen, which users reported as questions never coming
     up. Each sitting here is recorded the way simSubmit records it, and the
     bounds are worst cases over 1000 trials of the rotating builder; a blind
     shuffle misses them by a wide margin, so these are not flaky by chance. */
  const saved = O.S.simAttempts;
  const bank = O.simBank('CCAR-F');
  // A lap of the bank, plus two sittings of slack for the block structure:
  // a block cannot mix scenarios, so the last lap never packs perfectly.
  // The paper size comes from the exam's sim config now, which replaced the
  // SIM_TARGET constant when a second exam's paper had to differ.
  const enough = Math.ceil(bank.length / O.simConfig('CCAR-F').target) + 2;
  let overlapped = 0, unfinished = 0, worst = bank.length;
  for (let t = 0; t < 40; t++) {
    O.S.simAttempts = [];
    const seen = new Set();
    for (let k = 0; k < enough; k++) {
      const s = O.buildSitting({});
      const answers = {};
      s.list.forEach(i => { answers[i.q.id] = { picked: null, ok: false }; });
      if (k === 1 && s.list.some(i => seen.has(i.q.id))) overlapped++;
      s.list.forEach(i => seen.add(i.q.id));
      O.S.simAttempts.push({ exam: 'CCAR-F', answers });
    }
    if (seen.size < bank.length) { unfinished++; worst = Math.min(worst, seen.size); }
  }
  ok(overlapped === 0, overlapped ? overlapped + ' second sittings repeated a question from the first'
                                  : 'a second sitting never repeats the first');
  ok(unfinished === 0, unfinished
     ? unfinished + ' of 40 runs left questions unseen after ' + enough + ' sittings (worst ' + worst + ')'
     : 'every one of ' + bank.length + ' questions appears within ' + enough + ' sittings');

  // With no history the paper is still a random draw of four scenarios, as
  // the real exam's is: steering must not pin a first sitting to the big ones.
  O.S.simAttempts = [];
  const firstScn = new Set();
  for (let t = 0; t < 60; t++)
    O.buildSitting({}).blocks.filter(b => !b.filler).forEach(b => firstScn.add(b.scn));
  ok(firstScn.size === 6, 'first sittings draw from all ' + firstScn.size + ' scenarios');

  /* Questions that teach the same lesson share a family, and most families
     sit in one scenario, so a block could hold two and the first would give
     the second away. Mid-lap papers must keep families apart; only the paper
     that finishes a lap may relax it, so that coverage above still holds. */
  const fam = {};
  QS.forEach(q => { if (q.family) (fam[q.family] = fam[q.family] || []).push(q.id); });
  const lonely = Object.keys(fam).filter(f => fam[f].length < 2);
  ok(Object.keys(fam).length > 0 && !lonely.length, Object.keys(fam).length
     + ' families, each with at least two questions' + (lonely.length ? ' — alone: ' + lonely.join(' ') : ''));
  let pairs = 0;
  for (let t = 0; t < 200; t++) {
    O.S.simAttempts = [];
    const f = {};
    O.buildSitting({}).list.forEach(i => {
      if (!i.q.family) return;
      if (f[i.q.family]) pairs++;
      f[i.q.family] = 1;
    });
  }
  ok(pairs === 0, pairs ? pairs + ' first sittings held two questions from one family'
                        : 'a first sitting never holds two questions from one family');
  O.S.simAttempts = saved;
}

H('9. Scoring and the breakdowns');
const sim = Object.assign(O.buildSitting({}), {
  mode: 'exam', i: 0, answers: {}, flags: {}, revealed: {},
  started: Date.now() - 1000, deadlineMs: 7200000, reviewing: false, objectives: null
});
// Answer the first half right and the rest wrong, so every rollup has a
// mix rather than a degenerate 0% or 100%.
sim.list.forEach((it, n) => {
  const wrong = it.q.options.find(o => o.key !== it.q.correct).key;
  sim.answers[it.q.id] = n % 2 === 0 ? it.q.correct : wrong;
});
O.setSIM(sim);
O.simSubmit(false);
const att = O.S.simAttempts[O.S.simAttempts.length - 1];
ok(!!att, 'the attempt is recorded');
ok(att.total === 60, 'it records 60 questions');
ok(att.correct === 30, 'it scores exactly the 30 right answers, got ' + att.correct);
ok(att.exam === 'CCAR-F', 'it is tagged to CCAR-F so a per-exam reset finds it');
const sumObj = Object.values(att.byObj).reduce((n, v) => n + v.n, 0);
ok(Object.keys(att.byObj).length > 0, 'it breaks down by test objective (' + Object.keys(att.byObj).length + ')');
ok(Object.keys(att.byDom).length > 0, 'it breaks down by domain (' + Object.keys(att.byDom).length + ')');
ok(Object.keys(att.byScn).length > 0, 'it breaks down by scenario (' + Object.keys(att.byScn).length + ')');
ok(Object.values(att.byDom).reduce((n, v) => n + v.n, 0) >= 60,
   'every question counts toward at least one domain');
ok(Object.values(att.byObj).every(v => v.ok <= v.n), 'no objective scores more right than asked');
ok(Object.values(att.byScn).reduce((n, v) => n + v.n, 0) === 60,
   'the scenario rollup accounts for all 60 questions');
ok(Object.keys(att.answers).length === 60, 'every answer is kept for the review screen');

H('10. An unanswered paper scores zero, not an error');
const blank = Object.assign(O.buildSitting({}), {
  mode: 'exam', i: 0, answers: {}, flags: {}, revealed: {},
  started: Date.now(), deadlineMs: 1, reviewing: false, objectives: null
});
O.setSIM(blank);
O.simSubmit(true);
const z = O.S.simAttempts[O.S.simAttempts.length - 1];
ok(z.correct === 0, 'an empty paper scores 0');
ok(z.auto === true, 'an auto-submit is marked as one');
ok(Object.values(z.byObj).every(v => v.ok === 0), 'no objective claims a correct answer');

H('11. The recall bank is untouched');
const appSrc = fs.readFileSync(PATHS.resolve('app.js'), 'utf8');
ok(!/SIM_QUESTIONS\s*\)/.test(appSrc.replace(/typeof SIM_QUESTIONS/g, '')),
   'app.js never folds SIM_QUESTIONS into QUESTIONS');
ok(!/S\.history/.test(simCode), 'sim.js never touches the recall answer history');
ok(!/S\.sessions/.test(simCode), 'sim.js never touches the recall session log');
ok(/S\.simAttempts\.push/.test(simCode), 'it records attempts in its own store instead');
ok(appSrc.includes("S.simAttempts = (S.simAttempts || []).filter(a => a.exam !== exam)"),
   'a per-exam reset clears that exam\'s simulation attempts');
ok(/sims:\s*\(S\.simAttempts/.test(appSrc), 'the global reset counts simulation attempts');

H('12. The simulation bank is internally consistent');
/* The bank was generated by an importer that validated it on every run. The
   importer is gone and these files are now the source of truth, so the checks
   it used to enforce live here instead. */
const ids = new Set();
let dupe = 0, badOpts = 0, badCorrect = 0, noExpl = 0, badScn = 0, badField = 0;
const scnOk = new Set(scnIds);
for (const q of AR) {
  if (ids.has(q.id)) dupe++; else ids.add(q.id);
  if (!Array.isArray(q.options) || q.options.length !== 4) badOpts++;
  const right = (q.options || []).filter(o => o.is_correct || o.key === q.correct);
  if (!q.correct || right.length !== 1 || right[0].key !== q.correct) badCorrect++;
  if ((q.options || []).some(o => !o.explanation || !String(o.explanation).trim())) noExpl++;
  if (!q.scn || !scnOk.has(q.scn)) badScn++;
  if (!q.stem || !q.tiebreaker || !q.rationale || !q.set) badField++;
}
ok(dupe === 0, 'every CCAR-F question id is unique (' + ids.size + ' questions)');
ok(badOpts === 0, 'every CCAR-F question has exactly four options');
ok(badCorrect === 0, 'correct names exactly one option, and that option is the right one');
ok(noExpl === 0, 'every option carries an explanation');
ok(badScn === 0, 'every scenario id resolves against the CCAR-F scenario list');
ok(badField === 0, 'every question has stem, tiebreaker, rationale and set');

/* CCDV-F's shape. A single-select is the CCAR-F rule: four options, one
   correct key. A multi-select names an array of exactly `select` keys, at
   least two of them, each a real option, from four to six options, and
   leaves at least one option wrong: an all-correct item is answered by the
   count alone. Exhibits are text with a known language, and every question
   keeps the volatile flag and content date that let stale ones be found. */
const LANGS = ['json', 'python', 'typescript', 'bash', 'sse', 'text'];
const dvBad = [];
for (const q of DVQ) {
  if (ids.has(q.id)) dvBad.push(q.id + ': id clashes'); else ids.add(q.id);
  const keys = (q.options || []).map(o => o.key);
  if ((q.options || []).some(o => !o.text || !String(o.explanation || '').trim())) dvBad.push(q.id + ': option missing text/explanation');
  if (q.format === 'single_select') {
    if (keys.length !== 4) dvBad.push(q.id + ': single-select without 4 options');
    if (typeof q.correct !== 'string' || !keys.includes(q.correct)) dvBad.push(q.id + ': correct is not one key');
    if (q.select !== 1) dvBad.push(q.id + ': single-select with select ' + q.select);
  } else {
    if (keys.length < 4 || keys.length > 6) dvBad.push(q.id + ': multi-select with ' + keys.length + ' options');
    if (!Array.isArray(q.correct) || q.correct.length !== q.select || q.select < 2) dvBad.push(q.id + ': correct does not match select');
    else if (!q.correct.every(k => keys.includes(k))) dvBad.push(q.id + ': a correct key is not an option');
    else if (q.correct.length >= keys.length) dvBad.push(q.id + ': every option is correct');
  }
  if (q.exhibit && (!LANGS.includes(q.exhibit.lang) || !q.exhibit.body)) dvBad.push(q.id + ': malformed exhibit');
  if (typeof q.volatile !== 'boolean' || !/^\d{4}-\d{2}-\d{2}$/.test(q.contentDate || '')) dvBad.push(q.id + ': lost volatile/contentDate');
  if (!q.stem || !q.tiebreaker || !q.rationale || !q.set || !(q.sources || []).length) dvBad.push(q.id + ': missing a required field');
}
ok(!dvBad.length, 'all ' + DVQ.length + ' CCDV-F questions are well formed'
   + (dvBad.length ? ' — ' + dvBad.slice(0, 5).join('; ') : ''));
ok(DVQ.some(q => q.format === 'multi_select') && DVQ.some(q => q.exhibit),
   'the CCDV-F bank holds multi-select items (' + DVQ.filter(q => q.format === 'multi_select').length
   + ') and exhibits (' + DVQ.filter(q => q.exhibit).length + ')');

/* The objectives index points back at question ids; nothing regenerates it
   now, so a renamed or removed question would leave a dangling reference. */
let dangling = 0, orphanObj = 0;
for (const o of OBJ) {
  for (const qid of (o.questions || [])) if (!ids.has(qid)) dangling++;
  if (!(o.questions || []).length) orphanObj++;
}
ok(dangling === 0, 'every question id in the objectives index exists in the bank');
ok(orphanObj === 0, 'every objective has at least one question');

/* Drilling by objective is only useful if every objective has enough
   questions behind it. The CCAR-F bank was deliberately levelled to a floor
   of 8; this guards that floor against a future edit that thins one out.
   CCDV-F's set 1 holds one to five per sub-skill and is not levelled yet, so
   the floor applies to CCAR-F only (the handoff's target is about 160). */
const FLOOR = 8;
const perObj = AR_OBJ.map(o => [o.id, (o.questions || []).length]);
const thin = perObj.filter(([, n]) => n < FLOOR);
ok(thin.length === 0, 'every objective has at least ' + FLOOR + ' questions'
   + (thin.length ? ' — thin: ' + thin.map(([k, n]) => k + '(' + n + ')').join(' ') : ''));
const counts = perObj.map(([, n]) => n);
ok(Math.min(...counts) >= FLOOR, 'the per-objective floor holds (min '
   + Math.min(...counts) + ', max ' + Math.max(...counts) + ')');

H('13. Exam configuration, domain-quota papers and multi-select');
/* CCDV-F names no scenarios, so its paper is drawn by domain quota, and its
   items can ask for more than one answer. Nothing real is imported yet, so a
   synthetic bank from tests/fixtures/sim-dv.js stands in. It is added last,
   after every check that counts the CCAR-F bank, and stays out of them. */
const DV = require('./fixtures/sim-dv');

/* The four constants this replaced were CCAR-F's paper. An exam with no sim
   block must still get exactly that paper, or adding config would have
   quietly changed every existing sitting. */
const arCfg = O.simConfig('CCAR-F');
ok(arCfg.mode === 'scenario' && arCfg.blocks === 4 && arCfg.perBlock === 15
   && arCfg.target === 60 && arCfg.minutes === 120 && arCfg.multi === false,
   'CCAR-F resolves to 4 blocks of 15, 60 questions, 120 minutes, single-select');
const bare = O.simConfig('CCAO-F');
ok(bare.mode === 'scenario' && bare.target === 60 && bare.minutes === 120,
   'an exam with no sim block falls back to the CCAR-F paper');
const dvCfg = O.simConfig('CCDV-F');
ok(dvCfg.mode === 'domain' && dvCfg.target === 53 && dvCfg.minutes === 120 && dvCfg.multi,
   'CCDV-F is a 53-item, 120-minute domain paper with multi-select');

/* Largest remainder, not rounding. Rounding each share of 53 gives 52 and
   rounding up gives 56; the blueprint table is the largest-remainder result,
   so a builder that rounds would draw a paper one item short or three over. */
const quotas = O.simDomainQuotas('CCDV-F', 53);
const BLUEPRINT = { v1: 17, v2: 9, v3: 8, v4: 6, v5: 6, v6: 4, v7: 2, v8: 1 };
ok(Object.keys(BLUEPRINT).every(d => quotas[d] === BLUEPRINT[d]),
   'quotas for 53 items match the blueprint table: ' + JSON.stringify(quotas));
const q70 = O.simDomainQuotas('CCDV-F', 70);
ok(Object.values(q70).reduce((a, b) => a + b, 0) === 70,
   'a 70-item paper (the reported change) still sums exactly to 70');

QS.push(...DV.questions());
OBJ.push(...DV.objectives().filter(o => !OBJ.some(x => x.id === o.id)));
O.S.simAttempts = [];

/* A question from one certification must never land in another's paper,
   in either direction, now that the bank holds two. */
const dvPaper = O.buildSitting({ exam: 'CCDV-F' });
ok(dvPaper.total === 53 && dvPaper.filled === 0, 'a CCDV-F paper has 53 questions and no filler');
ok(dvPaper.list.every(it => it.q.exam === 'CCDV-F'), 'a domain-mode paper never contains a CCAR-F question');
const arPaper = O.buildSitting({ exam: 'CCAR-F' });
ok(arPaper.total === 60 && arPaper.list.every(it => it.q.exam === 'CCAR-F'),
   'and a CCAR-F paper never contains a CCDV-F question');
const perDom = {};
dvPaper.list.forEach(it => { perDom[it.q.domains[0]] = (perDom[it.q.domains[0]] || 0) + 1; });
ok(Object.keys(BLUEPRINT).every(d => perDom[d] === BLUEPRINT[d]),
   'each domain supplies exactly its quota');
ok(dvPaper.blocks.length === 1 && dvPaper.blocks[0].scn === null && !dvPaper.blocks[0].filler,
   'the paper is one block with no scenario, so block lookups keep working');
/* Grouped by domain, 53 items change domain 7 times. The real exam mixes
   them, and grouping would tell the candidate each item's domain. Any
   random order of these quotas changes far more often than 7 times. */
let switches = 0;
dvPaper.list.forEach((it, i) => { if (i && it.q.domains[0] !== dvPaper.list[i - 1].q.domains[0]) switches++; });
ok(switches > 15, 'the order is shuffled across domains, not grouped (' + switches + ' changes of domain)');

/* A domain that cannot fill its share is topped up from the others, in a
   separate block the start screen and results own up to. */
const v8 = QS.filter(q => q.exam === 'CCDV-F' && q.domains[0] === 'v8');
// (Real v8 questions and fixture ones alike, so the domain is truly empty.)
v8.forEach(q => QS.splice(QS.indexOf(q), 1));
const topped = O.buildSitting({ exam: 'CCDV-F' });
ok(topped.total === 53 && topped.filled === 1 && topped.blocks[1] && topped.blocks[1].filler,
   'with no v8 questions the paper still reaches 53, with 1 filler in its own block');
QS.push(...v8);

/* An objective drill asks for a handful of sub-skills, so a quota would push
   most of it into the filler block. It is drawn as one plain block. */
const skillN = QS.filter(q => (q.objectives || []).includes('DV-8.1')).length;
const dvDrill = O.buildSitting({ exam: 'CCDV-F', objectives: ['DV-8.1'], blocks: 6, perBlock: skillN, target: skillN });
ok(dvDrill.total === skillN && dvDrill.filled === 0 && dvDrill.list.every(it => it.q.objectives.includes('DV-8.1')),
   'a domain-mode objective drill holds only that sub-skill, with no filler block');
ok(O.simObjectives('CCDV-F').every(o => o.exam === 'CCDV-F') && O.simObjectives('CCDV-F').length === 25
   && O.simObjectives('CCAR-F').length === 37,
   'each exam\'s drill picker lists only its own objectives');

/* No partial credit. One of two right is wrong, as is picking everything:
   a scorer that counted overlap would pass both. */
const mq = QS.find(q => q.id.startsWith('FX-') && O.simIsMulti(q));
ok(!O.simIsCorrect(mq, ['A']), 'a multi-select with one of two correct picks scores as wrong');
ok(O.simIsCorrect(mq, ['C', 'A']), 'both correct picks score right, in either order');
ok(!O.simIsCorrect(mq, ['A', 'B', 'C']) && !O.simIsCorrect(mq, null),
   'an extra pick, or no answer, scores as wrong');
/* Attempts saved before multi-select store a bare key and are never migrated. */
const sq = QS.find(q => q.exam === 'CCAR-F');
ok(O.simIsCorrect(sq, sq.correct) && !O.simIsCorrect(sq, sq.options.find(o => o.key !== sq.correct).key),
   'a single-select answer stored as a plain string still scores both ways');

/* Answers are keys, never positions. Option order is shuffled per paper, so
   a scorer that stored "the second and fourth options" would grade against
   a different pair on every sitting. Answering by key through simSubmit
   must score full marks whatever order each paper showed. */
const before = JSON.stringify(mq.correct);
for (let t = 0; t < 5; t++) {
  const paper = Object.assign(O.buildSitting({ exam: 'CCDV-F' }), {
    mode: 'exam', i: 0, answers: {}, flags: {}, revealed: {},
    started: Date.now() - 1000, deadlineMs: 7200000, reviewing: false, objectives: null
  });
  paper.list.forEach(it => {
    const right = O.simCorrectKeys(it.q);
    const keys = it.order.filter(k => right.includes(k));
    paper.answers[it.q.id] = O.simIsMulti(it.q) ? keys.slice().sort() : keys[0];
  });
  O.setSIM(paper);
  O.simSubmit(false);
}
const fullMarks = O.S.simAttempts.slice(-5);
ok(fullMarks.every(a => a.correct === a.total && a.exam === 'CCDV-F'),
   'shuffled option order never changes which keys are correct (5 papers, all full marks)');
ok(JSON.stringify(mq.correct) === before, 'and building papers never reorders a question\'s correct keys');
ok(fullMarks.every(a => !Object.keys(a.byScn).length && Object.keys(a.byDom).length === 8),
   'a domain paper records no scenarios and all eight domains');

/* An under-answered multi-select is wrong, not half right. */
const under = Object.assign(O.buildSitting({ exam: 'CCDV-F' }), {
  mode: 'exam', i: 0, answers: {}, flags: {}, revealed: {},
  started: Date.now(), deadlineMs: 7200000, reviewing: false, objectives: null
});
const multiIt = under.list.find(it => O.simIsMulti(it.q));
under.answers[multiIt.q.id] = [O.simCorrectKeys(multiIt.q)[0]];
O.setSIM(under);
O.simSubmit(false);
const ua = O.S.simAttempts[O.S.simAttempts.length - 1];
ok(ua.answers[multiIt.q.id].ok === false && Array.isArray(ua.answers[multiIt.q.id].picked),
   'an under-answered multi-select scores wrong and keeps its picks as an array');
O.S.simAttempts = [];

console.log('');
if (fail) { console.log(fail + ' failure' + (fail === 1 ? '' : 's')); process.exit(1); }
console.log('all simulation checks passed');
