const fs=require('fs'), path=require('path'), vm=require('vm');
const P = require('./paths');
const dir = process.argv[2] || P.ROOT;
const ctx={console, structuredClone};
vm.createContext(ctx);
const files=['data-exams.js','data-questions.js','data-questions-2.js','data-questions-3.js','data-questions-4.js','data-questions-5.js','data-questions-6.js','data-questions-7.js','data-questions-8.js','data-questions-9.js','data-questions-held.js','data-questions-held-ao.js','data-questions-held-dv.js','data-questions-held-pr.js','data-questions-hard-ao.js','data-questions-hard-ar.js','data-questions-hard-dv.js','data-questions-hard-pr.js','data-labs.js','data-starters.js','data-notes.js'];
const src=files.map(f=>fs.readFileSync(P.resolve(f),'utf8')).join('\n;\n')
  + '\n;globalThis.__out={QUESTIONS,EXAMS,EXAM_ORDER,LABS,NOTES,CARDS,STARTERS,NO_STARTER};';
vm.runInContext(src, ctx, {filename:'bundle.js'});
const {QUESTIONS, EXAMS, EXAM_ORDER, LABS, NOTES, CARDS, STARTERS, NO_STARTER}=ctx.__out;
console.log('Questions:', QUESTIONS.length, '| Labs:', LABS.length,
            '| Notes:', NOTES.length, '| Cards:', CARDS.length);
