/* Anthropic Certification Trainer — application logic.
 * State persists to localStorage. All reads/writes are guarded.
 */
'use strict';

/* The storage key keeps its original name on purpose. The app was renamed to
   Anthropic Certification Trainer, but this string is what existing progress
   is filed under in localStorage — changing it would silently orphan every
   answer, flashcard box and lab checkpoint already saved. It is internal and
   never shown, so the old name here costs nothing. */
const STORE_KEY = 'claude-cert-trainer-v1';
const PASS_MARK = 720;

/* ---------- state ---------- */
const BLANK = {
  exam: 'CCAR-F',
  history: {},      // qid -> [{correct, conf, ts}]
  seen: {},         // qid -> count (for rotation)
  flags: {},        // "EXAM/domainId" -> true (manual "needs work")
  labs: {},         // labId -> {checkpoints: {idx:true}, done:bool}
  streak: { last: null, days: 0 },
  sessions: [],     // {ts, exam, total, correct, mode}
  read: {},         // "EXAM/domainId" -> ts of last read
  cards: {},        // card key -> {box:1-5, ts}  (Leitner spacing)
  planOrder: 'blueprint',  // 'blueprint' | 'gap'
  /* Exam simulation (see sim.js). Kept out of `sessions` and `history`
     because it is a different exam type scored a different way: by test
     objective, against a bank drawn from a real sitting. Mixing it into the
     recall numbers would move a readiness score that means something else. */
  simAttempts: [],  // {ts, exam, mode, total, correct, byObj, byDom, byScn, ...}
  simObjSel: []     // objective ids ticked for the drill, per user
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(BLANK);
    return Object.assign(structuredClone(BLANK), JSON.parse(raw));
  } catch (e) { return structuredClone(BLANK); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {}
}
let S = load();

/* Questions that moved domain keep their answer history: progress is keyed
   by question id, so a rename would otherwise silently reset it. */
const RENAMED_QIDS = { 'ar-d1-26': 'ar-d3-27', 'ar-d1-27': 'ar-d3-28' };
function migrateIds() {
  let moved = 0;
  for (const [from, to] of Object.entries(RENAMED_QIDS)) {
    if (S.history && S.history[from] && !S.history[to]) { S.history[to] = S.history[from]; moved++; }
    if (S.history) delete S.history[from];
    if (S.seen && S.seen[from] != null) {
      if (S.seen[to] == null) S.seen[to] = S.seen[from];
      delete S.seen[from];
    }
  }
  if (moved) save();
}
migrateIds();


/* ---------- question helpers ---------- */
function qExams(q) { return Array.isArray(q.exam) ? q.exam : [q.exam]; }
function qDomainFor(q, exam) {
  if (qExams(q)[0] === exam) return q.d;
  return (q.also && q.also[exam]) || null;
}
/* Questions marked heldOut are reserved for the full-length mock and the
   timed mock. Drilling a domain over and over should not teach you the
   answers to your own practice exam, so the two pools are disjoint. */
function poolFor(exam, opts) {
  const o = opts || {};
  return QUESTIONS.filter(q => {
    if (!qExams(q).includes(exam)) return false;
    /* `held:'any'` spans both pools, mirroring `hard:'any'` below. The quick
       quiz uses it where a simulation exists: with no recall sitting left to
       reserve them for, held-out questions are simply more good questions. */
    if (o.held !== 'any' && !!q.heldOut !== !!o.held) return false;
    // The hard tier is opt-in. These questions carry long scenarios and
    // sentence-length options; meeting one in a ten-question warm-up is
    // discouraging rather than useful, so they are excluded unless asked
    // for. `hard:true` returns only them, `hard:'any'` returns everything.
    if (o.hard === 'any') return true;
    return o.hard ? isHard(q) : !isHard(q);
  });
}
function isHard(q) { return q.difficulty === 'hard' || q.difficulty === 'expert'; }
/* Hard questions for an exam, whichever pool they sit in. */
function hardFor(exam) { return QUESTIONS.filter(q => qExams(q).includes(exam) && isHard(q)); }
/* Everything for an exam, regardless of which pool it belongs to. Used for
   coverage and mastery, where the split is an implementation detail. */
function allFor(exam) { return QUESTIONS.filter(q => qExams(q).includes(exam)); }
/* Whether the hard-tier mode is offered. Below five there is not a session's
   worth; where a simulation exists those questions were folded into its bank
   and the separate entry point is retired (see renderDash). */
function hardModeAvailable(exam) { return hardFor(exam).length >= 5 && !simAvailable(exam); }
/* Every question some mode on offer can actually serve. Coverage is measured
   against this rather than allFor(): a denominator holding questions no
   button can reach is a percentage nobody can finish, and it read as the
   app skipping questions. Held-out questions are always reachable — through
   the mocks, or the quick quiz where a simulation has replaced them. */
function reachableFor(exam) {
  const hard = hardModeAvailable(exam);
  return allFor(exam).filter(q => hard || !isHard(q));
}
function answersOf(q) { return Array.isArray(q.a) ? q.a : [q.a]; }

/* ---------- mastery ---------- */
/* Weighted recency: later attempts count more. Confidence lowers the score
   when you were right but unsure, so "guessed correctly" doesn't read as mastered. */
function statsFor(qid) {
  const h = S.history[qid];
  if (!h || !h.length) return null;
  let num = 0, den = 0;
  h.forEach((rec, i) => {
    // Steep decay so the latest attempt dominates: with 2.6, one recent correct
    // answer after two misses lands clearly above the 0.7 "needs work" line
    // rather than ambiguously on it.
    const w = Math.pow(2.6, i);
    let v = rec.correct ? 1 : 0;
    if (rec.correct && rec.conf === 'guess') v = 0.45;
    else if (rec.correct && rec.conf === 'unsure') v = 0.75;
    else if (!rec.correct && rec.conf === 'sure') v = -0.15; // confidently wrong
    num += v * w; den += w;
  });
  return { score: Math.max(0, num / den), attempts: h.length, last: h[h.length - 1] };
}

function domainMastery(exam, domId) {
  const inDom = q => qDomainFor(q, exam) === domId;
  const qs = reachableFor(exam).filter(inDom);
  let sum = 0, answered = 0;
  qs.forEach(q => { const st = statsFor(q.id); if (st) { sum += st.score; answered++; } });
  /* The domain drill serves only the drill pool — held-out questions are
     reserved and the hard tier is opt-in — so "have I worked through this
     domain" has to be asked of that pool. Against the whole domain, drilling
     every question on CCAR-P D1 read as 48% and the study plan's quiz step,
     which needed half, could never be completed by quizzing the domain. */
  const drillQs = poolFor(exam).filter(inDom);
  const drillDone = drillQs.filter(q => statsFor(q.id)).length;
  return {
    total: qs.length,
    answered,
    coverage: qs.length ? answered / qs.length : 0,
    score: answered ? sum / answered : null,
    flagged: !!S.flags[exam + '/' + domId],
    drill: { total: drillQs.length, answered: drillDone,
             coverage: drillQs.length ? drillDone / drillQs.length : 0 }
  };
}

/* Per-domain results drawn from Exam Simulation attempts.
 *
 * Simulation questions are the ones shaped like the real exam — long prose
 * stems, four close options, one best answer — so where a simulation bank
 * exists they are the better evidence of how a real sitting would go. A
 * drill question answered from recall says less about that.
 *
 * Every attempt counts, including objective drills: each row carries byDom,
 * a per-domain {n, ok} tally, and summing them weights domains by how much
 * of each has actually been attempted. Returns null for a domain with no
 * simulation evidence, matching domainMastery's contract.
 */
function simDomainMastery(exam, domId) {
  let n = 0, ok = 0;
  (S.simAttempts || []).forEach(a => {
    if (a.exam !== exam) return;
    const d = (a.byDom || {})[domId];
    if (d) { n += d.n; ok += d.ok; }
  });
  return { answered: n, score: n ? ok / n : null };
}

/* How much of the simulation bank for a domain has been seen at least once.
   Coverage is about breadth of exposure, so it counts distinct questions
   rather than attempts. */
function simDomainCoverage(exam, domId) {
  if (typeof SIM_QUESTIONS === 'undefined') return { total: 0, seen: 0, coverage: 0 };
  const qs = SIM_QUESTIONS.filter(q =>
    q.exam === exam && (q.domains || []).includes(domId));
  const seen = new Set();
  (S.simAttempts || []).forEach(a => {
    if (a.exam !== exam) return;
    Object.keys(a.answers || {}).forEach(qid => seen.add(qid));
  });
  const hit = qs.filter(q => seen.has(q.id)).length;
  return { total: qs.length, seen: hit, coverage: qs.length ? hit / qs.length : 0 };
}

/* Projected scaled score, weighted by real exam domain weights.
 * Unanswered domains contribute nothing and are reported as coverage gaps.
 *
 * Where an Exam Simulation bank exists, the projection comes from simulation
 * attempts rather than from drill history: those questions match the real
 * exam's shape, so the number means more. The drill pool still drives the
 * breadth gate and the mastery views — this function is only the estimate of
 * how a sitting would score. Exams with no simulation bank (every one but
 * CCAR-F today) keep projecting from drill history, which is the only
 * evidence they have.
 *
 * `source` says which pool the number came from, so the UI can label it
 * rather than leaving the reader to guess.
 */
function readiness(exam) {
  const ex = EXAMS[exam];
  const useSim = simAvailable(exam);
  let wSum = 0, acc = 0, covSum = 0, evidence = 0;
  ex.domains.forEach(d => {
    wSum += d.weight;
    if (useSim) {
      const m = simDomainMastery(exam, d.id);
      const c = simDomainCoverage(exam, d.id);
      covSum += d.weight * c.coverage;
      evidence += m.answered;
      if (m.score !== null) acc += d.weight * m.score;
    } else {
      const m = domainMastery(exam, d.id);
      covSum += d.weight * m.coverage;
      evidence += m.answered;
      if (m.score !== null) acc += d.weight * m.score;
    }
  });
  const coverage = wSum ? covSum / wSum : 0;
  const raw = wSum ? acc / wSum : 0;          // 0..1 over the whole blueprint
  const scaled = Math.round(100 + raw * 900); // map to the 100-1000 scale
  return { scaled, coverage, raw, source: useSim ? 'sim' : 'drill', evidence };
}


/* ---------- readiness gates ---------- */
/* The projected score above answers "how well am I doing on what I have
 * tried". It cannot answer "is that number trustworthy yet", and those are
 * different questions: a score of 850 drawn from forty questions answered
 * once, yesterday, in one sitting, is not evidence of much.
 *
 * Six gates, each testing something the others cannot see:
 *
 *   breadth     every domain actually attempted, not just the big ones
 *   accuracy    the projected score clears the real pass mark
 *   durability  answers that survived a night's sleep, not same-session recall
 *   recovery    questions you got wrong and later got right
 *   exam        at least one full timed sitting at or above the pass mark
 *   spacing     study spread over days rather than crammed into one
 *
 * Reported as "N of 6" rather than a percentage. Each gate is a yes or no
 * about evidence you either have or do not, and averaging them into a
 * single number would imply a precision the inputs do not carry.
 */
const GATE_BREADTH   = 0.60;   // of each domain's questions attempted
const GATE_DURABLE   = 0.50;   // of attempted questions right on a later day
const GATE_RECOVERY  = 0.60;   // of missed questions later recovered
const GATE_RECOVER_H = 24;     // hours that must pass before it counts
const GATE_DAYS      = 5;      // distinct days studied
const DAY_MS = 86400000;

/* A question counts as "durable" when some correct answer came at least a
   day after the first attempt on it. Same-session repetition is recall;
   a correct answer the next day is retention. */
/* Every full-length timed sitting for an exam, whichever mode produced it.
 *
 * Two sources: S.sessions rows from the retired timed mock, and S.simAttempts
 * from the Exam Simulation. Only genuine sittings count — a practice run has
 * feedback after every answer and an objective drill is neither timed nor
 * full-length, so neither is evidence of readiness.
 *
 * Simulation attempts carry no `scaled` field (simResult computes it when it
 * renders), so it is derived here the same way rather than read off the row.
 */
function simScaledOf(a) {
  return Math.round(100 + (a.correct / Math.max(1, a.total)) * 900);
}
function fullSittings(exam) {
  const legacy = S.sessions
    .filter(x => x.exam === exam && x.mode === 'exam')
    .map(x => ({ ts: x.ts, scaled: x.scaled || 0 }));
  const sims = (S.simAttempts || [])
    .filter(a => a.exam === exam && a.mode === 'exam' && !a.drill)
    .map(a => ({ ts: a.ts, scaled: simScaledOf(a) }));
  return legacy.concat(sims).sort((a, b) => a.ts - b.ts);
}

function gateDetail(exam) {
  const ex = EXAMS[exam];
  const r = readiness(exam);
  const dayKey = ts => new Date(ts).toDateString();

  /* Per-question history for this exam only. A shared question answered in
     a CCAR-F drill is CCAR-F evidence, not CCDV-F evidence. */
  const byQ = [];
  allFor(exam).forEach(q => {
    const h = (S.history[q.id] || []).filter(rec =>
      rec.exam ? rec.exam === exam : true);
    if (h.length) byQ.push({ q, h });
  });

  /* ---- breadth: the weakest domain decides ----
     Measured against the DRILL pool, not every question in the domain.
     The held-out pool is reserved for practice exams and the hard tier is
     opt-in, so counting them in the denominator would make this gate
     unreachable by drilling — on CCAR-F d1, working through every drill
     question would still read as 59% coverage. */
  let worst = null;
  ex.domains.forEach(d => {
    const qs = poolFor(exam).filter(q => qDomainFor(q, exam) === d.id);
    const answered = qs.filter(q => (S.history[q.id] || [])
      .some(rec => rec.exam ? rec.exam === exam : true)).length;
    const coverage = qs.length ? answered / qs.length : 1;
    if (!worst || coverage < worst.coverage) {
      worst = { id: d.id, name: d.name, num: d.num,
                coverage, answered, total: qs.length };
    }
  });
  const breadthNeed = worst ? Math.max(0,
    Math.ceil(worst.total * GATE_BREADTH) - worst.answered) : 0;

  /* ---- durability ---- */
  let durable = 0;
  byQ.forEach(({ h }) => {
    const first = h[0].ts;
    if (h.some(rec => rec.correct && rec.ts - first >= DAY_MS)) durable++;
  });
  const durableShare = byQ.length ? durable / byQ.length : 0;

  /* ---- recovery: wrong once, right at least GATE_RECOVER_H later ---- */
  let missed = 0, recovered = 0;
  byQ.forEach(({ h }) => {
    const i = h.findIndex(rec => !rec.correct);
    if (i < 0) return;
    missed++;
    const after = h.slice(i + 1).find(rec =>
      rec.correct && rec.ts - h[i].ts >= GATE_RECOVER_H * 3600000);
    if (after) recovered++;
  });
  const recoveryShare = missed ? recovered / missed : null;

  /* ---- exam conditions ---- */
  /* A full timed sitting, from either source. The simulation is the current
     route; mode:'exam' sessions are the retired timed mock, still counted
     because people have real history under it and a gate that un-passes
     itself on an update is worse than one honouring a retired mode. */
  const sittings = fullSittings(exam);
  const best = sittings.reduce((a, x) => x.scaled > a ? x.scaled : a, 0);

  /* ---- spacing ---- */
  const days = new Set();
  byQ.forEach(({ h }) => h.forEach(rec => days.add(dayKey(rec.ts))));

  /* How much evidence sits behind the projected score, counted from the pool
     the score was computed from. For a simulation-based projection that is
     distinct simulation questions answered; otherwise distinct drill
     questions. The two are not interchangeable, so the gate names which. */
  let estN = byQ.length, estWhat = 'questions';
  if (r.source === 'sim') {
    const seen = new Set();
    (S.simAttempts || []).forEach(a => {
      if (a.exam !== exam) return;
      Object.keys(a.answers || {}).forEach(qid => seen.add(qid));
    });
    estN = seen.size;
    estWhat = 'simulation questions';
  }

  return [
    { id: 'breadth', group: 'cover', label: 'Every domain covered',
      pass: !!worst && worst.coverage >= GATE_BREADTH,
      detail: worst
        ? (worst.num ? 'D' + worst.num : worst.id) + ' is weakest at '
          + Math.round(worst.coverage * 100) + '%'
        : 'no domains',
      need: 'Attempt at least ' + Math.round(GATE_BREADTH * 100)
        + '% of each domain\u2019s questions.',
      todo: breadthNeed
        ? breadthNeed + ' more in ' + (worst.num ? 'D' + worst.num : worst.id)
          + ' \u2014 ' + worst.name
        : null,
      act: worst
        ? { label: 'Drill ' + (worst.num ? 'D' + worst.num : worst.id),
            run: () => startQuiz('domain', { domain: worst.id }) }
        : null },

    /* The projected score is reported from eight percent coverage, which is
       enough to show a trend and not enough to stake a gate on: twenty-two
       questions can project 775 and mean very little. This gate additionally
       wants a sitting's worth of distinct questions behind the number. */
    /* The evidence behind the estimate has to be counted from whichever pool
       the estimate came from, or the gate asks for drill answers while the
       score is computed from simulation results. */
    { id: 'accuracy', group: 'sim', label: 'Projected score clears the mark',
      pass: estN >= ex.questions && r.scaled >= PASS_MARK,
      detail: estN < ex.questions
        ? estN + ' of ' + ex.questions + ' ' + estWhat + ' behind the estimate'
        : r.scaled + ' against ' + PASS_MARK,
      need: 'Reach a projected ' + PASS_MARK + ', with at least '
        + ex.questions + ' ' + estWhat + ' behind the estimate.',
      todo: estN < ex.questions
        ? (ex.questions - estN) + ' more ' + estWhat + ' before this means much'
        : r.scaled < PASS_MARK ? (PASS_MARK - r.scaled) + ' points short' : null,
      act: estN < ex.questions
        ? (r.source === 'sim'
            ? { label: 'Exam simulation', run: () => go('sim') }
            : { label: 'Quick quiz', run: () => startQuiz('quick') })
        : { label: 'Drill weak areas', run: () => startQuiz('weak', { weakOnly: true }) } },

    { id: 'durable', group: 'retain', label: 'Answers that survived a night',
      pass: byQ.length >= 20 && durableShare >= GATE_DURABLE,
      detail: byQ.length < 20 ? 'too few questions attempted yet'
        : Math.round(durableShare * 100) + '% of ' + byQ.length,
      need: 'Answer ' + Math.round(GATE_DURABLE * 100) + '% of your questions '
        + 'correctly on a later day \u2014 same-session repetition is recall, '
        + 'not retention.',
      todo: byQ.length >= 20 && durableShare < GATE_DURABLE
        ? 'revisit questions you first saw more than a day ago' : null,
      act: { label: 'Quick quiz', run: () => startQuiz('quick') } },

    { id: 'recovery', group: 'retain', label: 'Mistakes turned around',
      pass: missed >= 5 && recoveryShare !== null && recoveryShare >= GATE_RECOVERY,
      detail: missed < 5 ? 'not enough missed questions to judge'
        : recovered + ' of ' + missed + ' recovered',
      need: 'Get ' + Math.round(GATE_RECOVERY * 100) + '% of your missed '
        + 'questions right again, at least ' + GATE_RECOVER_H + ' hours later.',
      todo: missed >= 5 && recoveryShare < GATE_RECOVERY
        ? (Math.ceil(missed * GATE_RECOVERY) - recovered)
          + ' more to turn around' : null,
      act: { label: 'Drill weak areas', run: () => startQuiz('weak', { weakOnly: true }) } },

    /* Named for whichever full-length sitting this certification actually
       offers, so the instruction points at something the user can reach. */
    { id: 'exam', group: 'sim', label: 'A full timed sitting',
      pass: sittings.length >= 1 && best >= PASS_MARK,
      detail: !sittings.length ? 'none taken'
        : sittings.length + ' taken, best ' + best,
      need: 'Complete at least one '
        + (simAvailable(exam) ? 'timed exam simulation' : 'timed mock')
        + ' at or above ' + PASS_MARK + '.',
      todo: !sittings.length
        ? (simAvailable(exam) ? 'run the exam simulation' : 'run the timed mock')
        : best < PASS_MARK ? 'best so far is ' + best : null,
      act: simAvailable(exam)
        ? { label: 'Exam simulation', run: () => go('sim') }
        : { label: 'Timed mock', run: () => startQuiz('exam') } },

    { id: 'spacing', group: 'retain', label: 'Study spread over days',
      pass: days.size >= GATE_DAYS,
      detail: days.size + ' day' + (days.size === 1 ? '' : 's'),
      need: 'Study on at least ' + GATE_DAYS + ' separate days. Spacing is '
        + 'what moves material into memory that lasts.',
      todo: days.size < GATE_DAYS
        ? (GATE_DAYS - days.size) + ' more day'
          + (GATE_DAYS - days.size === 1 ? '' : 's') : null,
      /* No action: the only thing that closes this gate is coming back
         on another day, and a button cannot do that. */
      act: null }
  ];
}

/* N of 6, plus the gate furthest from being met. */
function readinessGates(exam) {
  const gates = gateDetail(exam);
  const passed = gates.filter(g => g.pass).length;
  const next = gates.find(g => !g.pass && g.todo) || gates.find(g => !g.pass);
  return { gates, passed, total: gates.length, next: next || null };
}

/* ---------- question selection: spaced repetition + rotation ---------- */
/* Priority: never-seen first, then wrong/shaky by how overdue they are.
   A question is not repeated until the rest of its pool has been served. */
function pickQuestions(exam, n, opts) {
  opts = opts || {};
  // The exam modes draw from the held-out pool so a practice sitting is not
  // made of questions you have already drilled to memory.
  // hard:true draws only the hard tier, and from BOTH pools — there are
  // too few of them to also split by held-out.
  // Pass `held` through rather than coercing it: 'any' is a third state and
  // !!'any' would narrow the quick quiz to held-out questions only.
  let pool = opts.hard ? hardFor(exam) : poolFor(exam, { held: opts.held });
  if (opts.domain) pool = pool.filter(q => qDomainFor(q, exam) === opts.domain);
  if (opts.weakOnly) {
    pool = pool.filter(q => {
      const st = statsFor(q.id);
      const dom = qDomainFor(q, exam);
      return (st && st.score < 0.7) || S.flags[exam + '/' + dom];
    });
    if (!pool.length) pool = opts.hard ? hardFor(exam)
      : poolFor(exam, { held: opts.held });        // nothing weak yet — fall back
  }

  const now = Date.now();
  const scored = pool.map(q => {
    const st = statsFor(q.id);
    const seen = S.seen[q.id] || 0;
    let pri;
    if (!st) {
      pri = 1000 - seen * 10;                       // unseen first
    } else {
      const days = (now - st.last.ts) / 86400000;
      const interval = Math.pow(2.2, st.score * 4); // mastered -> long interval
      const overdue = days / Math.max(0.35, interval);
      pri = 500 * (1 - st.score) + 120 * Math.min(overdue, 4) - seen * 8;
      // Just answered in this sitting? Push it well down, or a re-drill
      // serves the same questions straight back.
      if (days < 0.02) pri -= 320;
    }
    return { q, pri };
  });

  // exam-weighted sampling so a mock mirrors the real blueprint
  if (opts.weighted) {
    scored.sort((a, b) => b.pri - a.pri);
    return weightedSample(scored.map(s => s.q), exam, n);
  }
  return priorityShuffle(scored, n);
}

/* Draw n questions at random, weighted by priority.
 *
 * Taking the top n outright looked sensible but made a repeated drill
 * deterministic: once a few questions were missed their priority dominated,
 * the same set came back every round, and the rest of the pool was never
 * reached. Sampling without replacement keeps shaky questions likelier
 * without making them certain, so the pool keeps circulating. */
function priorityShuffle(scored, n) {
  if (!scored.length) return [];
  // Shift so the lowest priority sits just above zero, then bias the spread.
  const lo = Math.min(...scored.map(s => s.pri));
  const items = scored.map(s => ({ q: s.q, w: Math.pow(s.pri - lo + 40, 1.7) }));
  const out = [];
  const want = Math.min(n, items.length);
  for (let k = 0; k < want; k++) {
    let total = 0;
    for (const it of items) total += it.w;
    let r = Math.random() * total, idx = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      r -= items[i].w;
      if (r <= 0) { idx = i; break; }
    }
    out.push(items[idx].q);
    items.splice(idx, 1);                 // without replacement
  }
  return out;
}

/* Present options in a different order each time, so you learn the answer
 * rather than its position. Returns the shuffled option list plus the
 * mapping needed to translate a click back to the original index. */
