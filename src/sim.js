/* Exam Simulation — sittings, drills, scoring and results.
 *
 * A separate module from the fact-recall trainer in app.js, because it is a
 * different kind of exam. The recall bank asks what a thing is; these
 * questions describe a team trying to do something, offer approaches of
 * which often two would work, and ask for the best one.
 *
 * Built for CCAR-F, whose sitting draws 4 of 6 scenarios with 15 questions
 * each. Each exam's paper shape now comes from its `sim` block in
 * data-exams.js (see simConfig): CCAR-F keeps the scenario blocks, and
 * CCDV-F, which names no scenarios, is drawn by domain quota and adds
 * multiple-response items and code exhibits.
 *
 * Nothing here touches QUESTIONS, S.history or S.sessions. Simulation results
 * live in S.simAttempts and the two pools never mix — drilling a domain can't
 * teach you the answers to your own simulation, and a simulation can't move
 * the recall readiness number.
 *
 * Loaded after app.js, so everything it reads (EXAMS, S, el, go, save) is
 * already defined.
 */
'use strict';

/* Which exam the simulation is for.
 *
 * This used to be the constant 'CCAR-F', because that was the only bank. It
 * is now the selected exam, so a second bank becomes a data change rather
 * than a code change. A sitting in progress keeps the exam it was built for
 * (SIM.exam), so changing the picker mid-paper cannot rescore it, and a
 * finished attempt is read back through its own a.exam. */
function simExam() { return (SIM && SIM.exam) || S.exam; }

/* How an exam's paper is built, from its `sim` block in data-exams.js.
 * These used to be four constants (15 per block, 4 blocks, 60, 120 minutes)
 * because CCAR-F was the only bank. The defaults are still CCAR-F's, so an
 * exam with no sim block gets exactly the paper CCAR-F always had.
 * `target` is derived rather than stored: a scenario paper is blocks times
 * perBlock, a domain paper is its item count. */
const SIM_DEFAULT = { mode: 'scenario', blocks: 4, perBlock: 15, minutes: 120, multi: false };
function simConfig(exam) {
  const own = (EXAMS[exam || simExam()] || {}).sim || {};
  const c = Object.assign({}, SIM_DEFAULT, own);
  c.target = c.mode === 'domain' ? c.items : c.blocks * c.perBlock;
  return c;
}

/* ---------- answers ----------
 * A single-select question stores `correct` as one key and an answer as one
 * key. A multiple-response question stores both as arrays, answers sorted.
 * Attempts saved before multi-select existed hold plain strings, and are
 * never migrated, so everything that reads an answer goes through these. */
function simIsMulti(q) { return q.format === 'multi_select' || Array.isArray(q.correct); }
function simCorrectKeys(q) { return Array.isArray(q.correct) ? q.correct : [q.correct]; }
function simPickedKeys(picked) {
  return picked == null ? [] : Array.isArray(picked) ? picked : [picked];
}
/* How many a question asks for. `select` is stated on CCDV-F items; the
   number of correct keys answers for any that lack it. */
function simSelectCount(q) { return q.select || simCorrectKeys(q).length; }
/* No partial credit: every correct key and nothing else, as the recall quiz
   scores multiple-response items in app.js and as the real exams describe
   them. Two of three right is wrong, and so is one of two. */
function simIsCorrect(q, picked) {
  const want = simCorrectKeys(q), got = simPickedKeys(picked);
  return got.length === want.length && want.every(k => got.includes(k));
}
/* Where an answer stands: 'none', 'partial' or 'full'. A multi-select holding
   fewer picks than it asks for is partial, and scores zero exactly as an
   unanswered one does, so the review screen and the submit warning must not
   count it as answered: "53 answered" with one pick on a select-two item
   tells the candidate there is nothing left to do. */
function simAnswerState(q, picked) {
  const n = simPickedKeys(picked).length;
  if (!n) return 'none';
  return simIsMulti(q) && n < simSelectCount(q) ? 'partial' : 'full';
}
/* Tallies for the review screen and the submit warning, from one place. */
function simPaperCounts() {
  const c = { full: 0, partial: 0, none: 0 };
  SIM.list.forEach(it => { c[simAnswerState(it.q, SIM.answers[it.q.id])]++; });
  return c;
}
/* Letters as a sentence would list them: "B", "B and D", "A, B and D". */
function simJoinLetters(ls) {
  if (ls.length < 2) return ls.join('');
  return ls.slice(0, -1).join(', ') + ' and ' + ls[ls.length - 1];
}
function simSelectWord(n) {
  return (typeof SELECT_WORD !== 'undefined' && SELECT_WORD[n]) || String(n);
}

/* Each domain's share of an n-item paper: weight times n, rounded by largest
 * remainder so the shares sum to n exactly. Plain rounding of CCDV-F's eight
 * weights at 53 items gives 52, and rounding up gives 56; the blueprint's
 * table is the largest-remainder result. Ties on remainder go to the heavier
 * domain, so the answer never depends on the order domains are listed in. */
function simDomainQuotas(exam, n) {
  const doms = (EXAMS[exam] || {}).domains || [];
  const total = doms.reduce((a, d) => a + d.weight, 0) || 1;
  const rows = doms.map(d => ({ id: d.id, w: d.weight, x: d.weight / total * n }));
  const out = {};
  let given = 0;
  rows.forEach(r => { out[r.id] = Math.floor(r.x); given += out[r.id]; });
  rows.slice()
    .sort((a, b) => (b.x - Math.floor(b.x)) - (a.x - Math.floor(a.x)) || b.w - a.w)
    .slice(0, Math.max(0, n - given))
    .forEach(r => { out[r.id]++; });
  return out;
}
/* The page subtitle, which was static markup naming CCAR-F's scenario
   blocks and so described the wrong exam once a second bank existed. */
function simSetSubtitle(exam) {
  const sub = $('#simSub');
  if (!sub) return;
  sub.textContent = simConfig(exam).mode === 'domain'
    ? 'Weighted by domain, as the real ' + exam + ' paper is built'
    : 'Scenario blocks, as the real ' + exam + ' sitting is built';
}
/* A question's domain for quota purposes: its first listed one. */
function simDomainOf(q) { return (q.domains || [])[0] || null; }
function simDomainName(id, exam) {
  const d = ((EXAMS[exam || simExam()] || {}).domains || []).find(x => x.id === id);
  return d ? d.name : id;
}

/* ---------- bank helpers ---------- */
function simBank(exam) {
  const all = typeof SIM_QUESTIONS === 'undefined' ? [] : SIM_QUESTIONS;
  /* No argument means "the bank as a whole", which is what simQuestion() wants
     when resolving an id from a stored attempt. Everything that builds or
     counts a sitting passes an exam, because a question from another
     certification must never appear in this one's paper. */
  return exam ? all.filter(q => q.exam === exam) : all;
}
/* The selected exam's objectives, for the drill picker and the history
   table. Lookups by id search every exam's list: ids do not collide
   (O01-O37 against DV-1.1-DV-8.3), and a past attempt reopened from the
   results screen should still name its objectives whichever exam is picked. */
function simAllObjectives() { return typeof SIM_OBJECTIVES === 'undefined' ? [] : SIM_OBJECTIVES; }
function simObjectives(exam) {
  const ex = exam || simExam();
  return simAllObjectives().filter(o => o.exam === ex);
}
function simTiebreakers() { return typeof TIEBREAKERS === 'undefined' ? [] : TIEBREAKERS; }
/** The guide entry whose tags include this question's tiebreaker, if any. */
function simTiebreakerFor(name) { return simTiebreakers().find(t => t.tags.includes(name)) || null; }
function simScenarioName(id, exam) {
  const ex = EXAMS[exam || simExam()] || {};
  const s = (ex.scenarios || []).find(x => x.id === id);
  return s ? s.t : id;
}
function simObjective(id) { return simAllObjectives().find(o => o.id === id) || null; }
function simQuestion(id) { return simBank().find(q => q.id === id) || null; }
/* The context paragraph is carried on every question of a scenario; any one
   of them answers for the block. */