let err=[], warn=[]; const ids=new Set();
for(const q of QUESTIONS){
  if(ids.has(q.id)) err.push('dup id '+q.id); ids.add(q.id);
  const exams=Array.isArray(q.exam)?q.exam:[q.exam];
  for(const e of exams){
    if(!EXAMS[e]){err.push(q.id+': unknown exam '+e);continue;}
    const dom = exams[0]===e ? q.d : (q.also&&q.also[e]);
    if(!dom){err.push(q.id+': no domain mapping for '+e);continue;}
    if(!EXAMS[e].domains.find(d=>d.id===dom)) err.push(q.id+': bad domain '+dom+' for '+e);
  }
  const a=Array.isArray(q.a)?q.a:[q.a];
  if(!q.opts||q.opts.length<2) err.push(q.id+': bad opts');
  for(const i of a) if(typeof i!=='number'||i<0||i>=q.opts.length) err.push(q.id+': answer index '+i+' out of range');
  if(q.multi&&a.length<2) err.push(q.id+': multi with <2 answers');
  // A multi-select where EVERY option is correct gives itself away, because
  // the UI tells you how many to select.
  if(q.multi&&a.length>=q.opts.length) err.push(q.id+': every option is correct - needs a distractor');
  if(!q.multi&&a.length!==1) err.push(q.id+': single with '+a.length+' answers');
  if(!q.why||q.why.length<40) err.push(q.id+': thin explanation');
  if(!q.kind) err.push(q.id+': missing kind');
}
for(const l of LABS){
  for(const e of l.exams){
    if(!EXAMS[e]){err.push(l.id+': unknown exam '+e);continue;}
    for(const d of (l.domains[e]||[])) if(!EXAMS[e].domains.find(x=>x.id===d)) err.push(l.id+': bad domain '+d+' for '+e);
  }
  // a hint keyed past the end of checkpoints[] would silently never render
  for(const k of Object.keys(l.hints||{})){
    const i=Number(k);
    if(!Number.isInteger(i)||i<0||i>=l.checkpoints.length)
      err.push(l.id+': hint index '+k+' has no checkpoint (0..'+(l.checkpoints.length-1)+')');
    else if(!l.hints[k] || l.hints[k].length<25) err.push(l.id+': hint '+k+' too thin');
  }
  if(l.start){
    if(!l.start.setup && !l.start.first && !l.start.shape) err.push(l.id+': empty start block');
    if(l.start.shape && l.start.shape.length<40) err.push(l.id+': shape too short to be useful');
  }
}
// notes
const noteSeen=new Set();
for(const n of NOTES){
  const k=n.exam+'/'+n.d;
  if(noteSeen.has(k)) err.push('duplicate note for '+k); noteSeen.add(k);
  if(!EXAMS[n.exam]){err.push('note: unknown exam '+n.exam);continue;}
  if(!EXAMS[n.exam].domains.find(d=>d.id===n.d)) err.push('note '+k+': bad domain');
  if(!n.big||n.big.length<40) err.push('note '+k+': missing big idea');
  if(!n.sections||!n.sections.length) err.push('note '+k+': no sections');
  for(const s of (n.sections||[])){
    if(!s.h) err.push('note '+k+': section without heading');
    for(const p of (s.body||[])){
      if(typeof p==='string') continue;
      if(p.table){ const w=p.table[0].length;
        p.table.forEach((r,i)=>{ if(r.length!==w) err.push('note '+k+': table row '+i+' has '+r.length+' cells, header has '+w); });
      } else if(p.why){
        if(typeof p.why==='object' && !p.why.a) err.push('note '+k+': why block missing answer');
      } else if(p.fig){
        if(!p.fig.svg) err.push('note '+k+': fig block has no svg');
        if(!p.fig.cap) err.push('note '+k+': fig block has no caption — a figure must state its claim');
        if(p.fig.svg && !/viewBox=/.test(p.fig.svg)) err.push('note '+k+': fig svg has no viewBox, so it cannot scale');
        if(p.fig.svg && /<script|<style|<foreignObject/i.test(p.fig.svg)) err.push('note '+k+': fig svg must stay self-contained');
      } else if(!p.list && !p.warn && !p.key && !p.exam){
        err.push('note '+k+': unknown body part '+JSON.stringify(p).slice(0,40));
      }
    }
  }
  for(const c of (n.confusions||[])) if(!c.a||!c.b||!c.split) err.push('note '+k+': incomplete confusion pair');
  // every note should pull out at least one takeaway per two sections
  const keys=n.sections.reduce((a,s)=>a+s.body.filter(p=>p&&p.key).length,0);
  if(keys < Math.ceil(n.sections.length/2)) err.push('note '+k+': only '+keys+' takeaways for '+n.sections.length+' sections');
}
// cards
const cardKeys=new Set();
for(const c of CARDS){
  if(!EXAMS[c.exam]){err.push('card: unknown exam '+c.exam);continue;}
  if(!EXAMS[c.exam].domains.find(d=>d.id===c.d)) err.push('card "'+c.f.slice(0,30)+'": bad domain '+c.d);
  if(!c.f||!c.b) err.push('card missing front or back: '+JSON.stringify(c).slice(0,50));
  const k=c.exam+'/'+c.d+'/'+c.f.slice(0,40);
  if(cardKeys.has(k)) err.push('duplicate card key (collides in storage): '+k);
  cardKeys.add(k);
}
// Near-duplicate questions: different ids, near-identical content. This has
// happened when a later batch was written from the same notes as an earlier
// one, so it is checked rather than trusted.
{
  const words=t=>String(t).replace(/<[^>]+>/g,' ').toLowerCase()
    .replace(/[^a-z0-9 ]/g,' ').split(/s+/).filter(w=>w.length>3);
  const sig=q=>{const a=Array.isArray(q.a)?q.a:[q.a];
    return words(q.q+' '+a.map(i=>q.opts[i]).join(' '));};
  const sigs=QUESTIONS.map(sig);
  for(let i=0;i<QUESTIONS.length;i++) for(let j=i+1;j<QUESTIONS.length;j++){
    const a=new Set(sigs[i]), b=sigs[j];
    if(!b.length||!a.size) continue;
    const sim=b.filter(w=>a.has(w)).length/Math.max(a.size,b.length);
    if(sim>=0.62) err.push(QUESTIONS[i].id+' / '+QUESTIONS[j].id+': near-duplicate ('+sim.toFixed(2)+')');
  }
}
// Prose that announces a count ("three things") directly above a table or
// list should match it. This caught a note claiming three requirements over
// a four-row table. Only flags a number IMMEDIATELY followed by the
// structure, since prose often counts something else entirely.
{
  const WORD = { two:2, three:3, four:4, five:5, six:6, seven:7, eight:8 };
  for (const n of NOTES) {
    for (const s of (n.sections || [])) {
      const body = s.body || [];
      body.forEach((p, i) => {
        if (typeof p !== 'string') return;
        // only when the sentence introduces what follows
        if (!/[:：]\s*$/.test(p)) return;
        const m = /\b(two|three|four|five|six|seven|eight)\b/i.exec(p);
        if (!m) return;
        const want = WORD[m[1].toLowerCase()];
        const next = body[i + 1];
        if (!next) return;
        const got = next.table ? next.table.length - 1 : (next.list ? next.list.length : null);
        if (got === null || got === want) return;
        err.push('note ' + n.exam + '/' + n.d + ' "' + s.h + '": prose says '
          + m[1] + ' but the ' + (next.table ? 'table' : 'list') + ' has ' + got);
      });
    }
  }
}

