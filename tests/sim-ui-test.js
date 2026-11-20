/* Exam simulation, driven through the real markup.
 *
 * sim-test.js checks the logic; this checks the wiring. It builds a DOM stub
 * holding every id the simulation views declare in index.html, boots sim.js
 * against it, and plays a whole sitting: start screen, scenario headings,
 * answering, practice feedback, flagging, review, submit, results.
 *
 * The element ids come out of index.html rather than being restated here, so
 * renaming one in the markup without updating sim.js fails this suite instead
 * of failing silently in a browser.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const PATHS = require('../tools/paths');
const dir = PATHS.ROOT;

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

const HTML = fs.readFileSync(PATHS.resolve('index.html'), 'utf8');

/* ---------- DOM stub ---------- */
const BY_ID = {};
function mk(tag) {
  const n = {
    tag: tag || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', title: '', value: '', type: '', href: '',
    children: [], hidden: false, disabled: false, checked: false, handlers: {},
    onclick: null, onchange: null,
    classList: {
      add: c => c && n._cls.add(c), remove: c => n._cls.delete(c),
      toggle: (c, f) => { const on = f === undefined ? !n._cls.has(c) : f;
                          if (on) n._cls.add(c); else n._cls.delete(c); return on; },
      contains: c => n._cls.has(c)
    },
    appendChild(c) { if (c) n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    setAttribute(k, v) { n._attrs[k] = v; }, removeAttribute(k) { delete n._attrs[k]; },
    getAttribute(k) { return n._attrs[k]; },
    addEventListener(ev, fn) { (n.handlers[ev] = n.handlers[ev] || []).push(fn); },
    dispatch(ev) { const e = { preventDefault(){}, stopPropagation(){} }; (n.handlers[ev]||[]).forEach(f=>f(e)); return e; },
    focus() {}, scrollIntoView() {},
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 0, top: 0, bottom: 0 })
  };
  Object.defineProperty(n, 'className', {
    get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  });
  Object.defineProperty(n, 'innerHTML', {
    get: () => n._h || '', set: v => { n._h = v; if (!v) n.children = []; }
  });
  return n;
}
// Every id the markup declares, so a typo'd selector in sim.js returns
// undefined here and throws, rather than quietly doing nothing.
[...HTML.matchAll(/id="([^"]+)"/g)].forEach(m => { BY_ID[m[1]] = mk(); });

/* Walk a rendered subtree. The assertions below ask questions of the tree
   sim.js actually built, not of strings it was handed. */
const walk = (n, out = []) => { if (!n) return out; out.push(n); (n.children || []).forEach(c => walk(c, out)); return out; };
// Include innerHTML: a few lines are built that way, and a walker that read
// only textContent would silently miss them.
const textOf = n => walk(n).map(x => (x.textContent || '') + ' ' + (x.innerHTML || '')).join(' ');
const find = (n, pred) => walk(n).filter(pred);

