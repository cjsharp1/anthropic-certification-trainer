/* The hard tier: a third pool alongside drill and held-out.
 *
 * These questions are opt-in. They carry long scenarios and sentence-length
 * options, so meeting one in a ten-question warm-up is discouraging rather
 * than useful — but they must still count toward coverage, still appear in
 * the exposure chart, and still show up in "questions to revisit" when you
 * get one wrong. That split is what these tests pin.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

function boot() {
  const ctx = vm.createContext({ console, Math, Date, JSON, Object, Array, String,
    Number, Set, Map, parseInt, parseFloat, isFinite });
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])
    .filter(f => /(^|\/)data-/.test(f))
    .forEach(f => vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f }));
  return ctx;
}
const ctx = boot();
const Q = vm.runInContext('QUESTIONS', ctx);
const EXAMS = vm.runInContext('EXAMS', ctx);
const qExams = q => Array.isArray(q.exam) ? q.exam : [q.exam];
const isHard = q => q.difficulty === 'hard' || q.difficulty === 'expert';
const plain = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '');
const words = s => plain(s).split(/\s+/).filter(Boolean).length;
const hard = Q.filter(isHard);

H('1. The tier exists and is tagged consistently');
{
  ok(hard.length > 0, hard.length + ' hard questions');
  const bad = hard.filter(q => !['hard', 'expert'].includes(q.difficulty));
  ok(bad.length === 0, 'every tagged question uses a known difficulty');
  // difficulty is opt-in: an untagged question must stay in the drill pool
  const tagged = Q.filter(q => q.difficulty).length;
  ok(tagged === hard.length, 'no question carries a difficulty we do not handle');
  const dupes = Q.map(q => q.id).filter((v, i, a) => a.indexOf(v) !== i);
  ok(dupes.length === 0, dupes.length ? 'duplicate ids: ' + dupes.slice(0, 3) : 'ids unique across all banks');
}

H('2. They are genuinely harder than the drill bank');
{
  // The whole point is a step up in difficulty. If these drift back toward
  // the drill bank's shape, the tier stops meaning anything.
  const drill = Q.filter(q => !isHard(q));
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
  const hStem = med(hard.map(q => words(q.q)));
  const dStem = med(drill.map(q => words(q.q)));
  ok(hStem >= dStem * 1.6, 'stems are substantially longer: ' + hStem + ' vs ' + dStem + ' words');

  const hOpt = med(hard.flatMap(q => (q.opts || []).map(words)));
  const dOpt = med(drill.flatMap(q => (q.opts || []).map(words)));
  ok(hOpt >= dOpt * 1.4, 'options are longer: ' + hOpt + ' vs ' + dOpt + ' words');

  // sentence-length options are the measured difference against the site
  // this tier was benchmarked on: 75% of theirs, 16% of our drill bank.
  const full = hard.filter(q => (q.opts || []).every(o =>
    /[.:]$/.test(plain(o).trim()) || words(o) >= 12)).length;
  const share = Math.round(full / hard.length * 100);
  ok(share >= 70, share + '% of hard questions have full-sentence options (target 70%+)');

  const hWhy = med(hard.map(q => words(q.why)));
  ok(hWhy >= 60, 'explanations are substantial: ' + hWhy + ' words median');
}

H('3. No length tell was reintroduced');
{
  // Longer options are exactly where "pick the longest" creeps back in.
  const single = hard.filter(q => !q.multi);
  let longest = 0; const gaps = [];
  single.forEach(q => {
    const L = q.opts.map(o => plain(o).length);
    const other = Math.max(...L.filter((_, i) => i !== q.a));
    if (L[q.a] > other) longest++;
    gaps.push(L[q.a] - other);
  });
  gaps.sort((a, b) => a - b);
  const share = Math.round(longest / single.length * 100);
  console.log('     longest-is-correct ' + share + '%, median gap '
    + gaps[gaps.length >> 1] + ', max ' + gaps[gaps.length - 1]);
  ok(share <= 60, 'correct is longest in ' + share + '% (limit 60%)');
  ok(gaps[gaps.length - 1] < 60, 'no question has a 60+ char tell, max ' + gaps[gaps.length - 1]);
  // and the answer should not sit in one position
  const pos = {};
  single.forEach(q => pos[q.a] = (pos[q.a] || 0) + 1);
  const most = Math.max(...Object.values(pos));
  ok(most / single.length <= 0.45, 'no answer position dominates: ' + JSON.stringify(pos));
}

H('4. Every hard question is verified against a source');
{
  // A wrong answer in an expert-tier question is worse than no question:
  // it is stated with more confidence and explained at more length.
  const log = fs.existsSync(P.resolve('docs/VERIFICATION.md'))
    ? fs.readFileSync(P.resolve('docs/VERIFICATION.md'), 'utf8') : '';
  ok(log.length > 0, 'VERIFICATION.md exists');
  const missing = hard.filter(q => !log.includes(q.id));
  ok(missing.length === 0, missing.length
    ? missing.length + ' unverified: ' + missing.slice(0, 4).map(q => q.id).join(', ')
    : 'all ' + hard.length + ' appear in the verification log');
}

H('5. They are opt-in, not mixed into warm-up quizzes');
{
  const app = fs.readFileSync(P.resolve('app.js'), 'utf8');
  ok(/function isHard\(/.test(app), 'isHard() exists');
  ok(/opts\.hard \? hardFor\(exam\)/.test(app) || /opts\.hard/.test(app),
     'pickQuestions honours a hard flag');
  // poolFor must exclude them by default or a quick quiz serves them
  ok(/return o\.hard \? isHard\(q\) : !isHard\(q\)/.test(app),
     'poolFor excludes the hard tier unless asked');
  ok(/mode === 'hard'/.test(app), "startQuiz handles a 'hard' mode");
}

H('6. But they still count everywhere they should');
{
  const app = fs.readFileSync(P.resolve('app.js'), 'utf8');
  // coverage and mastery use allFor(), which never filtered by difficulty
  ok(/function allFor\(exam\) \{ return QUESTIONS\.filter\(q => qExams\(q\)\.includes\(exam\)\); \}/.test(app),
     'allFor() counts every question, hard included');
  // the exposure chart and the revisit list must not silently drop them
  const exposure = /function exposureData\([\s\S]{0,300}?poolFor\(exam, \{ held: !!held, hard: 'any' \}\)/.test(app);
  ok(exposure, 'the exposure chart counts the hard tier');
  ok(/const weak = poolFor\(exam, \{ hard: 'any' \}\)/.test(app),
     '"questions to revisit" can surface a hard question you got wrong');
}

H('7. The button appears only where the tier is populated');
{
  const app = fs.readFileSync(P.resolve('app.js'), 'utf8');
  ok(/hardBtn\.hidden = nHard < \d/.test(app), 'the button hides below a threshold');
  const byExam = {};
  Object.keys(EXAMS).forEach(code => {
    byExam[code] = Q.filter(q => qExams(q).includes(code) && isHard(q)).length;
  });
  console.log('     per exam: ' + JSON.stringify(byExam));
  const populated = Object.values(byExam).filter(n => n >= 5).length;
  ok(populated >= 1, populated + ' exam(s) have a usable hard tier');
}

H('8. Hard questions respect the same structural rules as the rest');
{
  const bad = [];
  hard.forEach(q => {
    const n = (q.opts || []).length;
    if (n < 4) bad.push(q.id + ' has ' + n + ' options');
    if (q.multi) {
      if (!Array.isArray(q.a) || q.a.some(i => i < 0 || i >= n)) bad.push(q.id + ' bad multi answer');
    } else if (typeof q.a !== 'number' || q.a < 0 || q.a >= n) bad.push(q.id + ' bad answer index');
    if (!q.why) bad.push(q.id + ' has no explanation');
    if (!q.d) bad.push(q.id + ' has no domain');
    const doms = (EXAMS[qExams(q)[0]] || { domains: [] }).domains.map(d => d.id);
    if (doms.length && !doms.includes(q.d)) bad.push(q.id + ' domain ' + q.d + ' not in blueprint');
  });
  ok(bad.length === 0, bad.length ? bad.slice(0, 4).join('; ') : 'all structurally sound');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Hard tier tests passed');
process.exit(fail ? 1 : 0);
