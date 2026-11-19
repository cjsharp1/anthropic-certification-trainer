/* CCAR-F Exam Simulation — sittings, drills, scoring and results.
 *
 * A separate module from the fact-recall trainer in app.js, because it is a
 * different kind of exam. The recall bank asks what a thing is; these
 * questions describe a team trying to do something, offer four approaches of
 * which often two would work, and ask for the best one. They come from a real
 * sitting: 4 of the 6 documented scenarios, 15 questions each, 120 minutes.
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
const SIM_BLOCK = 15;          // questions per scenario in the real sitting
const SIM_BLOCKS = 4;          // scenarios drawn from the bank of 6
const SIM_TARGET = SIM_BLOCK * SIM_BLOCKS;
const SIM_MINUTES = 120;

/* ---------- bank helpers ---------- */
function simBank(exam) {
  const all = typeof SIM_QUESTIONS === 'undefined' ? [] : SIM_QUESTIONS;
  /* No argument means "the bank as a whole", which is what simQuestion() wants
     when resolving an id from a stored attempt. Everything that builds or
     counts a sitting passes an exam, because a question from another
     certification must never appear in this one's paper. */
  return exam ? all.filter(q => q.exam === exam) : all;
}
function simObjectives() { return typeof SIM_OBJECTIVES === 'undefined' ? [] : SIM_OBJECTIVES; }
function simScenarioName(id, exam) {
  const ex = EXAMS[exam || simExam()] || {};
  const s = (ex.scenarios || []).find(x => x.id === id);
  return s ? s.t : id;
}
function simObjective(id) { return simObjectives().find(o => o.id === id) || null; }
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

  const target = o.target || SIM_TARGET;
  const perBlock = o.perBlock || SIM_BLOCK;
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
  const chosen = simShuffle(withQs)
    .sort((a, b) => fresh(b) - fresh(a))
    .slice(0, o.blocks || SIM_BLOCKS);

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
  let short = 0;
  chosen.forEach(scn => {
    const pool = simLeastSeen(bank.filter(q => q.scn === scn), seen);
    const take = pick(pool, perBlock);
    take.forEach(q => used.add(q.id));
    if (take.length < (o.perBlock || SIM_BLOCK)) short += (o.perBlock || SIM_BLOCK) - take.length;
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
    minutes: Math.max(1, Math.round((o.minutes || SIM_MINUTES) * (total / target)))
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
    answers: {},                // qid -> option key
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
  const head = $('#simScenario');
  head.innerHTML = '';
  head.hidden = false;
  if (block.filler) {
    head.appendChild(el('div', 'simscnname', 'Additional questions'));
    if (firstOfBlock) {
      head.appendChild(el('p', 'muted small',
        'The bank does not yet hold ' + SIM_BLOCK + ' questions for every scenario. '
        + 'These ' + block.questions.length + ' were added to bring the paper up to '
        + SIM.target + ' and are not part of a scenario block.'));
    }
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
  $('#simBlockLabel').textContent = block.filler
    ? 'Additional'
    : simScenarioName(block.scn) + ' · ' + n + ' of ' + block.questions.length;

  // Stems are plain prose from a real sitting, numbers and all. textContent,
  // so nothing is reinterpreted as markup or reflowed into a list.
  $('#simStem').textContent = q.stem;

  const wrap = $('#simOpts');
  wrap.innerHTML = '';
  const picked = SIM.answers[q.id];
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
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', picked === key ? 'true' : 'false');
    const mark = el('span', 'optkey', String.fromCharCode(65 + pos));
    const txt = el('span', 'opttext', opt.text);
    b.append(mark, txt);
    if (picked === key) b.classList.add('sel');
    if (revealed) {
      b.disabled = true;
      if (key === q.correct) b.classList.add('right');
      else if (picked === key) b.classList.add('wrong');
    }
    b.onclick = () => simPick(key);
    // Right-click to rule an option out, as the real exam allows. Keyed by
    // option key, so it follows the option when the order is shuffled.
    if (typeof enableStrike === 'function') {
      enableStrike(b, q.id, key, { locked: () => !!SIM.revealed[q.id] });
    }
    wrap.appendChild(b);
  });

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
  SIM.answers[q.id] = key;
  if (SIM.mode === 'practice') {
    SIM.revealed[q.id] = true;
    // The answer is on screen now; elimination marks have served their
    // purpose and would only compete with the right/wrong colouring.
    if (typeof clearStrikes === 'function') clearStrikes(q.id);
  }
  simRender();
}

