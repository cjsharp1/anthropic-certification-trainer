/* Coverage audit: can each question be answered from the notes a learner
   would actually read for that question's domain?

   Two distinct defects:
     MISFILED  - the content IS taught, but under a different domain, so
                 studying the tagged domain never reaches it.
     UNCOVERED - no note for this exam teaches the term at all.

   Only high-confidence technical terms are probed: real identifiers
   (snake_case, --flags, dotted paths), <code> spans, and a curated list of
   domain proper nouns. Ordinary prose is deliberately ignored, because a
   question may legitimately paraphrase. The output is a review worklist. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('./paths');
const dir = process.argv[2] || P.ROOT;
const ctx = { console, structuredClone };
vm.createContext(ctx);
for (const f of ['data-exams.js','data-questions.js','data-questions-2.js','data-questions-3.js',
                 'data-questions-4.js','data-questions-5.js','data-labs.js','data-starters.js','data-notes.js'])
  vm.runInContext(fs.readFileSync(P.resolve(f),'utf8'), ctx, {filename:f});
vm.runInContext('globalThis.__o={QUESTIONS,EXAMS,EXAM_ORDER,NOTES,CARDS};', ctx);
const { QUESTIONS, EXAMS, EXAM_ORDER, NOTES, CARDS } = ctx.__o;

function noteText(n) {
  const out = [n.big || ''];
  const walk = p => {
    if (!p) return;
    if (typeof p === 'string') { out.push(p); return; }
    if (p.table) p.table.forEach(r => out.push(r.join(' ')));
    if (p.list) p.list.forEach(x => out.push(x));
    if (p.key) out.push(p.key);
    if (p.warn) out.push(p.warn);
    if (p.exam) out.push(p.exam);
    if (p.why) out.push((p.why.q||'') + ' ' + (p.why.a||p.why));
  };
  (n.sections||[]).forEach(s => { out.push(s.h); if (s.scope) out.push(s.scope); (s.body||[]).forEach(walk); });
  (n.confusions||[]).forEach(c => out.push(c.a+' '+c.b+' '+c.split));
  (n.checks||[]).forEach(c => out.push(typeof c==='string'?c:(c.q||'')+' '+(c.a||'')));
  return out.join(' ');
}
const strip = s => String(s).replace(/<[^>]+>/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
                            .replace(/&[a-z]+;/g,' ').toLowerCase().replace(/\s+/g,' ');
const NOTEIDX = {};
NOTES.forEach(n => { NOTEIDX[n.exam+'/'+n.d] = strip(noteText(n)); });
CARDS.forEach(c => { const k=c.exam+'/'+c.d; NOTEIDX[k]=(NOTEIDX[k]||'')+' '+strip(c.f+' '+c.b); });
const EXAMTEXT = {};
Object.keys(NOTEIDX).forEach(k => { const e=k.split('/')[0]; EXAMTEXT[e]=(EXAMTEXT[e]||'')+' '+NOTEIDX[k]; });

/* Proper nouns worth checking: product, protocol and feature names. */
const NOUNS = ['plan mode','bedrock','vertex','mcp','message batches','batches api','files api',
  'citations','computer use','prompt caching','extended thinking','interleaved thinking',
  'subagent','subagents','hooks','slash command','skills','output styles','headless',
  'claude code','agent sdk','workbench','console','rate limit','token bucket','streaming',
  'sse','pdf support','vision','system prompt','stop sequence','temperature','top_p',
  'tool choice','parallel tool','fork_session','checkpoint','devcontainer','github actions',
  'pre-commit','guardrail','eval','evals','golden set','llm-as-judge','rubric','a/b test',
  'canary','rollback','observability','tracing','span','pii','redaction','rbac','sso',
  'audit log','data retention','zdr','trust center','soc 2','gdpr','hipaa','baa'];

function terms(s) {
  const raw = String(s);
  const low = strip(raw);
  const found = new Set();
  // real identifiers only: snake_case, --flags, dotted.paths, CamelCase
  (raw.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g)||[]).forEach(x=>found.add(x.toLowerCase()));
  (raw.match(/(?:^|[\s("'`])(--[a-z][a-z0-9-]{3,})/g)||[]).forEach(x=>found.add(x.trim().replace(/^[("'`]/,'').toLowerCase()));
  (raw.match(/\b[a-z]+\.[a-z]{2,}(?:\.[a-z]{2,})*\b/g)||[]).forEach(x=>found.add(x.toLowerCase()));
  (raw.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g)||[]).forEach(x=>found.add(x.toLowerCase()));
  // explicit <code> spans
  (raw.match(/<code>([\s\S]*?)<\/code>/g)||[]).forEach(x=>{
    const v=strip(x).trim(); if(v && v.length>2 && v.split(' ').length<=3) found.add(v);
  });
  NOUNS.forEach(n => { if (low.includes(n)) found.add(n); });
  return [...found].filter(t => t.length>3 && !/^(https?|www|e\.g|i\.e)/.test(t));
}

const rows = [];
for (const q of QUESTIONS) {
  const exams = Array.isArray(q.exam)?q.exam:[q.exam];
  const a = Array.isArray(q.a)?q.a:[q.a];
  const probe = [q.q, a.map(i=>q.opts[i]).join(' '), q.why].join(' ');
  const ts = terms(probe);
  if (!ts.length) continue;
  for (const e of exams) {
    const dom = exams[0]===e ? q.d : (q.also && q.also[e]);
    if (!dom) continue;
    const key = e+'/'+dom, own = NOTEIDX[key]||'';
    const missing = ts.filter(t => !own.includes(t));
    if (!missing.length) continue;
    const elsewhere = {};
    for (const t of missing)
      for (const k of Object.keys(NOTEIDX))
        if (k!==key && k.startsWith(e+'/') && NOTEIDX[k].includes(t))
          (elsewhere[k]=elsewhere[k]||[]).push(t);
    const best = Object.entries(elsewhere).sort((x,y)=>y[1].length-x[1].length)[0];
    const nowhere = missing.filter(t => !(EXAMTEXT[e]||'').includes(t));
    rows.push({ id:q.id, exam:e, dom, missing, nowhere,
      verdict: nowhere.length ? 'UNCOVERED' : 'MISFILED',
      where: best ? best[0]+' ('+best[1].slice(0,4).join(', ')+')' : '' });
  }
}
const dn = k => { const [e,i]=k.split('/'); const x=EXAMS[e].domains.find(y=>y.id===i); return x?'D'+x.num:i; };
const mis = rows.filter(r=>r.verdict==='MISFILED');
const unc = rows.filter(r=>r.verdict==='UNCOVERED').sort((a,b)=>b.nowhere.length-a.nowhere.length);
console.log('Audited', QUESTIONS.length, 'questions |', rows.length, 'flagged');
console.log('\n=== MISFILED: taught, but in another domain of the same exam ===');
mis.forEach(r=>console.log(`  ${r.id.padEnd(12)} ${r.exam} ${dn(r.exam+'/'+r.dom).padEnd(3)} -> ${r.where}`));
console.log('\n=== UNCOVERED: term appears in NO note for this exam ===');
unc.forEach(r=>console.log(`  ${r.id.padEnd(12)} ${r.exam} ${dn(r.exam+'/'+r.dom).padEnd(3)} ${r.nowhere.join(', ')}`));
console.log('\nMisfiled:', mis.length, '| Uncovered:', unc.length);
