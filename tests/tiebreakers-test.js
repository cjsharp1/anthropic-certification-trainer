/* The tiebreaker guide stays tied to the bank it describes.
 *
 * data-tiebreakers.js names principles by the exact `tiebreaker` strings the
 * sim questions carry. Those strings are free text, so a typo or a curly
 * apostrophe would leave a principle showing "0 questions" in the app with
 * nothing failing. These checks pin that, catch a principle that starts
 * recurring in the bank without a guide entry, and make sure
 * docs/TIEBREAKERS.md was regenerated after the data changed.
 */
const fs = require('fs');
const doc = require('../tools/tiebreakers-doc');

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log('\n' + t);

const D = doc.load();
const { SIM_QUESTIONS: Q, TIEBREAKERS: T, TIEBREAKER_REFLEXES: R } = D;
const ids = new Set(Q.map(q => q.id));

H('1. Every entry is complete');
const FIELDS = ['id', 'name', 'rule', 'spot', 'trap'];
const EX = ['situation', 'best', 'runnerUp', 'why'];
T.forEach(t => {
  const missing = FIELDS.filter(f => !t[f]).concat(EX.filter(f => !(t.example || {})[f]).map(f => 'example.' + f));
  if (missing.length) ok(false, t.id + ' is missing ' + missing.join(', '));
});
ok(T.every(t => FIELDS.every(f => t[f]) && EX.every(f => (t.example || {})[f])),
   'all ' + T.length + ' principles have a rule, spot, trap and a full example');
ok(new Set(T.map(t => t.id)).size === T.length, 'ids are unique (they are the doc\'s anchors)');

H('2. Every tag matches the bank');
// A tag that matches nothing is almost always a spelling drift: the app
// would show the principle with a count of zero and no error anywhere.
const dead = [];
T.forEach(t => t.tags.forEach(tag => { if (!Q.some(q => q.tiebreaker === tag)) dead.push(t.id + ': "' + tag + '"'); }));
ok(!dead.length, 'each tag is the tiebreaker of at least one question' + (dead.length ? ' — ' + dead.join('; ') : ''));
const owners = {};
T.forEach(t => t.tags.forEach(tag => (owners[tag] = owners[tag] || []).push(t.id)));
const shared = Object.entries(owners).filter(([, o]) => o.length > 1);
ok(!shared.length, 'no tag belongs to two principles, so each question counts once'
   + (shared.length ? ' — ' + shared.map(([k, o]) => k + ' in ' + o.join('+')).join('; ') : ''));

H('3. Every recurring principle has an entry');
/* Short-name tiebreakers shared by two or more questions are the principles
   the guide exists for. The reference-style questions carry one-off
   sentences ("Domain 2 core concept: …") instead, and the reflexes table
   covers their recurring patterns, so those are left out here. */
const counts = {};
Q.forEach(q => { counts[q.tiebreaker] = (counts[q.tiebreaker] || 0) + 1; });
const REF_STYLE = /^(Domain|Official|First Step|Always|Usually|Same )/;
const covered = new Set(T.flatMap(t => t.tags));
const orphans = Object.entries(counts)
  .filter(([k, n]) => n >= 2 && !REF_STYLE.test(k) && !covered.has(k)).map(([k]) => k);
ok(!orphans.length, 'no recurring tiebreaker is missing from the guide'
   + (orphans.length ? ' — add: ' + orphans.join('; ') : ''));

H('4. Reflexes point at real questions');
const badRef = [...R.firstStep, ...R.wrong].flatMap(r => r.q.filter(id => !ids.has(id)));
ok(!badRef.length, 'every id in TIEBREAKER_REFLEXES exists' + (badRef.length ? ' — ' + badRef.join(', ') : ''));
ok(R.wrong.every(w => w.level === 'Always' || w.level === 'Usually'),
   'wrong-option levels are Always or Usually (the app colors by them)');

H('5. The examples are original');
// The app shows examples with their answers, so a stem copied in from the
// bank would hand that question's answer to anyone who opened the guide.
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const stems = Q.map(q => norm(q.stem));
const copied = T.filter(t => { const s = norm(t.example.situation); return stems.some(x => x.includes(s) || s.includes(x)); });
ok(!copied.length, 'no example situation reproduces a bank stem' + (copied.length ? ' — ' + copied.map(t => t.id).join(', ') : ''));

H('6. docs/TIEBREAKERS.md is current');
const want = doc.render(D);
const have = fs.existsSync(doc.OUT) ? fs.readFileSync(doc.OUT, 'utf8').replace(/\r\n/g, '\n') : '';
ok(have === want, 'the committed doc matches the data (else run npm run docs:tiebreakers)');

console.log('');
if (fail) { console.log(fail + ' failure' + (fail === 1 ? '' : 's')); process.exit(1); }
console.log('all tiebreaker checks passed');