/* The scenario briefing. The exam guide's scenario list is the authority, so
   its `ctx` comes first; a question carrying its own scenarioContext (the
   handoff data did) still answers for a scenario the blueprint has not got. */
function simContext(scn, exam) {
  const ex = EXAMS[exam || simExam()] || {};
  const s = (ex.scenarios || []).find(x => x.id === scn);
  if (s && s.ctx) return s.ctx;
  const q = simBank(exam).find(x => x.scn === scn && x.scenarioContext);
  return q ? q.scenarioContext : null;
}

function simShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* How many finished papers each question has appeared on, for one exam.
   A submitted attempt records every question on its paper, answered or not,
   so this counts exposure rather than answers: a question left blank was
   still shown, and serving it again next time is not new material. */
function simExposure(exam) {
  const seen = {};
  (S.simAttempts || []).forEach(a => {
    if (a.exam !== exam) return;
    Object.keys(a.answers || {}).forEach(id => { seen[id] = (seen[id] || 0) + 1; });
  });
  return seen;
}

/* Least-exposed first, in random order within each exposure level. Shuffle
   first, then a stable sort, so ties stay random rather than settling into
   bank order. */
function simLeastSeen(qs, seen) {
  return simShuffle(qs).sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0));
}

/* ---------- building a sitting ---------- */
/* The real exam draws 4 scenarios and asks 15 questions on each. The bank is
 * not yet deep enough for that on every scenario, so we take what each chosen
 * scenario has and top the paper up from the others to reach 60.
 *
 * A topped-up question is tagged filler:true. It still counts for scoring —
 * it is a real question — but it is shown in its own block at the end rather
 * than pretending to belong to a scenario it was not written for, and the
 * start screen says plainly how many there are.
 */
function buildSitting(opts) {
  const o = opts || {};
  /* Taken as an option rather than read from SIM: this runs before a sitting
     exists (the start screen previews a paper before you commit to it). */
  const exam = o.exam || S.exam;
  const bank = simBank(exam).filter(q => !o.objectives || !o.objectives.length
    || (q.objectives || []).some(x => o.objectives.includes(x)));
  if (!bank.length) return null;

  const cfg = simConfig(exam);
  const target = o.target || cfg.target;
  const perBlock = o.perBlock || cfg.perBlock;
  const allScn = ((EXAMS[exam] || {}).scenarios || []).map(s => s.id);
  const withQs = allScn.filter(id => bank.some(q => q.scn === id));

  /* Rotate through the bank rather than drawing blind.
   *
   * A plain shuffle made every sitting independent of the last, and the bank
   * is uneven: the two big scenarios hold over 70 questions each, the two
   * small ones about 22, and every block is capped at 15. A small-scenario
   * question turned up in nearly half of all sittings, a big-scenario one
   * in about one in eight, and after twelve sittings a tenth of the bank had
   * still never appeared.
   *
   * So a sitting is built from the current lap: questions at the lowest
   * exposure across the bank are "fresh", and scenarios are ranked by how
   * many fresh questions they hold. The count is capped at a block's worth —
   * any scenario that can fill a whole block with fresh questions is as good
   * as any other — which keeps a first sitting a random draw of four, as the
   * real exam's is, and only starts steering once scenarios run dry. */
  const seen = simExposure(exam);
  const lap = Math.min(...bank.map(q => seen[q.id] || 0));
  const fresh = id => Math.min(perBlock,
    bank.filter(q => q.scn === id && (seen[q.id] || 0) === lap).length);
  const chosen = cfg.mode === 'domain' ? [] : simShuffle(withQs)
    .sort((a, b) => fresh(b) - fresh(a))
    .slice(0, o.blocks || cfg.blocks);

  /* Some questions teach the same lesson as another, and many of those pairs
     share a scenario, so one block could hold both and the first would give
     the second away, so a paper takes one question per family.
     The sitting that has to finish a lap is the exception: there, a held-back
     fresh question goes ahead of anything already seen. Holding strictly on
     every paper left the last fresh duplicates unserved, and about one run in
     fifty needed an extra sitting to see the whole bank (section 8b of the
     suite). Relaxing on every paper fixed that but let three papers in four
     keep a pair. A short paper is worse than a repeated lesson, so held
     questions still fill a block that nothing else can. */
  const families = new Set();
  const lapEnds = bank.filter(q => (seen[q.id] || 0) === lap).length <= target;
  const pick = (pool, n) => {
    const out = [], held = [];
    for (const q of pool) {
      while (lapEnds && held.length && out.length < n && (seen[held[0].id] || 0) < (seen[q.id] || 0))
        out.push(held.shift());
      if (out.length >= n) break;
      if (q.family && families.has(q.family)) { held.push(q); continue; }
      out.push(q);
      if (q.family) families.add(q.family);
    }
    for (const q of held) { if (out.length >= n) break; out.push(q); }
    return out;
  };

  const used = new Set();
  const blocks = [];
  if (cfg.mode === 'domain') {
    /* A domain paper is one block with no scenario, so the lookups that
       read SIM.blocks[it.block] keep working unchanged. Each domain gives
       its blueprint share, least-seen first and one per family, and the
       block is then shuffled: the real exam does not group by domain, and
       grouping would tell the candidate each item's domain.
       An objective drill is the exception. It asks for a handful of
       objectives, so most domains have nothing to give, and a quota would
       push nearly the whole drill into the "additional questions" block. */
    let take;
    if (o.objectives && o.objectives.length) {
      take = pick(simLeastSeen(bank, seen), target);
    } else {
      const quotas = simDomainQuotas(exam, target);
      take = [];
      Object.keys(quotas).forEach(d => {
        const pool = simLeastSeen(bank.filter(q => simDomainOf(q) === d), seen);
        take.push(...pick(pool, quotas[d]));
      });
    }
    take.forEach(q => used.add(q.id));
    blocks.push({ scn: null, context: null, questions: simShuffle(take), filler: false });
  }
  chosen.forEach(scn => {
    const pool = simLeastSeen(bank.filter(q => q.scn === scn), seen);
    const take = pick(pool, perBlock);
    take.forEach(q => used.add(q.id));
    blocks.push({ scn, context: simContext(scn, exam), questions: take, filler: false });
  });

  // Top up from whatever is left, in any scenario, to reach the target.
  let filled = 0;
  const want = target - blocks.reduce((n, b) => n + b.questions.length, 0);
  if (want > 0) {
    const rest = simLeastSeen(bank.filter(q => !used.has(q.id)), seen);
    const extra = pick(rest, want);
    filled = extra.length;
    if (extra.length) {
      extra.forEach(q => used.add(q.id));
      blocks.push({ scn: null, context: null, questions: extra, filler: true });
    }
  }

  const list = [];
  blocks.forEach((b, bi) => b.questions.forEach(q => list.push({
    q, block: bi,
    // Option order is shuffled per attempt and the answer is stored by key,
    // so position never carries meaning.
    order: simShuffle(q.options.map(o2 => o2.key))
  })));

  const total = list.length;
  return {
    exam,
    blocks, list,
    total,
    filled,
    shortBy: Math.max(0, target - total),
    target,
    // Scale the clock when the paper is short, so the per-question pace
    // matches a real sitting rather than being generous.
    minutes: Math.max(1, Math.round((o.minutes || cfg.minutes) * (total / target)))
  };
}

/* ---------- session ---------- */
let SIM = null;      // the sitting in progress
let simTimer = null;

function simStart(mode, opts) {
  const sit = buildSitting(opts);
  if (!sit || !sit.total) { alert('No simulation questions match that selection.'); return; }
  if (typeof clearStrikes === 'function') clearStrikes(null);
  SIM = Object.assign(sit, {
    mode,                       // 'exam' | 'practice'
    i: 0,
    answers: {},                // qid -> option key, or sorted keys (multi-select)
    flags: {},                  // qid -> true
    revealed: {},               // qid -> true (practice: feedback shown)
    started: Date.now(),
    deadlineMs: sit.minutes * 60 * 1000,
    reviewing: false,
    objectives: (opts && opts.objectives) || null
  });
  if (mode === 'exam') simStartTimer();
  simRender();
  go('sim');
}

