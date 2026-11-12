/* Near-duplicate detector. Two questions can have different ids and still
   test the same thing in almost the same words — that happened when a later
   batch was written from the same notes as an earlier one. Compares the
   question stem plus the correct answer, since a shared stem format with a
   genuinely different subject is fine. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('./paths');
const dir = process.argv[2] || P.ROOT;
const files = ['data-questions.js','data-questions-2.js','data-questions-3.js',
               'data-questions-4.js','data-questions-5.js','data-questions-6.js',
               'data-questions-7.js','data-questions-8.js','data-questions-9.js','data-questions-held.js','data-questions-held-ao.js','data-questions-held-dv.js','data-questions-held-pr.js','data-questions-hard-ao.js','data-questions-hard-ar.js','data-questions-hard-dv.js','data-questions-hard-pr.js']
  .filter(f => fs.existsSync(P.resolve(f)));
const ctx = { console, structuredClone };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(P.resolve('data-exams.js'), 'utf8'), ctx, { filename: 'e' });
files.forEach(f => vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f }));
vm.runInContext('globalThis.__o={QUESTIONS};', ctx);
const Q = ctx.__o.QUESTIONS;

const owner = {};
files.forEach(f => {
  const s = fs.readFileSync(P.resolve(f), 'utf8');
  [...s.matchAll(/id:"([^"]+)"/g)].forEach(m => { if (!owner[m[1]]) owner[m[1]] = f; });
});

const words = s => String(s).replace(/<[^>]+>/g, ' ').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
const sig = q => {
  const a = Array.isArray(q.a) ? q.a : [q.a];
  return words(q.q + ' ' + a.map(i => q.opts[i]).join(' '));
};
const THRESH = Number(process.env.DUP_THRESH || 0.62);

const hits = [];
const sigs = Q.map(sig);
for (let i = 0; i < Q.length; i++) {
  for (let j = i + 1; j < Q.length; j++) {
    const a = new Set(sigs[i]), b = sigs[j];
    if (!b.length || !a.size) continue;
    const sim = b.filter(w => a.has(w)).length / Math.max(a.size, b.length);
    if (sim >= THRESH) hits.push({ sim, i, j });
  }
}
hits.sort((x, y) => y.sim - x.sim);
if (!hits.length) { console.log('No near-duplicate questions above ' + THRESH); process.exit(0); }
console.log(hits.length + ' near-duplicate pair(s) at or above ' + THRESH + ':\n');
hits.forEach(h => {
  const a = Q[h.i], b = Q[h.j];
  console.log('  ' + h.sim.toFixed(2) + '  ' + a.id + ' (' + owner[a.id] + ')');
  console.log('        ' + a.q.replace(/<[^>]+>/g, '').slice(0, 92));
  console.log('        ' + b.id + ' (' + owner[b.id] + ')');
  console.log('        ' + b.q.replace(/<[^>]+>/g, '').slice(0, 92));
  console.log('');
});
process.exit(1);
