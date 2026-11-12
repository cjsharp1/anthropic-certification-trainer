/* Cross-check claims the notes make against each other and against the
   question bank. Disagreement between two of our own sources is a strong
   signal that one of them is wrong. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('./paths');
const dir = P.ROOT;
const ctx = { console, structuredClone };
vm.createContext(ctx);
const files = ['data-exams.js', 'data-questions.js', 'data-questions-2.js',
  'data-questions-3.js', 'data-questions-4.js', 'data-questions-5.js',
  'data-questions-6.js', 'data-questions-7.js', 'data-questions-8.js',
  'data-questions-9.js', 'data-questions-held.js',
  'data-questions-held-ao.js', 'data-questions-held-dv.js',
  'data-questions-held-pr.js','data-questions-hard-ao.js','data-questions-hard-ar.js','data-questions-hard-dv.js','data-questions-hard-pr.js', 'data-notes.js'];
files.forEach(f => vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f }));
vm.runInContext('globalThis.__o={NOTES,CARDS,QUESTIONS,EXAMS,EXAM_ORDER};', ctx);
const { NOTES, CARDS, QUESTIONS, EXAMS, EXAM_ORDER } = ctx.__o;

const strip = s => String(s).replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');

// all note prose, with its location
const frag = [];
NOTES.forEach(n => {
  const at = n.exam + '/' + n.d;
  frag.push({ at, where: 'big idea', t: strip(n.big) });
  (n.sections || []).forEach(s => (s.body || []).forEach(p => {
    if (typeof p === 'string') return frag.push({ at, where: s.h, t: strip(p) });
    if (p.table) return p.table.forEach(r => frag.push({ at, where: s.h + ' table', t: strip(r.join(' | ')) }));
    if (p.list) return p.list.forEach(x => frag.push({ at, where: s.h + ' list', t: strip(x) }));
    ['key', 'warn', 'exam'].forEach(k => { if (p[k]) frag.push({ at, where: s.h + ' ' + k, t: strip(p[k]) }); });
    if (p.why) frag.push({ at, where: s.h + ' why', t: strip((p.why.q || '') + ' ' + (p.why.a || p.why)) });
  }));
  (n.checks || []).forEach(c => frag.push({ at, where: 'check', t: strip(c) }));
  (n.confusions || []).forEach(c => frag.push({ at, where: 'confusion', t: strip(c.a + ' / ' + c.b + ': ' + c.split) }));
});
CARDS.forEach(c => frag.push({ at: c.exam + '/' + c.d, where: 'flashcard', t: strip(c.f + ' \u2014 ' + c.b) }));

let issues = 0;
const report = (kind, msg) => { issues++; console.log('  [' + kind + '] ' + msg); };

console.log('1. Enumerations stated with a count');
{
  const W = { two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
  // "the four X values: a, b, c, d" or "all six A · B · C"
  frag.forEach(f => {
    const m = /\b(two|three|four|five|six|seven|eight|nine|ten)\b[^.:]{0,40}[:\u2014-]\s*(.+)/i.exec(f.t);
    if (!m) return;
    const want = W[m[1].toLowerCase()];
    // count separated items on the tail
    const tail = m[2].split(/\.\s|\s\u2014\s/)[0];
    const parts = tail.split(/\s*[\u00b7,]\s*|\s+and\s+|\s*\|\s*/).map(x => x.trim()).filter(Boolean);
    // only trust it when the items look like a list of short terms
    if (parts.length < 2) return;
    if (parts.some(p => p.split(/\s+/).length > 4)) return;
    if (parts.length !== want) {
      report('count', f.at + ' (' + f.where + '): says ' + m[1] + ' but lists '
        + parts.length + ' \u2014 "' + tail.slice(0, 90) + '"');
    }
  });
}

console.log('\n2. Identifiers appearing in only one place (likely typos)');
{
  const tally = {};
  frag.forEach(f => (f.t.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) || [])
    .forEach(id => { (tally[id] = tally[id] || []).push(f.at); }));
  QUESTIONS.forEach(q => {
    const t = strip(q.q + ' ' + q.opts.join(' ') + ' ' + q.why);
    (t.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) || [])
      .forEach(id => { (tally[id] = tally[id] || []).push('Q:' + q.id); });
  });
  const once = Object.entries(tally).filter(([, v]) => v.length === 1);
  if (!once.length) console.log('  none');
  once.forEach(([id, where]) => console.log('  ' + id.padEnd(32) + where[0]));
}