function simStartTimer() { simStopTimer(); simTimer = setInterval(simTick, 1000); simTick(); }
function simStopTimer() { if (simTimer) { clearInterval(simTimer); simTimer = null; } }
function simRemaining() {
  if (!SIM || SIM.mode !== 'exam') return 0;
  return Math.max(0, SIM.deadlineMs - (Date.now() - SIM.started));
}
function simTick() {
  const c = $('#simClock');
  if (!SIM || SIM.mode !== 'exam' || !c) return;
  const left = simRemaining();
  c.textContent = fmtClock(left);
  c.classList.toggle('warn', left <= 10 * 60 * 1000 && left > 5 * 60 * 1000);
  c.classList.toggle('crit', left <= 5 * 60 * 1000);
  if (left <= 0) { simStopTimer(); simSubmit(true); }
}

/* ---------- rendering a question ---------- */
function simRender() {
  if (!SIM) return;
  const item = SIM.list[SIM.i];
  const q = item.q;
  const block = SIM.blocks[item.block];

  $('#simBar').hidden = SIM.mode !== 'exam';
  if (SIM.mode === 'exam') simTick();

  /* Scenario heading. The briefing is the setting every question in the block
     is asked against, so it stays available on all of them rather than only
     the first — a reader on question 9 should not have to page back to recall
     what system they are designing. It opens expanded on the first question
     of a block and collapses to the scenario name after that. */
  const firstOfBlock = SIM.i === 0 || SIM.list[SIM.i - 1].block !== item.block;
  const cfg = simConfig(SIM.exam);
  simSetSubtitle(SIM.exam);
  const head = $('#simScenario');
  head.innerHTML = '';
  head.hidden = false;
  if (block.filler) {
    head.appendChild(el('div', 'simscnname', 'Additional questions'));
    if (firstOfBlock) {
      head.appendChild(el('p', 'muted small', cfg.mode === 'domain'
        ? 'The bank does not yet hold enough questions in every domain. These '
          + block.questions.length + ' were added from other domains to bring the paper up to '
          + SIM.target + '.'
        : 'The bank does not yet hold ' + cfg.perBlock + ' questions for every scenario. '
          + 'These ' + block.questions.length + ' were added to bring the paper up to '
          + SIM.target + ' and are not part of a scenario block.'));
    }
  } else if (!block.scn) {
    // A domain paper: no scenario to brief, so no heading at all.
    head.hidden = true;
  } else if (block.context) {
    const det = el('details', 'simscnbox');
    det.open = firstOfBlock;
    const sum = el('summary', 'simscnname', simScenarioName(block.scn));
    det.appendChild(sum);
    det.appendChild(el('p', 'simscnctx', block.context));
    head.appendChild(det);
  } else {
    head.appendChild(el('div', 'simscnname', simScenarioName(block.scn)));
  }

  const n = block.questions.indexOf(q) + 1;
  $('#simProg').textContent = 'Question ' + (SIM.i + 1) + ' of ' + SIM.total;
  // A domain paper's only label is "Question n of N", which simProg carries.
  $('#simBlockLabel').hidden = !block.filler && !block.scn;
  $('#simBlockLabel').textContent = block.filler
    ? 'Additional'
    : block.scn ? simScenarioName(block.scn) + ' · ' + n + ' of ' + block.questions.length : '';

  // Stems are plain prose from a real sitting, numbers and all. textContent,
  // so nothing is reinterpreted as markup or reflowed into a list.
  $('#simStem').textContent = q.stem;

  const ex = $('#simExhibit');
  ex.innerHTML = '';
  ex.hidden = !q.exhibit;
  if (q.exhibit) ex.appendChild(simExhibit(q.exhibit));

  /* How many to select, as the real exam states it on every item. Shown
     only for an exam whose paper mixes the two kinds: on an all
     single-select paper such as CCAR-F's it would be noise. */
  const multi = simIsMulti(q);
  const need = simSelectCount(q);
  const hint = $('#simSelect');
  hint.textContent = multi ? 'Select ' + simSelectWord(need) : cfg.multi ? 'Select ONE' : '';
  hint.hidden = !hint.textContent;

  const wrap = $('#simOpts');
  wrap.innerHTML = '';
  wrap.setAttribute('role', multi ? 'group' : 'radiogroup');
  const picked = SIM.answers[q.id];
  const chosen = simPickedKeys(picked);
  const want = simCorrectKeys(q);
  const revealed = SIM.mode === 'practice' && SIM.revealed[q.id];
  /* The letter shown is the option's POSITION on screen, not its stored key.
     Order is shuffled per attempt, so printing the key gives a list reading
     B, C, D, A — which looks like a rendering fault and invites the reader to
     hunt for the missing A. The recall quiz already letters by position; this
     matches it. The key is still what gets stored and scored, so shuffling
     stays safe and review can name the right option. */
  item.order.forEach((key, pos) => {
    const opt = q.options.find(o => o.key === key);
    const b = el('button', 'opt simopt');
    b.type = 'button';
    b.setAttribute('role', multi ? 'checkbox' : 'radio');
    b.setAttribute('aria-checked', chosen.includes(key) ? 'true' : 'false');
    const mark = el('span', 'optkey', String.fromCharCode(65 + pos));
    const txt = el('span', 'opttext', opt.text);
    b.append(mark, txt);
    if (chosen.includes(key)) b.classList.add('sel');
    if (revealed) {
      b.disabled = true;
      if (want.includes(key)) b.classList.add('right');
      else if (chosen.includes(key)) b.classList.add('wrong');
    }
    b.onclick = () => simPick(key);
    // Right-click to rule an option out, as the real exam allows. Keyed by
    // option key, so it follows the option when the order is shuffled.
    if (typeof enableStrike === 'function') {
      enableStrike(b, q.id, key, { locked: () => !!SIM.revealed[q.id] });
    }
    wrap.appendChild(b);
  });

  /* Practice grades a multi-select once the reader has picked as many as it
     asks for. Check grades it sooner, for a reader who wants to see where an
     incomplete answer stands; it counts as wrong, as on the exam. */
  const check = $('#simCheck');
  check.hidden = !(multi && SIM.mode === 'practice' && !revealed);
  check.disabled = !chosen.length;
  check.onclick = () => simReveal(q);

  // Feedback: immediately in practice, never in exam mode until submission.
  const fb = $('#simFeedback');
  fb.innerHTML = '';
  fb.hidden = !revealed;
  if (revealed) fb.appendChild(simFeedback(q, picked, item.order));

  $('#simFlag').classList.toggle('on', !!SIM.flags[q.id]);
  $('#simFlag').textContent = SIM.flags[q.id] ? 'Flagged' : 'Flag for review';
  $('#simPrev').disabled = SIM.i === 0;
  const last = SIM.i === SIM.total - 1;
  $('#simNext').textContent = last ? (SIM.mode === 'exam' ? 'Review' : 'Finish') : 'Next';
  window.scrollTo(0, 0);
}

function simPick(key) {
  const item = SIM.list[SIM.i];
  const q = item.q;
  if (SIM.mode === 'practice' && SIM.revealed[q.id]) return;   // already graded
  if (simIsMulti(q)) {
    /* A click toggles membership. Once the reader holds as many as the
       question asks for, a further option does nothing until one is
       cleared: silently swapping out an earlier pick would change an answer
       the reader did not touch. An emptied answer is removed rather than
       stored as [], so "answered" keeps meaning at least one pick. */
    const cur = simPickedKeys(SIM.answers[q.id]);
    let next;
    if (cur.includes(key)) next = cur.filter(k => k !== key);
    else if (cur.length >= simSelectCount(q)) return;
    else next = cur.concat(key);
    next.sort();
    if (next.length) SIM.answers[q.id] = next; else delete SIM.answers[q.id];
    if (SIM.mode === 'practice' && next.length === simSelectCount(q)) { simReveal(q); return; }
    simRender();
    return;
  }
  SIM.answers[q.id] = key;
  if (SIM.mode === 'practice') { simReveal(q); return; }
  simRender();
}