/* The feedback panel: what you picked and why it is right or wrong, what the
   right answer was and why, the principle that separates them, and where to
   read more. The other two options are there but folded away, because the
   near-miss is the one worth reading. */
/* `order` is the keys in the order they were shown, so feedback can name an
   option by the letter the reader actually saw. Called from the results
   screen without it, where the shuffle is not recorded, it falls back to the
   stored order — the letters are then self-consistent within the panel. */
function simFeedback(q, picked, order) {
  const box = el('div', 'simfb');
  const ok = picked === q.correct;
  const shown = (order && order.length ? order : q.options.map(o => o.key));
  const letterOf = k => {
    const i = shown.indexOf(k);
    return i < 0 ? k : String.fromCharCode(65 + i);
  };
  const head = el('div', 'simfbhead ' + (ok ? 'good' : 'bad'));
  head.textContent = ok ? 'Correct'
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

  if (!ok && picked) box.appendChild(line(picked, 'Why your answer falls short', 'bad'));
  box.appendChild(line(q.correct, ok ? 'Why this is right' : 'Why this is the best answer', 'good'));

  const others = shown.filter(k => k !== q.correct && k !== picked);
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
  if (objs) box.appendChild(el('div', 'muted small simobj', 'Test objective ' + objs));
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
  const answered = SIM.list.filter(it => SIM.answers[it.q.id]).length;
  const flagged = SIM.list.filter(it => SIM.flags[it.q.id]).length;
  const wrap = $('#simReviewBody'); wrap.innerHTML = '';

  const stats = el('div', 'revstats');
  const stat = (n, label, cls) => {
    const c = el('div', 'revstat ' + (cls || ''));
    c.appendChild(el('div', 'revnum', String(n)));
    c.appendChild(el('div', 'muted small', label));
    return c;
  };
  stats.append(
    stat(answered, 'answered', 'good'),
    stat(SIM.total - answered, 'unanswered', SIM.total - answered ? 'bad' : ''),
    stat(flagged, 'flagged for review', flagged ? 'warn' : ''));
  wrap.appendChild(stats);
  wrap.appendChild(el('p', 'muted small',
    'Click any question to go back to it. Unanswered questions score zero — '
    + 'there is no penalty for guessing.'));

  SIM.blocks.forEach((b, bi) => {
    wrap.appendChild(el('h3', 'simrevscn', b.filler ? 'Additional questions' : simScenarioName(b.scn)));
    const grid = el('div', 'revgrid');
    SIM.list.forEach((it, i) => {
      if (it.block !== bi) return;
      const btn = el('button', 'sq', String(i + 1));
      if (SIM.answers[it.q.id]) btn.classList.add('done');
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
    const ok = picked === q.correct;
    if (ok) correct++;
    answers[q.id] = { picked, ok };
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
  if (a.filled) {
    wrap.appendChild(el('p', 'muted small',
      a.filled + ' question' + (a.filled === 1 ? ' was' : 's were') + ' added from other '
      + 'scenarios to reach ' + a.target + ', because the bank does not yet hold '
      + SIM_BLOCK + ' for every scenario.'));
  }

  // The breakdown the real score report gives, in the same shape.
  wrap.appendChild(el('h2', 'labsec', 'Percent correct by test objective'));
  wrap.appendChild(el('p', 'muted small',
    'The real score report breaks your result down this way. Each objective '
    + 'covers only a handful of items, so treat a single attempt as directional.'));
  const objRows = Object.keys(a.byObj).sort().map(id => {
    const o = simObjective(id);
    return { tag: id, name: o ? o.text : id, title: o ? o.text : '', n: a.byObj[id].n, ok: a.byObj[id].ok };
  });
  wrap.appendChild(objRows.length ? simBreakdown(objRows)
    : el('p', 'muted small', 'None of the questions in this sitting carry an objective tag.'));

  wrap.appendChild(el('h2', 'labsec', 'By domain'));
  wrap.appendChild(simBreakdown(((EXAMS[a.exam] || {}).domains || [])
    .filter(d => a.byDom[d.id])
    .map(d => ({ tag: 'D' + d.num, name: d.name, n: a.byDom[d.id].n, ok: a.byDom[d.id].ok }))));

  wrap.appendChild(el('h2', 'labsec', 'By scenario'));
  wrap.appendChild(simBreakdown(Object.keys(a.byScn)
    .map(id => ({ name: simScenarioName(id, a.exam), n: a.byScn[id].n, ok: a.byScn[id].ok }))));

  // History only means something once there is a second attempt to compare.
  const prior = S.simAttempts.filter(x => x !== a && x.exam === a.exam);
  if (prior.length) {
    wrap.appendChild(el('h2', 'labsec', 'Objectives across attempts'));
    wrap.appendChild(el('p', 'muted small',
      'Every objective you have been tested on, oldest attempt first.'));
    wrap.appendChild(simHistoryTable(a.exam));
  }

  const missed = SIM.list.filter(it => !a.answers[it.q.id].ok);
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
    name.appendChild(el('span', null, ' ' + (o ? o.text : id)));
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
      + (q.scn ? simScenarioName(q.scn, a.exam) : 'Additional')));
    card.appendChild(el('p', 'simmissstem', q.stem));
    card.appendChild(simFeedback(q, a.answers[q.id].picked));
    wrap.appendChild(card);
  });
  const act = el('div', 'actions');
  const back = el('button', 'btn sec', 'Back to results');
  back.onclick = () => simResult(a);
  act.appendChild(back);
  wrap.appendChild(act);
  window.scrollTo(0, 0);
}

