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

const need = ['data-sim-questions.js', 'data-sim-objectives.js', 'sim.js', 'data-exams.js'];
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
  fs.readFileSync(PATHS.resolve('data-sim-objectives.js'), 'utf8'),
  shim,
  fs.readFileSync(PATHS.resolve('sim.js'), 'utf8'),
  ';globalThis.__o={SIM_QUESTIONS,SIM_OBJECTIVES,SIM_SOURCES,EXAMS,'
  + 'buildSitting,simSubmit,simStart,simBank,simObjectives,SIM_BLOCK,SIM_TARGET,'
  + 'simScenarioName,S,getSIM:function(){return SIM;},setSIM:function(v){SIM=v;}};'
].join('\n;\n');

try { vm.runInContext(src, ctx, { filename: 'sim-bundle.js' }); }
catch (e) { console.log('sim.js failed to load:', e.message); process.exit(1); }

const O = ctx.__o;
const { SIM_QUESTIONS: QS, SIM_OBJECTIVES: OBJ, EXAMS } = O;
/* No score report ships; section 5 asserts that. */
const REP = ctx.SIM_SCORE_REPORT !== undefined ? ctx.SIM_SCORE_REPORT : undefined;

H('1. The imported bank');
ok(QS.length === 270, 'holds 270 questions, found ' + QS.length);
ok(OBJ.length === 37, 'holds 37 test objectives, found ' + OBJ.length);
ok(new Set(QS.map(q => q.id)).size === QS.length, 'every question id is unique');
ok(QS.every(q => q.exam === 'CCAR-F'), 'every question is CCAR-F');
ok(QS.every(q => q.format === 'single_select'), 'every question is single-select');

H('2. Every question obeys the import rules');
const bad = [];
QS.forEach(q => {
  if (!q.options || q.options.length !== 4) bad.push(q.id + ': not 4 options');
  if (!q.options.some(o => o.key === q.correct)) bad.push(q.id + ': correct key not among options');
  if (q.options.some(o => !o.text || !o.explanation)) bad.push(q.id + ': option missing text/explanation');
  if (q.options.map(o => o.key).join('') !== 'ABCD') bad.push(q.id + ': option keys not ABCD');
  if (!q.tiebreaker || !q.rationale) bad.push(q.id + ': missing tiebreaker/rationale');
  if (!q.sources || !q.sources.length) bad.push(q.id + ': no sources');
});
ok(!bad.length, 'all ' + QS.length + ' pass structural validation' + (bad.length ? ' — ' + bad.slice(0, 5).join('; ') : ''));

H('3. Scenarios and domains resolve against the exam guide');
const scnIds = (EXAMS['CCAR-F'].scenarios || []).map(s => s.id);
const domIds = (EXAMS['CCAR-F'].domains || []).map(d => d.id);
ok(QS.every(q => scnIds.includes(q.scn)), 'every question maps to a known scenario id');
ok(QS.every(q => q.domains.every(d => domIds.includes(d))), 'every domain maps to a known domain id');
// The handoff names this scenario differently from the exam guide; if the
// alias is ever dropped these 10 questions silently vanish from their block.
const ci = QS.filter(q => q.scn === 'ci');
ok(ci.length === 22, '"Claude Code for CI/CD" maps onto the guide\'s ci scenario (' + ci.length + ' questions)');
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
ok(OBJ.filter(o => o.questions.length).length === 37, 'all 37 objectives have at least one question, found ' + OBJ.filter(o => o.questions.length).length);
ok(OBJ.filter(o => !o.questions.length).length === 0, 'none are left uncovered, found ' + OBJ.filter(o => !o.questions.length).length);

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
const haveCtx = new Set(QS.filter(q => q.scenarioContext).map(q => q.scn));
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
const expect = QS.filter(q => q.objectives.includes('O01') || q.objectives.includes('O04')).length;
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
  const enough = Math.ceil(bank.length / O.SIM_TARGET) + 2;
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
for (const q of QS) {
  if (ids.has(q.id)) dupe++; else ids.add(q.id);
  if (!Array.isArray(q.options) || q.options.length !== 4) badOpts++;
  const right = (q.options || []).filter(o => o.is_correct || o.key === q.correct);
  if (!q.correct || right.length !== 1 || right[0].key !== q.correct) badCorrect++;
  if ((q.options || []).some(o => !o.explanation || !String(o.explanation).trim())) noExpl++;
  if (!q.scn || !scnOk.has(q.scn)) badScn++;
  if (!q.stem || !q.tiebreaker || !q.rationale || !q.set) badField++;
}
ok(dupe === 0, 'every question id is unique (' + ids.size + ' questions)');
ok(badOpts === 0, 'every question has exactly four options');
ok(badCorrect === 0, 'correct names exactly one option, and that option is the right one');
ok(noExpl === 0, 'every option carries an explanation');
ok(badScn === 0, 'every scenario id resolves against the CCAR-F scenario list');
ok(badField === 0, 'every question has stem, tiebreaker, rationale and set');

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
   questions behind it. The bank was deliberately levelled to a floor of 8;
   this guards that floor against a future edit that thins one out. */
const FLOOR = 8;
const perObj = OBJ.map(o => [o.id, (o.questions || []).length]);
const thin = perObj.filter(([, n]) => n < FLOOR);
ok(thin.length === 0, 'every objective has at least ' + FLOOR + ' questions'
   + (thin.length ? ' — thin: ' + thin.map(([k, n]) => k + '(' + n + ')').join(' ') : ''));
const counts = perObj.map(([, n]) => n);
ok(Math.min(...counts) >= FLOOR, 'the per-objective floor holds (min '
   + Math.min(...counts) + ', max ' + Math.max(...counts) + ')');

console.log('');
if (fail) { console.log(fail + ' failure' + (fail === 1 ? '' : 's')); process.exit(1); }
console.log('all simulation checks passed');