function simReveal(q) {
  SIM.revealed[q.id] = true;
  // The answer is on screen now; elimination marks have served their
  // purpose and would only compete with the right/wrong colouring.
  if (typeof clearStrikes === 'function') clearStrikes(q.id);
  simRender();
}

/* A code, trace or config exhibit, as a titled figure. The body goes in with
   textContent, never innerHTML, for the same reason the stem does: exhibits
   are full of angle brackets and quotes, and an HTML snippet in one would
   otherwise be parsed, or run. No highlighter, since the app ships no
   dependencies; a monospace face and a horizontal scroll are enough. */
function simExhibit(ex) {
  const fig = el('figure', 'simexhibit');
  const cap = el('figcaption', 'simexhibitcap');
  cap.appendChild(el('span', 'simexhibitlabel', 'Exhibit'));
  if (ex.title) cap.appendChild(el('span', 'simexhibittitle', ex.title));
  if (ex.lang && ex.lang !== 'text') cap.appendChild(el('span', 'simexhibitlang', ex.lang));
  fig.appendChild(cap);
  const pre = el('pre', 'simexhibitbody');
  const code = el('code');
  code.textContent = ex.body || '';
  pre.appendChild(code);
  fig.appendChild(pre);
  return fig;
}

/* The feedback panel: what you picked and why it is right or wrong, what the
   right answer was and why, the principle that separates them, and where to
   read more. The other two options are there but folded away, because the
   near-miss is the one worth reading. */
/* `order` is the keys in the order they were shown, so feedback can name an
   option by the letter the reader actually saw. The results screen passes
   the order saved with the attempt; attempts saved before that was recorded
   fall back to the stored order, which simAnswerList uses too, so the
   letters still agree within a card. */
function simFeedback(q, picked, order) {
  const box = el('div', 'simfb');
  const ok = simIsCorrect(q, picked);
  const multi = simIsMulti(q);
  const want = simCorrectKeys(q);
  const got = simPickedKeys(picked);
  const shown = (order && order.length ? order : q.options.map(o => o.key));
  const letterOf = k => {
    const i = shown.indexOf(k);
    return i < 0 ? k : String.fromCharCode(65 + i);
  };
  // Correct options in the order the reader saw them, so "B and D" reads
  // in screen order whatever the stored keys are.
  const wantShown = shown.filter(k => want.includes(k));
  const head = el('div', 'simfbhead ' + (ok ? 'good' : 'bad'));
  head.textContent = ok ? 'Correct'
    : multi ? 'Not the best answers — ' + simJoinLetters(wantShown.map(letterOf)) + ' are'
    : 'Not the best answer — ' + letterOf(q.correct) + ' is';
  box.appendChild(head);

  const optFor = k => q.options.find(o => o.key === k);
  const line = (k, label, cls) => {
    const o = optFor(k);
    if (!o) return null;
    const d = el('div', 'simfbopt ' + (cls || ''));
    d.appendChild(el('span', 'simfbkey', letterOf(k)));
    const body = el('div', 'simfbbody');
    body.appendChild(el('div', 'simfblabel', label));
    body.appendChild(el('div', null, o.explanation));
    d.appendChild(body);
    return d;
  };

  /* Every wrong pick, then every correct option. A multi-select can hold
     several of each, so nothing here assumes one picked and one right. */
  shown.filter(k => got.includes(k) && !want.includes(k))
    .forEach(k => box.appendChild(line(k, 'Why your answer falls short', 'bad')));
  if (multi && !ok && got.length && got.length < want.length) {
    box.appendChild(el('p', 'muted small', 'This asks for ' + simSelectWord(want.length).toLowerCase()
      + ' answers and you gave ' + got.length + '. There is no partial credit.'));
  }
  wantShown.forEach(k => box.appendChild(line(k,
    ok ? 'Why this is right'
      : multi ? (got.includes(k) ? 'You picked this — one of the best answers' : 'Why this is one of the best answers')
      : 'Why this is the best answer', 'good')));

  const others = shown.filter(k => !want.includes(k) && !got.includes(k));
  if (others.length) {
    const det = el('details', 'simfbmore');
    det.appendChild(el('summary', null, 'The other ' + (others.length === 1 ? 'option' : 'options')));
    others.forEach(k => det.appendChild(line(k, 'Option ' + letterOf(k), '')));
    box.appendChild(det);
  }

  if (q.tiebreaker) {
    const t = el('div', 'simtie');
    t.appendChild(el('span', 'simtielabel', 'Tiebreaker'));
    t.appendChild(el('span', null, q.tiebreaker));
    // A recurring principle gets its one-line rule, so a name like "Root
    // cause" says what it asks of you without leaving the question.
    const tb = simTiebreakerFor(q.tiebreaker);
    if (tb) t.appendChild(el('span', 'simtierule', tb.rule));
    box.appendChild(t);
  }
  if (q.rationale) box.appendChild(el('p', 'simrat', q.rationale));

  // Where the live product has moved on since the guide. Called out
  // separately because the exam still marks the guide's answer correct.
  if (q.note) {
    const c = el('div', 'simnote');
    c.appendChild(el('div', 'simnotelabel', 'Current state'));
    c.appendChild(el('div', null, q.note));
    box.appendChild(c);
  }

  if (q.sources && q.sources.length) {
    const s = el('div', 'simsrc');
    s.appendChild(el('span', 'muted small', 'Sources: '));
    q.sources.forEach((src, i) => {
      if (i) s.appendChild(document.createTextNode(' · '));
      if (src.url) {
        const a = el('a', null, src.title || src.url);
        a.href = src.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        s.appendChild(a);
      } else s.appendChild(el('span', null, src.title));
    });
    box.appendChild(s);
  }

  const objs = (q.objectives || []).map(id => id).join(', ');
  // CCAR-F's score report calls these test objectives; CCDV-F's are sub-skills.
  if (objs) box.appendChild(el('div', 'muted small simobj',
    (simConfig(q.exam || 'CCAR-F').mode === 'domain' ? 'Sub-skill ' : 'Test objective ') + objs));
  if (typeof questionRef === 'function') {
    // The location label must be an exact option in the report form's
    // dropdown (.github/ISSUE_TEMPLATE/wrong-answer.yml), one per exam.
    const ex = q.exam || 'CCAR-F';
    box.appendChild(questionRef(q.id, q.stem, ex, 'Exam Simulation (' + ex + ')'));
  }
  return box;
}

/* ---------- navigation ---------- */
function simGo(d) {
  const next = SIM.i + d;
  if (next < 0) return;
  if (next >= SIM.total) { SIM.mode === 'exam' ? simReview() : simSubmit(false); return; }
  SIM.i = next;
  simRender();
}
function simToggleFlag() {
  const q = SIM.list[SIM.i].q;
  SIM.flags[q.id] = !SIM.flags[q.id];
  simRender();
}