/* ---------- start screen ---------- */
function renderSim() {
  const wrap = $('#simStartBody'); wrap.innerHTML = '';
  const examCode = S.exam;
  const bank = simBank(examCode);
  if (!bank.length) {
    wrap.appendChild(el('p', 'muted', 'No simulation questions are loaded.'));
    return;
  }

  const counts = {};
  bank.forEach(q => { counts[q.scn] = (counts[q.scn] || 0) + 1; });
  const scns = ((EXAMS[examCode] || {}).scenarios || []);
  const ready = scns.filter(s => (counts[s.id] || 0) >= SIM_BLOCK).length;

  wrap.appendChild(el('p', 'simlede',
    'The real sitting draws ' + SIM_BLOCKS + ' of the ' + scns.length + ' scenarios and asks '
    + SIM_BLOCK + ' questions on each — ' + SIM_TARGET + ' questions in ' + SIM_MINUTES
    + ' minutes, single-select, no feedback until you submit.'));
  // As on the real exam. Said here because a right-click is not discoverable.
  wrap.appendChild(el('p', 'muted small',
    'As in the real exam, right-click an option to rule it out and right-click '
    + 'again to restore it. On a keyboard, focus the option and press X.'));

  // Say plainly what the bank can and cannot do today, before anyone starts.
  const avail = bank.length;
  const note = el('div', 'simavail');
  note.appendChild(el('div', 'simavailhead', avail + ' questions in the bank'));
  const detail = ready === scns.length
    ? el('div', 'muted small', 'Every scenario has at least ' + SIM_BLOCK + ' questions, so a full sitting is drawn exactly as the real exam does.')
    : el('div', 'muted small',
        ready + ' of ' + scns.length + ' scenarios have the full ' + SIM_BLOCK + '. '
        + 'A sitting takes what each drawn scenario has and tops the paper up from the '
        + 'others to reach ' + SIM_TARGET + '; the extras are shown separately and the '
        + 'result says how many there were.');
  note.appendChild(detail);
  const grid = el('div', 'simscngrid');
  scns.forEach(s => {
    const c = counts[s.id] || 0;
    const cell = el('div', 'simscncell' + (c >= SIM_BLOCK ? ' full' : c ? '' : ' empty'));
    cell.appendChild(el('span', 'simscnn', String(c)));
    cell.appendChild(el('span', 'simscnt', s.t));
    cell.title = c + ' question' + (c === 1 ? '' : 's') + ' · needs ' + SIM_BLOCK + ' for a full block';
    grid.appendChild(cell);
  });
  note.appendChild(grid);
  wrap.appendChild(note);

  const acts = el('div', 'actions');
  const exam = el('button', 'btn examcta', 'Start exam · timed');
  exam.onclick = () => {
    const sit = buildSitting({});
    if (!sit) return;
    let msg = 'Start a timed sitting?\n\n' + sit.total + ' questions, '
      + sit.minutes + ' minutes, no feedback until you submit.';
    if (sit.filled) msg += '\n\n' + sit.filled + ' question'
      + (sit.filled === 1 ? '' : 's') + ' will be added from other scenarios to reach '
      + sit.target + ', because the bank is not yet ' + SIM_BLOCK + ' deep on every scenario.';
    if (!confirm(msg)) return;
    simStart('exam', {});
  };
  const prac = el('button', 'btn sec', 'Practice · feedback as you go');
  prac.onclick = () => simStart('practice', {});
  acts.append(exam, prac);
  wrap.appendChild(acts);

  wrap.appendChild(el('h2', 'labsec', 'Drill by test objective'));
  wrap.appendChild(el('p', 'muted small',
    'The real exam breaks its score report down into ' + simObjectives().length
    + ' objectives. Pick the ones you want to work on — if you have sat the '
    + 'exam, tick what your own report marked low.'));
  wrap.appendChild(simObjectivePicker());

  if (S.simAttempts.filter(a => a.exam === examCode).length) {
    wrap.appendChild(el('h2', 'labsec', 'Your attempts'));
    wrap.appendChild(simAttemptList(examCode));
    wrap.appendChild(el('h2', 'labsec', 'Objectives across attempts'));
    wrap.appendChild(simHistoryTable(examCode));
  }
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
  ['When', 'Mode', 'Score', 'Estimate'].forEach(h => hr.appendChild(el('th', null, h)));
  head.appendChild(hr); t.appendChild(head);
  const tb = el('tbody');
  S.simAttempts.filter(a => a.exam === (exam || S.exam)).slice().reverse().forEach(a => {
    const tr = el('tr');
    tr.appendChild(el('td', null, new Date(a.ts).toLocaleDateString()));
    tr.appendChild(el('td', null, a.drill ? 'Objective drill' : a.mode === 'exam' ? 'Timed exam' : 'Practice'));
    tr.appendChild(el('td', null, a.correct + '/' + a.total));
    const approx = Math.round(100 + (a.correct / Math.max(1, a.total)) * 900);
    const td = el('td');
    if (a.drill) td.textContent = '—';
    else td.appendChild(el('span', 'tag ' + (approx >= PASS_MARK ? 'good' : 'warn'), String(approx)));
    tr.appendChild(td);
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
    const un = SIM.total - SIM.list.filter(it => SIM.answers[it.q.id]).length;
    const msg = un
      ? 'Submit with ' + un + ' question' + (un === 1 ? '' : 's') + ' unanswered? They score zero.'
      : 'Submit the paper? You cannot change answers afterwards.';
    if (!confirm(msg)) return;
    simSubmit(false);
  };
  $('#simResultDone').onclick = () => { SIM = null; go('sim'); };
}