function shuffleOptions(q) {
  const order = q.opts.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {    // Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}


function weightedSample(qs, exam, n) {
  const ex = EXAMS[exam];
  const byDom = {};
  qs.forEach(q => { const d = qDomainFor(q, exam); (byDom[d] = byDom[d] || []).push(q); });
  const out = [];
  ex.domains.forEach(d => {
    const want = Math.round(n * (d.weight / 100));
    const have = byDom[d.id] || [];
    out.push(...have.slice(0, want));
  });
  // top up or trim to exactly n
  if (out.length < n) {
    const rest = qs.filter(q => !out.includes(q));
    out.push(...rest.slice(0, n - out.length));
  }
  return out.slice(0, n).sort(() => Math.random() - 0.5);
}

/* ---------- quiz session ---------- */
let Q = null; // {list, i, answered, picked[], correct, mode}

function startQuiz(mode, opts) {
  const exam = S.exam;
  let n, weighted = false;
  let held = false;
  let hard = false;
  if (mode === 'mock' || mode === 'exam') {
    n = Math.min(EXAMS[exam].questions, poolFor(exam, { held: true }).length);
    weighted = true;
    held = true;          // reserved pool: never seen in a drill
  }
  else if (mode === 'hard') {
    // Every hard question for this exam, drill and held-out alike. There
    // are too few to sample from, and they are the point of the mode.
    n = Math.min(12, hardFor(exam).length);
    hard = true;
  }
  else if (mode === 'weak') n = 10;
  else if (mode === 'domain') n = 10;
  else {
    n = 10;
    /* Quick quiz draws from the drill and held-out pools together, but only
       where the simulation has taken over as the full-length sitting. Where
       the timed mock is still the only full-length option, its pool stays
       reserved so that sitting is not made of questions already drilled. */
    if (mode === 'quick' && simAvailable(exam)) held = 'any';
  }

  const list = pickQuestions(exam, n, Object.assign({ weighted, held, hard }, opts));
  if (!list.length) { alert('No questions available for that selection.'); return; }
  // Keep opts on the session: 'Another round' needs them to rebuild the same
  // kind of quiz. Without this a domain drill restarts unfiltered.
  Q = { list, i: 0, answered: false, picked: [], correct: 0, mode,
        opts: opts || null, started: Date.now() };
  // Rule-out marks are scratch working for one sitting, never carried into
  // the next.
  if (typeof clearStrikes === 'function') clearStrikes(null);

  // Exam mode mirrors the real sitting: a clock, answers you can change, no
  // feedback until you submit, and a review screen before scoring.
  if (mode === 'exam') {
    Q.answers = new Array(list.length);     // picked indexes per question
    Q.flags = new Array(list.length);       // marked for review
    Q.deadlineMs = EXAMS[exam].minutes * 60 * 1000;
    Q.reviewing = false;
    assignScenarios(exam, Q);
    startExamTimer();
  }
  renderQuiz();
  go('quiz');
}

/* CCAR-F draws 4 scenarios from a bank of 6 and frames its questions inside
   them. Reproduce that: pick 4, then label each question with whichever of
   those scenarios covers its domain, so questions arrive in scenario order. */
function assignScenarios(exam, sess) {
  const all = EXAMS[exam].scenarios;
  if (!all || !all.length) return;

  const chosen = all.slice().sort(() => Math.random() - 0.5).slice(0, 4);
  sess.scenarios = chosen;
  sess.scenarioMap = {};

  const buckets = chosen.map(() => []);
  const spare = [];
  sess.list.forEach(q => {
    // Only label a question with a scenario it genuinely belongs to.
    // Matching on domain alone put a retry-storm question under 'Code
    // Generation with Claude Code' simply because both touch D5 — the
    // heading then actively misleads. A question carries scn:[...] when
    // its subject fits; anything else is presented without a heading.
    const fits = Array.isArray(q.scn) ? q.scn : null;
    const hits = fits
      ? chosen.map((s, i) => (fits.includes(s.id) ? i : -1)).filter(i => i >= 0)
      : [];
    if (hits.length) {
      const pick = hits[Math.floor(Math.random() * hits.length)];
      buckets[pick].push(q);
      sess.scenarioMap[q.id] = chosen[pick].t;
    } else {
      spare.push(q);           // no chosen scenario genuinely covers it
    }
  });

  // Reorder the paper so questions arrive grouped under their scenario.
  sess.list = buckets.flat().concat(spare);
}

/* ---------- exam review and submission ---------- */
function showExamReview() {
  Q.reviewing = true;
  const answered = Q.answers.filter(a => a && a.length).length;
  const flagged = Q.flags.filter(Boolean).length;
  const unanswered = Q.list.length - answered;

  const wrap = $('#reviewBody'); wrap.innerHTML = '';
  const stats = el('div', 'revstats');
  const stat = (n, label, cls) => {
    const c = el('div', 'revstat ' + (cls || ''));
    c.appendChild(el('div', 'revnum', String(n)));
    c.appendChild(el('div', 'muted small', label));
    return c;
  };
  stats.append(
    stat(answered, 'answered', 'good'),
    stat(unanswered, 'unanswered', unanswered ? 'bad' : ''),
    stat(flagged, 'flagged for review', flagged ? 'warn' : ''),
  );
  wrap.appendChild(stats);

  wrap.appendChild(el('p', 'muted small',
    'Click any question to go back to it. Unanswered questions score zero — '
    + 'there is no penalty for guessing.'));

  const grid = el('div', 'revgrid');
  Q.list.forEach((_, i) => {
    const b = el('button', 'sq');
    b.textContent = String(i + 1);
    if ((Q.answers[i] || []).length) b.classList.add('done');
    if (Q.flags[i]) b.classList.add('flag');
    b.onclick = () => { Q.reviewing = false; Q.i = i; renderQuiz(); go('quiz'); };
    grid.appendChild(b);
  });
  wrap.appendChild(grid);

  $('#reviewClock').textContent = fmtClock(examRemaining());
  go('review');
}

/** Score the paper. Partial credit is not given: a multi-select is right only
 *  if the selected set matches exactly, which is how these exams score. */
function submitExam(auto) {
  stopExamTimer();
  let correct = 0;
  const byDom = {};
  Q.list.forEach((q, i) => {
    const d = qDomainFor(q, S.exam);
    byDom[d] = byDom[d] || { n: 0, ok: 0 };
    byDom[d].n++;
    const got = (Q.answers[i] || []).slice().sort().join(',');
    const want = answersOf(q).slice().sort().join(',');
    const ok = got !== '' && got === want;
    if (ok) { correct++; byDom[d].ok++; }
    // feed the normal mastery model, with no confidence signal recorded
    recordAnswer(q.id, ok, 'exam');
  });
  Q.correct = correct;
  Q.byDom = byDom;
  Q.autoSubmitted = !!auto;
  Q.elapsedMs = Date.now() - Q.started;
  finishExam();
}

/* ---------- exam timer ---------- */
let examTimer = null;

function startExamTimer() {
  stopExamTimer();
  examTimer = setInterval(tickExam, 1000);
  tickExam();
}
function stopExamTimer() {
  if (examTimer) { clearInterval(examTimer); examTimer = null; }
}
function examRemaining() {
  if (!Q || Q.mode !== 'exam') return 0;
  return Math.max(0, Q.deadlineMs - (Date.now() - Q.started));
}
function fmtClock(ms) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function tickExam() {
  const el2 = $('#examClock');
  if (!Q || Q.mode !== 'exam' || !el2) return;
  const left = examRemaining();
  el2.textContent = fmtClock(left);
  el2.classList.toggle('warn', left <= 10 * 60 * 1000 && left > 5 * 60 * 1000);
  el2.classList.toggle('crit', left <= 5 * 60 * 1000);
  if (left <= 0) { stopExamTimer(); submitExam(true); }
}

function recordAnswer(qid, correct, conf) {
  // Record which exam you were studying. 60 questions are shared between
  // CCAR-F and CCDV-F, so without this an answer given in a CCAR-F drill
  // also counted as CCDV-F activity — answers with no sessions to explain them.
  (S.history[qid] = S.history[qid] || []).push({ correct, conf, ts: Date.now(), exam: S.exam });
  S.seen[qid] = (S.seen[qid] || 0) + 1;
  // streak
  const today = new Date().toDateString();
  if (S.streak.last !== today) {
    const y = new Date(Date.now() - 86400000).toDateString();
    S.streak.days = (S.streak.last === y) ? S.streak.days + 1 : 1;
    S.streak.last = today;
  }
  save();
}

/* ---------- analytics ----------
 * Everything here is derived from data already recorded, so stats appear
 * for answers given before this feature existed. Confidence is scored
 * -1..+1 so "confidently wrong" is genuinely worse than a flagged guess.
 */
const CONF_SCORE = { sure: 1, unsure: 0.35, guess: -0.2, skip: 0 };
const CONF_LABEL = { sure: 'Confident', unsure: 'Unsure', guess: 'Guessed', skip: 'No rating' };
/* Labels for sessions already recorded. Entries are added, never removed: a
   session stored under a retired mode still has to render as what it was. */
const MODE_LABEL = { quick: 'Quick quiz', domain: 'Domain drill', weak: 'Weak-area drill',
                     exam: 'Practice exam', mock: 'Full-length practice',
                     hard: 'Hard questions', review: 'Missed-question review',
                     cards: 'Flashcards' };

/** Every answer, flattened and sorted oldest-first. */
function allAnswers() {
  const out = [];
  Object.keys(S.history).forEach(qid => {
    const q = QUESTIONS.find(x => x.id === qid);
    (S.history[qid] || []).forEach(r => out.push({ qid, q, ...r }));
  });
  return out.sort((a, b) => a.ts - b.ts);
}

/** Answers belonging to one exam (a question can serve several). */
/* Answers given WHILE studying this exam.
 *
 * A question can belong to two certifications, so filtering purely by
 * question membership made a CCAR-F drill show up as CCDV-F activity.
 * Answers now carry the exam they were given under; ones recorded before
 * that fall back to membership so old history is not silently dropped. */
function answersFor(exam) {
  return allAnswers().filter(a => {
    if (!a.q) return false;
    if (a.exam) return a.exam === exam;
    return qExams(a.q).includes(exam);
  });
}

/** Counts per quiz mode: how often run, and how it went. */
function modeStats(exam) {
  const out = {};
  S.sessions.filter(s => s.exam === exam).forEach(s => {
    const m = out[s.mode] || (out[s.mode] = { runs: 0, q: 0, correct: 0, ms: 0, timed: 0, best: null, last: 0 });
    m.runs++;
    m.q += s.total || 0;
    m.correct += s.correct || 0;
    if (s.ms) { m.ms += s.ms; m.timed++; }
    if (s.total) {
      const pct = s.correct / s.total;
      if (m.best === null || pct > m.best) m.best = pct;
    }
    if (s.ts > m.last) m.last = s.ts;
  });
  return out;
}

/** Per-domain drill counts, so "how often have I drilled D3" is answerable. */
function drillCounts(exam) {
  const out = {};
  S.sessions.filter(s => s.exam === exam && s.domain).forEach(s => {
    const d = out[s.domain] || (out[s.domain] = { runs: 0, q: 0, correct: 0 });
    d.runs++; d.q += s.total || 0; d.correct += s.correct || 0;
  });
  return out;
}

/** Confidence mix plus a single calibration number.
 *  Calibration = how often your confidence matched the outcome. */
function confStats(list) {
  const mix = { sure: 0, unsure: 0, guess: 0, skip: 0 };
  let scored = 0, sum = 0, matched = 0, rated = 0;
  list.forEach(r => {
    const c = r.conf || 'skip';
    if (mix[c] === undefined) mix[c] = 0;
    mix[c]++;
    if (c !== 'skip') {
      rated++;
      sum += CONF_SCORE[c] ?? 0;
      scored++;
      // "well calibrated" = confident and right, or hedged and wrong
      const confident = c === 'sure';
      if (confident === !!r.correct) matched++;
    }
  });
  return { mix, rated,
           avg: scored ? sum / scored : null,
           calibration: rated ? matched / rated : null };
}

/** Confidence and accuracy per session, oldest first — the graph's series. */
function confTrend(exam) {
  const ans = answersFor(exam);
  if (!ans.length) return [];
  // Group answers into sittings: a gap over 45 minutes starts a new one.
  const GAP = 45 * 60 * 1000;
  const groups = [];
  let cur = null;
  ans.forEach(a => {
    if (!cur || a.ts - cur.end > GAP) { cur = { ts: a.ts, end: a.ts, items: [] }; groups.push(cur); }
    cur.end = a.ts;
    cur.items.push(a);
  });
  return groups.map(g => {
    const c = confStats(g.items);
    const correct = g.items.filter(x => x.correct).length;
    return { ts: g.ts, n: g.items.length,
             acc: correct / g.items.length,
             conf: c.avg, cal: c.calibration };
  });
}

/** Study days, current and longest streak, computed from answer timestamps
 *  rather than the running counter so it survives a missed save. */
function streakStats() {
  const days = [...new Set(allAnswers().map(a => new Date(a.ts).toDateString()))]
    .map(d => new Date(d).getTime()).sort((a, b) => a - b);
  if (!days.length) return { total: 0, best: 0, current: 0 };
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((days[i] - days[i - 1]) / 86400000);
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  const today = new Date().setHours(0, 0, 0, 0);
  const last = new Date(days[days.length - 1]).setHours(0, 0, 0, 0);
  const sinceLast = Math.round((today - last) / 86400000);
  let current = 0;
  if (sinceLast <= 1) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (Math.round((days[i] - days[i - 1]) / 86400000) === 1) current++;
      else break;
    }
  }
  return { total: days.length, best, current };
}

/** The fun ones: busiest day, fastest answer, longest sitting, comeback. */
function funStats(exam) {
  const ans = answersFor(exam);
  if (!ans.length) return null;
  const byDay = {};
  ans.forEach(a => { const k = new Date(a.ts).toDateString(); byDay[k] = (byDay[k] || 0) + 1; });
  const busiest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

  // hour-of-day histogram -> when you actually study
  const hours = new Array(24).fill(0);
  ans.forEach(a => hours[new Date(a.ts).getHours()]++);
  const peakHour = hours.indexOf(Math.max(...hours));

  // longest run of correct answers, ever
  let streak = 0, bestStreak = 0;
  ans.forEach(a => { streak = a.correct ? streak + 1 : 0; if (streak > bestStreak) bestStreak = streak; });

  // questions turned around: first attempt wrong, latest attempt right
  let turned = 0, stillWrong = 0;
  Object.keys(S.history).forEach(qid => {
    const q = QUESTIONS.find(x => x.id === qid);
    if (!q || !qExams(q).includes(exam)) return;
    const h = S.history[qid];
    if (h.length < 2) return;
    if (!h[0].correct && h[h.length - 1].correct) turned++;
    if (!h[h.length - 1].correct) stillWrong++;
  });

  const sessions = S.sessions.filter(s => s.exam === exam);
  const timed = sessions.filter(s => s.ms && s.total);
  const totalMs = timed.reduce((n, s) => n + s.ms, 0);
  const totalQ = timed.reduce((n, s) => n + s.total, 0);

  return {
    answers: ans.length,
    busiestDay: busiest ? { day: busiest[0], n: busiest[1] } : null,
    peakHour, hours,
    bestStreak, turned, stillWrong,
    sessions: sessions.length,
    minutes: Math.round(totalMs / 60000),
    secPerQ: totalQ ? Math.round(totalMs / totalQ / 1000) : null,
  };
}

/** Inline SVG so it needs no library and prints correctly in both themes.
 *  Two series share one 0-100% axis: accuracy, and confidence rescaled from
 *  its -1..+1 range so the two are visually comparable. */
