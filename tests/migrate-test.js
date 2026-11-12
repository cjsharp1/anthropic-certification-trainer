// The rename must carry answer history across, not drop it.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;

function boot(stored) {
  const store = { 'claude-cert-trainer-v1': stored ? JSON.stringify(stored) : null };
  const mk = () => ({ className:'', style:{}, hidden:false, dataset:{}, textContent:'', innerHTML:'',
    classList:{add(){},remove(){},toggle(){},contains:()=>false}, appendChild(){}, append(){},
    addEventListener(){}, focus(){}, setAttribute(){}, removeAttribute(){},
    querySelector:()=>null, querySelectorAll:()=>[], children:[],
    getBoundingClientRect:()=>({width:232,top:0,bottom:0}), scrollIntoView(){} });
  const ctx = { console, structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
    parseInt, parseFloat, isFinite, setTimeout(){}, setInterval:()=>1, clearInterval(){},
    performance:{now:()=>0}, alert(){}, confirm:()=>true, CSS:{escape:x=>String(x)},
    localStorage:{ getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v;}, removeItem:k=>{delete store[k];} },
    location:{hash:''}, history:{pushState(){},replaceState(){}},
    document:{ documentElement:{style:{setProperty(){}},setAttribute(){},removeAttribute(){},classList:{add(){},remove(){}}},
      body:{classList:{add(){},remove(){}}}, getElementById:()=>mk(), querySelector:()=>mk(),
      querySelectorAll:()=>[], createElement:mk, addEventListener(){} },
    window:{ scrollTo(){}, addEventListener(){}, innerHeight:900, matchMedia:()=>({matches:false,addEventListener(){}}) } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['data-exams.js','data-questions.js','data-questions-2.js','data-questions-3.js',
                   'data-questions-4.js','data-questions-5.js','data-labs.js','data-starters.js',
                   'data-notes.js','app.js'])
    vm.runInContext(fs.readFileSync(P.resolve(f),'utf8'), ctx, {filename:f});
  vm.runInContext('globalThis.__s = S;', ctx);
  return { S: ctx.__s, stored: () => JSON.parse(store['claude-cert-trainer-v1'] || '{}') };
}

let fail = 0;
const ok = (c,m) => { if(!c){console.log('  FAIL:',m);fail++;} else console.log('  ok:',m); };

console.log('\n1. History for a renamed question survives');
{
  const hist = [{correct:true, conf:'sure', ts:111}, {correct:false, conf:'unsure', ts:222}];
  const b = boot({ history:{ 'ar-d1-27':hist, 'ar-d2-01':[{correct:true,conf:'sure',ts:5}] },
                   seen:{ 'ar-d1-27':3, 'ar-d2-01':1 } });
  ok(!b.S.history['ar-d1-27'], 'old id removed');
  ok(JSON.stringify(b.S.history['ar-d3-28'])===JSON.stringify(hist), 'history moved to the new id');
  ok(b.S.seen['ar-d3-28']===3, 'seen count moved');
  ok(!b.S.seen['ar-d1-27'], 'old seen removed');
  ok(b.S.history['ar-d2-01'].length===1, 'unrelated history untouched');
  ok(b.stored().history['ar-d3-28'], 'migration persisted to storage');
}

console.log('\n2. Nothing to migrate is harmless');
{
  const b = boot({ history:{ 'ar-d2-01':[{correct:true,conf:'sure',ts:5}] }, seen:{} });
  ok(!!b.S.history['ar-d2-01'], 'existing history intact');
  ok(!b.S.history['ar-d3-28'], 'no phantom entry created');
}

console.log('\n3. A fresh install is unaffected');
{
  const b = boot(null);
  ok(Object.keys(b.S.history).length===0, 'no history on first run');
}

console.log('\n4. An existing new-id entry is not clobbered');
{
  const keep = [{correct:true, conf:'sure', ts:999}];
  const b = boot({ history:{ 'ar-d1-27':[{correct:false,conf:'guess',ts:1}], 'ar-d3-28':keep }, seen:{} });
  ok(JSON.stringify(b.S.history['ar-d3-28'])===JSON.stringify(keep), 'newer entry wins');
  ok(!b.S.history['ar-d1-27'], 'stale old id still cleaned up');
}

console.log('\n5. Every rename target is a real question, and no old id lingers');
{
  const src = ['data-questions.js','data-questions-2.js','data-questions-3.js',
               'data-questions-4.js','data-questions-5.js']
    .map(f => fs.readFileSync(P.resolve(f), 'utf8')).join('\n');
  const app = fs.readFileSync(P.resolve('app.js'), 'utf8');
  const map = /const RENAMED_QIDS = \{([^}]*)\}/.exec(app)[1];
  const pairs = [...map.matchAll(/'([^']+)':\s*'([^']+)'/g)].map(m => [m[1], m[2]]);
  ok(pairs.length > 0, pairs.length + ' renames declared');
  pairs.forEach(([from, to]) => {
    ok(src.includes('id:"' + to + '"'), to + ' exists in the question bank');
    ok(!src.includes('id:"' + from + '"'), from + ' is gone from the bank');
  });
}


console.log(fail ? `\n${fail} FAILURES` : '\nMigration tests passed');
process.exit(fail ? 1 : 0);