// Length tell: if the correct option is reliably the longest, the bank can be
// passed by counting characters instead of knowing the material. Measured at
// 95% before this check existed. Distractors must be full, plausible
// statements — not four-word dismissals next to a qualified correct answer.
{
  const plain = s => String(s).replace(/<[^>]+>/g, '').trim();
  const LONGEST_MAX = 0.55;   // share of single-answer questions where correct is longest
  let longest = 0, single = 0;
  for (const q of QUESTIONS) {
    if (q.multi) continue;
    single++;
    const a = Array.isArray(q.a) ? q.a[0] : q.a;
    const L = q.opts.map(o => plain(o).length);
    const others = L.filter((_, i) => i !== a);
    if (L[a] > Math.max(...others)) longest++;
    // a single runaway option is a giveaway on its own
    const gap = L[a] - Math.max(...others);
    if (gap >= 60) warn.push(q.id + ': correct option is ' + gap
      + ' chars longer than any distractor (length tell)');
  }
  if (single) {
    const share = longest / single;
    if (share > LONGEST_MAX) warn.push('length tell: the correct option is the longest in '
      + Math.round(share * 100) + '% of ' + single + ' single-answer questions (limit '
      + Math.round(LONGEST_MAX * 100) + '%)');
  }

  // The aggregate above misses the case that actually matters. A candidate
  // cannot count characters, so a question whose options differ by three
  // chars gives them nothing — and there are enough of those to hold the
  // aggregate down while the obvious cases stay obvious. What they CAN see
  // is one option visibly longer than the rest. Measured separately: at a
  // 7-char visible margin the longest option was correct ~85% of the time
  // while the aggregate read a comfortable 53%.
  const VISIBLE = 7;           // chars of lead before a reader notices
  const VISIBLE_MAX = 0.45;    // how often the visible-longest may be correct
  let vis = 0, visHit = 0;
  for (const q of QUESTIONS) {
    if (q.multi) continue;
    const a = Array.isArray(q.a) ? q.a[0] : q.a;
    const L = q.opts.map(o => plain(o).length);
    const sorted = [...L].sort((x, y) => y - x);
    if (sorted[0] - sorted[1] < VISIBLE) continue;   // nothing a reader can see
    vis++;
    if (L[a] === sorted[0]) visHit++;
  }
  if (vis >= 20) {
    const share = visHit / vis;
    if (share > VISIBLE_MAX) warn.push('visible length tell: where one option leads by '
      + VISIBLE + '+ chars it is the correct one in ' + Math.round(share * 100) + '% of '
      + vis + ' questions (limit ' + Math.round(VISIBLE_MAX * 100) + '%)');
  }
}

// Scenario tags must name a scenario the exam actually has. A question is
// shown under a scenario heading only when tagged, so a typo here silently
// means "never labelled" rather than erroring at runtime.
{
  for (const q of QUESTIONS) {
    if (!q.scn) continue;
    if (!Array.isArray(q.scn)) { err.push(q.id + ': scn must be an array'); continue; }
    const exams = Array.isArray(q.exam) ? q.exam : [q.exam];
    const ids = new Set();
    exams.forEach(e => (EXAMS[e] && EXAMS[e].scenarios || []).forEach(s => ids.add(s.id)));
    q.scn.forEach(t => {
      if (!ids.has(t)) err.push(q.id + ': scenario tag "' + t
        + '" is not a scenario of ' + exams.join('/'));
    });
  }
  // every scenario an exam declares needs an id, or tagging cannot reference it
  Object.keys(EXAMS).forEach(e => {
    (EXAMS[e].scenarios || []).forEach(s => {
      if (!s.id) err.push(e + ': scenario "' + s.t + '" has no id');
    });
  });
}