function trendChart(points) {
  const W = 720, H = 210, PL = 38, PR = 14, PT = 14, PB = 26;
  const iw = W - PL - PR, ih = H - PT - PB;
  const NSVG = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NSVG, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('class', 'trendsvg');
  svg.setAttribute('role', 'img');
  const n = points.length;
  const x = i => PL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = v => PT + (1 - v) * ih;
  const mk = (tag, attrs) => {
    const e = document.createElementNS(NSVG, tag);
    Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    return e;
  };
  [0, 0.5, 1].forEach(v => {
    svg.appendChild(mk('line', { x1: PL, x2: W - PR, y1: y(v), y2: y(v), class: 'tgrid' }));
    const t = mk('text', { x: PL - 8, y: y(v) + 4, class: 'taxis', 'text-anchor': 'end' });
    t.textContent = Math.round(v * 100) + '%';
    svg.appendChild(t);
  });
  const path = (vals, cls) => {
    const d = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    svg.appendChild(mk('path', { d: d, class: cls, fill: 'none' }));
  };
  path(points.map(p => p.acc), 'tline tacc');
  path(points.map(p => (p.conf === null ? 0.5 : (p.conf + 1) / 2)), 'tline tconf');
  points.forEach((p, i) => {
    const c = mk('circle', { cx: x(i), cy: y(p.acc), r: 3.4, class: 'tdot tacc' });
    const title = mk('title', {});
    title.textContent = new Date(p.ts).toLocaleDateString()
      + ' — ' + p.n + ' question' + (p.n === 1 ? '' : 's') + ', '
      + Math.round(p.acc * 100) + '% correct';
    c.appendChild(title);
    svg.appendChild(c);
  });
  const lab = (i, anchor) => {
    const t = mk('text', { x: x(i), y: H - 7, class: 'taxis', 'text-anchor': anchor });
    t.textContent = new Date(points[i].ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    svg.appendChild(t);
  };
  lab(0, 'start');
  if (n > 1) lab(n - 1, 'end');
  return svg;
}

/** The analytics block on the Progress page. */
function renderStats(wrap, exam, opts) {
  // The analytics page draws its own headline tiles, so it passes
  // {tiles:false} and keeps only the graph and the per-mode tables.
  const showTiles = !opts || opts.tiles !== false;
  const fun = funStats(exam);
  if (showTiles) wrap.appendChild(el('h2', 'labsec', 'Your numbers'));
  if (!fun) {
    wrap.appendChild(el('p', 'muted', 'Answer a few questions and this fills in.'));
    return;
  }
  const streak = streakStats();
  const ans = answersFor(exam);
  const conf = confStats(ans);

  if (showTiles) {
    const tiles = el('div', 'statgrid');
    const tile = (n, label, note, cls) => {
      const c = el('div', 'statcard ' + (cls || ''));
      c.appendChild(el('div', 'statnum', String(n)));
      c.appendChild(el('div', 'statlabel', label));
      if (note) c.appendChild(el('div', 'muted small', note));
      tiles.appendChild(c);
    };
    tile(fun.answers, 'Questions answered', fun.sessions + ' session' + (fun.sessions === 1 ? '' : 's'));
    tile(streak.current, 'Day streak', streak.best + ' day best · ' + streak.total + ' days studied');
    tile(fun.bestStreak, 'Best run', 'Correct in a row');
    if (fun.minutes) tile(fun.minutes + 'm', 'Time drilling',
      fun.secPerQ ? fun.secPerQ + 's per question' : null);
    if (conf.calibration !== null)
      tile(Math.round(conf.calibration * 100) + '%', 'Calibration',
        'Confidence matched the outcome',
        conf.calibration >= 0.75 ? 'good' : conf.calibration >= 0.5 ? '' : 'warn');
    tile(fun.turned, 'Turned around', 'Wrong first, right now', fun.turned ? 'good' : '');
    if (fun.stillWrong) tile(fun.stillWrong, 'Still missing', 'Latest attempt wrong', 'bad');
    if (fun.busiestDay) tile(fun.busiestDay.n, 'Busiest day',
      new Date(fun.busiestDay.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    wrap.appendChild(tiles);
  }

  const ampm = h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
  wrap.appendChild(el('p', 'muted small statnote',
    'Most of your studying happens around ' + ampm(fun.peakHour) + '.'));

  const trend = confTrend(exam);
  wrap.appendChild(el('h2', 'labsec', 'Accuracy and confidence over time'));
  if (trend.length < 2) {
    wrap.appendChild(el('p', 'muted',
      'One sitting so far — the graph appears once there are two to compare.'));
  } else {
    const box = el('div', 'trendbox');
    const key = el('div', 'tkey');
    const kitem = (cls, text) => {
      const s = el('span', 'tkitem');
      s.appendChild(el('span', 'tswatch ' + cls));
      s.appendChild(el('span', null, text));
      return s;
    };
    key.appendChild(kitem('tacc', 'Accuracy'));
    key.appendChild(kitem('tconf', 'Confidence'));
    box.appendChild(key);
    box.appendChild(trendChart(trend));
    box.appendChild(el('div', 'muted small',
      'Each point is one sitting. Confidence rising alongside accuracy is the '
      + 'pattern you want; confidence running above accuracy means overconfidence.'));
    wrap.appendChild(box);
  }

  const modes = modeStats(exam);
  const keys = Object.keys(modes).sort((a, b) => modes[b].runs - modes[a].runs);
  if (keys.length) {
    wrap.appendChild(el('h2', 'labsec', 'By quiz type'));
    const t = el('table', 'statstable');
    const head = el('tr');
    ['Type', 'Taken', 'Questions', 'Average', 'Best', 'Last'].forEach(h =>
      head.appendChild(el('th', null, h)));
    t.appendChild(head);
    keys.forEach(k => {
      const m = modes[k];
      const tr = el('tr');
      tr.appendChild(el('td', null, MODE_LABEL[k] || k));
      tr.appendChild(el('td', 'num', String(m.runs)));
      tr.appendChild(el('td', 'num', String(m.q)));
      tr.appendChild(el('td', 'num', m.q ? Math.round(m.correct / m.q * 100) + '%' : '—'));
      tr.appendChild(el('td', 'num', m.best === null ? '—' : Math.round(m.best * 100) + '%'));
      tr.appendChild(el('td', 'num muted', m.last
        ? new Date(m.last).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'));
      t.appendChild(tr);
    });
    wrap.appendChild(t);
  }

  const drills = drillCounts(exam);
  if (Object.keys(drills).length) {
    wrap.appendChild(el('h2', 'labsec', 'Domain drills'));
    const t = el('table', 'statstable');
    const head = el('tr');
    ['Domain', 'Drilled', 'Questions', 'Average'].forEach(h => head.appendChild(el('th', null, h)));
    t.appendChild(head);
    EXAMS[exam].domains.forEach(d => {
      const v = drills[d.id];
      if (!v) return;
      const tr = el('tr');
      tr.appendChild(el('td', null, (d.num ? 'D' + d.num + ' · ' : '') + d.name));
      tr.appendChild(el('td', 'num', v.runs + '×'));
      tr.appendChild(el('td', 'num', String(v.q)));
      tr.appendChild(el('td', 'num', v.q ? Math.round(v.correct / v.q * 100) + '%' : '—'));
      t.appendChild(tr);
    });
    wrap.appendChild(t);
    const never = EXAMS[exam].domains.filter(d => !drills[d.id]);
    if (never.length) wrap.appendChild(el('p', 'muted small statnote',
      'Never drilled on its own: ' + never.map(d => d.num ? 'D' + d.num : d.name).join(', ') + '.'));
  }

  if (conf.rated) {
    wrap.appendChild(el('h2', 'labsec', 'How sure you felt'));
    const bar = el('div', 'confmix');
    const order = ['sure', 'unsure', 'guess'];
    order.forEach(k => {
      const v = conf.mix[k] || 0;
      if (!v) return;
      const seg = el('div', 'confseg c-' + k);
      seg.style.flexGrow = String(v);
      seg.title = CONF_LABEL[k] + ': ' + v;
      seg.appendChild(el('span', null, String(v)));
      bar.appendChild(seg);
    });
    wrap.appendChild(bar);
    const legend = el('div', 'conflegend');
    order.forEach(k => {
      const v = conf.mix[k] || 0;
      if (!v) return;
      const s = el('span', 'tkitem');
      s.appendChild(el('span', 'tswatch c-' + k));
      s.appendChild(el('span', null, CONF_LABEL[k] + ' — ' + Math.round(v / conf.rated * 100) + '%'));
      legend.appendChild(s);
    });
    wrap.appendChild(legend);
  }
}

/* ---------- analytics page ----------
 * A dedicated view over everything recorded: quizzes, flashcards, notes and
 * labs. Progress answers "am I ready"; this answers "how have I been
 * studying". All of it is derived, so nothing new has to be collected.
 */

/** Flashcard spacing: how the deck is distributed across Leitner boxes. */
function cardStats(exam) {
  const deck = CARDS.filter(c => c.exam === exam);
  const boxes = [0, 0, 0, 0, 0];
  let started = 0, due = 0;
  const now = Date.now();
  deck.forEach(c => {
    const k = cardKey(c);
    const st = S.cards[k];
    if (!st) return;
    started++;
    boxes[Math.min(5, Math.max(1, st.box)) - 1]++;
    if (now - st.ts >= (BOX_DAYS[st.box] || 0) * 86400000) due++;
  });
  return { total: deck.length, started, boxes, due,
           mature: boxes[3] + boxes[4] };
}

/** Reading coverage: which notes have been opened, and the time they claim. */
function noteStats(exam) {
  const notes = NOTES.filter(n => n.exam === exam);
  const read = notes.filter(n => hasRead(exam, n.d));
  const mins = notes.reduce((a, n) => a + (n.mins || 0), 0);
  const readMins = read.reduce((a, n) => a + (n.mins || 0), 0);
  return { total: notes.length, read: read.length, mins, readMins };
}

/** Lab progress across the labs that apply to this exam. */
function labStats(exam) {
  const labs = LABS.filter(l => l.exams.includes(exam));
  let done = 0, cps = 0, cpTotal = 0, touched = 0;
  labs.forEach(l => {
    const st = S.labs[l.id] || { checkpoints: {} };
    const hit = Object.values(st.checkpoints || {}).filter(Boolean).length;
    cpTotal += l.checkpoints.length;
    cps += hit;
    if (hit) touched++;
    if (st.done || (l.checkpoints.length && hit === l.checkpoints.length)) done++;
  });
  return { total: labs.length, done, touched, cps, cpTotal };
}

/** Per-domain rollup used by the coverage table. */
function domainRollup(exam) {
  const drills = drillCounts(exam);
  return EXAMS[exam].domains.map(d => {
    const m = domainMastery(exam, d.id);
    const note = NOTES.find(n => n.exam === exam && n.d === d.id);
    return {
      d, m,
      drills: (drills[d.id] || {}).runs || 0,
      read: note ? hasRead(exam, d.id) : null,
      // what this domain costs you if it stays weak, in scaled-score points
      gap: d.weight * (1 - (m.score === null ? 0 : m.score) * m.coverage),
    };
  });
}

/** A horizontal bar, 0..1, with its own label. Used for coverage rows. */
function meter(frac, cls) {
  const outer = el('div', 'meter');
  const inner = el('div', 'meterfill ' + (cls || ''));
  inner.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
  outer.appendChild(inner);
  return outer;
}

/** Answers per day for the last N days — the activity strip. */
function activityDays(exam, days) {
  const out = [];
  const ans = answersFor(exam);
  const byDay = {};
  ans.forEach(a => {
    const k = new Date(a.ts).setHours(0, 0, 0, 0);
    byDay[k] = (byDay[k] || 0) + 1;
  });
  const today = new Date().setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const ts = today - i * 86400000;
    out.push({ ts, n: byDay[ts] || 0 });
  }
  return out;
}

/* The four certifications side by side: answers, coverage, projected score,
   sessions and fee. Doubles as the pathway Progress used to show as cards,
   and as the switcher — selecting a row changes the studied exam. It opens
   the page because it is the only cross-exam thing here; everything below
   describes whichever one is selected. */
function renderAllCerts(wrap) {
  const exam = S.exam;
  /* A read-only comparison of the four certifications, opening the page
     because it is the only cross-exam thing here. The tab strip below it
     is the switcher — this used to be clickable too, which meant two
     controls doing one job. Simplified to match: no level bands, no
     recommended-experience line, just the figures that compare. */
  wrap.appendChild(el('h2', 'labsec', 'All certifications'));

  const all = el('table', 'statstable certtable');
  const ah = el('tr');
  ['Certification', 'Answers', 'Covered', 'Projected', 'Sessions', 'Fee'].forEach(h =>
    ah.appendChild(el('th', null, h)));
  all.appendChild(ah);

  EXAM_ORDER.forEach(code => {
    const rr = readiness(code);
    const na = answersFor(code).length;
    const ns = S.sessions.filter(s => s.exam === code).length;
    const tr = el('tr');

    const c1 = el('td');
    c1.appendChild(el('div', 'certcode', code));
    c1.appendChild(el('div', 'muted small', EXAMS[code].name));
    tr.appendChild(c1);

    tr.appendChild(el('td', 'num', String(na)));
    // Coverage credits shared questions: a question tagged to two
    // certifications means drilling one genuinely covers part of the other.
    // Say so, rather than showing a bare figure for an exam you never opened.
    const cov = el('td', 'num', Math.round(rr.coverage * 100) + '%');
    if (!na && rr.coverage > 0) {
      cov.classList.add('viashared');
      cov.title = 'From questions shared with another certification you have studied';
    }
    tr.appendChild(cov);
    const proj = el('td', 'num', rr.coverage >= 0.08 ? String(rr.scaled) : '—');
    if (!na && rr.coverage >= 0.08) {
      proj.classList.add('viashared');
      proj.title = 'Projected from shared questions only — you have not drilled this exam directly';
    }
    tr.appendChild(proj);
    tr.appendChild(el('td', 'num', String(ns)));
    tr.appendChild(el('td', 'num', EXAMS[code].fee || ''));
    if (code === exam) tr.className = 'rowon';
    all.appendChild(tr);
  });
  wrap.appendChild(all);

  // Explain the marker, but only when something is actually marked.
  const anyShared = EXAM_ORDER.some(code =>
    !answersFor(code).length && readiness(code).coverage > 0);
  /* Count the overlap rather than stating it: the figure was written in by
     hand once and the bank has moved since. */
  const shared = QUESTIONS.filter(q => {
    const e = qExams(q);
    return e.includes('CCAR-F') && e.includes('CCDV-F');
  }).length;
  if (anyShared) wrap.appendChild(el('p', 'muted small statnote',
    '* Covered and projected from questions shared with a certification you '
    + 'have studied. ' + shared + ' question' + (shared === 1 ? '' : 's')
    + ' appear in both CCAR-F and CCDV-F.'));
}

function renderAnalytics() {
  const wrap = $('#statsBody');
  if (!wrap) return;
  wrap.innerHTML = '';
  const exam = S.exam;
  const ex = EXAMS[exam];

  // The cross-exam comparison comes first: it is how you pick which
  // certification the rest of the page is about.
  renderAllCerts(wrap);

  // Which certification the rest of the page describes. This is the only
  // switcher now — the table above it is read-only reference.
  const head = el('div', 'statshead');
  head.appendChild(el('span', 'statslabel', 'Showing'));
  const pick = el('div', 'statstabs');
  pick.setAttribute('role', 'tablist');
  pick.setAttribute('aria-label', 'Certification to show statistics for');
  EXAM_ORDER.forEach(code => {
    const on = code === exam;
    const b = el('button', 'statstab' + (on ? ' on' : ''), code);
    b.type = 'button';
    b.title = EXAMS[code].name;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(on));
    b.onclick = () => { S.exam = code; save(); examPicker(); renderAnalytics(); };
    pick.appendChild(b);
  });
  head.appendChild(pick);
  wrap.appendChild(head);

  const fun = funStats(exam);
  if (!fun) {
    const empty = el('div', 'emptybox');
    empty.appendChild(el('strong', null, 'Nothing recorded for ' + exam + ' yet'));
    empty.appendChild(el('div', 'muted small',
      'Answer a few questions and this page fills in: pace, accuracy, '
      + 'confidence over time, and which domains you have actually covered.'));
    const b = el('button', 'mini', 'Start a quick mock');
    b.onclick = () => startQuiz('quick');
    empty.appendChild(b);
    wrap.appendChild(empty);
    return;
  }

  const r = readiness(exam);
  const streak = streakStats();
  const conf = confStats(answersFor(exam));
  const cards = cardStats(exam);
  const notes = noteStats(exam);
  const labs = labStats(exam);

  /* ---- at a glance ---- */
  const tiles = el('div', 'statgrid');
  const tile = (n, label, note, cls) => {
    const c = el('div', 'statcard ' + (cls || ''));
    c.appendChild(el('div', 'statnum', String(n)));
    c.appendChild(el('div', 'statlabel', label));
    if (note) c.appendChild(el('div', 'muted small', note));
    tiles.appendChild(c);
  };
  const started = r.coverage >= 0.08;
  tile(started ? r.scaled : '—', 'Projected score',
    'Pass mark ' + PASS_MARK + (started ? '' : ' · answer more to project'),
    !started ? '' : r.scaled >= PASS_MARK ? 'good' : r.scaled >= PASS_MARK - 80 ? 'warn' : 'bad');
  tile(Math.round(r.coverage * 100) + '%', 'Bank covered',
    fun.answers + ' answers over ' + fun.sessions + ' session' + (fun.sessions === 1 ? '' : 's'));
  tile(streak.current, 'Day streak',
    streak.best + ' best · ' + streak.total + ' day' + (streak.total === 1 ? '' : 's') + ' studied');
  if (conf.calibration !== null)
    tile(Math.round(conf.calibration * 100) + '%', 'Calibration',
      'Confidence matched the outcome',
      conf.calibration >= 0.75 ? 'good' : conf.calibration >= 0.5 ? '' : 'warn');
  if (fun.minutes) tile(fun.minutes + 'm', 'Time in quizzes',
    fun.secPerQ ? fun.secPerQ + 's per question' : null);
  tile(fun.bestStreak, 'Best run', 'Correct in a row');
  tile(fun.turned, 'Turned around', 'Wrong first, right now', fun.turned ? 'good' : '');
  if (fun.stillWrong) tile(fun.stillWrong, 'Still missing', 'Latest attempt wrong', 'bad');
  wrap.appendChild(tiles);

  /* ---- activity strip ---- */
  const act = activityDays(exam, 30);
  const busiest = Math.max(1, ...act.map(a => a.n));
  if (act.some(a => a.n)) {
    wrap.appendChild(el('h2', 'labsec', 'Last 30 days'));
    const strip = el('div', 'actstrip');
    act.forEach(a => {
      const cell = el('div', 'actcell' + (a.n ? ' hit' : ''));
      if (a.n) cell.style.opacity = String(0.35 + 0.65 * (a.n / busiest));
      const d = new Date(a.ts);
      cell.title = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        + ' — ' + (a.n ? a.n + ' answer' + (a.n === 1 ? '' : 's') : 'nothing');
      strip.appendChild(cell);
    });
    wrap.appendChild(strip);
    const studied = act.filter(a => a.n).length;
    wrap.appendChild(el('p', 'muted small statnote',
      'Studied on ' + studied + ' of the last 30 days. Busiest: '
      + busiest + ' answers in a day.'));
  }

  /* ---- the trend graph and per-mode tables (shared with Progress) ---- */
  renderStats(wrap, exam, { tiles: false });

  // How often each question has come up, per pool.
  renderExposure(wrap, exam);

  /* ---- domain coverage ---- */
  wrap.appendChild(el('h2', 'labsec', 'Coverage by domain'));
  const roll = domainRollup(exam);
  const t = el('table', 'statstable');
  const hrow = el('tr');
  ['Domain', 'Weight', 'Covered', 'Mastery', 'Drills', 'Notes'].forEach(h =>
    hrow.appendChild(el('th', null, h)));
  t.appendChild(hrow);
  roll.forEach(x => {
    const tr = el('tr');
    const name = el('td');
    name.appendChild(el('div', null, (x.d.num ? 'D' + x.d.num + ' · ' : '') + x.d.name));
    tr.appendChild(name);
    const wcell = el('td', 'num muted', x.d.weight + '%');
    wcell.title = x.d.weight + '% of the exam blueprint.';
    tr.appendChild(wcell);
    const cov = el('td', 'num');
    cov.appendChild(el('div', 'mnum', Math.round(x.m.coverage * 100) + '%'));
    cov.appendChild(meter(x.m.coverage));
    /* Name the drill pool underneath. Without it, a domain drilled to the
       last question still shows well short of 100% — the remainder sits in
       the held-out pool — and that read as questions never being served. */
    cov.appendChild(el('div', 'muted small',
      'drills ' + x.m.drill.answered + '/' + x.m.drill.total));
    cov.title = x.m.answered + ' of ' + x.m.total
      + ' questions in this domain attempted at least once. '
      + x.m.drill.answered + ' of the ' + x.m.drill.total + ' that the domain '
      + 'drill serves; the rest come up in '
      + (simAvailable(exam) ? 'the quick quiz.' : 'the mock exams.');
    tr.appendChild(cov);
    const mas = el('td', 'num');
    mas.title = x.m.score === null
      ? 'No answers in this domain yet.'
      : 'Mastery across the ' + x.m.answered + ' questions you have attempted, '
        + 'weighted toward recent answers and adjusted for confidence.';
    if (x.m.score === null) mas.appendChild(el('span', 'muted', '—'));
    else {
      mas.appendChild(el('div', 'mnum', Math.round(x.m.score * 100) + '%'));
      mas.appendChild(meter(x.m.score, x.m.score >= 0.8 ? 'good' : x.m.score >= 0.6 ? 'warn' : 'bad'));
    }
    tr.appendChild(mas);
    tr.appendChild(el('td', 'num', x.drills ? x.drills + '×' : '—'));
    tr.appendChild(el('td', 'num', x.read === null ? '—' : (x.read ? 'read' : 'unread')));
    t.appendChild(tr);
  });
  wrap.appendChild(t);

  // Where the remaining points actually are, so study time goes to the
  // domain that costs the most rather than the one that feels worst.
  const worst = roll.slice().sort((a, b) => b.gap - a.gap).filter(x => x.gap > 0.5)[0];
  if (worst) wrap.appendChild(el('p', 'muted small statnote',
    'Biggest remaining gain: ' + (worst.d.num ? 'D' + worst.d.num + ' · ' : '')
    + worst.d.name + ', worth about ' + Math.round(worst.gap * 9) + ' scaled points.'));

  /* ---- study material beyond quizzes ---- */
  wrap.appendChild(el('h2', 'labsec', 'Study material'));
  const mat = el('div', 'matgrid');
  const matcard = (title, frac, main, sub) => {
    const c = el('div', 'matcard');
    c.appendChild(el('div', 'statlabel', title));
    c.appendChild(el('div', 'mnum', main));
    c.appendChild(meter(frac));
    if (sub) c.appendChild(el('div', 'muted small', sub));
    mat.appendChild(c);
  };
  matcard('Notes read', notes.total ? notes.read / notes.total : 0,
    notes.read + ' / ' + notes.total,
    notes.mins ? notes.readMins + ' of ' + notes.mins + ' min of reading' : null);
  matcard('Flashcards started', cards.total ? cards.started / cards.total : 0,
    cards.started + ' / ' + cards.total,
    cards.due ? cards.due + ' due for review' : 'nothing due');
  matcard('Cards well known', cards.total ? cards.mature / cards.total : 0,
    String(cards.mature),
    'in the 7- and 21-day boxes');
  matcard('Lab checkpoints', labs.cpTotal ? labs.cps / labs.cpTotal : 0,
    labs.cps + ' / ' + labs.cpTotal,
    labs.done + ' of ' + labs.total + ' labs finished');
  wrap.appendChild(mat);

  // Leitner distribution, if the deck has been touched at all
  if (cards.started) {
    const box = el('div', 'boxrow');
    cards.boxes.forEach((n, i) => {
      const b = el('div', 'boxcell');
      b.appendChild(el('div', 'boxnum', String(n)));
      b.appendChild(el('div', 'muted small', 'Box ' + (i + 1)));
      b.appendChild(el('div', 'muted small', BOX_DAYS[i + 1] ? BOX_DAYS[i + 1] + 'd' : 'new'));
      box.appendChild(b);
    });
    wrap.appendChild(box);
    wrap.appendChild(el('p', 'muted small statnote',
      'A card moves up a box when you get it right and back to box 1 when you '
      + 'do not. Higher boxes come round less often.'));
  }

  /* ---- session log ---- */
  const recent = S.sessions.filter(s => s.exam === exam).slice(-20).reverse();
  if (recent.length) {
    wrap.appendChild(el('h2', 'labsec', 'Session log'));
    const log = el('table', 'statstable');
    const lh = el('tr');
    ['When', 'Type', 'Score', 'Result'].forEach(h => lh.appendChild(el('th', null, h)));
    log.appendChild(lh);
    recent.forEach(s => {
      const tr = el('tr');
      const d = new Date(s.ts);
      const c1 = el('td');
      c1.appendChild(el('div', null, d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })));
      c1.appendChild(el('div', 'muted small', d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
      tr.appendChild(c1);
      const c2 = el('td');
      c2.appendChild(el('div', null, MODE_LABEL[s.mode] || s.mode));
      // Which domain was drilled, where the session recorded one. Rows from
      // before that field existed simply have no subtitle.
      const sub = [];
      let full = null;
      if (s.domain) {
        const sd = EXAMS[exam].domains.find(x => x.id === s.domain);
        if (sd) {
          // The number is the useful part in a narrow column; the full name
          // would be up to 61 characters and crowd the score columns.
          sub.push(sd.num ? 'D' + sd.num : sd.name);
          full = (sd.num ? 'D' + sd.num + ' · ' : '') + sd.name;
        }
      }
      if (s.ms) sub.push(Math.round(s.ms / 60000) + ' min');
      if (sub.length) {
        const line = el('div', 'muted small', sub.join(' · '));
        if (full) line.title = full;
        c2.appendChild(line);
      }
      tr.appendChild(c2);
      tr.appendChild(el('td', 'num', s.total ? s.correct + ' / ' + s.total : '—'));
      const c4 = el('td', 'num');
      if (s.scaled !== undefined && s.scaled !== null) {
        const tag = el('span', 'tag ' + (s.scaled >= PASS_MARK ? 'good' : 'warn'));
        tag.textContent = s.scaled + (s.scaled >= PASS_MARK ? ' pass' : ' below');
        c4.appendChild(tag);
      } else if (s.total) {
        c4.appendChild(el('span', 'muted', Math.round(s.correct / s.total * 100) + '%'));
      }
      tr.appendChild(c4);
      log.appendChild(tr);
    });
    wrap.appendChild(log);
  }

  // Last on the page, after everything it would erase. The selected exam
  // only — wiping every certification is on Settings.
  renderExamReset(wrap);
}

/* ---------- per-question history ----------
 * Every attempt already records {correct, conf, ts}, so a question's own
 * track record is available for free. Shown after you rate confidence, so
 * the attempt you just made is part of it.
 */

/** One attempt as a value in 0..1, matching how statsFor weighs confidence:
 *  confidently wrong is worse than a flagged guess that happened to be right. */
function attemptValue(rec) {
  if (!rec.correct) return rec.conf === 'sure' ? 0 : 0.12;   // confidently wrong is the floor
  if (rec.conf === 'guess') return 0.45;
  if (rec.conf === 'unsure') return 0.75;
  return 1;                                                  // correct and sure
}

const ATTEMPT_LABEL = {
  sure:   { right: 'Correct, confident',  wrong: 'Wrong, and you were sure' },
  unsure: { right: 'Correct but unsure',  wrong: 'Wrong, and unsure' },
  guess:  { right: 'Correct on a guess',  wrong: 'Wrong, guessed' },
  skip:   { right: 'Correct',             wrong: 'Wrong' },
};

function attemptLabel(rec) {
  const row = ATTEMPT_LABEL[rec.conf] || ATTEMPT_LABEL.skip;
  return rec.correct ? row.right : row.wrong;
}

/** How long ago, in words short enough for a chip. */
function agoShort(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.round(h / 24);
  if (d < 30) return d + 'd ago';
  return Math.round(d / 30) + 'mo ago';
}

/** A question's attempt history: one dot per attempt, oldest left.
 *  Returns null when there is nothing worth drawing. */
function questionHistory(qid) {
  const h = (S.history[qid] || []);
  if (h.length < 2) return null;        // one attempt is not a trend

  const box = el('details', 'qhist');
  box.open = false;
  const sum = el('summary');
  const st = statsFor(qid);
  sum.appendChild(el('span', 'qhlabel', `This question: ${h.length} attempts`));

  // A compact read of the direction, so the summary is useful unopened.
  const first = attemptValue(h[0]), last = attemptValue(h[h.length - 1]);
  const dir = last > first + 0.1 ? { t: 'improving', c: 'good' }
            : last < first - 0.1 ? { t: 'slipping', c: 'bad' }
            : { t: 'steady', c: '' };
  sum.appendChild(el('span', 'qhtag ' + dir.c, dir.t));
  sum.appendChild(el('span', 'qhscore', Math.round(st.score * 100) + '%'));
  box.appendChild(sum);

  const body = el('div', 'qhbody');

  // The track: one dot per attempt, sized by how well it went.
  const track = el('div', 'qhtrack');
  h.forEach((rec, i) => {
    const v = attemptValue(rec);
    const dot = el('div', 'qhdot'
      + (rec.correct ? ' right' : ' wrong')
      + (!rec.correct && rec.conf === 'sure' ? ' blind' : '')
      + (rec.correct && rec.conf === 'guess' ? ' lucky' : ''));
    dot.style.setProperty('--v', String(v));
    dot.title = `Attempt ${i + 1} · ${attemptLabel(rec)} · ${agoShort(rec.ts)}`;
    track.appendChild(dot);
  });
  body.appendChild(track);

  const scale = el('div', 'qhscale');
  scale.appendChild(el('span', null, 'first attempt'));
  scale.appendChild(el('span', null, 'latest'));
  body.appendChild(scale);

  // Spell the last few out, since the dots alone do not say what went wrong.
  const list = el('div', 'qhlist');
  h.slice(-5).reverse().forEach(rec => {
    const row = el('div', 'qhrow');
    row.appendChild(el('span', 'qhmark ' + (rec.correct ? 'right' : 'wrong'),
      rec.correct ? '✓' : '✗'));
    row.appendChild(el('span', 'qhwhat', attemptLabel(rec)));
    row.appendChild(el('span', 'muted small', agoShort(rec.ts)));
    list.appendChild(row);
  });
  body.appendChild(list);

  // The one observation worth drawing out, when there is one.
  const note = questionHistoryNote(h);
  if (note) body.appendChild(el('div', 'qhnote', note));

  box.appendChild(body);
  return box;
}

/** A sentence about the pattern, or null when the history says nothing
 *  beyond what the dots already show. */
function questionHistoryNote(h) {
  const last = h[h.length - 1];
  const blind = h.filter(r => !r.correct && r.conf === 'sure').length;
  const lucky = h.filter(r => r.correct && r.conf === 'guess').length;

  // Right now but previously confidently wrong: the belief was the problem.
  if (last.correct && blind > 0)
    return 'You were confidently wrong on this ' + blind + (blind === 1 ? ' time' : ' times')
      + ' before. Worth re-reading the explanation rather than trusting the streak.';
  if (!last.correct && last.conf === 'sure')
    return 'Wrong while confident — the highest-value kind of mistake to chase down, '
      + 'because nothing felt uncertain at the time.';
  if (lucky >= 2 && last.correct)
    return 'Several of these were guesses that happened to land. The score flatters '
      + 'what you actually know here.';
  // Wrong, then right, with no confident errors: ordinary learning.
  if (last.correct && h.some(r => !r.correct) && blind === 0)
    return 'Missed earlier, right now — this one looks learned.';
  return null;
}

/* ---------- exposure chart ----------
 * How many questions have you seen once, twice, three times…, and of those,
 * how many do you currently get right? Answers the question a coverage
 * percentage cannot: whether the bank is being worked evenly or whether a
 * handful of questions absorb all the repetition.
 *
 * A bar is split by the LATEST attempt rather than a lifetime ratio, because
 * what matters is whether you know it now.
 */
function exposureData(exam, held) {
  // 'any' so the chart accounts for the hard tier too: these are questions
  // you can be asked, and leaving them out would understate the bank.
  const pool = poolFor(exam, { held: !!held, hard: 'any' });
  const buckets = [];                       // index = times asked
  pool.forEach(q => {
    const h = (S.history[q.id] || []).filter(r =>
      r.exam ? r.exam === exam : true);
    const n = h.length;
    const b = buckets[n] || (buckets[n] = { n, right: 0, wrong: 0, total: 0 });
    b.total++;
    if (!n) return;
    if (h[h.length - 1].correct) b.right++; else b.wrong++;
  });
  // collapse the long tail: anything past 6 attempts is "7+"
  const CAP = 6;
  const out = [];
  for (let i = 0; i <= CAP; i++) out.push(buckets[i] || { n: i, right: 0, wrong: 0, total: 0 });
  const tail = { n: CAP + 1, right: 0, wrong: 0, total: 0, tail: true };
  buckets.forEach(b => { if (b && b.n > CAP) { tail.right += b.right; tail.wrong += b.wrong; tail.total += b.total; } });
  if (tail.total) out.push(tail);
  return out;
}

/* The Exam Simulation bank, counted the same way.
 *
 * Its answers don't live in S.history: a sitting records them in
 * S.simAttempts[].answers, keyed by question id, and the two pools are
 * deliberately kept apart so drilling can't move a simulation score. That
 * means this needs its own tally rather than reusing exposureData() — but it
 * produces the identical bucket shape, so exposureChart() renders it unchanged.
 *
 * "Times asked" is how many sittings included the question, and right/wrong
 * follows the most recent sitting that asked it. SIM_QUESTIONS is only
 * defined once the simulation data files are loaded, so callers check
 * simAvailable() first.
 */
function simExposureData(exam) {
  if (typeof SIM_QUESTIONS === 'undefined') return [];
  const ex = exam || S.exam;
  const asked = {};                 // qid -> {n, lastTs, lastOk}
  (S.simAttempts || []).forEach(a => {
    if (a.exam !== ex || !a.answers) return;
    Object.keys(a.answers).forEach(qid => {
      const rec = asked[qid] || (asked[qid] = { n: 0, lastTs: -1, lastOk: false });
      rec.n++;
      // Attempts are pushed in order, but sort defensively on the timestamp
      // rather than trusting array position.
      if (a.ts >= rec.lastTs) { rec.lastTs = a.ts; rec.lastOk = !!a.answers[qid].ok; }
    });
  });

  const buckets = [];
  SIM_QUESTIONS.filter(q => q.exam === ex).forEach(q => {
    const rec = asked[q.id];
    const n = rec ? rec.n : 0;
    const b = buckets[n] || (buckets[n] = { n, right: 0, wrong: 0, total: 0 });
    b.total++;
    if (!n) return;
    if (rec.lastOk) b.right++; else b.wrong++;
  });

  // Same tail collapse as the drill pools, so the three charts share an x-axis.
  const CAP = 6;
  const out = [];
  for (let i = 0; i <= CAP; i++) out.push(buckets[i] || { n: i, right: 0, wrong: 0, total: 0 });
  const tail = { n: CAP + 1, right: 0, wrong: 0, total: 0, tail: true };
  buckets.forEach(b => { if (b && b.n > CAP) { tail.right += b.right; tail.wrong += b.wrong; tail.total += b.total; } });
  if (tail.total) out.push(tail);
  return out;
}

/* Does this certification have a simulation bank behind it?
 *
 * The single gate for everything the simulation drives: the nav entry, the
 * analytics exposure chart, and which quiz modes the dashboard offers. It
 * asks the data rather than naming an exam, so a bank imported for another
 * certification lights all of them up at once with no code change — and an
 * exam without one keeps the modes it has today.
 */
function simAvailable(exam) {
  return typeof SIM_QUESTIONS !== 'undefined'
    && SIM_QUESTIONS.some(q => q.exam === exam);
}
/* Kept as the name the exposure chart calls; one concept, one implementation. */
function simExposureAvailable(exam) { return simAvailable(exam); }

/** Stacked bars: question count by number of times asked, split right/wrong.
 *
 * `unit` names what the x-axis counts. The drill pools count individual
 * answers, but a simulation question is asked once per sitting, so calling
 * that "times asked" would overstate what a bar means. Defaults to the
 * drill wording so existing callers are unchanged.
 */
function exposureChart(data, unit) {
  const U = unit || { axis: 'times asked', one: 'time', many: 'times', prep: '' };
  const W = 720, H = 220, PL = 42, PR = 12, PT = 14, PB = 42;
  const iw = W - PL - PR, ih = H - PT - PB;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('class', 'expsvg');
  svg.setAttribute('role', 'img');
  const mk = (t, a) => {
    const e = document.createElementNS(NS, t);
    Object.keys(a).forEach(k => e.setAttribute(k, a[k]));
    return e;
  };

  const max = Math.max(1, ...data.map(d => d.total));
  // a round number above the tallest bar, so the axis reads cleanly
  const step = max <= 5 ? 1 : max <= 20 ? 5 : max <= 60 ? 10 : 25;
  const top = Math.ceil(max / step) * step;
  const y = v => PT + ih - (v / top) * ih;
  const bw = iw / data.length;
  const barW = Math.min(54, bw * 0.62);

  // gridlines and the count axis
  for (let v = 0; v <= top; v += step) {
    svg.appendChild(mk('line', { x1: PL, x2: W - PR, y1: y(v), y2: y(v), class: 'egrid' }));
    const t = mk('text', { x: PL - 8, y: y(v) + 4, class: 'eaxis', 'text-anchor': 'end' });
    t.textContent = String(v);
    svg.appendChild(t);
  }

  data.forEach((d, i) => {
    const cx = PL + bw * i + bw / 2;
    const x = cx - barW / 2;
    // unanswered sit in their own column, drawn flat so they read as absence
    const parts = d.n === 0
      ? [{ v: d.total, cls: 'eunseen' }]
      : [{ v: d.wrong, cls: 'ewrong' }, { v: d.right, cls: 'eright' }];
    let acc = 0;
    parts.forEach(p => {
      if (!p.v) return;
      const h = (p.v / top) * ih;
      svg.appendChild(mk('rect', { x, y: y(acc) - h, width: barW, height: h, class: 'ebar ' + p.cls }));
      acc += p.v;
    });
    // total above the bar, so a short bar is still readable
    if (d.total) {
      const lab = mk('text', { x: cx, y: y(d.total) - 6, class: 'ecount', 'text-anchor': 'middle' });
      lab.textContent = String(d.total);
      svg.appendChild(lab);
    }
    const tick = mk('text', { x: cx, y: H - 22, class: 'eaxis', 'text-anchor': 'middle' });
    tick.textContent = d.tail ? d.n + '+' : String(d.n);
    svg.appendChild(tick);

    const title = mk('title', {});
    title.textContent = d.n === 0
      ? d.total + ' question' + (d.total === 1 ? '' : 's') + ' never asked'
      : d.total + ' question' + (d.total === 1 ? '' : 's') + ' asked '
        + (U.prep || '')
        + (d.tail ? d.n + ' or more ' + U.many : d.n + ' ' + (d.n === 1 ? U.one : U.many))
        + ' — ' + d.right + ' right now, ' + d.wrong + ' wrong';
    svg.appendChild(title);
  });

  const xl = mk('text', { x: PL + iw / 2, y: H - 5, class: 'eaxis', 'text-anchor': 'middle' });
  xl.textContent = U.axis;
  svg.appendChild(xl);
  return svg;
}

/** One chart per pool, with a legend and a one-line read of what it shows. */
function renderExposure(wrap, exam) {
  /* What serves each pool depends on whether this certification has a
     simulation. Where it does, the held-out pool is no longer reserved —
     the recall sittings it was protected for have been retired — so the
     quick quiz draws from it alongside the drill pool. */
  const simHere = simAvailable(exam);
  const sets = [
    { held: false, title: 'Drill questions',
      note: 'Served by quick quizzes, domain drills and weak-area drills.' },
    { held: true,  title: 'Held-out questions',
      note: simHere ? 'Served by the quick quiz, alongside the drill pool.'
                    : 'Reserved for the full-length practice and the timed mock.' },
  ];
  const hasSim = simExposureAvailable(exam);
  const any = sets.some(s => poolFor(exam, { held: s.held, hard: 'any' }).length) || hasSim;
  if (!any) return;

  wrap.appendChild(el('h2', 'labsec', 'Question exposure'));
  wrap.appendChild(el('p', 'muted small statnote',
    'How often each question has come up, and whether you get it right now. '
    + 'A tall bar at zero means most of the bank is still untouched; a long '
    + 'tail means a few questions are absorbing the repetition. Each bank is '
    + 'counted separately, because each holds different questions.'));

  const key = el('div', 'tkey');
  const kitem = (cls, text) => {
    const s = el('span', 'tkitem');
    s.appendChild(el('span', 'eswatch ' + cls));
    s.appendChild(el('span', null, text));
    return s;
  };
  key.appendChild(kitem('eright', 'Right on the latest attempt'));
  key.appendChild(kitem('ewrong', 'Wrong on the latest attempt'));
  key.appendChild(kitem('eunseen', 'Never asked'));
  wrap.appendChild(key);

  /* One box per pool, built the same way whichever pool it is: a title, how
     much of the bank has been seen, a note saying what serves it, and the
     chart. The simulation pool differs only in where its counts come from. */
  const box = (title, note, total, data, unit) => {
    const b = el('div', 'expbox');
    const head = el('div', 'exphead');
    head.appendChild(el('strong', null, title));
    const seen = total - (data[0] ? data[0].total : 0);
    head.appendChild(el('span', 'muted small', seen + ' of ' + total + ' seen'));
    b.appendChild(head);
    b.appendChild(el('div', 'muted small', note));
    b.appendChild(exposureChart(data, unit));
    wrap.appendChild(b);
  };

  sets.forEach(s => {
    const pool = poolFor(exam, { held: s.held, hard: 'any' });
    if (!pool.length) return;
    box(s.title, s.note, pool.length, exposureData(exam, s.held));
  });

  /* The Exam Simulation bank is a third pool, and a separate one: its
     questions are never served by a drill, and "times asked" here counts
     sittings rather than individual answers. */
  if (hasSim) {
    box('Exam Simulation questions',
        'Drawn by a simulation sitting or an objective drill. Counted per '
        + 'sitting, and scored from the most recent sitting that asked it.',
        SIM_QUESTIONS.filter(q => q.exam === exam).length, simExposureData(exam),
        { axis: 'sittings', one: 'sitting', many: 'sittings', prep: 'in ' });
  }
}

/* ---------- study notes ---------- */
function noteFor(exam, domId) { return NOTES.find(n => n.exam === exam && n.d === domId); }
function hasRead(exam, domId) { return !!S.read[exam + '/' + domId]; }
function markRead(exam, domId) { S.read[exam + '/' + domId] = Date.now(); save(); }

/* ---------- read notes aloud ---------- */
/* Uses the browser's built-in speech synthesis: no API, no dependency, works
   offline from file://. The work is in turning a note into something worth
   listening to — tables and code read terribly unless handled deliberately. */

/** Strip markup and expand the shorthand that doesn't survive being spoken. */
function speakable(html) {
  let t = String(html)
    .replace(/<code>(.*?)<\/code>/gi, ' $1 ')
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    .replace(/<em>(.*?)<\/em>/gi, '$1')
    .replace(/<[^>]+>/g, ' ');
  // entities and symbols that are read as nothing, or as the wrong thing
  t = t.replace(/&lt;/g, 'less than ').replace(/&gt;/g, 'greater than ')
       .replace(/&amp;/g, ' and ').replace(/&nbsp;/g, ' ')
       .replace(/&minus;/g, ' minus ').replace(/&larr;/g, ' back ')
       .replace(/&rarr;/g, ' then ')
       .replace(/→/g, ' then ')          // →
       .replace(/—|–/g, ', ')       // em/en dash as a pause
       .replace(/·/g, ', ')              // ·
       .replace(/✓/g, ' done ')          // ✓
       .replace(/ & /g, ' and ');             // bare ampersand reads inconsistently
  // identifiers that read badly letter-by-letter or run together
  t = t.replace(/\btool_use\b/g, 'tool use')
       .replace(/\bend_turn\b/g, 'end turn')
       .replace(/\bstop_reason\b/g, 'stop reason')
       .replace(/\bmax_tokens\b/g, 'max tokens')
       .replace(/\btool_result\b/g, 'tool result')
       .replace(/\btool_choice\b/g, 'tool choice')
       .replace(/\binput_schema\b/g, 'input schema')
       .replace(/\bCLAUDE\.md\b/g, 'CLAUDE dot M D')
       .replace(/\.mcp\.json\b/g, 'dot M C P dot json')
       .replace(/\bMCP\b/g, 'M C P')
       .replace(/\bAPI\b/g, 'A P I')
       .replace(/\bCI\/CD\b/g, 'C I C D')
       .replace(/\bJSON\b/g, 'Jason')
       .replace(/\bD(\d)\b/g, 'Domain $1');
  return t.replace(/\s+/g, ' ').trim();
}

/** Flatten a note into an ordered list of spoken segments. */
function noteToSpeech(exam, domId) {
  const n = noteFor(exam, domId);
  if (!n) return [];
  const d = EXAMS[exam].domains.find(x => x.id === domId);
  const out = [];
  // `key` ties a spoken segment to the element it came from, so clicking a
  // paragraph can start playback at exactly that point.
  const push = (text, label, key) => {
    const t = speakable(text);
    if (t) out.push({ text: t, label: label || '', key: key || null });
  };

  push(`${d.num ? 'Domain ' + d.num + '. ' : ''}${d.name}. ${d.weight} percent of the exam.`,
       'Title', 'title');
  push('The big idea. ' + n.big, 'The big idea', 'big');

  n.sections.forEach((sec, si) => {
    push('Section. ' + sec.h, sec.h, `s${si}`);
    if (sec.scope) push('Scope note. ' + sec.scope, sec.h, `s${si}-scope`);
    sec.body.forEach((p, bi) => {
      const k = `s${si}-b${bi}`;
      if (typeof p === 'string') push(p, sec.h, k);
      else if (p.key) push('Takeaway. ' + p.key, sec.h, k);
      else if (p.warn) push('Watch out. ' + p.warn, sec.h, k);
      else if (p.exam) push('On the exam. ' + p.exam, sec.h, k);
      else if (p.list) p.list.forEach((it, i) => push(`Point ${i + 1}. ${it}`, sec.h, k));
      else if (p.why) push(p.why.q + ' ' + p.why.a, sec.h, k);
      // A diagram reads as its caption: the caption is written to state the
      // claim the picture makes, so it stands alone for a listener.
      else if (p.fig) push('Figure. ' + (p.fig.cap || ''), sec.h, k);
      else if (p.table) {
        // Read a table as rows paired with their headers, or it is gibberish.
        const head = p.table[0] || [];
        push('Table. ' + head.join(', ') + '.', sec.h, k);
        p.table.slice(1).forEach(row => {
          const pairs = row.map((cell, i) =>
            head[i] ? `${head[i]}: ${cell}` : cell).join('. ');
          push(pairs + '.', sec.h, k);
        });
      }
    });
  });

  if (n.confusions && n.confusions.length) {
    push('Easily confused.', 'Easily confused', 'conf');
    n.confusions.forEach((c, i) =>
      push(`${c.a}, versus ${c.b}. ${c.split}`, 'Easily confused', `conf-${i}`));
  }
  if (n.checks && n.checks.length) {
    push('Check yourself.', 'Check yourself', 'checks');
    n.checks.forEach((c, i) => push(`Question ${i + 1}. ${c}`, 'Check yourself', `checks-${i}`));
  }
  return out;
}

/* Playback state. Chrome drops long utterances, so each segment is spoken
   separately and chained — which also gives us pause/resume and progress. */
let TTS = null;

function ttsSupported() {
  return typeof speechSynthesis !== 'undefined'
    && typeof SpeechSynthesisUtterance !== 'undefined';
}

function startSpeaking(exam, domId, fromKey) {
  if (!ttsSupported()) { alert('This browser has no speech synthesis.'); return; }
  stopSpeaking();
  const segs = noteToSpeech(exam, domId);
  if (!segs.length) return;
  // Clicking a block starts at its first segment; a table or list may map to
  // several, so find the first one rather than assuming a 1:1 match.
  let start = 0;
  if (fromKey) {
    const at = segs.findIndex(x => x.key === fromKey);
    if (at >= 0) start = at;
  }
  TTS = { segs, i: start, domId, exam, paused: false };
  refreshNoteUI();      // rebuild first: it would wipe the highlight otherwise
  speakSegment();
}

function speakSegment() {
  if (!TTS || TTS.i >= TTS.segs.length) { stopSpeaking(); refreshNoteUI(); return; }
  const u = new SpeechSynthesisUtterance(TTS.segs[TTS.i].text);
  u.rate = ttsRate();
  const v = ttsVoice();
  if (v) u.voice = v;
  u.onend = () => {
    if (!TTS || TTS.paused) return;
    TTS.i++;
    if (TTS.i >= TTS.segs.length) { stopSpeaking(); refreshNoteUI(); return; }
    updateTtsBar();
    speakSegment();
  };
  u.onerror = (e) => {
    // 'interrupted' and 'canceled' are what cancel() produces — not failures
    if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
    stopSpeaking(); refreshNoteUI();
  };
  TTS.utterance = u;
  speechSynthesis.speak(u);
  updateTtsBar();
}

function pauseSpeaking() {
  if (!TTS) return;
  TTS.paused = true;
  speechSynthesis.pause();
  updateTtsBar();
}
function resumeSpeaking() {
  if (!TTS) return;
  TTS.paused = false;
  speechSynthesis.resume();
  updateTtsBar();
}
function stopSpeaking() {
  if (ttsSupported()) speechSynthesis.cancel();
  TTS = null;
  document.querySelectorAll('.speaking').forEach(n => n.classList.remove('speaking'));
  updateTtsBar();
}
function skipSegment(dir) {
  if (!TTS) return;
  const next = TTS.i + dir;
  if (next < 0 || next >= TTS.segs.length) return;
  TTS.i = next;
  TTS.paused = false;
  speechSynthesis.cancel();
  speakSegment();
}

function ttsRate() {
  let r = 1;
  try { r = parseFloat(localStorage.getItem('cct-ttsrate')) || 1; } catch (e) {}
  return Math.min(2, Math.max(0.6, r));
}
function setTtsRate(r) {
  const v = Math.min(2, Math.max(0.6, Math.round(r * 10) / 10));
  try { localStorage.setItem('cct-ttsrate', String(v)); } catch (e) {}
  if (TTS && !TTS.paused) { speechSynthesis.cancel(); speakSegment(); }
  updateTtsBar();
  return v;
}
/** English voices first, then the rest — the notes are English. */
function ttsVoices() {
  if (!ttsSupported()) return [];
  const all = speechSynthesis.getVoices() || [];
  const en = all.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  const rest = all.filter(v => !en.includes(v));
  return en.concat(rest);
}

function setTtsVoice(name) {
  try { localStorage.setItem('cct-ttsvoice', name || ''); } catch (e) {}
  // Re-speak the current segment so you hear the change immediately.
  if (TTS && !TTS.paused) { speechSynthesis.cancel(); speakSegment(); }
  updateTtsBar();
}

function ttsVoice() {
  if (!ttsSupported()) return null;
  let want = '';
  try { want = localStorage.getItem('cct-ttsvoice') || ''; } catch (e) {}
  const voices = speechSynthesis.getVoices();
  return voices.find(v => v.name === want)
      || voices.find(v => v.lang && v.lang.startsWith('en') && v.localService)
      || voices.find(v => v.lang && v.lang.startsWith('en'))
      || null;
}

/** The floating player. Rendered once and updated in place, so it survives
 *  the note list re-rendering underneath it. */
function updateTtsBar() {
  const bar = $('#ttsBar');
  if (!bar) return;
  if (!TTS) { bar.hidden = true; return; }

  bar.hidden = false;
  const d = EXAMS[TTS.exam].domains.find(x => x.id === TTS.domId);
  const seg = TTS.segs[TTS.i] || {};
  $('#ttsTitle').textContent = d ? (d.num ? 'D' + d.num + ' · ' : '') + d.name : '';
  $('#ttsWhere').textContent = seg.label || '';
  $('#ttsCount').textContent = `${TTS.i + 1} / ${TTS.segs.length}`;
  $('#ttsNow').textContent = seg.text || '';
  $('#ttsPlay').textContent = TTS.paused ? 'Resume' : 'Pause';
  $('#ttsRate').textContent = ttsRate().toFixed(1) + '×';
  const pct = Math.round((TTS.i / Math.max(1, TTS.segs.length - 1)) * 100);
  $('#ttsFill').style.width = pct + '%';

  fillVoiceSelect();
  highlightSpoken(true);
}

/** Mark the block being read. Separate from the player bar so it can be
 *  re-applied after the notes re-render, and so a hidden bar never skips it. */
function highlightSpoken(allowScroll) {
  document.querySelectorAll('.speaking').forEach(n => n.classList.remove('speaking'));
  if (!TTS) return;
  const seg = TTS.segs[TTS.i];
  if (!seg || !seg.key) return;
  const node = document.querySelector(`[data-seg="${CSS.escape(seg.key)}"]`);
  if (!node) return;
  node.classList.add('speaking');
  if (!allowScroll) return;
  const r = node.getBoundingClientRect();
  // keep it clear of the sticky header and the player bar at the bottom
  if (r.top < 70 || r.bottom > window.innerHeight - 170) {
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/** Fill the voice picker once the browser has reported its voices. */
function fillVoiceSelect() {
  const sel = $('#ttsVoiceSel');
  if (!sel) return;
  const voices = ttsVoices();
  if (!voices.length) { sel.hidden = true; return; }
  sel.hidden = false;
  const current = ttsVoice();
  const want = current ? current.name : '';
  if (sel.dataset.filled === String(voices.length)) { sel.value = want; return; }
  sel.innerHTML = '';
  voices.forEach(v => {
    const o = el('option', null, `${v.name}${v.localService ? '' : ' (network)'}`);
    o.value = v.name;
    sel.appendChild(o);
  });
  sel.dataset.filled = String(voices.length);
  sel.value = want;
}

/* ---------- flashcards (Leitner boxes) ---------- */
/* Box 1 = due every session, box 5 = effectively retired. "Got it" promotes,
   "Missed" demotes to box 1 — a fact you just failed is due immediately. */
const BOX_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 };
function cardKey(c) { return c.exam + '/' + c.d + '/' + c.f.slice(0, 40); }
function cardState(c) { return S.cards[cardKey(c)] || { box: 1, ts: 0 }; }
function cardDue(c) {
  const st = cardState(c);
  const wait = (BOX_DAYS[st.box] || 0) * 86400000;
  return Date.now() - st.ts >= wait;
}
function cardsFor(exam, domId) {
  return CARDS.filter(c => c.exam === exam && (!domId || c.d === domId));
}
function dueCards(exam, domId) { return cardsFor(exam, domId).filter(cardDue); }
function gradeCard(c, got) {
  const k = cardKey(c), st = cardState(c);
  S.cards[k] = { box: got ? Math.min(5, st.box + 1) : 1, ts: Date.now() };
  save();
}

/* ---------- study plan ---------- */
/* Sequences each domain: read the notes, drill the cards, quiz, then build.
   Ordered by exam weight x how far behind you are, so the biggest gap is first. */
function planFor(exam) {
  const ex = EXAMS[exam];
  const rows = ex.domains.map(d => {
    const m = domainMastery(exam, d.id);
    const note = noteFor(exam, d.id);
    const cards = cardsFor(exam, d.id);
    const due = dueCards(exam, d.id).length;
    const labs = LABS.filter(l => l.exams.includes(exam) && (l.domains[exam] || []).includes(d.id));
    const labDone = labs.filter(l => { const p = labProgress(l); return p.total && p.done === p.total; }).length;

    const steps = [];
    if (note) steps.push({ k: 'read', label: 'Read the notes', done: hasRead(exam, d.id), meta: note.mins + ' min' });
    if (cards.length) steps.push({ k: 'cards', label: 'Drill flashcards', done: due === 0 && cards.some(c => cardState(c).box > 1), meta: due ? due + ' due' : cards.length + ' cards' });
    steps.push({ k: 'quiz', label: 'Quiz this domain', done: m.drill.coverage >= 0.5 && m.score !== null && m.score >= 0.8, meta: m.score === null ? 'not started' : Math.round(m.score * 100) + '%' });
    if (labs.length) steps.push({ k: 'lab', label: labs.length > 1 ? 'Build (' + labs.length + ' labs)' : 'Build: ' + labs[0].title, done: labDone > 0, meta: labDone + '/' + labs.length, lab: labs[0] });

    const left = steps.filter(s => !s.done).length;
    // gap: how much of this domain's exam weight is still unearned
    const gap = d.weight * (1 - (m.score === null ? 0 : m.score) * (m.coverage));
    return { d, m, steps, left, gap, note, due, labs };
  });

  // Two orderings, because they suit different moments:
  //   blueprint — the exam guide's own domain order. Stable between sessions
  //               and respects how the material builds (D1 establishes the
  //               loop that D2 and D5 assume). Best for a first pass.
  //   gap       — biggest unearned exam weight first. Reorders as you learn,
  //               which is the point: it triages. Best when revising.
  if (S.planOrder === 'gap') rows.sort((a, b) => b.gap - a.gap);
  else rows.sort((a, b) => (a.d.num || 99) - (b.d.num || 99));
  return rows;
}

/* ---------- rendering ---------- */
const $ = sel => document.querySelector(sel);
const NL = String.fromCharCode(10);   // newline for <pre> blocks built from arrays
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

/* Views you can navigate to and back out of. The session views — quiz, cards,
   result — are deliberately excluded: they hold in-progress state, and landing
   back in a half-finished quiz is worse than not restoring it. Backing out of
   one returns you to the destination you came from. */
const ROUTES = ['dash', 'study', 'notes', 'note', 'labs', 'stats', 'settings', 'sim'];

/* Retired views, and where their content went. A bookmark or a Back entry
   from before the move still resolves rather than landing on a blank page:
   "Questions to revisit" is on the Dashboard now, so #progress goes there. */
const MOVED = { progress: 'dash' };

function go(view, opts) {
  const o = opts || {};
  if (MOVED[view]) view = MOVED[view];
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  $('#view-' + view).hidden = false;
  // A single note is still the Notes section as far as the sidebar goes.
  const navFor = view === 'note' ? 'notes' : view;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === navFor));
  examMeta();
  if (TTS && view !== 'notes' && view !== 'note') { stopSpeaking(); }
  if (view === 'dash') renderDash();
  if (view === 'labs') renderLabs();
  if (view === 'stats') renderAnalytics();
  if (view === 'settings') renderSettings();
  if (view === 'study') renderStudy();
  if (view === 'notes') renderNotes();
  if (view === 'note') renderNoteView(o.dom || currentNote);
  // The simulation page is either its start screen or a sitting in progress;
  // only one of the two is ever visible.
  if (view === 'sim') {
    const running = typeof SIM !== 'undefined' && SIM && !SIM.reviewing;
    $('#simStartBody').hidden = !!running;
    $('#simRun').hidden = !running;
    if (running) simRender(); else renderSim();
  }
  window.scrollTo(0, 0);

  // Record it in history unless we're responding to a history event ourselves.
  if (!o.fromHistory) syncHistory(view, o.dom);
}

/* Hash routing rather than pushState with a path: this page runs from file://,
   where a path-based pushState is rejected but a hash change is not.
   A note view carries a third segment: "#note/CCAR-F/d3". That makes a single
   domain linkable and, more importantly, gives Back something to return to
   when you step from the index into a note and out again. */
function syncHistory(view, arg) {
  if (!ROUTES.includes(view)) return;          // session views don't get entries
  let hash = '#' + view + '/' + S.exam;
  if (view === 'note' && arg) hash += '/' + arg;
  if (location.hash === hash) return;          // no duplicate entries
  const state = { view, exam: S.exam, dom: view === 'note' ? (arg || null) : null };
  try {
    history.pushState(state, '', hash);
  } catch (e) {
    location.hash = hash;                      // fallback; still gives us Back
  }
}
/** Parse "#notes/CCAR-F" or "#note/CCAR-F/d3", ignoring anything unrecognised. */
function parseHash() {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return null;
  let [view, exam, dom] = raw.split('/');
  // An old link to a retired view still carries a usable exam, so translate
  // rather than dropping it — #progress/CCDV-F should land on the CCDV-F
  // dashboard, not on whichever exam happens to be selected.
  if (MOVED[view]) view = MOVED[view];
  if (!ROUTES.includes(view)) return null;
  return { view, exam: EXAMS[exam] ? exam : null, dom: dom || null };
}

function initRouting() {
  window.addEventListener('popstate', (e) => {
    const r = (e.state && ROUTES.includes(e.state.view))
      ? { view: e.state.view, exam: e.state.exam, dom: e.state.dom || null }
      : parseHash();
    if (!r) { go('dash', { fromHistory: true }); return; }

    // A quiz or flashcard run in progress is abandoned by navigating away —
    // same as pressing End session, just triggered by the Back button.
    stopExamTimer();
    Q = null; C = null;

    if (r.exam && EXAMS[r.exam] && r.exam !== S.exam) {
      S.exam = r.exam; save(); examPicker();
    }
    go(r.view, { fromHistory: true, dom: r.dom });
  });

  const initial = parseHash();
  if (initial) {
    if (initial.exam && initial.exam !== S.exam) { S.exam = initial.exam; save(); examPicker(); }
    go(initial.view, { fromHistory: true, dom: initial.dom });
    // Rewrite the URL as well as the state. A link to a retired view was
    // translated on the way in, so leaving the old hash in the address bar
    // would keep handing out a stale link every time it was copied.
    let url = '#' + initial.view + '/' + S.exam;
    if (initial.view === 'note' && initial.dom) url += '/' + initial.dom;
    try {
      history.replaceState({ view: initial.view, exam: S.exam, dom: initial.dom || null }, '', url);
    } catch (e) {
      // file:// can reject a URL argument; the state alone still works.
      try { history.replaceState({ view: initial.view, exam: S.exam, dom: initial.dom || null }, ''); } catch (e2) {}
    }
  } else {
    go('dash');
  }
}

function examPicker() {
  const sel = $('#examSel');
  sel.innerHTML = '';
  // Grouped by the experience level each guide recommends. This is a readiness
  // progression, not a prerequisite chain — any exam can be taken in any order.
  const LEVELS = { 1: 'Entry level', 2: 'Needs hands-on Claude experience', 3: 'Senior / architect level' };
  let lastLevel = null, og = null;
  EXAM_ORDER.forEach(code => {
    const ex = EXAMS[code];
    if (ex.level !== lastLevel) {
      og = document.createElement('optgroup');
      og.label = LEVELS[ex.level] || '';
      sel.appendChild(og);
      lastLevel = ex.level;
    }
    const o = el('option', null,
      `${ex.tier === 'Professional' ? 'Architect Pro' : ex.name.replace('Claude Certified ', '')} · ${code}`);
    o.value = code;
    (og || sel).appendChild(o);
  });
  sel.value = S.exam;
  sel.onchange = () => {
    S.exam = sel.value; save();
    examMeta();
    // every view is scoped to the active exam, so re-render whichever is open.
    // From a session view there is nothing meaningful to re-render into, so
    // fall back to the dashboard.
    const open = document.querySelector('.view:not([hidden])');
    const cur = open ? open.id.replace('view-', '') : 'dash';
    go(ROUTES.includes(cur) ? cur : 'dash');
  };
  examMeta();
}

function examMeta() {
  const ex = EXAMS[S.exam];
  const r = readiness(S.exam);
  // The simulation bank exists only for the exam someone actually sat, so the
  // nav entry appears only there rather than leading to an empty page.
  const navSim = $('#navSim');
  if (navSim) {
    navSim.hidden = !simAvailable(S.exam);
  }
  const started = r.coverage >= 0.08;
  const meta = $('#examSwMeta');
  meta.textContent = started
    ? `${r.scaled} / ${PASS_MARK}  ·  ${Math.round(r.coverage * 100)}% covered`
    : `${ex.questions} items · ${PASS_MARK} to pass`;
  // A passing score is worth seeing at a glance; below the mark it stays
  // neutral rather than being coloured as a failure.
  meta.style.color = started && r.scaled >= PASS_MARK ? 'var(--good)' : '';
  // Read aloud as a sentence: "931 / 720 · 94% covered" is terse enough to
  // be meaningless without saying what the numbers are.
  meta.title = started
    ? `${ex.code}: projected scaled score ${r.scaled} out of 1000, pass mark `
      + `${PASS_MARK}. ${Math.round(r.coverage * 100)}% of the question bank attempted.`
    : `${ex.code}: ${ex.questions} questions per sitting, ${PASS_MARK} to pass. `
      + 'Nothing attempted yet.';
}

/* The readiness tile and the gate list beneath it.
 *
 * Reported as "N of 6" rather than a percentage: each gate is a yes or no
 * about evidence you either have or do not, and averaging them would imply
 * a precision the inputs do not carry. An unmet gate states what it wants
 * and how far off you are, so the list doubles as a to-do.
 */
/* The six gates answer three different questions, and reading them as one
   flat list hides that: "every domain covered" is about breadth of study,
   "mistakes turned around" is about whether it stuck, and "a full timed
   sitting" is about performing under exam conditions. A profile can be
   strong on one and empty on another, which is the useful thing to see. */
const GATE_GROUPS = [
  { id: 'cover',  title: 'Study every domain',
    blurb: 'Breadth — no domain left untouched.' },
  { id: 'retain', title: 'Study across multiple days',
    blurb: 'Retention — answers that survived a night, and mistakes you turned around.' },
  { id: 'sim',    title: 'Take exam simulations',
    blurb: 'Performance under exam conditions, and a score with enough behind it.' }
];

function renderReadiness(exam) {
  const rg = readinessGates(exam);

  const val = $('#readyVal');
  if (val) {
    val.textContent = rg.passed + ' of ' + rg.total;
    val.style.color = rg.passed === rg.total ? 'var(--good)'
      : rg.passed >= rg.total - 1 ? 'var(--warn)' : '';
    val.title = rg.passed + ' of ' + rg.total + ' readiness gates met. These '
      + 'measure whether the projected score has enough behind it to trust, '
      + 'which is a different question from how high the score is.';
  }
  const note = $('#readyNote');
  if (note) {
    note.textContent = rg.passed === rg.total
      ? 'Every gate met — the projection is well evidenced'
      : rg.next && rg.next.todo ? 'Next: ' + rg.next.todo
      : 'Evidence that the score is trustworthy';
  }

  const list = $('#gateList');
  if (!list) return;
  list.innerHTML = '';

  /* Ordered by group, with a heading and a met-count per group. A gate with
     no group (or an unknown one) still renders, at the end, so adding a gate
     without remembering to group it degrades to the old flat list rather
     than vanishing from the page. */
  const seen = new Set();
  const ordered = [];
  GATE_GROUPS.forEach(grp => {
    const inGroup = rg.gates.filter(g => g.group === grp.id);
    if (!inGroup.length) return;
    inGroup.forEach(g => seen.add(g.id));
    ordered.push({ grp, gates: inGroup });
  });
  const ungrouped = rg.gates.filter(g => !seen.has(g.id));
  if (ungrouped.length) ordered.push({ grp: null, gates: ungrouped });

  ordered.forEach(({ grp, gates }) => {
    if (grp) {
      const met = gates.filter(g => g.pass).length;
      const head = el('div', 'gategroup' + (met === gates.length ? ' done' : ''));
      head.appendChild(el('span', 'gategrouptitle', grp.title));
      head.appendChild(el('span', 'gategroupcount', met + '/' + gates.length));
      head.setAttribute('aria-label',
        grp.title + ': ' + met + ' of ' + gates.length + ' met. ' + grp.blurb);
      head.title = grp.blurb;
      list.appendChild(head);
    }
    gates.forEach(g => {
    /* An unmet gate with an action is a button: clicking it starts the
       work that closes it. A met gate, or one whose only remedy is the
       passage of time, stays a plain row — making it look clickable and
       do nothing is worse than leaving it inert.

       A met gate still offers its action, but as a link inside the row
       rather than by making the whole row a button: the work that closed
       the gate is the same work that keeps it closed, and a passed gate
       is not a finished subject. Keeping the row inert preserves the
       checklist reading — only the link itself is a control. */
    const live = !g.pass && !!g.act;
    const keep = g.pass && !!g.act;
    const row = el(live ? 'button' : 'div',
      'gaterow' + (g.pass ? ' met' : '') + (live ? ' live' : ''));
    if (live) row.type = 'button';
    const mark = el('span', 'gatemark', g.pass ? '✓' : '');
    mark.setAttribute('aria-hidden', 'true');
    row.appendChild(mark);

    const mid = el('div', 'gatemid');
    mid.appendChild(el('div', 'gatelabel', g.label));
    mid.appendChild(el('div', 'gateneed', g.need));
    if (live) {
      const cue = el('span', 'gatego');
      cue.textContent = g.act.label + ' →';
      mid.appendChild(cue);
    } else if (keep) {
      const cue = el('button', 'gatego gatekeep');
      cue.type = 'button';
      cue.textContent = g.act.label + ' →';
      cue.setAttribute('aria-label',
        g.act.label + ' — keep “' + g.label + '” sharp. Already met.');
      cue.onclick = g.act.run;
      mid.appendChild(cue);
    }
    row.appendChild(mid);

    const right = el('div', 'gatestate');
    right.textContent = g.detail;
    row.appendChild(right);

    /* A live row is a button, so this names the control. An inert row is a
       plain div: labelling it adds nothing on most readers and would talk
       over the keep-sharp button nested inside, which carries its own
       label. The row's text already reads in order. */
    if (live) {
      row.setAttribute('aria-label',
        g.label + ': not met. ' + g.detail + '. ' + g.need
        + ' Opens ' + g.act.label + '.');
      row.onclick = g.act.run;
    }
    list.appendChild(row);
    });
  });
}

function renderDash() {
  const exam = S.exam, ex = EXAMS[exam];
  const r = readiness(exam);
  const pool = poolFor(exam, { hard: 'any' });

  /* The hard tier is still being written out across the four exams, so the
     button appears only where there is something behind it — and not at all
     where a simulation exists, because those questions have been folded into
     that bank and the simulation presents them in their proper shape, with a
     per-option explanation rather than one shared note. They stay in
     QUESTIONS so coverage and mastery figures do not move; this hides the
     separate entry point, it does not delete anything. */
  const hardBtn = $('#btnHard');
  if (hardBtn) {
    const nHard = hardFor(exam).length;
    hardBtn.hidden = !hardModeAvailable(exam);
    hardBtn.textContent = 'Hard questions · ' + Math.min(12, nHard);
  }

  /* The two recall-based full-length modes are retired wherever a simulation
     bank exists: the simulation is the same sitting in the shape the real
     paper has. The markup and the startQuiz branch stay, because sessions
     recorded under them still render and the certifications without a bank
     still use them. */
  const simHere = simAvailable(exam);
  [$('#btnMock'), $('#btnExam')].forEach(b => { if (b) b.hidden = simHere; });

  $('#examBlurb').textContent = ex.blurb;
  $('#examMeta').textContent = [
    `${ex.questions} questions`, `${ex.minutes} min`, `${PASS_MARK}/1000 to pass`,
    ex.fee, `${pool.length} in bank`
  ].filter(Boolean).join(' · ');
  $('#examAud').textContent = ex.structure ? `${ex.structure}. ${ex.audience}` : ex.audience;
  const hint = $('#modeHint');
  if (hint) {
    hint.innerHTML = simHere
      ? `<strong>Quick quiz</strong> draws ten questions from the whole bank. `
        + `<strong>Exam simulation</strong> is the full-length sitting: `
        + `${ex.questions} questions in ${ex.minutes} minutes, in scenario blocks, `
        + `timed with no feedback until you submit — use it to find out where you `
        + `actually stand.`
      : `Both full-length options draw ${ex.questions} questions at the real domain weighting. `
        + `<strong>Full-length practice</strong> explains each answer as you go. `
        + `<strong>Timed mock</strong> is timed at ${ex.minutes} minutes with no feedback `
        + `until you submit — use it to find out where you actually stand.`;
  }
  const lvl = $('#examLevel');
  if (ex.experience) {
    lvl.innerHTML = '';
    lvl.appendChild(el('span', 'lvlbadge', 'Level ' + ex.level + ' · ' + ex.levelName));
    lvl.appendChild(el('span', 'muted small', ex.experience));
    lvl.hidden = false;
  } else { lvl.hidden = true; }

  // readiness gauge
  const pct = Math.max(0, Math.min(1, (r.scaled - 100) / 900));
  $('#gaugeFill').style.width = (pct * 100).toFixed(1) + '%';
  $('#gaugeVal').textContent = r.coverage < 0.08 ? '—' : r.scaled;
  /* Name the pool the estimate came from. Where a simulation exists the
     number is projected from simulation attempts, which is a different
     claim from one projected off drill recall, and the reader should not
     have to infer which they are looking at. */
  const from = r.source === 'sim' ? ' on simulation results' : ' on answered material';
  $('#gaugeNote').textContent = r.coverage < 0.08
    ? (r.source === 'sim'
        ? 'Run an exam simulation for an estimate'
        : 'Answer more questions for an estimate')
    : (r.scaled >= PASS_MARK ? 'Above the pass mark' + from : `${PASS_MARK - r.scaled} below the pass mark`);
  /* Coverage of two different banks.
   *
   * Where a simulation exists, r.coverage is simulation coverage, because
   * that is the pool the projected score is computed from — so it is the
   * headline, labelled as such, with drill coverage named underneath. One
   * undifferentiated "bank attempted" percentage would be read as covering
   * both and be wrong about each. */
  const drillCov = (() => {
    let w = 0, c = 0;
    EXAMS[exam].domains.forEach(d => {
      const m = domainMastery(exam, d.id);
      w += d.weight; c += d.weight * m.coverage;
    });
    return w ? c / w : 0;
  })();
  const covLbl = $('#covLbl'), covNote = $('#covNote'), covSplit = $('#covSplit');
  if (r.source === 'sim') {
    if (covLbl) covLbl.textContent = 'Simulation bank attempted';
    if (covNote) covNote.textContent = 'What the projected score is based on';
    if (covSplit) {
      covSplit.hidden = false;
      covSplit.innerHTML = '';
      covSplit.appendChild(el('span', null, 'Drill bank'));
      covSplit.appendChild(el('b', null, Math.round(drillCov * 100) + '%'));
      covSplit.title = Math.round(drillCov * 100) + '% of the '
        + reachableFor(exam).length + ' questions in the ' + exam + ' drill bank have '
        + 'been attempted at least once, weighted by domain. Drill questions '
        + 'build and check knowledge; they do not feed the projected score.';
    }
  } else {
    if (covLbl) covLbl.textContent = 'Bank attempted';
    if (covNote) covNote.textContent = 'Coverage of this exam’s questions';
    if (covSplit) covSplit.hidden = true;
  }
  $('#covVal').textContent = Math.round(r.coverage * 100) + '%';
  renderReadiness(exam);

  // Say what each headline figure actually measures.
  const gv = $('#gaugeVal');
  if (gv) gv.title = r.coverage < 0.08
    ? 'Not enough answered yet to project a score.'
    : 'Projected scaled score ' + r.scaled + ' out of 1000, pass mark '
      + PASS_MARK + '. Based only on questions you have attempted, weighted '
      + 'by each domain’s share of the exam.';
  const cv = $('#covVal');
  if (cv) {
    const simTotal = typeof SIM_QUESTIONS === 'undefined' ? 0
      : SIM_QUESTIONS.filter(q => q.exam === exam).length;
    cv.title = r.source === 'sim'
      ? Math.round(r.coverage * 100) + '% of the ' + simTotal + ' questions in '
        + 'the ' + exam + ' simulation bank have been answered at least once, '
        + 'weighted by domain. This is the pool the projected score comes from.'
      : Math.round(r.coverage * 100) + '% of the ' + reachableFor(exam).length
        + ' questions in the ' + exam + ' bank have been attempted at least '
        + 'once, weighted by domain.';
  }


  // domain table
  const tb = $('#domTable'); tb.innerHTML = '';
  const rows = ex.domains.map(d => ({ d, m: domainMastery(exam, d.id) }));
  rows.forEach(({ d, m }) => {
    const tr = el('div', 'drow');
    // Breadth is judged on the drill pool: the Drill button beside it serves
    // nothing else, so a shortfall it cannot close is not something to flag.
    const needs = m.flagged || (m.score !== null && m.score < 0.7) || m.drill.coverage < 0.4;

    const nm = el('div', 'dname');
    const label = el('span', null, d.name);
    if (d.num) { const n = el('span', 'dnum', 'D' + d.num); nm.appendChild(n); }
    nm.appendChild(label);
    const tags = el('span', 'dtags');
    if (m.flagged) tags.appendChild(el('span', 'tag flag', 'flagged'));
    if (needs && !m.flagged) tags.appendChild(el('span', 'tag warn', 'needs work'));
    nm.appendChild(tags);

    // These three numbers are easy to misread, so each says what it is.
    const wt = el('div', 'dwt', d.weight + '%');
    wt.title = d.name + ' is ' + d.weight + '% of the ' + exam + ' exam — '
      + 'roughly ' + Math.round(EXAMS[exam].questions * d.weight / 100)
      + ' of its ' + EXAMS[exam].questions + ' questions.';

    const barWrap = el('div', 'dbar');
    const bar = el('div', 'dbarfill');
    const sc = m.score === null ? 0 : m.score;
    bar.style.width = (sc * 100).toFixed(0) + '%';
    bar.classList.add(sc >= 0.8 ? 'good' : sc >= 0.6 ? 'mid' : 'low');
    barWrap.appendChild(bar);
    barWrap.title = m.score === null
      ? 'No questions answered in this domain yet.'
      : 'Mastery ' + Math.round(sc * 100) + '%. Weighted toward your recent '
        + 'answers and adjusted by how confident you were — a correct guess '
        + 'counts for less than a confident one.';

    const stat = el('div', 'dstat', m.score === null ? `0/${m.total}` : `${Math.round(sc * 100)}% · ${m.answered}/${m.total}`);
    stat.title = m.score === null
      ? '0 of ' + m.total + ' questions in this domain attempted.'
      : 'Mastery ' + Math.round(sc * 100) + '% · ' + m.answered + ' of '
        + m.total + ' questions attempted ('
        + Math.round(m.coverage * 100) + '% of the bank). Drill questions: '
        + m.drill.answered + ' of ' + m.drill.total + '; the rest come up in '
        + (simAvailable(exam) ? 'the quick quiz.' : 'the mock exams.');

    const acts = el('div', 'dacts');
    // Jump straight into this domain's notes — the dashboard is where you
    // notice a weak domain, so it should be where you can go read about it.
    if (noteFor(exam, d.id)) {
      const bn = el('button', 'mini ghost', hasRead(exam, d.id) ? 'Notes' : 'Read');
      bn.title = 'Open the notes for this domain';
      bn.onclick = () => openNote(exam, d.id);
      acts.appendChild(bn);
    }
    const bq = el('button', 'mini', 'Drill');
    bq.onclick = () => startQuiz('domain', { domain: d.id });
    const bf = el('button', 'mini ghost', m.flagged ? 'Unflag' : 'Flag');
    bf.onclick = () => { const k = exam + '/' + d.id; if (S.flags[k]) delete S.flags[k]; else S.flags[k] = true; save(); renderDash(); };
    acts.append(bq, bf);

    tr.append(nm, wt, barWrap, stat, acts);
    tb.appendChild(tr);
  });

  // focus panel — what to work on next
  const focus = rows
    .filter(r2 => r2.m.flagged || r2.m.drill.coverage < 0.5 || (r2.m.score !== null && r2.m.score < 0.7))
    .sort((a, b) => {
      const pa = (a.m.flagged ? 100 : 0) + a.d.weight * (1 - (a.m.score == null ? 0 : a.m.score));
      const pb = (b.m.flagged ? 100 : 0) + b.d.weight * (1 - (b.m.score == null ? 0 : b.m.score));
      return pb - pa;
    }).slice(0, 3);
  const fp = $('#focusList'); fp.innerHTML = '';
  if (!focus.length) {
    fp.appendChild(el('p', 'muted', 'Nothing flagged. Run a mock exam to find gaps.'));
  } else {
    focus.forEach(({ d, m }) => {
      const li = el('div', 'fitem');
      const t = el('div', 'ftext');
      t.appendChild(el('strong', null, d.name));
      const reason = m.flagged ? 'You flagged this for review'
        : m.drill.coverage < 0.5 ? `Only ${Math.round(m.drill.coverage * 100)}% of its drill questions attempted — ${d.weight}% of the exam`
        : `Scoring ${Math.round(m.score * 100)}% — ${d.weight}% of the exam`;
      t.appendChild(el('div', 'muted small', reason));
      const acts = el('div', 'dacts');
      if (noteFor(exam, d.id) && !hasRead(exam, d.id)) {
        const r = el('button', 'mini', 'Read');
        r.onclick = () => openNote(exam, d.id);
        acts.appendChild(r);
      }
      const b = el('button', 'mini' + (noteFor(exam, d.id) && !hasRead(exam, d.id) ? ' ghost' : ''), 'Drill');
      b.onclick = () => startQuiz('domain', { domain: d.id });
      acts.appendChild(b);
      li.append(t, acts); fp.appendChild(li);
    });
  }

  // study-now strip
  const due = dueCards(exam).length;
  const unread = EXAMS[exam].domains.filter(d => noteFor(exam, d.id) && !hasRead(exam, d.id)).length;
  const sn = $('#studyNow'); sn.innerHTML = '';
  if (due || unread) {
    const msg = el('div', 'ftext');
    const bits = [];
    if (unread) bits.push(`${unread} domain${unread === 1 ? '' : 's'} not yet read`);
    if (due) bits.push(`${due} flashcard${due === 1 ? '' : 's'} due`);
    msg.appendChild(el('strong', null, bits.join(' · ')));
    msg.appendChild(el('div', 'muted small', 'Studying first makes the quizzes diagnostic rather than guesswork.'));
    const b = el('button', 'mini', 'Open study plan');
    b.onclick = () => go('study');
    sn.append(msg, b);
    sn.hidden = false;
  } else {
    sn.hidden = true;
  }

  // The individual questions behind the domain table above.
  renderRevisit($('#revisitList'));

  // exam scenarios — the contexts the real exam frames its questions in
  const scWrap = $('#examScenarios');
  const scSec = $('#scenarioSection');
  if (ex.scenarios && ex.scenarios.length) {
    scSec.hidden = false;
    scWrap.innerHTML = '';
    ex.scenarios.forEach(sc => {
      const row = el('div', 'scrow');
      row.appendChild(el('div', 'sctitle', sc.t));
      const tags = el('div', 'sctags');
      sc.d.forEach(id => {
        const dd = ex.domains.find(x => x.id === id);
        if (!dd) return;
        const m = domainMastery(exam, id);
        const t = el('span', 'tag dom' + (m.score !== null && m.score < 0.7 ? ' warn' : ''));
        t.textContent = dd.num ? 'D' + dd.num : dd.name;
        t.title = dd.name;
        tags.appendChild(t);
      });
      row.appendChild(tags);
      scWrap.appendChild(row);
    });
  } else {
    scSec.hidden = true;
  }

  // related labs
  const rl = $('#dashLabs'); rl.innerHTML = '';
  LABS.filter(l => l.exams.includes(exam)).slice(0, 3).forEach(l => {
    const done = labProgress(l);
    const a = el('button', 'labchip');
    a.innerHTML = `<span>${l.title}</span><span class="muted small">${done.done}/${done.total}</span>`;
    a.onclick = () => { go('labs'); setTimeout(() => { const n = document.getElementById('lab-' + l.id); if (n) { n.open = true; n.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 40); };
    rl.appendChild(a);
  });
}

/* ---------- study plan view ---------- */
function renderStudy() {
  const exam = S.exam;
  const plan = planFor(exam);
  const totalDue = dueCards(exam).length;

  const byGap = S.planOrder === 'gap';
  $('#studyIntro').textContent = byGap
    ? `Ordered by unearned exam weight — the biggest gaps first. This reshuffles `
      + `as you learn, so use it for revision rather than a first pass.`
    : `In the order the official ${EXAMS[exam].code} exam guide lists its `
      + `${EXAMS[exam].domains.length} domains. Earlier domains set up concepts the `
      + `later ones assume, so this is the order to work through first.`;

  // order toggle
  const ord = $('#planOrder');
  if (ord) {
    ord.innerHTML = '';
    [['blueprint', 'Exam guide order'], ['gap', 'Biggest gaps first']].forEach(([val, label]) => {
      const b = el('button', 'themebtn' + (S.planOrder === val ? ' on' : ''), label);
      b.onclick = () => { S.planOrder = val; save(); renderStudy(); };
      ord.appendChild(b);
    });
  }

  const cta = $('#studyCta'); cta.innerHTML = '';
  if (totalDue) {
    const b = el('button', 'btn', `Review ${totalDue} due flashcard${totalDue === 1 ? '' : 's'}`);
    b.onclick = () => startCards(null);
    cta.appendChild(b);
  }
  const nextUnread = plan.find(p => p.note && !hasRead(exam, p.d.id));
  if (nextUnread) {
    const b = el('button', 'btn' + (totalDue ? ' sec' : ''), `Read: ${nextUnread.d.name}`);
    b.onclick = () => openNote(exam, nextUnread.d.id);
    cta.appendChild(b);
  }

  const wrap = $('#studyPlan'); wrap.innerHTML = '';
  plan.forEach((p, i) => {
    const card = el('div', 'plancard' + (p.left === 0 ? ' complete' : ''));

    const head = el('div', 'planhead');
    const rank = el('div', 'planrank', String(byGap ? i + 1 : (p.d.num || i + 1)));
    if (p.left === 0) { rank.textContent = '✓'; rank.classList.add('ok'); }
    const ht = el('div', 'planht');
    ht.appendChild(el('div', 'plantitle', p.d.name));
    const sub = el('div', 'muted small');
    sub.textContent = `${p.d.weight}% of exam · ${p.left === 0 ? 'all steps done' : p.left + ' step' + (p.left === 1 ? '' : 's') + ' remaining'}`;
    ht.appendChild(sub);
    head.append(rank, ht);
    card.appendChild(head);

    const steps = el('div', 'steps');
    p.steps.forEach(s => {
      const row = el('button', 'step' + (s.done ? ' done' : ''));
      const dot = el('span', 'stepdot', s.done ? '✓' : '');
      const lab = el('span', 'steplabel', s.label);
      const meta = el('span', 'stepmeta', s.meta);
      row.append(dot, lab, meta);
      row.onclick = () => {
        if (s.k === 'read') openNote(exam, p.d.id);
        else if (s.k === 'cards') startCards(p.d.id);
        else if (s.k === 'quiz') startQuiz('domain', { domain: p.d.id });
        else if (s.k === 'lab') { go('labs'); setTimeout(() => { const n = document.getElementById('lab-' + s.lab.id); if (n) { n.open = true; n.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 40); }
      };
      steps.appendChild(row);
    });
    card.appendChild(steps);
    wrap.appendChild(card);
  });
}

/* ---------- notes view ---------- */
/* The domain whose note is on screen. Kept so a re-render (marking read,
   toggling Listen) knows what to redraw without being passed it again. */
let currentNote = null;

/* Open one domain's note in its own view. Every caller — dashboard, study
   plan, index card, prev/next — goes through here so the history entry and
   the exam switch are handled in one place. */
function openNote(exam, domId) {
  if (exam && exam !== S.exam) { S.exam = exam; save(); examPicker(); }
  currentNote = domId;
  go('note', { dom: domId });
}

/* TTS lives on a note page now, so a redraw must target the note view —
   calling renderNotes() would replace it with the index mid-playback. */
function refreshNoteUI() {
  const v = document.getElementById('view-note');
  if (v && !v.hidden && currentNote) { renderNoteView(currentNote); return; }
  const i = document.getElementById('view-notes');
  if (i && !i.hidden) renderNotes();
}

/* Build a note body. Shared by the per-domain view and anything else that
   needs the rendered prose; takes exam/domain so it has no hidden state. */
/* Strip markup for places that need text rather than HTML — an
   aria-label, a title attribute. */
function plainText(html) { return String(html || '').replace(/<[^>]+>/g, ''); }

function noteBody(exam, d, n) {
  const body = el('div', 'notebody');

  const big = el('div', 'bigidea');
  big.appendChild(el('div', 'lablabel', 'The big idea'));
  big.appendChild(el('div', null, n.big));
  body.appendChild(big);

  // Every takeaway in the note, collected up front. Scanning this is a
  // 30-second refresh; the prose below is the first read.
  const keys = [];
  n.sections.forEach(sec => sec.body.forEach(p => { if (p && p.key) keys.push({ k: p.key, h: sec.h }); }));
  if (keys.length) {
    const sum = el('details', 'keysum');
    sum.open = hasRead(exam, d.id);   // once read, lead with the summary
    sum.appendChild(el('summary', null, `${keys.length} takeaways`));
    // Grouped by source section: the heading appears once, however many
    // takeaways came from it. Repeating it on every card was pure noise.
    const ul = el('div', 'keylist');
    const groups = [];
    keys.forEach(x => {
      const last = groups[groups.length - 1];
      if (last && last.h === x.h) last.items.push(x.k);
      else groups.push({ h: x.h, items: [x.k] });
    });
    groups.forEach(g => {
      const item = el('div', 'keyitem');
      item.appendChild(el('div', 'keysrc', g.h));
      g.items.forEach(k => {
        const t = el('div', 'keyli'); t.innerHTML = k;
        item.appendChild(t);
      });
      ul.appendChild(item);
    });
    sum.appendChild(ul);
    body.appendChild(sum);
  }

  // Tag each rendered block with the same key its spoken segment carries,
  // so clicking it can start narration from there.
  const tag = (node, key) => {
    if (!node || !ttsSupported()) return node;
    node.dataset.seg = key;         // still addressable for the highlight
    node.classList.add('speakable');
    node.title = 'Click to read aloud from here';
    node.onclick = () => startSpeaking(exam, d.id, key);
    return node;
  };

  /* A <details> already uses its click to expand, so we must not steal it.
     Keep the block addressable for the highlight, but move the listen
     action onto a small button in the summary. */
  const tagOwnClick = (node, key, host) => {
    if (!node || !ttsSupported()) return node;
    node.dataset.seg = key;
    const b = el('button', 'segspeak', '▶');
    b.type = 'button';
    b.title = 'Read aloud from here';
    b.setAttribute('aria-label', 'Read aloud from here');
    b.onclick = (ev) => {
      ev.preventDefault();          // do not toggle the disclosure
      ev.stopPropagation();
      startSpeaking(exam, d.id, key);
    };
    (host || node).appendChild(b);
    return node;
  };

  n.sections.forEach((sec, si) => {
    body.appendChild(tag(el('h3', 'nsec', sec.h), `s${si}`));
    if (sec.scope) {
      const sc = el('div', 'nscope');
      sc.appendChild(el('span', 'nscopetag', 'Scope'));
      const st = el('div'); st.innerHTML = sec.scope;
      sc.appendChild(st);
      body.appendChild(tag(sc, `s${si}-scope`));
    }
    sec.body.forEach((part, bi) => {
      const segKey = `s${si}-b${bi}`;
      if (typeof part === 'string') {
        const p = el('p', 'ntext'); p.innerHTML = part; body.appendChild(tag(p, segKey));
      } else if (part.table) {
        const scroll = el('div', 'tscroll');
        const t = el('table', 'ntable');
        part.table.forEach((row, ri) => {
          const tr = el('tr');
          row.forEach(cell => {
            const c = el(ri === 0 ? 'th' : 'td');
            c.innerHTML = cell; tr.appendChild(c);
          });
          t.appendChild(tr);
        });
        scroll.appendChild(t); body.appendChild(tag(scroll, segKey));
      } else if (part.list) {
        const ul = el('ul', 'nlist');
        part.list.forEach(it => { const li = el('li'); li.innerHTML = it; ul.appendChild(li); });
        body.appendChild(tag(ul, segKey));
      } else if (part.fig) {
        /* A diagram. The SVG is authored by hand in the note data and drawn
           in currentColor so it themes with the page; the caption states
           what the picture claims, and doubles as the aria-label for anyone
           who cannot see it. A figure earns its place only where it shows a
           mechanism the prose would have to be assembled to picture. */
        const f = el('figure', 'nfig');
        const holder = el('div', 'nfigsvg');
        holder.innerHTML = part.fig.svg;
        const svg = holder.children && holder.children[0];
        if (svg && svg.setAttribute) {
          svg.setAttribute('role', 'img');
          svg.setAttribute('aria-label', plainText(part.fig.cap || ''));
        }
        f.appendChild(holder);
        if (part.fig.cap) {
          const cap = el('figcaption'); cap.innerHTML = part.fig.cap;
          f.appendChild(cap);
        }
        body.appendChild(tag(f, segKey));
      } else if (part.warn) {
        const w = el('div', 'nwarn'); w.innerHTML = part.warn; body.appendChild(tag(w, segKey));
      } else if (part.key) {
        // the pulled-out takeaway — the one line to carry out of this section
        const k = el('div', 'nkey');
        k.appendChild(el('span', 'nkeytag', 'Takeaway'));
        const kt = el('div', 'nkeytext'); kt.innerHTML = part.key;
        k.appendChild(kt);
        body.appendChild(tag(k, segKey));
      } else if (part.why) {
        // mechanism / background — why the rule is the way it is
        const w = el('details', 'nwhy');
        const s = el('summary');
        s.appendChild(el('span', null, part.why.q || 'Why this works'));
        w.appendChild(s);
        const d = el('div', 'nwhybody'); d.innerHTML = part.why.a || part.why;
        w.appendChild(d);
        body.appendChild(tagOwnClick(w, segKey, s));
      } else if (part.exam) {
        const e2 = el('div', 'nexam');
        e2.appendChild(el('span', 'nexamtag', 'On the exam'));
        const et = el('div'); et.innerHTML = part.exam;
        e2.appendChild(et);
        body.appendChild(tag(e2, segKey));
      }
    });
  });

  if (n.confusions && n.confusions.length) {
    body.appendChild(el('h3', 'nsec', 'Easily confused'));
    const cw = el('div', 'confgrid');
    n.confusions.forEach(c => {
      const box = el('div', 'confbox');
      const pair = el('div', 'confpair');
      pair.appendChild(el('span', 'confa', c.a));
      pair.appendChild(el('span', 'confvs', 'vs'));
      pair.appendChild(el('span', 'confa', c.b));
      box.appendChild(pair);
      box.appendChild(el('div', 'muted small', c.split));
      cw.appendChild(box);
    });
    body.appendChild(cw);
  }

  if (n.checks && n.checks.length) {
    body.appendChild(el('h3', 'nsec', 'Check yourself'));
    const ol = el('ol', 'nchecks');
    n.checks.forEach(c => ol.appendChild(el('li', null, c)));
    body.appendChild(ol);
  }
  return body;
}


/* The notes index: one card per domain, each opening its own view.
   Previously every domain rendered as a <details> on one page, which made
   the page very long and meant the reading position, the Listen player and
   the browser's Back button were all shared between domains. */
function renderNotes() {
  const exam = S.exam;
  const avail = EXAMS[exam].domains.filter(d => noteFor(exam, d.id));
  $('#notesIntro').textContent = avail.length
    ? `Concept-first explanations for ${avail.length} of ${EXAMS[exam].domains.length} domains. These teach the reasoning the scenario questions test.`
    : `No notes written for ${exam} yet. Its question bank, explanations, and labs are available — add notes to data-notes.js to fill this in.`;

  const wrap = $('#notesBody'); wrap.innerHTML = '';
  if (!avail.length) return;

  const readN = avail.filter(d => hasRead(exam, d.id)).length;
  const totalMins = avail.reduce((a, d) => a + (noteFor(exam, d.id).mins || 0), 0);
  const sum = el('div', 'noteidxsum');
  sum.appendChild(el('span', null, `${readN} of ${avail.length} read`));
  sum.appendChild(el('span', 'muted', `${totalMins} min total`));
  wrap.appendChild(sum);

  // One row per domain. The number, name and weight align down the list so
  // it can be scanned vertically; the big idea is a two-line preview.
  const list = el('div', 'noteidx');
  avail.forEach(d => {
    const n = noteFor(exam, d.id);
    const read = hasRead(exam, d.id);
    const row = el('button', 'notecard' + (read ? ' read' : ''));
    row.type = 'button';
    row.setAttribute('aria-label',
      `${d.name}, ${d.weight}% of the exam, ${n.mins} minute read` +
      (read ? ', read' : ''));

    row.appendChild(el('span', 'ncnum', d.num ? 'D' + d.num : d.id.toUpperCase()));
    row.appendChild(el('span', 'ncname', d.name));
    row.appendChild(el('span', 'ncbig', n.big));

    const meta = el('span', 'ncmeta');
    meta.appendChild(el('span', 'ncweight', d.weight + '%'));
    meta.appendChild(el('span', null, `${n.mins} min`));
    // The tick only appears once read, so reserve nothing for it when absent.
    if (read) meta.appendChild(el('span', 'nctick', '✓'));
    row.appendChild(meta);

    row.onclick = () => openNote(exam, d.id);
    list.appendChild(row);
  });
  wrap.appendChild(list);
}

/* One domain, on its own page. */
function renderNoteView(domId) {
  const exam = S.exam;
  const avail = EXAMS[exam].domains.filter(d => noteFor(exam, d.id));
  // Fall back to the first available note rather than rendering an empty
  // page, which is what a stale or hand-edited hash would otherwise give.
  let d = avail.find(x => x.id === domId) || avail[0];
  if (!d) { go('notes'); return; }
  currentNote = d.id;
  const n = noteFor(exam, d.id);
  const wrap = $('#noteBody'); wrap.innerHTML = '';

  const at = avail.findIndex(x => x.id === d.id);
  const prev = at > 0 ? avail[at - 1] : null;
  const next = at < avail.length - 1 ? avail[at + 1] : null;

  // Breadcrumb back to the index, where this sits in the sequence, and the
  // two display controls. They only affect this page, so they belong on it:
  // from the Settings page you could not see what they were changing.
  const nav = el('div', 'notenav');
  const back = el('button', 'mini ghost', '← All notes');
  back.onclick = () => go('notes');
  nav.appendChild(back);

  const navr = el('div', 'notenavr');
  navr.appendChild(el('span', 'muted small', `${at + 1} of ${avail.length}`));
  const disp = el('div', 'notedisp');
  disp.appendChild(el('span', 'notedisplabel', 'Text size'));
  disp.appendChild(readingStepper());
  navr.appendChild(disp);
  nav.appendChild(navr);
  wrap.appendChild(nav);

  const head = el('div', 'notehead');
  const h = el('h1', 'notehtitle', (d.num ? 'D' + d.num + ' · ' : '') + d.name);
  head.appendChild(h);
  head.appendChild(el('div', 'muted small', `${d.weight}% of the exam · ${n.mins} min read`));
  wrap.appendChild(head);

  // Actions for this domain, together in one row.
  const acts = el('div', 'noteacts');
  const act = (label, cls, fn, disabled) => {
    const b = el('button', 'mini ' + cls, label);
    if (disabled) b.disabled = true;
    b.onclick = fn;
    acts.appendChild(b);
    return b;
  };
  const read = hasRead(exam, d.id);
  act(read ? 'Read ✓' : 'Mark read', read ? 'readon' : 'ghost', () => {
    const k = exam + '/' + d.id;
    if (S.read[k]) delete S.read[k]; else markRead(exam, d.id);
    save(); renderNoteView(d.id);
  });
  const nCards = cardsFor(exam, d.id).length;
  act(nCards ? `Drill ${nCards} cards` : 'No cards', 'ghost', () => startCards(d.id), !nCards);
  act('Quiz this domain', 'ghost', () => startQuiz('domain', { domain: d.id }));
  if (ttsSupported()) {
    const playing = TTS && TTS.domId === d.id;
    act(playing ? 'Stop' : 'Listen', playing ? 'readon' : 'ghost',
      () => { playing ? (stopSpeaking(), renderNoteView(d.id)) : startSpeaking(exam, d.id); });
  }
  wrap.appendChild(acts);

  wrap.appendChild(noteBody(exam, d, n));

  // Previous / next along the blueprint, so reading straight through works.
  const foot = el('div', 'notefoot');
  const step = (dom, label, cls) => {
    if (!dom) { foot.appendChild(el('span', null, '')); return; }
    const b = el('button', 'notestep ' + cls);
    b.appendChild(el('span', 'muted small', label));
    b.appendChild(el('span', 'stepname', (dom.num ? 'D' + dom.num + ' · ' : '') + dom.name));
    b.onclick = () => openNote(exam, dom.id);
    foot.appendChild(b);
  };
  step(prev, '← Previous', 'prev');
  step(next, 'Next →', 'next');
  wrap.appendChild(foot);

  // The header's size control was just rebuilt along with everything else,
  // so re-bind it and push the stored value into the fresh label.
  initSize();

  highlightSpoken(false);   // survive the rebuild this function just did
  window.scrollTo(0, 0);
}


/* ---------- flashcards ---------- */
let C = null; // {list, i, flipped, got, missed}

function startCards(domId) {
  const exam = S.exam;
  let list = dueCards(exam, domId);
  if (!list.length) list = cardsFor(exam, domId);   // nothing due — review all
  if (!list.length) { alert('No flashcards for that selection yet.'); return; }
  list = list.slice().sort(() => Math.random() - 0.5).slice(0, 20);
  C = { list, i: 0, flipped: false, got: 0, missed: 0,
        grades: new Array(list.length), started: Date.now() };
  renderCard();
  go('cards');
}

function renderCard() {
  const c = C.list[C.i];
  const dom = EXAMS[S.exam].domains.find(d => d.id === c.d);
  $('#cProg').textContent = `${C.i + 1} / ${C.list.length}`;
  $('#cDomain').textContent = dom ? dom.name : '';
  $('#cBox').textContent = 'Box ' + cardState(c).box;
  $('#cFront').innerHTML = c.f;
  $('#cBack').innerHTML = c.b + (c.volatile
    ? '<div class="muted small vol">Version-sensitive — re-verify before exam day.</div>' : '');
  // A card you've already graded opens revealed, with its grade shown — going
  // back should let you re-read it, not re-test you on something just answered.
  const prior = C.grades[C.i];
  const seen = prior !== undefined;
  C.flipped = seen;
  $('#cBack').hidden = !seen;
  $('#cFlip').hidden = seen;
  $('#cGrade').hidden = !seen;

  const mark = $('#cMark');
  if (mark) {
    mark.hidden = !seen;
    if (seen) {
      mark.textContent = prior ? 'Marked: got it' : 'Marked: missed';
      mark.className = 'cardmark ' + (prior ? 'got' : 'miss');
    }
  }
  const prev = $('#cPrev'), next = $('#cNext');
  if (prev) prev.disabled = C.i === 0;
  if (next) next.disabled = C.i === C.list.length - 1;
  const done = C.grades.filter(g => g !== undefined).length;
  const counter = $('#cDone');
  if (counter) counter.textContent = done + ' graded';
}

function flipCard() {
  C.flipped = true;
  $('#cBack').hidden = false;
  $('#cFlip').hidden = true;
  $('#cGrade').hidden = false;
}

function gradeCurrent(got) {
  // Re-grading a card you navigated back to replaces the old grade rather than
  // counting twice. C.grades holds the decision per index, not a running tally.
  C.grades[C.i] = got;
  gradeCard(C.list[C.i], got);
  C.got = C.grades.filter(g => g === true).length;
  C.missed = C.grades.filter(g => g === false).length;

  const allGraded = C.grades.filter(g => g !== undefined).length === C.list.length;
  if (allGraded) { finishCards(); return; }
  // After grading, jump to the next card still ungraded — so re-grading an
  // earlier card doesn't strand you in the middle of a finished run.
  const nextUngraded = C.grades.findIndex((g, i) => g === undefined && i > C.i);
  const anyUngraded = C.grades.findIndex(g => g === undefined);
  C.i = nextUngraded !== -1 ? nextUngraded
      : anyUngraded !== -1 ? anyUngraded
      : Math.min(C.i + 1, C.list.length - 1);
  renderCard();
}

/** End the run and report. Only graded cards count — ending early reports what
 *  you actually did rather than scoring the skipped ones as misses. */
function finishCards() {
  const graded = C.grades.filter(g => g !== undefined).length;
  if (!graded) { C = null; go('study'); return; }

  const wrap = $('#resultBody'); wrap.innerHTML = '';
  wrap.appendChild(el('div', 'bigscore', `${C.got} / ${graded}`));
  wrap.appendChild(el('div', 'muted', 'recalled without help'));
  if (graded < C.list.length) {
    wrap.appendChild(el('div', 'muted small',
      `${C.list.length - graded} card${C.list.length - graded === 1 ? '' : 's'} left ungraded.`));
  }
  if (C.missed) {
    const d = el('div', 'mockline');
    d.innerHTML = `${C.missed} card${C.missed === 1 ? '' : 's'} reset to box 1 — due again next session.`;
    wrap.appendChild(d);
  }
  S.sessions.push({ ts: Date.now(), exam: S.exam, total: graded, correct: C.got,
                   mode: 'cards', domain: null,
                   ms: C.started ? Date.now() - C.started : null });
  save();
  go('result');
}

/** Score report, shaped like the real one: pass/fail, a scaled 100-1000 score,
 *  and percent-correct per domain (which the guides state is informational and
 *  not what determines the result). */
function finishExam() {
  const ex = EXAMS[S.exam];
  const raw = Q.correct / Q.list.length;
  const scaled = Math.round(100 + raw * 900);
  const passed = scaled >= PASS_MARK;

  S.sessions.push({ ts: Date.now(), exam: S.exam, total: Q.list.length,
                    correct: Q.correct, mode: 'exam', scaled,
                    domain: null, ms: Q.started ? Date.now() - Q.started : null });
  save();

  const wrap = $('#resultBody'); wrap.innerHTML = '';

  const verdict = el('div', 'verdictbig ' + (passed ? 'pass' : 'fail'));
  verdict.textContent = passed ? 'PASS' : 'DID NOT PASS';
  wrap.appendChild(verdict);

  const sc = el('div', 'scaledbig');
  sc.innerHTML = `<strong>${scaled}</strong><span class="muted"> / 1000</span>`;
  wrap.appendChild(sc);
  wrap.appendChild(el('div', 'muted small',
    `${PASS_MARK} to pass · ${Q.correct} of ${Q.list.length} correct · `
    + `${fmtClock(Q.elapsedMs)} of ${ex.minutes}:00 used`));

  if (Q.autoSubmitted) {
    const w = el('div', 'mockline');
    w.textContent = 'Time expired — the paper was submitted automatically.';
    wrap.appendChild(w);
  }

  wrap.appendChild(el('h2', 'labsec', 'Percent correct by domain'));
  wrap.appendChild(el('p', 'muted small',
    'Informational only. Your result is determined by the total scaled score.'));

  const bd = el('div', 'dtable');
  ex.domains.forEach(d => {
    const v = Q.byDom[d.id];
    if (!v) return;
    const pct = Math.round(v.ok / v.n * 100);
    const row = el('div', 'drow');
    const nm = el('div', 'dname');
    if (d.num) nm.appendChild(el('span', 'dnum', 'D' + d.num));
    nm.appendChild(el('span', null, d.name));
    const bar = el('div', 'dbar');
    const fill = el('div', 'dbarfill ' + (pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'low'));
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    // Distinct from the dashboard bar: this is THIS sitting, not mastery.
    const wt = el('div', 'dwt', d.weight + '%');
    wt.title = d.weight + '% of the exam blueprint, so '
      + v.n + ' of the ' + Q.list.length + ' questions in this sitting.';
    bar.title = pct + '% correct on this attempt — ' + v.ok + ' of ' + v.n + '.';
    const st = el('div', 'dstat', `${pct}%  ${v.ok}/${v.n}`);
    st.title = 'You answered ' + v.ok + ' of ' + v.n + ' ' + d.name
      + ' questions correctly in this exam.';
    row.append(nm, wt, bar, st);
    bd.appendChild(row);
  });
  wrap.appendChild(bd);

  // Offer the missed questions as a drill rather than dumping explanations here
  const wrong = Q.list.filter((q, i) => {
    const got = (Q.answers[i] || []).slice().sort().join(',');
    return got !== answersOf(q).slice().sort().join(',');
  });
  if (wrong.length) {
    const act = el('div', 'actions');
    const b = el('button', 'btn', `Review the ${wrong.length} you missed`);
    b.onclick = () => {
      Q = { list: wrong, i: 0, answered: false, picked: [], correct: 0,
            mode: 'review', started: Date.now() };
      renderQuiz(); go('quiz');
    };
    act.appendChild(b);
    wrap.appendChild(act);
  }
  go('result');
}

/** Move without grading. Clamped; does not wrap. */
function stepCard(dir) {
  const next = C.i + dir;
  if (next < 0 || next >= C.list.length) return;
  C.i = next;
  renderCard();
}

/* ---------- quiz view ---------- */
function renderQuiz() {
  const q = Q.list[Q.i];
  const exam = S.exam;
  const isExam = Q.mode === 'exam';
  const dom = EXAMS[exam].domains.find(d => d.id === qDomainFor(q, exam));
  $('#qProg').textContent = `${Q.i + 1} / ${Q.list.length}`;
  $('#qMode').textContent = isExam ? EXAMS[exam].code + ' practice exam'
    : Q.mode === 'mock' ? 'Full-length practice' : Q.mode === 'weak' ? 'Weak areas'
    : Q.mode === 'domain' ? 'Domain drill' : 'Quick quiz';

  // Exam chrome: clock, flag control, prev/next, progress strip
  $('#examBar').hidden = !isExam;
  $('#examNav').hidden = !isExam;
  $('#qDomain').hidden = isExam;        // the real exam doesn't label the domain
  if (isExam) {
    const scen = scenarioFor(exam, q);
    $('#qScenario').textContent = scen || '';
    $('#qScenario').hidden = !scen;
    $('#btnFlag').textContent = Q.flags[Q.i] ? 'Flagged for review' : 'Flag for review';
    $('#btnFlag').classList.toggle('on', !!Q.flags[Q.i]);
    $('#btnPrevQ').disabled = Q.i === 0;
    renderExamStrip();
  } else {
    $('#qScenario').hidden = true;
  }
  $('#qDomain').textContent = dom ? dom.name : '';
  $('#qKind').textContent = q.kind === 'scenario' ? 'Scenario' : 'Recall';
  $('#qKind').className = 'pill ' + (q.kind === 'scenario' ? 'scn' : 'rec');
  $('#qText').innerHTML = q.q;

  const multi = !!q.multi;
  const nAns = answersOf(q).length;
  const WORD = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
  // The real exams state how many to select. Suppress it when every option is
  // correct, because there the count IS the answer.
  $('#qHint').textContent = !multi ? 'Select ONE'
    : nAns >= q.opts.length ? 'Select all that apply'
    : `Select ${WORD[nAns] || nAns}`;
  // A right-click gesture nobody is told about is a gesture nobody uses.
  $('#qHint').title = 'Right-click an option to rule it out, and again to '
    + 'restore it. Keyboard: focus the option and press X.';

  const box = $('#qOpts'); box.innerHTML = '';
  Q.picked = [];
  Q.answered = false;
  // Option order is shuffled once per question and remembered for the
  // session, so re-rendering (flagging, prev/next in exam mode) does not
  // reshuffle under you. Q.picked always holds ORIGINAL indexes.
  Q.order = Q.order || {};
  if (!Q.order[Q.i]) Q.order[Q.i] = shuffleOptions(q);
  const order = Q.order[Q.i];
  order.forEach((idx, pos) => {
    const text = q.opts[idx];
    const b = el('button', 'opt ' + (multi ? 'multi' : 'single'));
    b.setAttribute('role', multi ? 'checkbox' : 'radio');
    b.setAttribute('aria-checked', 'false');
    b.innerHTML = `<span class="optbox" aria-hidden="true"></span>`
      + `<span class="optmark">${multi ? '' : String.fromCharCode(65 + pos)}</span>`
      + `<span class="opttext">${text}</span>`;
    // Right-click rules an option out. Keyed by the ORIGINAL option index,
    // not the shuffled position, so the mark stays on the option it was put
    // on when the question re-renders.
    if (typeof enableStrike === 'function') {
      enableStrike(b, q.id, idx, { locked: () => Q.answered });
    }
    b.onclick = () => {
      if (isExam) {
        // Record only. No correctness shown, and the answer stays changeable.
        if (multi) {
          const at = Q.picked.indexOf(idx);
          if (at >= 0) Q.picked.splice(at, 1); else Q.picked.push(idx);
        } else {
          Q.picked = [idx];
        }
        Q.answers[Q.i] = Q.picked.slice();
        renderExamSelection();
        renderExamStrip();
        return;
      }
      if (Q.answered) return;
      if (multi) {
        const at = Q.picked.indexOf(idx);
        if (at >= 0) Q.picked.splice(at, 1); else Q.picked.push(idx);
        b.classList.toggle('sel');
        b.setAttribute('aria-checked', String(b.classList.contains('sel')));
        $('#btnSubmit').disabled = Q.picked.length === 0;
      } else {
        Q.picked = [idx];
        grade();
      }
    };
    box.appendChild(b);
  });

  if (isExam) {
    Q.picked = (Q.answers[Q.i] || []).slice();
    renderExamSelection();
    $('#btnSubmit').hidden = true;
    $('#qExplain').hidden = true;
    $('#confRow').hidden = true;
    $('#btnNext').hidden = true;
    $('#btnNextQ').textContent = Q.i === Q.list.length - 1 ? 'Review answers' : 'Next';
    return;
  }

  $('#btnSubmit').hidden = !multi;
  $('#btnSubmit').disabled = true;
  $('#qExplain').hidden = true;
  $('#confRow').hidden = true;
  $('#btnNext').hidden = true;
}

/** Paint the current selection without revealing anything. */
function renderExamSelection() {
  // Buttons are in shuffled order, so translate position back to the
  // original option index before testing what is picked.
  const order = (Q.order && Q.order[Q.i]) || null;
  const q = Q.list[Q.i];
  document.querySelectorAll('#qOpts .opt').forEach((b, pos) => {
    const idx = order ? order[pos] : pos;
    const on = Q.picked.includes(idx);
    b.classList.toggle('sel', on);
    b.setAttribute('aria-checked', String(on));
    // This repaints the class list, so any rule-out mark has to be put back
    // or selecting an answer would silently clear the others' strikes.
    if (typeof applyStrike === 'function' && q) applyStrike(b, q.id, idx);
  });
}

/** Which of the exam's named scenarios this question belongs to, if any. */
function scenarioFor(exam, q) {
  const list = EXAMS[exam].scenarios;
  if (!list || !Q.scenarioMap) return null;
  return Q.scenarioMap[q.id] || null;
}

/** Answered / flagged strip so you can jump straight to a question. */
function renderExamStrip() {
  const strip = $('#examStrip');
  if (!strip) return;
  strip.innerHTML = '';
  Q.list.forEach((_, i) => {
    const b = el('button', 'sq');
    b.textContent = String(i + 1);
    if ((Q.answers[i] || []).length) b.classList.add('done');
    if (Q.flags[i]) b.classList.add('flag');
    if (i === Q.i) b.classList.add('cur');
    b.onclick = () => { Q.i = i; renderQuiz(); };
    strip.appendChild(b);
  });
}

function grade() {
  if (Q.answered) return;
  Q.answered = true;
  const q = Q.list[Q.i];
  // The answer is about to be revealed; rule-out marks would compete with
  // the right/wrong colouring that replaces them.
  if (typeof clearStrikes === 'function') clearStrikes(q.id);
  const right = answersOf(q).slice().sort().join(',');
  const got = Q.picked.slice().sort().join(',');
  const ok = right === got;
  Q.lastOK = ok;

  const gOrder = (Q.order && Q.order[Q.i]) || null;
  document.querySelectorAll('#qOpts .opt').forEach((b, pos) => {
    const idx = gOrder ? gOrder[pos] : pos;
    b.classList.add('done');
    if (answersOf(q).includes(idx)) b.classList.add('right');
    else if (Q.picked.includes(idx)) b.classList.add('wrong');
  });

  $('#btnSubmit').hidden = true;
  const ex = $('#qExplain');
  ex.innerHTML = '';
  ex.appendChild(el('div', 'verdict ' + (ok ? 'ok' : 'no'), ok ? 'Correct' : 'Not quite'));
  const p = el('div', 'why'); p.innerHTML = q.why; ex.appendChild(p);
  if (q.volatile) ex.appendChild(el('div', 'muted small vol', 'Version-sensitive: re-verify against current docs before exam day.'));
  // A shared question names the exam being studied, not the first one listed.
  const qExam = Array.isArray(q.exam) ? (q.exam.includes(S.exam) ? S.exam : q.exam[0]) : q.exam;
  if (typeof questionRef === 'function') {
    ex.appendChild(questionRef(q.id, q.q, qExam, Q.mode === 'mock' ? 'Practice exam' : 'Drill'));
  }
  ex.hidden = false;
  $('#confRow').hidden = false;
}

/** conf === null means "skip": the result still counts, but no confidence
 *  signal is recorded, so it can't distort the calibration numbers. */
function answerConf(conf) {
  const q = Q.list[Q.i];
  recordAnswer(q.id, Q.lastOK, conf || 'skip');
  if (Q.lastOK) Q.correct++;
  $('#confRow').hidden = true;
  // Shown only now, so the attempt just rated is part of the history.
  // Exam mode has no per-question feedback at all, so it is skipped there.
  if (Q.mode !== 'exam') {
    const hist = questionHistory(q.id);
    if (hist) $('#qExplain').appendChild(hist);
  }
  $('#btnNext').hidden = false;
  $('#btnNext').textContent = (Q.i === Q.list.length - 1) ? 'Finish' : 'Next question';
  $('#btnNext').focus();
}

function nextQ() {
  if (Q.i === Q.list.length - 1) { finishQuiz(); return; }
  Q.i++; renderQuiz();
}

function finishQuiz() {
  S.sessions.push({ ts: Date.now(), exam: S.exam, total: Q.list.length,
                    correct: Q.correct, mode: Q.mode,
                    domain: (Q.opts && Q.opts.domain) || null,
                    ms: Q.started ? Date.now() - Q.started : null });
  save();
  const pct = Math.round(Q.correct / Q.list.length * 100);
  const r = readiness(S.exam);
  const wrap = $('#resultBody'); wrap.innerHTML = '';
  wrap.appendChild(el('div', 'bigscore', `${Q.correct} / ${Q.list.length}`));
  // Name what was actually drilled, so repeating it is an informed choice.
  const dom = Q.opts && Q.opts.domain
    ? EXAMS[S.exam].domains.find(x => x.id === Q.opts.domain) : null;
  const what = dom ? `${dom.num ? 'D' + dom.num + ' · ' : ''}${dom.name}`
    : Q.mode === 'weak' ? 'Weak areas'
    : Q.mode === 'review' ? 'Missed questions'
    : Q.mode === 'mock' ? 'Full-length practice' : 'Quick quiz';
  wrap.appendChild(el('div', 'muted', `${pct}% this session · ${what}`));
  if (Q.mode === 'mock') {
    const sc = Math.round(100 + (Q.correct / Q.list.length) * 900);
    const d = el('div', 'mockline');
    d.innerHTML = `Scaled estimate <strong>${sc}</strong> — `
      + `${sc >= PASS_MARK ? 'above' : 'below'} the ${PASS_MARK} pass mark`;
    wrap.appendChild(d);
    // Seeing the answer after each question inflates this relative to a real
    // sitting, so don't let it read as a prediction.
    wrap.appendChild(el('div', 'muted small',
      'Seeing each answer as you go makes this run easier than the real exam. '
      + 'Use the timed mock for a score worth trusting.'));
  }
  // per-domain breakdown for this session
  const byDom = {};
  Q.list.forEach((q, i) => {
    const d = qDomainFor(q, S.exam);
    byDom[d] = byDom[d] || { n: 0, ok: 0 };
    byDom[d].n++;
    const h = S.history[q.id]; if (h && h.length && h[h.length - 1].correct) byDom[d].ok++;
  });
  const bd = el('div', 'bdlist');
  EXAMS[S.exam].domains.forEach(d => {
    const v = byDom[d.id]; if (!v) return;
    const row = el('div', 'bdrow');
    row.appendChild(el('span', null, d.name));
    row.appendChild(el('span', 'muted', `${v.ok}/${v.n}`));
    bd.appendChild(row);
  });
  wrap.appendChild(bd);

  // Straight into the notes for whatever you just drilled, or the weakest
  // domain of a mixed round — the moment you know you need them.
  const weakest = dom || EXAMS[S.exam].domains
    .filter(x => byDom[x.id] && noteFor(S.exam, x.id))
    .sort((a, b) => (byDom[a.id].ok / byDom[a.id].n) - (byDom[b.id].ok / byDom[b.id].n))[0];
  if (weakest && noteFor(S.exam, weakest.id)) {
    const act = el('div', 'actions');
    const b = el('button', 'btn sec',
      `Read the notes: ${weakest.num ? 'D' + weakest.num + ' · ' : ''}${weakest.name}`);
    b.onclick = () => openNote(S.exam, weakest.id);
    act.appendChild(b);
    wrap.appendChild(act);
  }

  // Name the repeat, so it's clear another round means the same thing again.
  const again = $('#btnAgain');
  if (again) again.textContent = dom
    ? `Another ${dom.num ? 'D' + dom.num + ' ' : ''}round`
    : 'Another round';

  go('result');
}

/* ---------- lab starter projects ---------- */
/* Bundled as one Markdown file rather than a zip: zipping needs a library and
   a build step, and this page runs from file:// with neither. The bundle is
   readable as-is and unpacks with the script printed at the top of it. */
function starterBundle(labId) {
  const s = STARTERS[labId];
  if (!s) return null;
  const files = Object.assign({}, STARTER_COMMON, s.files);
  files["package.json"] = pkg(s.dir, s.deps);
  files["src/client.ts"] = CLIENT_TS;
  files["README.md"] = starterReadme(labId, s);

  const order = ["README.md", "package.json", "tsconfig.json", ".env.example", ".gitignore"];
  const names = order.filter(n => files[n])
    .concat(Object.keys(files).filter(n => !order.includes(n)).sort());

  const lang = n => n.endsWith('.ts') ? 'ts'
    : n.endsWith('.json') ? 'json'
    : n.endsWith('.md') ? 'md' : 'text';

  const BRK = '\n';
  let out = '# ' + s.dir + ' — starter project' + BRK + BRK;
  out += '## Unpacking this file' + BRK + BRK;
  out += 'The unpack script is the **last section of this document**. Copy that code'
       + BRK + 'block into a file named `unpack.mjs` next to this one, then run:' + BRK + BRK;
  out += '```bash' + BRK;
  out += 'node unpack.mjs ' + s.dir + '.md' + BRK;
  out += 'cd ' + s.dir + BRK;
  out += 'npm install' + BRK;
  out += 'cp .env.example .env     # Windows: copy .env.example .env' + BRK;
  out += '#   then put your ANTHROPIC_API_KEY in .env' + BRK;
  out += 'npm start' + BRK;
  out += '```' + BRK + BRK;
  out += 'Needs Node 20 or newer. Would rather not run the script? Every heading below'
       + BRK + "is a file path and every block is that file's contents — create them by hand."
       + BRK + BRK + '---' + BRK + BRK;
  names.forEach(n => {
    out += `## \`${n}\`\n\n`;
    out += '```' + lang(n) + '\n' + files[n].replace(/\n$/, '') + '\n```\n\n';
  });
  out += `---\n\n## \`unpack.mjs\`\n\n`;
  out += `Copy this whole block into a file called \`unpack.mjs\`, saved next to this bundle,\nthen run \`node unpack.mjs ${s.dir}.md\`.\n\n`;
  out += '```js\n' + UNPACK_SCRIPT + '\n```\n';
  return { name: s.dir + '.md', text: out };
}

const UNPACK_SCRIPT = `// Writes every file in a starter bundle to disk, then prints next steps.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const bundle = process.argv[2];
if (!bundle) { console.error("usage: node unpack.mjs <bundle>.md"); process.exit(1); }

const md = await readFile(bundle, "utf8");
const root = bundle.replace(/\\.md$/, "");
const re = /^## \`([^\`]+)\`\\n\\n\`\`\`[a-z]*\\n([\\s\\S]*?)\\n\`\`\`/gm;

let n = 0, m;
while ((m = re.exec(md))) {
  const [, path, body] = m;
  if (path === "unpack.mjs") continue;
  const full = join(root, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, body + "\\n", "utf8");
  console.log("  " + full);
  n++;
}
console.log("");
console.log("wrote " + n + " files");
console.log("");
console.log("  cd " + root);
console.log("  npm install");
console.log("  cp .env.example .env     # then add your ANTHROPIC_API_KEY");
console.log("  npm start");`;

function starterReadme(labId, s) {
  const lab = LABS.find(l => l.id === labId);
  return `# ${lab ? lab.title : s.dir}

${s.blurb}

## Run it

\`\`\`bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env and add your ANTHROPIC_API_KEY
npm start
\`\`\`

\`npm run typecheck\` type-checks without running.

## What's deliberately missing

The TODOs in \`src/\` are the lab's checkpoints. The starter removes setup
friction — API client, tool plumbing, sample data — not the thinking. Work
through the checkpoints in the app, and use the hints when you're stuck.

## Requirements

Node 20 or newer, and an Anthropic API key. Everything runs through \`tsx\`,
so there is no build step while you're iterating.
`;
}

function downloadStarter(labId) {
  const bundle = starterBundle(labId);
  if (!bundle) return;
  try {
    const blob = new Blob([bundle.text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = bundle.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    alert('Download failed in this browser. The bundle is plain Markdown — '
      + 'you can copy it from data-starters.js instead.');
  }
}

/** Repeat the last quiz with the SAME mode and options. Dropping the options
 *  here is what previously turned a D1 drill into an unfiltered quiz. */
function againRound() {
  if (!Q) { startQuiz('quick'); return; }
  // 'review' is a one-off list of missed questions — repeating it means
  // another round of the mode it came from, not the same list again.
  const mode = Q.mode === 'review' ? 'quick' : Q.mode;
  startQuiz(mode, Q.opts || undefined);
}

/* ---------- labs ---------- */
function labProgress(l) {
  const st = S.labs[l.id] || { checkpoints: {} };
  const done = Object.keys(st.checkpoints || {}).filter(k => st.checkpoints[k]).length;
  return { done, total: l.checkpoints.length };
}

function renderLabs() {
  const wrap = $('#labList'); wrap.innerHTML = '';
  const exam = S.exam;
  const mine = LABS.filter(l => l.exams.includes(exam));

  // which of this exam's domains a lab actually touches
  const covered = new Set();
  mine.forEach(l => (l.domains[exam] || []).forEach(d => covered.add(d)));
  const total = EXAMS[exam].domains.length;
  $('#labIntro').textContent = mine.length
    ? `${mine.length} labs for ${EXAMS[exam].code}, covering ${covered.size} of its ${total} domains. Each lists checkpoints you can verify yourself, with hints when you're stuck.`
    : `No labs for ${EXAMS[exam].code} yet.`;

  const section = (title, list) => {
    if (!list.length) return;
    wrap.appendChild(el('h2', 'labsec', title));
    list.forEach(l => {
      const p = labProgress(l);
      const det = el('details', 'lab');
      det.id = 'lab-' + l.id;
      const sum = el('summary');
      sum.innerHTML = `<span class="labtitle">${l.title}</span>
        <span class="labmeta"><span class="tag ${l.level === 'Core' ? 'core' : l.level === 'Depth' ? 'depth' : 'optional'}">${l.level}</span>
        <span class="muted small">${l.effort}</span>
        <span class="labcount ${p.done === p.total ? 'full' : ''}">${p.done}/${p.total}</span></span>`;
      det.appendChild(sum);

      const body = el('div', 'labbody');
      const dm = (l.domains[exam] || []).map(id => {
        const d = EXAMS[exam].domains.find(x => x.id === id);
        return d ? `${d.name} (${d.weight}%)` : null;
      }).filter(Boolean);
      if (dm.length) {
        const dd = el('div', 'labdoms');
        dm.forEach(t => dd.appendChild(el('span', 'tag dom', t)));
        body.appendChild(dd);
      }
      body.appendChild(labField('Why this matters', l.why));
      body.appendChild(labField('Build', l.build));

      if (l.start) {
        const st = el('details', 'labstart');
        st.appendChild(el('summary', null, 'Getting started'));
        const sb = el('div', 'labstartbody');

        // starter project: a complete runnable scaffold, TODOs at the checkpoints
        if (STARTERS[l.id]) {
          const box = el('div', 'starter');
          const head = el('div', 'starterhead');
          const txt = el('div');
          txt.appendChild(el('strong', null, 'Starter project'));
          txt.appendChild(el('div', 'muted small', STARTERS[l.id].blurb));
          const btn = el('button', 'mini', 'Download');
          btn.onclick = (e) => { e.preventDefault(); downloadStarter(l.id); };
          head.append(txt, btn);
          box.appendChild(head);
          // Numbered because the order matters and two steps are easy to miss:
          // the bundle lands in your downloads folder, and unpack.mjs ships
          // INSIDE it, so it has to be written out before it can be run.
          const dir = STARTERS[l.id].dir;
          const ol = el('ol', 'startersteps');
          const step = (label, code) => {
            const li = el('li');
            li.appendChild(el('div', 'stepwhat', label));
            if (code) { const pre = el('pre', 'labcode'); pre.textContent = code; li.appendChild(pre); }
            ol.appendChild(li);
          };
          step('Click Download. Your browser saves ' + dir + '.md to its downloads folder.');
          step('Open a terminal there and make a folder for the lab.',
               ['cd ~/Downloads                      # wherever your browser saved it',
                'mkdir ' + dir + '-lab',
                'mv ' + dir + '.md ' + dir + '-lab/      # Windows: move ' + dir + '.md ' + dir + '-lab',
                'cd ' + dir + '-lab'].join(NL));
          step('Open the bundle. Its last section is the unpack script — copy that '
             + 'code block into a new file called unpack.mjs in the same folder.');
          step('Unpack, install, add your key, then run it.',
               ['node unpack.mjs ' + dir + '.md',
                'cd ' + dir,
                'npm install',
                'cp .env.example .env     # Windows: copy .env.example .env',
                '#   then put your ANTHROPIC_API_KEY in .env',
                'npm start'].join(NL));
          box.appendChild(ol);
          box.appendChild(el('div', 'muted small',
            'Needs Node 20+. The bundle is one Markdown file containing every '
            + 'source file plus the unpack script — no build step, nothing to trust blindly.'));
          sb.appendChild(box);
        } else if (NO_STARTER[l.id]) {
          const n = el('div', 'muted small nostarter');
          n.textContent = 'No starter project: ' + NO_STARTER[l.id];
          sb.appendChild(n);
        }

        if (l.start.setup) {
          sb.appendChild(el('div', 'lablabel', 'Setup'));
          sb.appendChild(el('div', 'labtext', l.start.setup));
        }
        if (l.start.first) {
          sb.appendChild(el('div', 'lablabel', 'First move'));
          sb.appendChild(el('div', 'labtext', l.start.first));
        }
        if (l.start.shape) {
          sb.appendChild(el('div', 'lablabel', 'Shape of the thing'));
          const pre = el('pre', 'labcode'); pre.textContent = l.start.shape;
          sb.appendChild(pre);
        }
        st.appendChild(sb);
        body.appendChild(st);
      }

      const cp = el('div', 'labfield');
      cp.appendChild(el('div', 'lablabel', 'Checkpoints'));
      const ul = el('div', 'cplist');
      l.checkpoints.forEach((c, i) => {
        const st = S.labs[l.id] || { checkpoints: {} };
        const id = `cp-${l.id}-${i}`;
        const row = el('label', 'cp');
        const cb = el('input'); cb.type = 'checkbox'; cb.id = id;
        cb.checked = !!(st.checkpoints && st.checkpoints[i]);
        cb.onchange = () => {
          S.labs[l.id] = S.labs[l.id] || { checkpoints: {} };
          S.labs[l.id].checkpoints[i] = cb.checked;
          save();
          const np = labProgress(l);
          const badge = det.querySelector('.labcount');
          badge.textContent = `${np.done}/${np.total}`;
          badge.classList.toggle('full', np.done === np.total);
        };
        row.append(cb, el('span', null, c));

        const hint = (l.hints || {})[i];
        if (hint) {
          // wrap so the hint sits under its checkpoint rather than beside it
          const cell = el('div', 'cpcell');
          cell.appendChild(row);
          const h = el('details', 'cphint');
          h.appendChild(el('summary', null, 'Hint'));
          const hb = el('div', 'cphintbody'); hb.innerHTML = hint;
          h.appendChild(hb);
          cell.appendChild(h);
          ul.appendChild(cell);
          return;
        }
        ul.appendChild(row);
      });
      cp.appendChild(ul);
      body.appendChild(cp);

      body.appendChild(labField('Stretch', l.stretch));
      const tr = labField('Watch for', l.trap);
      tr.classList.add('trap');
      body.appendChild(tr);

      det.appendChild(body);
      wrap.appendChild(det);
    });
  };
  if (mine.length) {
    const core = mine.filter(l => l.level === 'Core');
    const depth = mine.filter(l => l.level === 'Depth');
    const opt = mine.filter(l => l.level !== 'Core' && l.level !== 'Depth');
    section('Core — build these first', core);
    section('Depth', depth);
    section('Optional', opt);
  } else {
    const empty = el('div', 'focus');
    empty.appendChild(el('strong', null, `No labs written for ${exam} yet.`));
    empty.appendChild(el('div', 'muted small',
      'Its questions, explanations and notes still apply. Labs live in data-labs.js — add one with this exam in its `exams` array and it appears here.'));
    wrap.appendChild(empty);
  }
}
function labField(label, text) {
  const d = el('div', 'labfield');
  d.appendChild(el('div', 'lablabel', label));
  d.appendChild(el('div', 'labtext', text));
  return d;
}

/* ---------- progress ---------- */
/* The weakest individual questions for the selected certification.
 *
 * This was the Progress page, which had shrunk to this list plus a reset
 * button. It belongs on the Dashboard: that page is already the selected
 * exam's home, and "What to work on next" is the same idea one level up —
 * domains there, the individual questions behind them here.
 *
 * Scoped to the selected exam. Pooling all four meant a CCAR-F list could
 * fill with CCAO-F items you were not studying; the domain tag says where
 * to go and revise.
 */
function renderRevisit(wrap) {
  if (!wrap) return;
  wrap.innerHTML = '';
  const exam = S.exam;
  const weak = poolFor(exam, { hard: 'any' })
    .map(q => ({ q, st: statsFor(q.id), dom: qDomainFor(q, exam) }))
    .filter(x => x.st && x.st.score < 0.7)
    .sort((a, b) => a.st.score - b.st.score)
    .slice(0, 12);

  if (!weak.length) {
    wrap.appendChild(el('p', 'muted', 'Nothing below the threshold yet.'));
    return;
  }
  const list = el('div', 'weaklist');
  weak.forEach(({ q, st, dom }) => {
    const row = el('div', 'weakrow');
    const t = el('div');
    const d = EXAMS[exam].domains.find(x => x.id === dom);
    if (d) t.appendChild(el('div', 'weakdom', (d.num ? 'D' + d.num + ' \u00b7 ' : '') + d.name));
    const qt = el('div'); qt.innerHTML = q.q;
    t.appendChild(qt);
    // A compact attempt strip says WHY it is weak: a run of confident
    // misses reads very differently from one bad guess.
    const h = S.history[q.id] || [];
    if (h.length > 1) {
      const strip = el('div', 'qhtrack mini');
      h.slice(-8).forEach(rec => {
        const dot = el('div', 'qhdot'
          + (rec.correct ? ' right' : ' wrong')
          + (!rec.correct && rec.conf === 'sure' ? ' blind' : '')
          + (rec.correct && rec.conf === 'guess' ? ' lucky' : ''));
        dot.style.setProperty('--v', String(attemptValue(rec)));
        dot.title = attemptLabel(rec) + ' \u00b7 ' + agoShort(rec.ts);
        strip.appendChild(dot);
      });
      t.appendChild(strip);
    }
    // Straight into a drill on that domain, so the list is actionable
    // rather than just diagnostic.
    row.appendChild(t);
    const right = el('div', 'weakright');
    right.appendChild(el('span', 'tag warn', Math.round(st.score * 100) + '%'));
    if (d) {
      const b = el('button', 'mini ghost', 'Drill');
      b.title = 'Drill ' + d.name;
      b.onclick = () => startQuiz('domain', { domain: d.id });
      right.appendChild(b);
    }
    row.appendChild(right);
    list.appendChild(row);
  });
  wrap.appendChild(list);
}

/* What one certification's progress consists of, and how much there is.
 * Shared questions make this less obvious than it looks: an answer belongs
 * to the exam it was given under, not to every exam the question appears in. */
function examTally(exam) {
  let answers = 0;
  const qids = [];
  Object.keys(S.history).forEach(qid => {
    const q = QUESTIONS.find(x => x.id === qid);
    if (!q) return;
    const mine = (S.history[qid] || []).filter(r =>
      r.exam ? r.exam === exam : qExams(q).includes(exam));
    if (mine.length) { answers += mine.length; qids.push(qid); }
  });
  const prefix = exam + '/';
  const cards = Object.keys(S.cards).filter(k => k.startsWith(prefix)).length;
  const read = Object.keys(S.read).filter(k => k.startsWith(prefix)).length;
  const flags = Object.keys(S.flags).filter(k => k.startsWith(prefix)).length;
  const sessions = S.sessions.filter(s => s.exam === exam).length;
  // A lab can serve several exams; only count ones that apply to this one.
  let checkpoints = 0, labIds = [];
  LABS.filter(l => l.exams.includes(exam)).forEach(l => {
    const st = S.labs[l.id];
    if (!st) return;
    const hit = Object.values(st.checkpoints || {}).filter(Boolean).length;
    if (hit || st.done) { checkpoints += hit; labIds.push(l.id); }
  });
  const sims = (S.simAttempts || []).filter(a => a.exam === exam).length;
  return { answers, qids, cards, read, flags, sessions, checkpoints, labIds, sims,
           any: answers || cards || read || flags || sessions || checkpoints || sims };
}

/* Erase one certification's progress, leaving the others untouched.
 * Answers on a shared question are removed only where they were recorded
 * under this exam, so resetting CCDV-F cannot wipe CCAR-F work. */
function resetExam(exam) {
  const t = examTally(exam);
  t.qids.forEach(qid => {
    const q = QUESTIONS.find(x => x.id === qid);
    const keep = (S.history[qid] || []).filter(r =>
      r.exam ? r.exam !== exam : !qExams(q).includes(exam));
    if (keep.length) S.history[qid] = keep;
    else { delete S.history[qid]; delete S.seen[qid]; }
  });
  const prefix = exam + '/';
  Object.keys(S.cards).forEach(k => { if (k.startsWith(prefix)) delete S.cards[k]; });
  Object.keys(S.read).forEach(k => { if (k.startsWith(prefix)) delete S.read[k]; });
  Object.keys(S.flags).forEach(k => { if (k.startsWith(prefix)) delete S.flags[k]; });
  S.sessions = S.sessions.filter(s => s.exam !== exam);
  S.simAttempts = (S.simAttempts || []).filter(a => a.exam !== exam);
  // Only clear a lab if no other certification still uses it.
  t.labIds.forEach(id => {
    const lab = LABS.find(l => l.id === id);
    const sharedWith = lab ? lab.exams.filter(e => e !== exam) : [];
    if (!sharedWith.length) delete S.labs[id];
  });
  save();
}

/* Everything recorded across every certification, for the global reset. */
function totalTally() {
  return {
    answers: Object.values(S.history).reduce((n, h) => n + h.length, 0),
    cards: Object.keys(S.cards).length,
    read: Object.keys(S.read).length,
    checkpoints: Object.values(S.labs).reduce((n, l) =>
      n + Object.values(l.checkpoints || {}).filter(Boolean).length, 0),
    sims: (S.simAttempts || []).length
  };
}

/* A destructive action behind a phrase you have to type.
 *
 * A single confirm() is dismissed reflexively — it is the same dialog people
 * click through a dozen times a day, and it carries no information about what
 * is being destroyed. Typing the exam code (or DELETE for everything) cannot
 * be done by accident or by muscle memory, and it forces the wording of the
 * consequence to be read on the way past. The gate stays closed until the
 * phrase matches exactly, and collapses again after it fires.
 */
function armedReset(opts) {
  // opts: { cls, title, detail, phrase, label, disabled, run }
  const box = el('div', 'danger' + (opts.cls ? ' ' + opts.cls : ''));
  const text = el('div', 'ftext');
  text.appendChild(el('strong', null, opts.title));
  text.appendChild(el('div', 'muted small', opts.detail));
  box.appendChild(text);

  if (opts.disabled) {
    const b = el('button', 'mini danger-btn', opts.label);
    b.disabled = true;
    box.appendChild(b);
    return box;
  }

  const arm = el('button', 'mini danger-btn', opts.label);
  box.appendChild(arm);

  // The confirmation row replaces the button in place rather than opening a
  // dialog, so the description of what is about to be erased stays on screen
  // while you type.
  const gate = el('div', 'resetgate');
  gate.hidden = true;
  const prompt = el('label', 'resetprompt');
  const pid = 'reset-' + Math.random().toString(36).slice(2, 8);
  prompt.setAttribute('for', pid);
  prompt.innerHTML = 'Type <strong>' + opts.phrase + '</strong> to confirm';
  const row = el('div', 'resetrow');
  const field = el('input', 'resetinput');
  field.type = 'text'; field.id = pid;
  field.setAttribute('autocomplete', 'off');
  field.setAttribute('spellcheck', 'false');
  field.setAttribute('aria-label', 'Type ' + opts.phrase + ' to confirm');
  const go2 = el('button', 'mini danger-btn', 'Erase');
  go2.disabled = true;
  const cancel = el('button', 'mini ghost', 'Cancel');

  const close = () => {
    gate.hidden = true;
    arm.hidden = false;
    field.value = '';
    go2.disabled = true;
  };
  // Exact match, trimmed only for stray whitespace — not case-folded, so the
  // phrase has to be typed as shown.
  const check = () => { go2.disabled = String(field.value).trim() !== opts.phrase; };
  field.oninput = check;
  field.onkeydown = ev => {
    if (ev.key === 'Enter' && !go2.disabled) { ev.preventDefault(); go2.onclick(); }
    if (ev.key === 'Escape') close();
  };
  cancel.onclick = close;
  go2.onclick = () => { if (go2.disabled) return; close(); opts.run(); };

  arm.onclick = () => {
    arm.hidden = true;
    gate.hidden = false;
    field.focus();
  };

  row.append(field, go2, cancel);
  gate.append(prompt, row);
  box.appendChild(gate);
  return box;
}

/* Reset for the selected certification. Lives on Progress, where everything
   else is also scoped to that one exam. */
function renderExamReset(wrap) {
  const exam = S.exam;
  const t = examTally(exam);

  const bits = [];
  if (t.answers) bits.push(t.answers + ' answer' + (t.answers === 1 ? '' : 's'));
  if (t.sessions) bits.push(t.sessions + ' session' + (t.sessions === 1 ? '' : 's'));
  if (t.cards) bits.push(t.cards + ' flashcard state' + (t.cards === 1 ? '' : 's'));
  if (t.read) bits.push(t.read + ' read marker' + (t.read === 1 ? '' : 's'));
  if (t.checkpoints) bits.push(t.checkpoints + ' lab checkpoint' + (t.checkpoints === 1 ? '' : 's'));
  if (t.sims) bits.push(t.sims + ' simulation attempt' + (t.sims === 1 ? '' : 's'));

  wrap.appendChild(el('h2', 'labsec', 'Manage ' + exam + ' data'));

  /* Timed sittings on their own.
   *
   * The projected score is computed from simulation attempts, so when the
   * question bank changes the old ones describe a paper that no longer
   * exists. Clearing them re-baselines the score without touching drill
   * answers, flashcards, read markers or labs — the full exam reset below
   * would take all of those too, which is far more than "let me re-sit this".
   *
   * It also clears mode:'exam' rows in S.sessions, the retired timed mock.
   * Those feed the same "a full timed sitting" gate, so leaving them behind
   * means the gate still reports sittings and a best score after a reset
   * that looked like it cleared exactly that. Where a simulation exists the
   * mock's entry points are hidden, so these rows are history that can never
   * be added to — there is no reason to keep them alone.
   *
   * Only offered where a simulation exists. */
  if (simAvailable(exam)) {
    const legacySits = S.sessions.filter(s => s.exam === exam && s.mode === 'exam').length;
    const sitBits = [];
    if (t.sims) sitBits.push(t.sims + ' simulation attempt' + (t.sims === 1 ? '' : 's'));
    if (legacySits) sitBits.push(legacySits + ' timed mock sitting'
      + (legacySits === 1 ? '' : 's') + ' from the retired mock');
    wrap.appendChild(armedReset({
      cls: 'soft',
      title: 'Reset ' + exam + ' exam results',
      detail: sitBits.length
        ? 'Erases ' + sitBits.join(' and ') + ', and the projected score built '
          + 'from them. Your drill answers, flashcards, read markers and labs '
          + 'are untouched. This cannot be undone.'
        : 'No exam results recorded for ' + exam + ' yet.',
      phrase: 'SIM',
      label: 'Reset exam results',
      disabled: !sitBits.length,
      run: () => {
        S.simAttempts = (S.simAttempts || []).filter(a => a.exam !== exam);
        S.sessions = S.sessions.filter(s => !(s.exam === exam && s.mode === 'exam'));
        save(); examPicker(); renderAnalytics();
      }
    }));
  }

  wrap.appendChild(armedReset({
    cls: 'soft',
    title: 'Reset ' + exam + ' progress',
    detail: t.any
      ? 'Erases ' + bits.join(', ') + ' for ' + EXAMS[exam].name
        + ' only. Your other certifications are untouched. This cannot be undone.'
      : 'Nothing recorded for ' + exam + ' yet.',
    phrase: exam,
    label: 'Reset ' + exam,
    disabled: !t.any,
    run: () => { resetExam(exam); examPicker(); renderAnalytics(); }
  }));
  // The global reset is deliberately not here: wiping every certification
  // from a page about one of them is too easy to do by accident.
  const x = el('p', 'muted small statnote');
  x.textContent = 'Resetting every certification at once is on the Settings page.';
  wrap.appendChild(x);
}

/* Reset for everything, across all certifications. Lives on Settings —
   a page you open deliberately, not one you pass through to check a score. */
function renderGlobalReset(wrap) {
  const tally = totalTally();
  const anything = tally.answers || tally.cards || tally.read || tally.checkpoints || tally.sims;

  /* Exam results across every certification, without the rest.
   *
   * The same reset as the per-exam one on Progress, widened to all four. It
   * is here rather than there for the same reason the full reset is: an
   * action that reaches certifications other than the one you are looking at
   * belongs on a page you opened deliberately.
   *
   * Clears both sources the timed-sitting gate reads — simulation attempts
   * and the retired timed mock's mode:'exam' sessions — and leaves drill
   * answers, flashcards, read markers and labs alone. Drill sessions survive;
   * only full sittings go. */
  const legacySits = S.sessions.filter(s => s.mode === 'exam').length;
  const resBits = [];
  if (tally.sims) resBits.push(tally.sims + ' simulation attempt'
    + (tally.sims === 1 ? '' : 's'));
  if (legacySits) resBits.push(legacySits + ' timed mock sitting'
    + (legacySits === 1 ? '' : 's') + ' from the retired mock');

  wrap.appendChild(armedReset({
    cls: 'soft',
    title: 'Reset exam results',
    detail: resBits.length
      ? 'Erases ' + resBits.join(' and ') + ' across all four certifications, '
        + 'and the projected scores built from them. Drill answers, flashcards, '
        + 'read markers and labs are untouched. This cannot be undone.'
      : 'No exam results recorded yet.',
    phrase: 'RESULTS',
    label: 'Reset exam results',
    disabled: !resBits.length,
    run: () => {
      S.simAttempts = [];
      S.sessions = S.sessions.filter(s => s.mode !== 'exam');
      save(); examPicker(); renderSettings();
    }
  }));

  wrap.appendChild(armedReset({
    title: 'Reset all progress',
    detail: anything
      ? `Erases ${tally.answers} answer${tally.answers === 1 ? '' : 's'}, ${tally.cards} flashcard state${tally.cards === 1 ? '' : 's'}, ${tally.read} read marker${tally.read === 1 ? '' : 's'}, ${tally.checkpoints} lab checkpoint${tally.checkpoints === 1 ? '' : 's'}, and ${tally.sims} simulation attempt${tally.sims === 1 ? '' : 's'} across all four certifications. This cannot be undone.`
      : 'Nothing recorded yet.',
    phrase: 'DELETE',
    label: 'Reset everything',
    disabled: !anything,
    run: () => {
      const keep = S.exam;
      S = structuredClone(BLANK);
      S.exam = keep;              // stay on the exam you were studying
      save(); examPicker(); renderSettings();
    }
  }));
}


/* ---------- settings ---------- */
/* What remains here is what genuinely applies everywhere. The reading text
   size and column width went to the study-note header once they were scoped
   to that one surface: a control belongs next to the thing it changes, where
   you can watch it take effect, and "Affects: Study notes" on a settings
   page is a worse version of simply putting it on the note. */
const SETTINGS_SCOPE = {
  theme: ['Every page']
};

function settingRow(opts) {
  // opts: { title, help, scope, control }
  const row = el('div', 'setrow');
  const head = el('div', 'setinfo');
  head.appendChild(el('div', 'settitle', opts.title));
  if (opts.help) head.appendChild(el('div', 'sethelp', opts.help));

  const scope = el('div', 'setscope');
  scope.appendChild(el('span', 'setscopetag', 'Affects'));
  const list = el('span', 'setscopelist');
  // Plain text rather than a <ul>: at two to four short items a sentence
  // reads faster than a bulleted list, and it keeps the row compact.
  list.textContent = opts.scope.join(' · ');
  scope.appendChild(list);
  head.appendChild(scope);

  row.appendChild(head);
  row.appendChild(opts.control);
  return row;
}

function renderSettings() {
  const wrap = $('#settingsBody');
  if (!wrap) return;
  wrap.innerHTML = '';

  const card = el('div', 'setcard');

  // --- theme ---
  const themeCtl = el('div', 'themerow');
  themeCtl.setAttribute('role', 'group');
  themeCtl.setAttribute('aria-label', 'Colour theme');
  [['light', 'Light'], ['dark', 'Dark'], ['system', 'Auto']].forEach(([v, label]) => {
    const b = el('button', 'themebtn', label);
    b.type = 'button';
    b.dataset.themeSet = v;
    themeCtl.appendChild(b);
  });
  card.appendChild(settingRow({
    title: 'Colour theme',
    help: 'Auto follows your operating system setting.',
    scope: SETTINGS_SCOPE.theme,
    control: themeCtl
  }));

  // The reading controls are not here: they only affect a study note, so
  // they live in that note's header where you can see what they do.
  wrap.appendChild(card);

  // Destructive actions, last and clearly separated from the preferences.
  wrap.appendChild(el('h2', 'labsec', 'Manage data'));
  const dnote = el('p', 'muted small');
  dnote.style.margin = '-6px 0 12px';
  dnote.textContent = 'Resetting a single certification is on that '
    + 'certification’s Progress page.';
  wrap.appendChild(dnote);
  renderGlobalReset(wrap);

  // The theme buttons are rebuilt on every visit, so re-attach handlers and
  // mark the active one. The reading controls are not on this page.
  initTheme();
}

/* ---------- theme ---------- */
/* Three states, matching how the CSS is written: an explicit choice sets
   data-theme and wins over the OS; "system" removes it and follows
   prefers-color-scheme. Stored separately from study state so clearing
   progress doesn't reset how the page looks. */
function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
  else root.removeAttribute('data-theme');
  document.querySelectorAll('[data-theme-set]').forEach(b =>
    b.classList.toggle('on', b.dataset.themeSet === mode));
  try { localStorage.setItem('cct-theme', mode); } catch (e) {}
}

function initTheme() {
  let mode = 'system';
  try { mode = localStorage.getItem('cct-theme') || 'system'; } catch (e) {}
  if (!['light', 'dark', 'system'].includes(mode)) mode = 'system';
  applyTheme(mode);
  document.querySelectorAll('[data-theme-set]').forEach(b =>
    b.onclick = () => applyTheme(b.dataset.themeSet));
}

/* The reading text-size control, built as a stepper: − value + .
 *
 * initSize() finds these by id and wires them, so the ids are the contract
 * rather than the markup. Column width used to have a matching stepper; the
 * site has a single content measure now, so text size is the only thing
 * left that varies.
 */
function readingStepper() {
  const spec = { label: 'Reading text size', ids: ['sizeDown', 'sizeLabel', 'sizeUp'], init: '18px' };
  const row = el('div', 'sizerow');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', spec.label);
  // The visible caption is hidden on narrow screens, so the group carries
  // its own name for hover and for assistive tech.
  row.title = spec.label;

  const dn = el('button', 'themebtn stepbtn', '−');
  dn.type = 'button'; dn.id = spec.ids[0];
  dn.setAttribute('aria-label', 'Decrease ' + spec.label.toLowerCase());

  const lb = el('button', 'sizelabel', spec.init);
  lb.type = 'button'; lb.id = spec.ids[1]; lb.title = 'Reset to default';
  lb.setAttribute('aria-label', spec.label + ', click to reset');

  const up = el('button', 'themebtn stepbtn', '+');
  up.type = 'button'; up.id = spec.ids[2];
  up.setAttribute('aria-label', 'Increase ' + spec.label.toLowerCase());

  row.append(dn, lb, up);
  return row;
}

/* Reading text size. Scales note prose only — UI chrome stays fixed so the
   layout doesn't shift when you change it. */
/* Continuous steps rather than fixed presets: 14px to 26px at the default
   18px base, in 1px-ish increments. Stored as a multiplier so every size in
   the reading surface scales together. */
const SIZE_MIN = 0.76, SIZE_MAX = 1.48, SIZE_STEP = 0.06, SIZE_DEFAULT = 1;
const READ_BASE_PX = 18;          // what --read-scale:1 renders note prose at

/* Snap to a grid anchored on SIZE_DEFAULT, not on zero — otherwise stepping up
   then down lands on a different value than you started from, because the
   steps don't divide evenly into 1. Rounded to 2dp to avoid float drift
   accumulating across many steps. */
function clampSize(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return SIZE_DEFAULT;
  const steps = Math.round((v - SIZE_DEFAULT) / SIZE_STEP);
  const snapped = Math.round((SIZE_DEFAULT + steps * SIZE_STEP) * 100) / 100;
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, snapped));
}

function applySize(scale) {
  const s = clampSize(scale);
  document.documentElement.style.setProperty('--user-read-scale', String(s));
  const label = $('#sizeLabel');
  if (label) label.textContent = Math.round(READ_BASE_PX * s) + 'px';
  const dec = $('#sizeDown'), inc = $('#sizeUp');
  if (dec) dec.disabled = s <= SIZE_MIN + 1e-9;
  if (inc) inc.disabled = s >= SIZE_MAX - 1e-9;
  try { localStorage.setItem('cct-readsize', String(s)); } catch (e) {}
  return s;
}

function stepSize(dir) {
  let cur = SIZE_DEFAULT;
  try { cur = clampSize(localStorage.getItem('cct-readsize')); } catch (e) {}
  return applySize(cur + dir * SIZE_STEP);
}

function initSize() {
  let s = SIZE_DEFAULT;
  try {
    const raw = localStorage.getItem('cct-readsize');
    if (raw !== null) s = clampSize(raw);
  } catch (e) {}
  applySize(s);
  const dec = $('#sizeDown'), inc = $('#sizeUp'), reset = $('#sizeLabel');
  if (dec) dec.onclick = () => stepSize(-1);
  if (inc) inc.onclick = () => stepSize(1);
  if (reset) reset.onclick = () => applySize(SIZE_DEFAULT);   // click px to reset
}

/* ---------- resizable sidebar ---------- */
const RAIL_MIN = 170, RAIL_MAX = 420, RAIL_DEFAULT = 232;

function setRail(px, persist) {
  const w = Math.round(Math.max(RAIL_MIN, Math.min(RAIL_MAX, px)));
  document.documentElement.style.setProperty('--rail', w + 'px');
  const g = $('#railGrip');
  if (g) {
    g.setAttribute('aria-valuenow', String(w));
    g.setAttribute('aria-valuemin', String(RAIL_MIN));
    g.setAttribute('aria-valuemax', String(RAIL_MAX));
  }
  if (persist) { try { localStorage.setItem('cct-rail', String(w)); } catch (e) {} }
  return w;
}

function initRail() {
  let start = RAIL_DEFAULT;
  try { const v = parseInt(localStorage.getItem('cct-rail'), 10); if (v) start = v; } catch (e) {}
  setRail(start, false);

  const grip = $('#railGrip');
  if (!grip) return;

  // Pointer events cover mouse, pen and touch with one path, and capture keeps
  // the drag alive when the cursor outruns the handle.
  grip.addEventListener('pointerdown', e => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = $('.rail').getBoundingClientRect().width;
    grip.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing');

    const move = ev => setRail(w0 + (ev.clientX - x0), false);
    const up = () => {
      grip.releasePointerCapture(e.pointerId);
      document.body.classList.remove('resizing');
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      setRail($('.rail').getBoundingClientRect().width, true);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });

  grip.addEventListener('dblclick', () => setRail(RAIL_DEFAULT, true));

  grip.addEventListener('keydown', e => {
    const cur = $('.rail').getBoundingClientRect().width;
    const step = e.shiftKey ? 32 : 8;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setRail(cur - step, true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setRail(cur + step, true); }
    else if (e.key === 'Home') { e.preventDefault(); setRail(RAIL_DEFAULT, true); }
  });
}

/* ---------- wiring ---------- */
function init() {
  initTheme();
  initSize();
  initRail();
  examPicker();
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => go(b.dataset.view));
  $('#btnQuick').onclick = () => startQuiz('quick');
  $('#btnWeak').onclick = () => startQuiz('weak', { weakOnly: true });
  $('#btnHard').onclick = () => startQuiz('hard');
  $('#btnExam').onclick = () => {
    const ex = EXAMS[S.exam];
    const n = Math.min(ex.questions, poolFor(S.exam, { held: true }).length);
    const short = n < ex.questions ? `

Note: only ${n} questions are in the bank `
      + `(the real exam has ${ex.questions}).` : '';
    if (!confirm(
      `Start the ${ex.code} practice exam?

`
      + `${n} questions · ${ex.minutes} minutes · ${PASS_MARK}/1000 to pass
`
      + `No feedback until you submit. The clock starts now.${short}`)) return;
    startQuiz('exam');
  };
  $('#btnPrevQ').onclick = () => { if (Q.i > 0) { Q.i--; renderQuiz(); } };
  $('#btnNextQ').onclick = () => {
    if (Q.i === Q.list.length - 1) showExamReview();
    else { Q.i++; renderQuiz(); }
  };
  $('#btnFlag').onclick = () => {
    Q.flags[Q.i] = !Q.flags[Q.i];
    renderQuiz();
  };
  $('#btnSubmitExam').onclick = () => {
    const un = Q.list.length - Q.answers.filter(a => a && a.length).length;
    const msg = un
      ? `Submit with ${un} question${un === 1 ? '' : 's'} unanswered? They score zero.`
      : 'Submit the exam? You cannot change answers afterwards.';
    if (!confirm(msg)) return;
    submitExam(false);
  };
  $('#btnBackToExam').onclick = () => { Q.reviewing = false; renderQuiz(); go('quiz'); };
  $('#btnMock').onclick = () => {
    const n = Math.min(EXAMS[S.exam].questions, poolFor(S.exam, { held: true }).length);
    if (!confirm(
      `Start full-length practice for ${S.exam}?

`
      + `${n} questions at the real domain weighting, with the answer explained `
      + `after each one. No timer.

`
      + `For timed exam conditions, use the timed mock instead.`)) return;
    startQuiz('mock');
  };
  $('#btnCards').onclick = () => startCards(null);
  $('#cFlip').onclick = flipCard;
  $('#cPrev').onclick = () => stepCard(-1);
  $('#cNext').onclick = () => stepCard(1);
  $('#cQuit').onclick = () => finishCards();
  document.querySelectorAll('[data-grade]').forEach(b => b.onclick = () => gradeCurrent(b.dataset.grade === 'got'));
  $('#btnSubmit').onclick = grade;
  $('#btnNext').onclick = nextQ;
  $('#btnQuit').onclick = () => {
    if (Q && Q.mode === 'exam') {
      if (!confirm('Abandon the practice exam? Nothing will be scored.')) return;
      stopExamTimer(); Q = null; go('dash'); return;
    }
    if (Q && Q.i > 0) { if (!confirm('End this session? Answers so far are saved.')) return; }
    go('dash');
  };
  document.querySelectorAll('[data-conf]').forEach(b => b.onclick = () => answerConf(b.dataset.conf));
  $('#btnSkipConf').onclick = () => answerConf(null);
  $('#btnAgain').onclick = againRound;
  $('#btnBackDash').onclick = () => go('dash');

  // read-aloud player
  if (ttsSupported()) {
    $('#ttsPlay').onclick = () => { TTS && TTS.paused ? resumeSpeaking() : pauseSpeaking(); };
    $('#ttsPrev').onclick = () => skipSegment(-1);
    $('#ttsNext').onclick = () => skipSegment(1);
    $('#ttsStop').onclick = () => { stopSpeaking(); refreshNoteUI(); };
    $('#ttsSlower').onclick = () => setTtsRate(ttsRate() - 0.1);
    $('#ttsFaster').onclick = () => setTtsRate(ttsRate() + 0.1);
    $('#ttsRate').onclick = () => setTtsRate(1);
    // voices load asynchronously in some browsers
    $('#ttsVoiceSel').onchange = (e) => setTtsVoice(e.target.value);
    // Chrome reports voices asynchronously; refill when they land.
    speechSynthesis.onvoiceschanged = () => fillVoiceSelect();
    fillVoiceSelect();
    // never leave speech running after the page goes away
    window.addEventListener('beforeunload', () => speechSynthesis.cancel());
  }
  // keyboard: cards — Space/Enter flips, then 1 = missed, 2 = got it
  document.addEventListener('keydown', e => {
    // Ctrl/Cmd +/- adjusts the reading size, like browser zoom but scoped to
    // the notes. Ctrl+0 resets. Works from any view.
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') { e.preventDefault(); stepSize(1); return; }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); stepSize(-1); return; }
      if (e.key === '0') { e.preventDefault(); applySize(SIZE_DEFAULT); return; }
    }
    if (!$('#view-cards').hidden) {
      if (!C) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); stepCard(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); stepCard(1);  return; }
      if ((e.key === ' ' || e.key === 'Enter') && !C.flipped) { e.preventDefault(); flipCard(); }
      else if (C.flipped && (e.key === '1' || e.key === '2')) { e.preventDefault(); gradeCurrent(e.key === '2'); }
      return;
    }
    if ($('#view-quiz').hidden) return;
    if (e.key >= '1' && e.key <= '6') {
      const opts = document.querySelectorAll('#qOpts .opt');
      const idx = parseInt(e.key, 10) - 1;
      if (opts[idx]) opts[idx].click();
    } else if (e.key === 'Enter') {
      if (!$('#btnNext').hidden) nextQ();
      else if (!$('#confRow').hidden) answerConf(null);   // skip the rating
      else if (!$('#btnSubmit').hidden && !$('#btnSubmit').disabled) grade();
    }
  });
  // sim.js loads after this file and defines its own wiring; call it before
  // routing so a #sim deep link finds its handlers already attached.
  if (typeof initSim === 'function') initSim();
  initRouting();
}
document.addEventListener('DOMContentLoaded', init);