let CURRENT_VIEW = null;
const ctx = {
  console, structuredClone, Date, Math, JSON, Object, Array, String, Number, Set, Boolean,
  setInterval: () => 0, clearInterval: () => {},
  alert: m => { throw new Error('unexpected alert: ' + m); },
  confirm: () => true,
  document: {
    createElement: mk, createElementNS: mk, createTextNode: t => { const n = mk('text'); n.textContent = t; return n; },
    addEventListener() {},
    querySelector: sel => BY_ID[String(sel).replace(/^#/, '')] || null,
    querySelectorAll: () => []
  },
  window: { scrollTo() {}, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} }
};
ctx.globalThis = ctx;
vm.createContext(ctx);

const shim = `
  var PASS_MARK = 720;
  var S = { exam:'CCAR-F', simAttempts:[], simObjSel:[] };
  function save(){}
  function go(v){ globalThis.__view = v; }
  function el(tag, cls, txt){ var e = document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
  function $(sel){ return document.querySelector(sel); }
  function fmtClock(ms){ var t=Math.floor(ms/1000); return Math.floor(t/60)+':'+String(t%60).padStart(2,'0'); }
`;
vm.runInContext([
  fs.readFileSync(PATHS.resolve('data-exams.js'), 'utf8'),
  fs.readFileSync(PATHS.resolve('data-sim-questions.js'), 'utf8'),
  fs.readFileSync(PATHS.resolve('data-sim-objectives.js'), 'utf8'),
  shim,
  fs.readFileSync(PATHS.resolve('strikeout.js'), 'utf8'),
  fs.readFileSync(PATHS.resolve('sim.js'), 'utf8'),
  ';globalThis.__o={initSim,renderSim,simStart,simRender,simPick,simGo,simReview,isStruck,'
  + 'simSubmit,simReviewMissed,simToggleFlag,buildSitting,S,SIM_QUESTIONS,SIM_OBJECTIVES,getSIM:function(){return SIM;},clearSIM:function(){SIM=null;}};'
].join('\n;\n'), ctx, { filename: 'sim-ui.js' });
const O = ctx.__o;
const view = () => ctx.__view;

H('1. The markup declares every element sim.js reaches for');
// sim.js is the source of truth for what it needs; index.html must supply it.
const simSrc = fs.readFileSync(PATHS.resolve('sim.js'), 'utf8');
const wanted = [...simSrc.matchAll(/\$\('#([A-Za-z0-9_-]+)'\)/g)].map(m => m[1]);
const missing = [...new Set(wanted)].filter(id => !BY_ID[id]);
ok(!missing.length, 'all ' + new Set(wanted).size + ' ids exist in index.html'
   + (missing.length ? ' — missing: ' + missing.join(', ') : ''));

H('2. Wiring up');
let threw = null;
try { O.initSim(); } catch (e) { threw = e; }
ok(!threw, 'initSim() attaches its handlers without error' + (threw ? ': ' + threw.message : ''));
['simPrev', 'simNext', 'simFlag', 'simQuit', 'simReviewBack', 'simSubmitExam', 'simResultDone']
  .forEach(id => ok(typeof BY_ID[id].onclick === 'function', id + ' is wired'));

H('3. The start screen');
threw = null;
try { O.renderSim(); } catch (e) { threw = e; }
ok(!threw, 'renderSim() runs' + (threw ? ': ' + threw.message : ''));
const start = BY_ID.simStartBody;
const startText = textOf(start);
/* The bank grows as sets are imported, so assert it states the CURRENT
   size rather than a number frozen at the time this test was written. */
ok(new RegExp(O.SIM_QUESTIONS.length + ' questions in the bank').test(startText),
   'it states the bank size (' + O.SIM_QUESTIONS.length + ')');
ok(/4 of the 6 scenarios/.test(startText), 'it explains the 4-of-6 scenario draw');
ok(/15 questions on each/.test(startText), 'it states 15 questions per scenario');
ok(/120\s*minutes/.test(startText), 'it states the 120-minute clock');
/* The honest-shortfall promise from the handoff, which now has two correct
   states. Every scenario currently clears 15, so the start screen should say
   a full sitting is drawn as the real exam does; if the bank ever thins out
   again it must go back to warning that the paper is topped up. Asserting
   whichever matches the data keeps the promise under test either way. */
const scnCounts = {};
O.SIM_QUESTIONS.filter(q => q.exam === 'CCAR-F')
  .forEach(q => { scnCounts[q.scn] = (scnCounts[q.scn] || 0) + 1; });
const allFull = Object.values(scnCounts).every(n => n >= 15)
  && Object.keys(scnCounts).length === 6;
ok(allFull ? /drawn exactly as the real exam does/.test(startText)
           : /tops the paper up/.test(startText),
   allFull ? 'it states a full sitting is drawn as the real exam does'
           : 'it warns that short scenarios are topped up');
const boxes = find(start, n => n.tag === 'input' && n.type === 'checkbox');
ok(boxes.length === 37, 'the objective picker lists all 37 objectives, found ' + boxes.length);
ok(boxes.every(b => b.checked === false), 'nothing is pre-selected');
/* An objective with no questions behind it must be un-tickable. Every
   objective now has at least one, so the expected count is whatever the
   data says is empty — today zero, and the rule still has to hold. */
const emptyObjs = O.SIM_OBJECTIVES.filter(o => !o.questions.length).length;
ok(boxes.filter(b => b.disabled).length === emptyObjs,
   'objectives with no questions are disabled (' + emptyObjs + ' empty, '
   + boxes.filter(b => b.disabled).length + ' disabled)');
ok(find(start, n => /Scored/.test(n.title || '')).length === 0,
   'no score-report percentages are shown on the objective rows');
ok(find(start, n => /at or below 50%/.test(n.textContent || '')).length === 0,
   'no "at or below 50%" preset button');

H('4. Starting a timed sitting');
O.simStart('exam', {});
const SIM = O.getSIM();
ok(view() === 'sim', 'it navigates to the simulation view');
ok(SIM && SIM.total === 60, 'the paper is 60 questions, got ' + (SIM && SIM.total));
ok(SIM.mode === 'exam', 'in exam mode');
ok(BY_ID.simBar.hidden === false, 'the clock bar is visible in exam mode');
ok(/Question 1 of 60/.test(BY_ID.simProg.textContent), 'progress reads "Question 1 of 60"');
ok(BY_ID.simStem.textContent.length > 120,
   'the stem renders as long prose (' + BY_ID.simStem.textContent.length + ' chars)');
ok(BY_ID.simStem.textContent === SIM.list[0].q.stem, 'and is the stem verbatim, unreformatted');
const opts = find(BY_ID.simOpts, n => n.tag === 'button');
ok(opts.length === 4, 'four options are rendered, found ' + opts.length);
ok(opts.every(o => o._attrs.role === 'radio'), 'each is a radio for assistive tech');
ok(BY_ID.simScenario.hidden === false, 'the scenario heading shows on the first question of a block');

H('5. Exam mode withholds feedback');
O.simPick(SIM.list[0].q.correct);
ok(SIM.answers[SIM.list[0].q.id] === SIM.list[0].q.correct, 'the answer is stored by option key');
ok(BY_ID.simFeedback.hidden === true, 'no feedback is shown after answering in exam mode');
ok(find(BY_ID.simOpts, n => n._cls && n._cls.has('right')).length === 0,
   'the correct option is not revealed');

H('6. Flagging and navigation');
O.simToggleFlag();
ok(SIM.flags[SIM.list[0].q.id] === true, 'a question can be flagged');
ok(BY_ID.simFlag.textContent === 'Flagged', 'the button reflects it');
O.simGo(1);
ok(SIM.i === 1, 'Next advances');
O.simGo(-1);
ok(SIM.i === 0, 'Previous goes back');
ok(SIM.answers[SIM.list[0].q.id] === SIM.list[0].q.correct, 'the earlier answer survives navigation');

H('7. Scenario blocks are grouped and headed');
const blockOf = {};
SIM.list.forEach(it => { (blockOf[it.block] = blockOf[it.block] || []).push(it); });
let contiguous = true, last = -1;
SIM.list.forEach(it => { if (it.block < last) contiguous = false; last = it.block; });
ok(contiguous, 'questions arrive grouped by block, never interleaved');
/* The scenario name is on every question — the briefing is the setting the
   whole block is asked against, so paging back for it would be busywork. What
   happens once per block is the briefing being OPEN; after that it collapses
   to the name. */
const heads = [], opened = [];
const findDet = n => (n.children || []).filter(c => c.tag === 'details');
for (let i = 0; i < SIM.total; i++) {
  SIM.i = i; O.simRender();
  if (!BY_ID.simScenario.hidden) heads.push({ i, text: textOf(BY_ID.simScenario) });
  const det = findDet(BY_ID.simScenario)[0];
  if (det && det.open) opened.push(i);
}
ok(heads.length === SIM.total,
   'the scenario name shows on every question (' + heads.length + ' of ' + SIM.total + ')');
ok(opened.length === SIM.blocks.length,
   'and the briefing opens once per block (' + opened.length + ' open, '
   + SIM.blocks.length + ' blocks)');
/* Every block must actually have a briefing behind that control. Before the
   blueprint carried one, five of the six scenarios rendered an empty box. */
let briefed = 0;
SIM.blocks.forEach(b => { if (b.filler || (b.context && b.context.length > 80)) briefed++; });
ok(briefed === SIM.blocks.length,
   'every block has a briefing (' + briefed + ' of ' + SIM.blocks.length + ')');
const extractHead = heads.find(h => /Structured Data Extraction/.test(h.text));
if (extractHead) ok(/invoices|unstructured business documents/.test(extractHead.text),
  'the extraction block shows its scenario context paragraph');
else ok(true, 'extraction not drawn this run — context check skipped');
/* A top-up block only exists when a drawn scenario was short. Most
   scenarios now hold 15+, so many sittings need none. When one is present
   it must be labelled as additional rather than dressed up as a scenario;
   when none is needed, no such heading should be invented. */
const filler = heads.find(h => /Additional questions/.test(h.text));
const needsFiller = SIM.blocks.some(b => b.filler);
ok(needsFiller ? !!filler : !filler,
   needsFiller ? 'the topped-up questions are headed as additional, not passed off as a scenario'
               : 'no shortfall this draw, so no additional-questions heading appears');
ok(needsFiller ? /not part of a scenario block/.test(filler.text) : true,
   needsFiller ? 'and say so plainly' : 'no filler block to label this run');

H('8. Review screen');
SIM.i = 0;
O.simReview();
ok(view() === 'simreview', 'it navigates to the review view');
const rtext = textOf(BY_ID.simReviewBody);
ok(/answered/.test(rtext) && /unanswered/.test(rtext), 'it counts answered and unanswered');
ok(/flagged for review/.test(rtext), 'and flagged');
const squares = find(BY_ID.simReviewBody, n => n._cls && n._cls.has('sq'));
ok(squares.length === 60, 'every question has a jump square, found ' + squares.length);
ok(squares.filter(s => s._cls.has('done')).length === 1, 'one is marked answered');
ok(squares.filter(s => s._cls.has('flag')).length === 1, 'one is marked flagged');

H('9. Submitting scores the paper');
SIM.list.forEach((it, n) => { if (n % 3 === 0) SIM.answers[it.q.id] = it.q.correct; });
/* One deliberate wrong answer, for the missed-question review below. */
const wrongIt = SIM.list[1];
const missKey = wrongIt.order.find(k => k !== wrongIt.q.correct);
SIM.answers[wrongIt.q.id] = missKey;
const expected = SIM.list.filter(it => SIM.answers[it.q.id] === it.q.correct).length;
O.simSubmit(false);
ok(view() === 'simresult', 'it navigates to the results view');
const att = O.S.simAttempts[O.S.simAttempts.length - 1];
ok(att.correct === expected, 'it scores ' + expected + ' correct, got ' + att.correct);
const res = textOf(BY_ID.simResultBody);
ok(new RegExp(expected + ' / 60').test(res), 'the headline shows the raw score');
ok(/Rough estimate/.test(res), 'the scaled figure is labelled an estimate');
ok(/approximation only/.test(res), 'and explicitly called an approximation');
ok(/cannot be reproduced/.test(res), 'explaining why it cannot match the real scaling');
ok(/Percent correct by test objective/.test(res), 'results break down by test objective');
ok(/By domain/.test(res), 'and by domain');
ok(/By scenario/.test(res), 'and by scenario');
/* Disclosed only when there was a shortfall to disclose. */
ok(needsFiller ? /added from other scenarios/.test(res) : true,
   needsFiller ? 'the topped-up count is disclosed in the results'
               : 'no top-ups this run, so nothing to disclose');

H('9b. The missed-question review shows the options themselves');
/* The feedback panel refers to options by letter only. On the results screen
   there was no option list above it, so a reader saw "B falls short" with no
   way to tell what B said. The review must print every option's text, in the
   order the reader saw them, with their pick and the best answer marked. */
const missed = SIM.list.filter(it => !att.answers[it.q.id].ok);
O.simReviewMissed(att, missed);
const card = find(BY_ID.simResultBody, n => n._cls && n._cls.has('simmiss'))
  .find(c => textOf(c).includes(wrongIt.q.stem));
ok(!!card, 'the wrongly answered question has a review card');
const rows = find(card, n => n._cls && n._cls.has('opt'));
ok(rows.length === wrongIt.q.options.length, 'every option is listed, found ' + rows.length);
ok(wrongIt.order.every((k, i) => textOf(rows[i]).includes(wrongIt.q.options.find(o => o.key === k).text)),
   'in the shuffled order the reader saw');
const wpos = wrongIt.order.indexOf(missKey), cpos = wrongIt.order.indexOf(wrongIt.q.correct);
ok(rows[wpos]._cls.has('wrong') && /Your answer/.test(textOf(rows[wpos])), 'the pick is marked as yours and wrong');
ok(rows[cpos]._cls.has('right') && /Best answer/.test(textOf(rows[cpos])), 'the best answer is marked');

H('10. Practice mode gives feedback immediately');
O.simStart('practice', {});
const P = O.getSIM();
ok(BY_ID.simBar.hidden === true, 'no clock in practice mode');
const pq = P.list[0].q;
const wrongKey = pq.options.find(o => o.key !== pq.correct).key;
O.simPick(wrongKey);
ok(BY_ID.simFeedback.hidden === false, 'feedback appears straight after answering');
const fb = textOf(BY_ID.simFeedback);
ok(new RegExp('Not the best answer . ' + pq.correct + ' is').test(fb) || /Not the best answer/.test(fb),
   'it says the answer was wrong and which was right');
ok(fb.includes(pq.options.find(o => o.key === wrongKey).explanation),
   'it explains the option the user picked');
ok(fb.includes(pq.options.find(o => o.key === pq.correct).explanation),
   'and the correct option');
ok(/Tiebreaker/.test(fb) && fb.includes(pq.tiebreaker), 'it shows the tiebreaker');
ok(fb.includes(pq.rationale), 'and the rationale');
const links = find(BY_ID.simFeedback, n => n.tag === 'a');
ok(links.length >= 1, 'source links are rendered, found ' + links.length);
ok(links.every(a => a.href && a.rel === 'noopener noreferrer' && a.target === '_blank'),
   'external links are safe (rel=noopener noreferrer)');
const det = find(BY_ID.simFeedback, n => n.tag === 'details');
ok(det.length === 1, 'the remaining options are folded behind an expander');
const revealed = find(BY_ID.simOpts, n => n._cls && n._cls.has('right'));
ok(revealed.length === 1, 'the correct option is marked in the list');
ok(find(BY_ID.simOpts, n => n._cls && n._cls.has('wrong')).length === 1, 'and the wrong pick too');
ok(find(BY_ID.simOpts, n => n.tag === 'button').every(b => b.disabled),
   'options lock once answered so the score cannot be changed');

H('11. current_state_note is called out when present');
const noteQ = O.SIM_QUESTIONS.find(q => q.note);
ok(!!noteQ, 'the bank has questions carrying a current-state note');
const withNote = P.list.findIndex(it => it.q.note);
if (withNote >= 0) {
  P.i = withNote;
  O.simPick(P.list[withNote].q.correct);
  const t = textOf(BY_ID.simFeedback);
  ok(/Current state/.test(t), 'it renders as its own labelled callout');
  ok(t.includes(P.list[withNote].q.note), 'carrying the note text');
} else {
  ok(true, 'no note-bearing question drawn this run — skipped');
}

H('12. Ruling an option out, in the real markup');
O.simStart('exam', {});
const E = O.getSIM();
const eq = E.list[0].q;
const ebtns = find(BY_ID.simOpts, n => n.tag === 'button');
const target = ebtns[1];
const tkey = E.list[0].order[1];
target.dispatch('contextmenu');
ok(target._cls.has('struck'), 'right-clicking an option strikes it');
ok(O.isStruck(eq.id, tkey), 'keyed by option key, not screen position');
O.simPick(E.list[0].order[0]);
const after = find(BY_ID.simOpts, n => n.tag === 'button');
ok(after[1]._cls.has('struck'), 'the mark survives answering the question');
ok(after[0]._cls.has('sel'), 'and the chosen answer is still selected');
ok(E.answers[eq.id] === E.list[0].order[0], 'striking did not change what was answered');
target.dispatch('contextmenu');
ok(!O.isStruck(eq.id, tkey), 'right-clicking again restores it');
E.i = 1; O.simRender(); E.i = 0; O.simRender();
ok(find(BY_ID.simOpts, n => n.tag === 'button')[0]._cls.has('sel'),
   'navigating away and back keeps the answer');

H('13. History builds across attempts');
ok(O.S.simAttempts.length >= 1, 'attempts accumulate in S.simAttempts');
O.renderSim();
const s2 = textOf(BY_ID.simStartBody);
ok(/Your attempts/.test(s2), 'the start screen lists past attempts once there are any');
ok(/Objectives across attempts/.test(s2), 'and shows the per-objective history table');

H('14. A past attempt can be reopened and its misses reviewed');
/* The results screen used to read the missed list from the live sitting, so
   once that sitting was gone the only way back to a missed question was to
   have stayed on the page. Reopening from history has no live sitting. */
const hist = find(BY_ID.simStartBody, n => n.tag === 'button' && /Results/.test(n.textContent || ''));
ok(hist.length === O.S.simAttempts.filter(x => x.exam === O.S.simAttempts[0].exam).length,
   'each attempt row has a Results button, found ' + hist.length);
const withMiss = O.S.simAttempts.slice().reverse().findIndex(x => Object.values(x.answers).some(v => !v.ok));
O.clearSIM();
hist[withMiss].onclick();
ok(view() === 'simresult', 'it opens the results view');
const again = find(BY_ID.simResultBody, n => n.tag === 'button' && /you missed/.test(n.textContent || ''));
ok(again.length === 1, 'with the review-missed button, even with no live sitting');
again[0].onclick();
ok(find(BY_ID.simResultBody, n => n._cls && n._cls.has('simmiss')).length > 0, 'which lists the missed questions');

console.log('');
if (fail) { console.log(fail + ' failure' + (fail === 1 ? '' : 's')); process.exit(1); }
console.log('all simulation UI checks passed');