/* Shape tell: the correct option singled out by punctuation rather than by
   content. The length tell is guarded above; this is its quieter cousin.
   A correct answer is usually the most informative option, so the em dash
   and the enumerating comma land there by default, and "pick the one with
   the aside" scores well above chance. Measured as a share so it can be
   driven down the way the length tell was. */
{
  const plainOpt = o => String(o || '').replace(/<[^>]+>/g, '');
  let lone = 0, eligible = 0;
  QUESTIONS.forEach(q => {
    if (q.multi || !q.opts || q.opts.length < 3) return;
    const opts = q.opts.map(plainOpt);
    eligible++;
    const dashed = opts.map((o, i) => /—/.test(o) ? i : -1).filter(i => i >= 0);
    if (dashed.length === 1 && dashed[0] === q.a) lone++;
  });
  const share = eligible ? Math.round(lone / eligible * 100) : 0;
  if (share > 5) warn.push('shape tell: the correct option is the only one with '
    + 'an em dash in ' + share + '% of ' + eligible + ' questions (limit 5%)');
}

/* Spelling: American throughout, matching the source documentation the exams
   are drawn from. Eighteen words once appeared in BOTH forms — summarise
   next to summarize, organisation next to organization — which reads as
   carelessness even when every individual question is sound.
   Words like advise, precise and promise are never spelled with a z, so
   this checks an explicit list rather than applying a general -ise rule. */
{
  const BRITISH = [
    [/\b(summar|organ|author|optim|standard|amort|general|external|serial|recogn|special|central|custom|anonym|priorit|parallel|synthes|token|random|maxim|minim|normal|rational|material|memor|legitim|destabil|ideal|internal|parameter|synchron|capital|categor|visual|util|final|critic|emphas|modular|formal|initial|personal|popular|regular|stabil|theor)is(e|ed|es|ing|ation|ations|able|ability)\b/i, '-ise form'],
    [/\bbehaviour|\bcolour\b|\bcentre\b|\bcatalogue|\bjudgement|\blicence\b|\bdefence\b|\bmodelling\b|\blabell(ed|ing)\b|\bcancelled\b|\bcancelling\b|\bfavour|\bpractise\b|\bfulfil\b|\bper cent\b/i, 'British spelling']
  ];
  const seen = [];
  QUESTIONS.forEach(q => {
    const text = [q.q, ...(q.opts || []), q.why].map(x => String(x || '')).join(' ');
    BRITISH.forEach(([re, what]) => {
      const m = re.exec(text);
      if (m) seen.push(q.id + ': ' + what + ' "' + m[0] + '"');
    });
  });
  if (seen.length) {
    warn.push('spelling: ' + seen.length + ' question(s) use British forms; '
      + 'the banks are standardized on American — ' + seen.slice(0, 3).join('; '));
  }
}

if (warn.length) {
  console.log('WARNINGS (' + warn.length + '):');
  warn.slice(0, 6).forEach(w => console.log('  ' + w));
  if (warn.length > 6) console.log('  ... and ' + (warn.length - 6) + ' more');
  console.log('');
}
console.log(err.length?'ERRORS:\n'+err.join('\n'):'All integrity checks passed');
console.log('\nPer-exam pool (domain:count):');
for(const c of EXAM_ORDER){
  const pool=QUESTIONS.filter(q=>(Array.isArray(q.exam)?q.exam:[q.exam]).includes(c));
  const perDom=EXAMS[c].domains.map(d=>{
    const n=pool.filter(q=>{const ex=Array.isArray(q.exam)?q.exam:[q.exam];return (ex[0]===c?q.d:(q.also&&q.also[c]))===d.id;}).length;
    return d.id+':'+n;}).join(' ');
  console.log('  '+c.padEnd(8), String(pool.length).padStart(3), 'need', String(EXAMS[c].questions).padStart(3), '|', perDom);
}
console.log('\nWeight sums:', EXAM_ORDER.map(c=>c+'='+EXAMS[c].domains.reduce((s,d)=>s+d.weight,0).toFixed(1)).join('  '));
const scn=QUESTIONS.filter(q=>q.kind==='scenario').length;
console.log('Scenario:', scn, '| Recall:', QUESTIONS.length-scn, '| Multi-select:', QUESTIONS.filter(q=>q.multi).length);