function simReview() {
  SIM.reviewing = true;
  const counts = simPaperCounts();
  const answered = counts.full;
  const flagged = SIM.list.filter(it => SIM.flags[it.q.id]).length;
  const wrap = $('#simReviewBody'); wrap.innerHTML = '';

  const stats = el('div', 'revstats');
  const stat = (n, label, cls) => {
    const c = el('div', 'revstat ' + (cls || ''));
    c.appendChild(el('div', 'revnum', String(n)));
    c.appendChild(el('div', 'muted small', label));
    return c;
  };
  stats.append(stat(answered, 'answered', 'good'));
  // Shown only when it can happen: a CCAR-F paper has no multi-select items.
  if (counts.partial) stats.append(stat(counts.partial, 'incomplete', 'part'));
  stats.append(
    stat(counts.none, 'unanswered', counts.none ? 'bad' : ''),
    stat(flagged, 'flagged for review', flagged ? 'warn' : ''));
  wrap.appendChild(stats);
  wrap.appendChild(el('p', 'muted small',
    'Click any question to go back to it. Unanswered questions score zero — '
    + 'there is no penalty for guessing.'
    + (counts.partial ? ' Incomplete ones, shown with a dashed outline, hold fewer '
      + 'picks than they ask for and also score zero.' : '')));

  SIM.blocks.forEach((b, bi) => {
    // A domain paper's single block has no scenario to head it.
    if (b.filler || b.scn) {
      wrap.appendChild(el('h3', 'simrevscn', b.filler ? 'Additional questions' : simScenarioName(b.scn)));
    }
    const grid = el('div', 'revgrid');
    SIM.list.forEach((it, i) => {
      if (it.block !== bi) return;
      const btn = el('button', 'sq', String(i + 1));
      const state = simAnswerState(it.q, SIM.answers[it.q.id]);
      if (state === 'full') btn.classList.add('done');
      /* Incomplete gets its own mark, never the filled "done" one: at a
         glance the grid must not say a question is finished when it scores
         zero as it stands. The label says it for a screen reader too. */
      if (state === 'partial') {
        btn.classList.add('part');
        btn.setAttribute('aria-label', 'Question ' + (i + 1) + ', incomplete: '
          + simPickedKeys(SIM.answers[it.q.id]).length + ' of ' + simSelectCount(it.q) + ' picked');
        btn.title = 'Incomplete';
      }
      if (SIM.flags[it.q.id]) btn.classList.add('flag');
      btn.onclick = () => { SIM.reviewing = false; SIM.i = i; simRender(); go('sim'); };
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);
  });

  $('#simReviewClock').textContent = fmtClock(simRemaining());
  go('simreview');
}

/* ---------- scoring ---------- */
function simSubmit(auto) {
  simStopTimer();
  // Scratch working for a paper that is now finished.
  if (typeof clearStrikes === 'function') clearStrikes(null);
  const byObj = {}, byDom = {}, byScn = {};
  const bump = (m, k) => { m[k] = m[k] || { n: 0, ok: 0 }; return m[k]; };
  let correct = 0;
  const answers = {};

  SIM.list.forEach(it => {
    const q = it.q;
    const picked = SIM.answers[q.id] || null;
    const ok = simIsCorrect(q, picked);
    if (ok) correct++;
    // The shuffled order is kept so the missed-question review can letter the
    // options as they were seen. Attempts saved before this lack it, and
    // review falls back to the stored order.
    answers[q.id] = { picked, ok, order: it.order };
    (q.objectives || []).forEach(o => { const r = bump(byObj, o); r.n++; if (ok) r.ok++; });
    (q.domains || []).forEach(d => { const r = bump(byDom, d); r.n++; if (ok) r.ok++; });
    const scn = SIM.blocks[it.block].filler ? q.scn : SIM.blocks[it.block].scn;
    if (scn) { const r = bump(byScn, scn); r.n++; if (ok) r.ok++; }
  });

  const attempt = {
    ts: Date.now(), exam: SIM.exam, mode: SIM.mode,
    total: SIM.total, correct,
    ms: Date.now() - SIM.started,
    filled: SIM.filled, target: SIM.target,
    auto: !!auto,
    drill: SIM.objectives || null,
    byObj, byDom, byScn, answers
  };
  S.simAttempts.push(attempt);
  save();
  simResult(attempt);
}

/* A percentage bar matching the one the exam results already use. */
function simBar(pct) {
  const bar = el('div', 'dbar');
  const fill = el('div', 'dbarfill ' + (pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'low'));
  fill.style.width = pct + '%';
  bar.appendChild(fill);
  bar.title = pct + '% correct on this attempt.';
  return bar;
}

function simBreakdown(rows) {
  const t = el('div', 'dtable');
  rows.forEach(r => {
    const pct = r.n ? Math.round(r.ok / r.n * 100) : 0;
    const row = el('div', 'drow simrow');
    const nm = el('div', 'dname');
    if (r.tag) nm.appendChild(el('span', 'dnum', r.tag));
    nm.appendChild(el('span', null, r.name));
    if (r.title) nm.title = r.title;
    row.append(nm, simBar(pct), el('div', 'dstat', pct + '%  ' + r.ok + '/' + r.n));
    t.appendChild(row);
  });
  return t;
}

function simResult(a) {
  const wrap = $('#simResultBody'); wrap.innerHTML = '';
  const pct = a.total ? Math.round(a.correct / a.total * 100) : 0;
  // Raw percent mapped onto the 100-1000 band. The real exam scales by item
  // difficulty, which cannot be reproduced from outside, so this is labelled
  // an estimate everywhere it appears and never called a predicted score.
  const approx = Math.round(100 + (a.correct / Math.max(1, a.total)) * 900);
  const passing = approx >= PASS_MARK;

  wrap.appendChild(el('div', 'bigscore', a.correct + ' / ' + a.total));
  wrap.appendChild(el('div', 'muted', pct + '% correct · ' + fmtClock(a.ms) + ' taken'
    + (a.mode === 'practice' ? ' · practice mode' : '')));

  const est = el('div', 'mockline');
  est.innerHTML = '<strong>Rough estimate ' + approx + '</strong> / 1000 — '
    + (passing ? 'above' : 'below') + ' the ' + PASS_MARK + ' pass mark';
  wrap.appendChild(est);
  wrap.appendChild(el('p', 'muted small',
    'An approximation only. The real exam uses scaled scoring weighted by item '
    + 'difficulty, which cannot be reproduced here. Treat it as a direction of '
    + 'travel, not a prediction.'));
  if (a.auto) {
    const w = el('div', 'mockline');
    w.textContent = 'Time expired — the paper was submitted automatically.';
    wrap.appendChild(w);
  }
  const cfg = simConfig(a.exam);
  if (a.filled) {
    wrap.appendChild(el('p', 'muted small',
      a.filled + ' question' + (a.filled === 1 ? ' was' : 's were') + ' added from other '
      + (cfg.mode === 'domain'
        ? 'domains to reach ' + a.target + ', because the bank does not yet hold '
          + 'enough questions in every domain.'
        : 'scenarios to reach ' + a.target + ', because the bank does not yet hold '
          + cfg.perBlock + ' for every scenario.')));
  }

  /* The breakdown the real score report gives comes first, in its shape.
     CCAR-F's report is by test objective; CCDV-F's is by domain, with
     sub-skills as the finer grain beneath it. */
  const objRows = Object.keys(a.byObj).sort().map(id => {
    const o = simObjective(id);
    const label = o ? (o.name || o.text) : id;
    return { tag: id, name: label, title: o ? o.text : '', n: a.byObj[id].n, ok: a.byObj[id].ok };
  });
  const objTable = () => objRows.length ? simBreakdown(objRows)
    : el('p', 'muted small', 'None of the questions in this sitting carry an objective tag.');
  const domTable = () => simBreakdown(((EXAMS[a.exam] || {}).domains || [])
    .filter(d => a.byDom[d.id])
    .map(d => ({ tag: 'D' + d.num, name: d.name, n: a.byDom[d.id].n, ok: a.byDom[d.id].ok })));

  if (cfg.mode === 'domain') {
    wrap.appendChild(el('h2', 'labsec', 'Percent correct by domain'));
    wrap.appendChild(el('p', 'muted small',
      'The real score report breaks your result down this way. The lighter '
      + 'domains cover only one or two items, so treat a single attempt as directional.'));
    wrap.appendChild(domTable());
    wrap.appendChild(el('h2', 'labsec', 'By sub-skill'));
    wrap.appendChild(objTable());
  } else {
    wrap.appendChild(el('h2', 'labsec', 'Percent correct by test objective'));
    wrap.appendChild(el('p', 'muted small',
      'The real score report breaks your result down this way. Each objective '
      + 'covers only a handful of items, so treat a single attempt as directional.'));
    wrap.appendChild(objTable());
    wrap.appendChild(el('h2', 'labsec', 'By domain'));
    wrap.appendChild(domTable());
  }

  // A domain paper has no scenarios, and an empty table says nothing.
  if (Object.keys(a.byScn || {}).length) {
    wrap.appendChild(el('h2', 'labsec', 'By scenario'));
    wrap.appendChild(simBreakdown(Object.keys(a.byScn)
      .map(id => ({ name: simScenarioName(id, a.exam), n: a.byScn[id].n, ok: a.byScn[id].ok }))));
  }

  // History only means something once there is a second attempt to compare.
  const prior = S.simAttempts.filter(x => x !== a && x.exam === a.exam);
  if (prior.length) {
    wrap.appendChild(el('h2', 'labsec', 'Objectives across attempts'));
    wrap.appendChild(el('p', 'muted small',
      'Every objective you have been tested on, oldest attempt first.'));
    wrap.appendChild(simHistoryTable(a.exam));
  }

  /* Built from the attempt, not the live sitting, so a past attempt reopened
     from the history table can be reviewed too. Answers were saved in paper
     order; a question since removed from the bank is skipped rather than
     shown half-empty. */
  const missed = Object.keys(a.answers)
    .filter(id => !a.answers[id].ok)
    .map(id => ({ q: simQuestion(id) }))
    .filter(it => it.q);
  if (missed.length) {
    const act = el('div', 'actions');
    const b = el('button', 'btn', 'Review the ' + missed.length + ' you missed');
    b.onclick = () => simReviewMissed(a, missed);
    act.appendChild(b);
    wrap.appendChild(act);
  }
  go('simresult');
}

/* Per-objective history: one row per objective, one cell per attempt that
   tested it, so improvement is visible at a glance. */
function simHistoryTable(exam) {
  const atts = S.simAttempts.filter(a => a.exam === (exam || simExam()));
  const ids = [...new Set(atts.flatMap(a => Object.keys(a.byObj)))].sort();
  const t = el('table', 'statstable simhist');
  const thead = el('thead'); const hr = el('tr');
  hr.appendChild(el('th', null, 'Objective'));
  atts.forEach((a, i) => {
    const th = el('th', 'simhistcol', '#' + (i + 1));
    th.title = new Date(a.ts).toLocaleString() + ' — ' + a.correct + '/' + a.total;
    hr.appendChild(th);
  });
  hr.appendChild(el('th', null, 'Trend'));
  thead.appendChild(hr); t.appendChild(thead);

  const tb = el('tbody');
  ids.forEach(id => {
    const tr = el('tr');
    const o = simObjective(id);
    const name = el('td');
    name.appendChild(el('span', 'dnum', id));
    name.appendChild(el('span', null, ' ' + (o ? (o.name || o.text) : id)));
    tr.appendChild(name);
    const seq = [];
    atts.forEach(a => {
      const v = a.byObj[id];
      const td = el('td', 'simhistcell');
      if (!v) { td.textContent = '·'; td.className += ' muted'; }
      else {
        const p = Math.round(v.ok / v.n * 100);
        seq.push(p);
        td.textContent = p + '%';
        td.className += ' ' + (p >= 80 ? 'good' : p >= 60 ? 'warn' : 'bad');
        td.title = v.ok + ' of ' + v.n + ' correct';
      }
      tr.appendChild(td);
    });
    const d = seq.length > 1 ? seq[seq.length - 1] - seq[0] : null;
    const trend = el('td', 'simtrend');
    trend.textContent = d === null ? '—' : (d > 0 ? '+' + d : String(d));
    if (d !== null && d !== 0) trend.className += ' ' + (d > 0 ? 'good' : 'bad');
    tr.appendChild(trend);
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  return t;
}

function simReviewMissed(a, missed) {
  const wrap = $('#simResultBody'); wrap.innerHTML = '';
  wrap.appendChild(el('h2', 'labsec', 'The ' + missed.length + ' you missed'));
  missed.forEach((it, n) => {
    const q = it.q;
    const card = el('div', 'simmiss');
    card.appendChild(el('div', 'muted small',
      (n + 1) + ' of ' + missed.length + ' · '
      + (q.scn ? simScenarioName(q.scn, a.exam)
        : simConfig(a.exam).mode === 'domain' ? simDomainName(simDomainOf(q), a.exam)
        : 'Additional')));
    card.appendChild(el('p', 'simmissstem', q.stem));
    // The exhibit again: a question about code cannot be reviewed without it.
    if (q.exhibit) card.appendChild(simExhibit(q.exhibit));
    const ans = a.answers[q.id];
    card.appendChild(simAnswerList(q, ans.picked, ans.order));
    card.appendChild(simFeedback(q, ans.picked, ans.order));
    wrap.appendChild(card);
  });
  const act = el('div', 'actions');
  const back = el('button', 'btn sec', 'Back to results');
  back.onclick = () => simResult(a);
  act.appendChild(back);
  wrap.appendChild(act);
  window.scrollTo(0, 0);
}

/* The options as the reader saw them, graded. The feedback panel names
   options only by letter, which works under a live question where the
   options sit just above it but leaves the results screen with nothing to
   read the letters against. Divs rather than disabled buttons: nothing here
   is clickable, and a button would need its font restated. */
function simAnswerList(q, picked, order) {
  const keys = order && order.length ? order : q.options.map(o => o.key);
  const want = simCorrectKeys(q), got = simPickedKeys(picked);
  const wrap = el('div', 'opts simmissopts');
  if (simIsMulti(q)) wrap.appendChild(el('div', 'muted small', 'Select ' + simSelectWord(simSelectCount(q))));
  keys.forEach((key, pos) => {
    const opt = q.options.find(o => o.key === key);
    if (!opt) return;
    const row = el('div', 'opt done');
    const mine = got.includes(key), right = want.includes(key);
    if (right) row.classList.add('right');
    else if (mine) row.classList.add('wrong');
    row.appendChild(el('span', 'optkey', String.fromCharCode(65 + pos)));
    const txt = el('span', 'opttext', opt.text);
    if (mine || right) {
      const tag = mine && right ? 'Your answer · correct'
        : mine ? 'Your answer' : want.length > 1 ? 'Correct answer' : 'Best answer';
      txt.appendChild(el('span', 'simmisstag', tag));
    }
    row.appendChild(txt);
    wrap.appendChild(row);
  });
  if (!got.length) wrap.appendChild(el('div', 'muted small', 'You left this one unanswered.'));
  return wrap;
}

/* ---------- start screen ---------- */
function renderSim() {
  const wrap = $('#simStartBody'); wrap.innerHTML = '';
  const examCode = S.exam;
  simSetSubtitle(examCode);
  const bank = simBank(examCode);
  if (!bank.length) {
    wrap.appendChild(el('p', 'muted', 'No simulation questions are loaded.'));
    return;
  }

  /* What the bank must supply, per unit. For a scenario paper the units are
     the scenarios and each needs a full block; for a domain paper they are
     the domains, each needing its blueprint share of the paper. Everything
     below reads these, so the two kinds of paper share one start screen. */
  const cfg = simConfig(examCode);
  const domainMode = cfg.mode === 'domain';
  const ex = EXAMS[examCode] || {};
  const scns = ex.scenarios || [];
  let units;
  if (domainMode) {
    const quotas = simDomainQuotas(examCode, cfg.target);
    units = (ex.domains || []).map(d => ({ t: d.name, need: quotas[d.id] || 0,
      have: bank.filter(q => simDomainOf(q) === d.id).length }));
  } else {
    units = scns.map(s => ({ t: s.t, need: cfg.perBlock,
      have: bank.filter(q => q.scn === s.id).length }));
  }
  const ready = units.filter(u => u.have >= u.need).length;
  const unitWord = domainMode ? 'domain' : 'scenario';

  /* The page is ordered by what a visit is for. Starting a sitting comes
     first, then your own past attempts; the drill and objective history,
     then the reflexes and tiebreaker guide, are opened when wanted, so
     each folds to a title and one line. Open all at once they pushed the
     drill a screen and a half below the start buttons. */
  const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve'];
  wrap.appendChild(el('p', 'simlede', domainMode
    ? 'The real exam asks ' + cfg.target + ' questions in ' + cfg.minutes + ' minutes across '
      + (NUM[units.length] || units.length) + ' domains, weighted by the blueprint. '
      + (cfg.multi ? 'Some questions ask you to select more than one answer. ' : '')
      + 'No feedback until you submit.'
    : 'The real sitting draws ' + cfg.blocks + ' of the ' + scns.length + ' scenarios and asks '
      + cfg.perBlock + ' questions on each — ' + cfg.target + ' questions in ' + cfg.minutes
      + ' minutes, single-select, no feedback until you submit.'));

  const acts = el('div', 'actions');
  const exam = el('button', 'btn examcta', 'Start exam · timed');
  exam.onclick = () => {
    const sit = buildSitting({});
    if (!sit) return;
    let msg = 'Start a timed sitting?\n\n' + sit.total + ' questions, '
      + sit.minutes + ' minutes, no feedback until you submit.';
    if (sit.filled) msg += '\n\n' + sit.filled + ' question'
      + (sit.filled === 1 ? '' : 's') + ' will be added from other ' + unitWord + 's to reach '
      + sit.target + (domainMode
        ? ', because the bank cannot yet fill every domain\'s share.'
        : ', because the bank is not yet ' + cfg.perBlock + ' deep on every scenario.');
    if (!confirm(msg)) return;
    simStart('exam', {});
  };
  const prac = el('button', 'btn sec', 'Practice · feedback as you go');
  prac.onclick = () => simStart('practice', {});
  acts.append(exam, prac);
  wrap.appendChild(acts);
  // As in the real exam. Said here because a right-click is not discoverable.
  wrap.appendChild(el('p', 'muted small simhint',
    'As in the real exam, right-click an option to rule it out and right-click '
    + 'again to restore it. On a keyboard, focus the option and press X.'));

  /* Say plainly what the bank can and cannot do today, before anyone starts.
     When every unit is deep enough there is nothing to act on, so the
     per-unit counts fold away behind the total. A short one opens them,
     because then the paper is topped up and the reader should see why. */
  const avail = bank.length;
  const short = units.length - ready;
  const note = el('details', 'simavail');
  note.open = short > 0;
  const nsum = el('summary');
  nsum.appendChild(el('span', 'simavailhead', avail + ' questions in the bank'));
  nsum.appendChild(el('span', 'muted small', domainMode
    ? (short ? ' · ' + short + ' domain' + (short === 1 ? '' : 's') + ' short of a full share'
             : ' · every domain can fill its share')
    : (short ? ' · ' + short + ' scenario' + (short === 1 ? '' : 's') + ' short of ' + cfg.perBlock
             : ' · every scenario has at least ' + cfg.perBlock)));
  note.appendChild(nsum);
  let detail;
  if (domainMode) {
    detail = el('div', 'muted small', ready === units.length
      ? 'A sitting takes each domain\'s share of the ' + cfg.target + ' questions by blueprint '
        + 'weight. Every domain has at least its share, so a full paper is drawn as the '
        + 'blueprint weights it; the more a domain holds, the less often a question comes round again.'
      : ready + ' of ' + units.length + ' domains can fill their share. A sitting takes what '
        + 'each has and tops the paper up from the others to reach ' + cfg.target
        + '; the extras are shown separately and the result says how many there were.');
    if (cfg.itemsNote) detail.appendChild(el('span', null, ' ' + cfg.itemsNote + '.'));
  } else {
    detail = ready === units.length
      ? el('div', 'muted small', 'A sitting draws ' + cfg.perBlock + ' questions from each of ' + cfg.blocks + ' scenarios. Every scenario has at least that many, so a full sitting is drawn exactly as the real exam does; the more a scenario holds, the less often a question comes round again.')
      : el('div', 'muted small',
          ready + ' of ' + units.length + ' scenarios have the full ' + cfg.perBlock + '. '
          + 'A sitting takes what each drawn scenario has and tops the paper up from the '
          + 'others to reach ' + cfg.target + '; the extras are shown separately and the '
          + 'result says how many there were.');
  }
  note.appendChild(detail);
  /* Counts in words, not bars. A bar against the deepest scenario, with a
     tick at the block size, made the reader decode a chart to learn two
     facts: how many questions a scenario has, and whether that is enough.
     The sentence above says why the count matters; a short scenario says so
     beside its count. Three columns, not auto-fit: six scenarios divide
     evenly into 3, 2 and 1, where auto-fit left one orphaned on its own row;
     eight domains fill three columns as 3, 3, 2. */
  const grid = el('div', 'simscngrid');
  units.forEach(u => {
    const isShort = u.have < u.need;
    const cell = el('div', 'simscncell' + (isShort ? ' short' : ''));
    cell.appendChild(el('span', 'simscnt', u.t));
    const n = el('span', 'simscnn', String(u.have));
    if (isShort) n.appendChild(el('span', 'simscnshort', ' · short of ' + u.need));
    cell.appendChild(n);
    cell.title = u.have + ' question' + (u.have === 1 ? '' : 's') + ' · a sitting draws ' + u.need;
    grid.appendChild(cell);
  });
  note.appendChild(grid);
  wrap.appendChild(note);

  const attempts = S.simAttempts.filter(a => a.exam === examCode).length;
  if (attempts) {
    wrap.appendChild(el('h2', 'labsec', 'Your attempts'));
    wrap.appendChild(simAttemptList(examCode));
  }

  /* Two pairs. Your objectives first: the drill and the history it is
     chosen from sit together, so the weak objectives in the history are
     beside the list you tick them in. Then the study aids, quick reflexes
     and the tiebreaker guide, which are both about how to pick between
     options and used to be split up by the drill. */

  // Open when objectives are already ticked: whoever ticked them came back
  // to drill, and should not have to find the list again.
  wrap.appendChild(simSection('Drill by test objective',
    'Practice only the objectives you pick from the ' + simObjectives().length
    + ' on the score report — if you have sat the exam, the ones yours marked low.',
    (S.simObjSel || []).length > 0, () => simObjectivePicker()));

  if (attempts) {
    wrap.appendChild(simSection('Objectives across attempts',
      'Percent correct on each test objective, attempt by attempt.',
      false, () => simHistoryTable(examCode)));
  }

  /* Quick reflexes lead the study aids in their own tinted section. They
     used to be the last row of the tiebreaker list, styled like the
     principles above them, and readers scrolled past the most immediately
     usable thing on the page. */
  const R = simReflexes();
  if (R) {
    const sec = simSection('Quick reflexes',
      R.firstStep.length + ' familiar symptoms and the fix the exam expects first, and '
      + R.wrong.length + ' options that are almost never right.',
      false, () => simReflexList(R));
    sec.classList.add('reflex');
    wrap.appendChild(sec);
  }

  if (simTiebreakers().length) {
    wrap.appendChild(simSection('Tiebreakers',
      'When two options both work, these principles pick the best one. '
      + 'Each comes with how to spot it and a worked example.',
      false, () => simTiebreakerGuide(bank)));
  }
}

/* A start-screen section that folds to its heading and one line. The body
   is built straight away rather than on first open: the drill's selection
   has to be live whether or not the section has been opened, and none of
   these are costly to build. */
function simSection(title, blurb, open, build) {
  const det = el('details', 'simsec');
  det.open = !!open;
  const sum = el('summary');
  sum.appendChild(el('h2', 'labsec', title));
  sum.appendChild(el('span', 'muted small simsecblurb', blurb));
  det.appendChild(sum);
  const body = el('div', 'simsecbody');
  body.appendChild(build());
  det.appendChild(body);
  return det;
}

/* The tiebreaker guide. Each principle is collapsed to its name and rule, so
   the list reads as a checklist, and opens to how to spot it, what the
   runner-up looks like, and a worked example. The examples are original to
   data-tiebreakers.js: showing a bank question with its answer here would
   spoil it for the sittings that draw it. */
function simTiebreakerGuide(bank) {
  // The heading and introduction come from the simSection that holds it.
  const box = el('div', 'simtbguide');

  const count = t => bank.filter(q => t.tags.includes(q.tiebreaker)).length;
  simTiebreakers().slice().sort((a, b) => count(b) - count(a)).forEach(t => {
    const det = el('details', 'simtb');
    const sum = el('summary');
    const head = el('span', 'simtbhead');
    head.appendChild(el('span', 'simtbname', t.name));
    const n = count(t);
    head.appendChild(el('span', 'simtbn', n + ' question' + (n === 1 ? '' : 's')));
    sum.appendChild(head);
    sum.appendChild(el('span', 'simtbrule', t.rule));
    det.appendChild(sum);

    const body = el('div', 'simtbbody');
    const part = (label, text, cls) => {
      const p = el('div', 'simtbpart' + (cls ? ' ' + cls : ''));
      p.appendChild(el('div', 'simfblabel', label));
      p.appendChild(el('div', null, text));
      return p;
    };
    body.appendChild(part('How to spot it', t.spot));
    body.appendChild(part('The runner-up', t.trap));
    const ex = t.example;
    const exBox = el('div', 'simtbex');
    exBox.appendChild(el('div', 'simfblabel', 'Example'));
    exBox.appendChild(el('p', 'simtbsit', ex.situation));
    exBox.appendChild(part('Best', ex.best, 'good'));
    exBox.appendChild(part('Runner-up', ex.runnerUp, 'bad'));
    exBox.appendChild(el('p', 'simrat', ex.why));
    body.appendChild(exBox);
    det.appendChild(body);
    box.appendChild(det);
  });

  return box;
}

function simReflexes() { return typeof TIEBREAKER_REFLEXES === 'undefined' ? null : TIEBREAKER_REFLEXES; }

/* Symptom → fix pairs as a list, not a table: each pair is read as one
   thought ("wrong tool, so descriptions"), and on a phone a two-column
   table squeezed both halves into slivers. */
function simReflexList(R) {
  const box = el('div', 'simreflex');
  box.appendChild(el('div', 'simfblabel', 'Symptom → first fix'));
  const rows = el('ul', 'simreflexrows');
  R.firstStep.forEach(r => {
    const li = el('li', 'simreflexrow');
    li.appendChild(el('span', 'simreflexsym', r.symptom));
    li.appendChild(el('span', 'simreflexarrow', '→'));
    li.appendChild(el('span', 'simreflexfix', r.fix));
    rows.appendChild(li);
  });
  box.appendChild(rows);
  box.appendChild(el('p', 'muted small',
    'If the stem says that first fix is already in place, it is testing something else.'));
  box.appendChild(el('div', 'simfblabel', 'Almost never the answer'));
  const ul = el('ul', 'simtbwrong');
  R.wrong.forEach(w => {
    const li = el('li');
    li.appendChild(el('span', 'tag ' + (w.level === 'Always' ? 'bad' : 'warn'), w.level + ' wrong'));
    // A span, not a text node, so the flex gap spaces it from the tag.
    li.appendChild(el('span', null, w.text));
    ul.appendChild(li);
  });
  box.appendChild(ul);
  return box;
}

/* The objective picker. Nothing is ticked by default: whoever opens this has
   their own score report, or none, so the app never presumes which objectives
   are the weak ones. */
function simObjectivePicker() {
  const box = el('div', 'simpick');
  const bank = simBank(S.exam);
  const sel = new Set(S.simObjSel || []);

  const bar = el('div', 'simpickbar');
  const count = el('span', 'muted small');
  const refresh = () => {
    const ids = [...sel];
    const n = bank.filter(q => (q.objectives || []).some(o => sel.has(o))).length;
    count.textContent = ids.length
      ? ids.length + ' objective' + (ids.length === 1 ? '' : 's') + ' · ' + n + ' question' + (n === 1 ? '' : 's')
      : 'Nothing selected';
    start.disabled = !n;
    S.simObjSel = ids; save();
  };
  const clearBtn = el('button', 'mini ghost', 'Clear');
  clearBtn.onclick = () => { sel.clear(); renderRows(); refresh(); };
  const start = el('button', 'btn', 'Drill selected objectives');
  start.onclick = () => {
    const ids = [...sel];
    if (!ids.length) return;
    const pool = bank.filter(q => (q.objectives || []).some(o => ids.includes(o)));
    simStart('practice', { objectives: ids, blocks: 6, perBlock: pool.length, target: pool.length });
  };
  bar.append(clearBtn, count);

  const rows = el('div', 'simpickrows');
  function renderRows() {
    rows.innerHTML = '';
    simObjectives().forEach(o => {
      const n = bank.filter(q => (q.objectives || []).includes(o.id)).length;
      const row = el('label', 'simpickrow' + (n ? '' : ' none'));
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = sel.has(o.id);
      cb.disabled = !n;
      cb.onchange = () => { cb.checked ? sel.add(o.id) : sel.delete(o.id); refresh(); };
      row.appendChild(cb);
      const body = el('div', 'simpickbody');
      const top = el('div', 'simpicktop');
      top.appendChild(el('span', 'dnum', o.id));
      top.appendChild(el('span', 'muted small', n ? n + ' question' + (n === 1 ? '' : 's') : 'no questions yet'));
      body.appendChild(top);
      body.appendChild(el('div', 'simpicktext', o.text));
      row.appendChild(body);
      rows.appendChild(row);
    });
  }
  renderRows();

  box.append(bar, rows);
  const act = el('div', 'actions');
  act.appendChild(start);
  box.appendChild(act);
  refresh();

  return box;
}

function simAttemptList(exam) {
  const t = el('table', 'statstable');
  const head = el('thead'); const hr = el('tr');
  /* .statstable right-aligns every heading after the first, which suits
     numbers; Mode is words, so it is pinned left and its cells follow. */
  [['When'], ['Mode', 'txt'], ['Score'], ['Estimate'], ['']]
    .forEach(([h, c]) => hr.appendChild(el('th', c || null, h)));
  head.appendChild(hr); t.appendChild(head);
  const tb = el('tbody');
  S.simAttempts.filter(a => a.exam === (exam || S.exam)).slice().reverse().forEach(a => {
    const tr = el('tr');
    tr.appendChild(el('td', null, new Date(a.ts).toLocaleDateString()));
    tr.appendChild(el('td', null, a.drill ? 'Objective drill' : a.mode === 'exam' ? 'Timed exam' : 'Practice'));
    tr.appendChild(el('td', 'num', a.correct + '/' + a.total));
    const approx = Math.round(100 + (a.correct / Math.max(1, a.total)) * 900);
    const td = el('td', 'num');
    if (a.drill) td.textContent = '—';
    else td.appendChild(el('span', 'tag ' + (approx >= PASS_MARK ? 'good' : 'warn'), String(approx)));
    tr.appendChild(td);
    const open = el('td', 'num');
    const btn = el('button', 'mini ghost', 'Results');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Results for the attempt on ' + new Date(a.ts).toLocaleDateString());
    btn.onclick = () => simResult(a);
    open.appendChild(btn);
    tr.appendChild(open);
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  return t;
}

/* ---------- wiring ---------- */
function initSim() {
  $('#simPrev').onclick = () => simGo(-1);
  $('#simNext').onclick = () => simGo(1);
  $('#simFlag').onclick = simToggleFlag;
  $('#simQuit').onclick = () => {
    if (!confirm('Abandon this sitting? Nothing will be scored.')) return;
    simStopTimer(); SIM = null; go('sim');
  };
  $('#simReviewBack').onclick = () => { SIM.reviewing = false; simRender(); go('sim'); };
  $('#simSubmitExam').onclick = () => {
    // Incomplete multi-selects score zero too, so they are named here rather
    // than counted as answered.
    const c = simPaperCounts();
    const parts = [];
    if (c.none) parts.push(c.none + ' question' + (c.none === 1 ? '' : 's') + ' unanswered');
    if (c.partial) parts.push(c.partial + ' incomplete');
    const msg = parts.length
      ? 'Submit with ' + parts.join(' and ') + '? They score zero.'
      : 'Submit the paper? You cannot change answers afterwards.';
    if (!confirm(msg)) return;
    simSubmit(false);
  };
  $('#simResultDone').onclick = () => { SIM = null; go('sim'); };
}