console.log('\n3. Every note domain exists in its exam blueprint');
{
  NOTES.forEach(n => {
    if (!EXAMS[n.exam]) return report('domain', 'unknown exam ' + n.exam);
    if (!EXAMS[n.exam].domains.find(d => d.id === n.d))
      report('domain', n.exam + '/' + n.d + ' is not a domain of that exam');
  });
  if (!issues) console.log('  all 27 notes map to a real domain');
}

console.log('\n3b. Each note teaches its own domain, not a neighbour\'s');
{
  /* Three CCAR-P notes were once written one domain out of step — p4 taught
     evaluation, p5 taught governance, p6 taught stakeholder work — so a
     candidate revising a domain got material for a different one. The note
     text never says which domain it belongs to, so nothing surfaced it.
     This compares each note's own vocabulary against every domain name in
     its exam: if another domain is a markedly better match than the one it
     is filed under, the note has drifted. */
  const STOP = new Set(['and','the','for','with','of','a','to','in','on','its','it','is','are',
    'this','that','not']);
  const words = s => String(s).toLowerCase().replace(/<[^>]+>/g, ' ')
    .split(/[^a-z]+/).filter(w => w.length > 3 && !STOP.has(w));
  NOTES.forEach(n => {
    const ex = EXAMS[n.exam];
    if (!ex) return;
    const mine = ex.domains.find(d => d.id === n.d);
    if (!mine) return;
    // Score only on words that belong to ONE domain name in this exam.
    // Shared words such as "model" or "design" appear in several blueprint
    // titles and carry no signal about which domain a note is teaching.
    const freq = {};
    ex.domains.forEach(d => new Set(words(d.name)).forEach(w => freq[w] = (freq[w] || 0) + 1));
    // The note's own text: big idea plus section headings carry its subject.
    const text = new Set(words(n.big + ' ' + (n.sections || []).map(s => s.h).join(' ')));
    const score = d => words(d.name).filter(w => freq[w] === 1 && text.has(w)).length;
    const best = ex.domains.map(d => ({ d, s: score(d) })).sort((a, b) => b.s - a.s)[0];
    // Require a clear margin: one distinctive word in common is a coincidence,
    // two or more while the filed domain matches none is a real mismatch.
    if (best.d.id !== n.d && best.s >= 2 && best.s > score(mine) + 1)
      report('drift', n.exam + '/' + n.d + ' (' + mine.name + ') reads like '
        + best.d.id + ' (' + best.d.name + ')');
  });
  if (!issues) console.log('  every note matches the domain it is filed under');
}

console.log('\n4. Note weight claims match the blueprint');
{
  let checked = 0;
  NOTES.forEach(n => {
    const d = EXAMS[n.exam].domains.find(x => x.id === n.d);
    const mine = frag.filter(f => f.at === n.exam + '/' + n.d);
    mine.forEach(f => {
      const m = /\b(\d{1,2}(?:\.\d)?)\s*%\s*of the (?:exam|blueprint)/i.exec(f.t);
      if (!m) return;
      checked++;
      if (Math.abs(Number(m[1]) - d.weight) > 0.05)
        report('weight', n.exam + '/' + n.d + ' says ' + m[1] + '% but the blueprint says ' + d.weight + '%');
    });
  });
  console.log('  ' + checked + ' in-text weight claims checked');
}

console.log('\n5. Exam facts stated in prose match data-exams.js');
{
  let checked = 0;
  frag.forEach(f => {
    const exam = f.at.split('/')[0];
    const ex = EXAMS[exam];
    const m1 = /\b(\d{2,3})\s*(?:questions|items)\b/i.exec(f.t);
    if (m1) { checked++;
      if (Number(m1[1]) !== ex.questions)
        report('exam', f.at + ' (' + f.where + '): says ' + m1[1] + ' questions, blueprint says ' + ex.questions);
    }
    const m2 = /\b(\d{2,3})\s*minutes\b/i.exec(f.t);
    if (m2) { checked++;
      if (Number(m2[1]) !== ex.minutes)
        report('exam', f.at + ' (' + f.where + '): says ' + m2[1] + ' minutes, blueprint says ' + ex.minutes);
    }
    const m3 = /pass(?:ing)?\s*(?:mark|score)[^0-9]{0,12}(\d{3})/i.exec(f.t);
    if (m3) { checked++;
      if (Number(m3[1]) !== 720)
        report('exam', f.at + ' (' + f.where + '): says pass mark ' + m3[1] + ', actual 720');
    }
  });
  console.log('  ' + checked + ' exam-structure claims checked');
}

console.log('\n' + (issues ? issues + ' issue(s) to review' : 'No internal contradictions found'));
