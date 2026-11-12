// The analytics are only useful if the numbers are right. Each case feeds
// data with a hand-computed expected answer.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const DAY = 86400000;

function boot(state) {
  const store = { 'claude-cert-trainer-v1': state ? JSON.stringify(state) : null };
  const mk = () => ({ className:'', style:{}, hidden:false, dataset:{}, textContent:'', innerHTML:'',
    classList:{add(){},remove(){},toggle(){},contains:()=>false}, appendChild(){}, append(){},
    addEventListener(){}, focus(){}, setAttribute(){}, removeAttribute(){},
    querySelector:()=>null, querySelectorAll:()=>[], children:[],
    getBoundingClientRect:()=>({width:232,top:0,bottom:0}), scrollIntoView(){} });
  const ctx = { console, structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
    parseInt, parseFloat, isFinite, setTimeout(){}, setInterval:()=>1, clearInterval(){},
    performance:{now:()=>0}, alert(){}, confirm:()=>true, CSS:{escape:x=>String(x)},
    localStorage:{getItem:k=>store[k]??null,setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}},
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
  vm.runInContext('globalThis.__a={modeStats,drillCounts,confStats,confTrend,streakStats,funStats,allAnswers,answersFor,QUESTIONS,S};', ctx);
  return ctx.__a;
}

let fail = 0;
const ok = (c,m) => { if(!c){console.log('  FAIL:',m);fail++;} else console.log('  ok:',m); };
const Q1='ar-d1-01', Q2='ar-d1-03', Q3='ar-d2-01';
const H = (title) => console.log(String.fromCharCode(10) + title);
H('1. Mode counts: runs, totals and best score');
{
  const A = boot({ exam:'CCAR-F', history:{}, sessions:[
    {ts:1, exam:'CCAR-F', mode:'quick',  total:10, correct:6, ms:300000},
    {ts:2, exam:'CCAR-F', mode:'quick',  total:10, correct:9, ms:200000},
    {ts:3, exam:'CCAR-F', mode:'exam',   total:60, correct:45},
    {ts:4, exam:'CCDV-F', mode:'quick',  total:10, correct:1},
  ]});
  const m = A.modeStats('CCAR-F');
  ok(m.quick.runs===2, 'quick counted twice, got '+m.quick.runs);
  ok(m.quick.q===20 && m.quick.correct===15, 'totals summed (20q / 15 correct)');
  ok(Math.abs(m.quick.best-0.9)<1e-9, 'best run 90%, got '+Math.round(m.quick.best*100)+'%');
  ok(m.exam.runs===1, 'exam counted once');
  ok(m.quick.timed===2 && m.quick.ms===500000, 'durations summed only when present');
  ok(Object.keys(m).length===2, 'other exam excluded');
}

H('2. Drill counts are per domain');
{
  const A = boot({ exam:'CCAR-F', history:{}, sessions:[
    {ts:1, exam:'CCAR-F', mode:'domain', total:10, correct:7, domain:'d3'},
    {ts:2, exam:'CCAR-F', mode:'domain', total:10, correct:8, domain:'d3'},
    {ts:3, exam:'CCAR-F', mode:'domain', total:10, correct:5, domain:'d1'},
    {ts:4, exam:'CCAR-F', mode:'quick',  total:10, correct:5},
  ]});
  const d = A.drillCounts('CCAR-F');
  ok(d.d3.runs===2 && d.d3.q===20 && d.d3.correct===15, 'd3: 2 runs, 20q, 15 correct');
  ok(d.d1.runs===1, 'd1: 1 run');
  ok(Object.keys(d).length===2, 'session without a domain is skipped');
}

H('3. Confidence mix and calibration');
{
  const A = boot(null);
  const list=[{conf:'sure',correct:true},{conf:'sure',correct:true},
              {conf:'sure',correct:false},
              {conf:'unsure',correct:false},
              {conf:'guess',correct:true},
              {conf:'skip',correct:true}];
  const c=A.confStats(list);
  ok(c.mix.sure===3 && c.mix.unsure===1 && c.mix.guess===1 && c.mix.skip===1, 'mix counted');
  ok(c.rated===5, 'skip excluded from rated, got '+c.rated);
  ok(Math.abs(c.calibration-3/5)<1e-9, 'calibration 3/5, got '+c.calibration);
  const expAvg=(1+1+1+0.35-0.2)/5;
  ok(Math.abs(c.avg-expAvg)<1e-9, 'avg confidence '+expAvg.toFixed(3)+', got '+c.avg.toFixed(3));
}

H('4. Trend groups answers into sittings by a 45-minute gap');
{
  const t0=Date.now()-10*DAY;
  const A = boot({ exam:'CCAR-F', sessions:[], history:{
    [Q1]:[{correct:true,conf:'sure',ts:t0},{correct:true,conf:'sure',ts:t0+60000}],
    [Q2]:[{correct:false,conf:'guess',ts:t0+120000}],
    [Q3]:[{correct:true,conf:'sure',ts:t0+3*3600000}],
  }});
  const tr=A.confTrend('CCAR-F');
  ok(tr.length===2, 'two sittings, got '+tr.length);
  ok(tr[0].n===3, 'first sitting has 3 answers, got '+tr[0].n);
  ok(Math.abs(tr[0].acc-2/3)<1e-9, 'first sitting accuracy 2/3');
  ok(tr[1].n===1 && tr[1].acc===1, 'second sitting 1 answer, 100%');
  ok(tr[0].ts<tr[1].ts, 'oldest first');
}

H('5. Streaks come from distinct answer days');
{
  const base=new Date(); base.setHours(12,0,0,0);
  const d=n=>base.getTime()-n*DAY;
  const A = boot({ exam:'CCAR-F', sessions:[], history:{
    [Q1]:[{correct:true,conf:'sure',ts:d(0)},{correct:true,conf:'sure',ts:d(1)},
          {correct:true,conf:'sure',ts:d(2)}],
    [Q2]:[{correct:true,conf:'sure',ts:d(10)},{correct:true,conf:'sure',ts:d(11)},
          {correct:true,conf:'sure',ts:d(12)},{correct:true,conf:'sure',ts:d(13)}],
  }});
  const st=A.streakStats();
  ok(st.total===7, '7 distinct study days, got '+st.total);
  ok(st.best===4, 'longest streak 4, got '+st.best);
  ok(st.current===3, 'current streak 3, got '+st.current);
}

H('6. Streak resets when the last answer is old');
{
  const A = boot({ exam:'CCAR-F', sessions:[], history:{
    [Q1]:[{correct:true,conf:'sure',ts:Date.now()-9*DAY}],
  }});
  const st=A.streakStats();
  ok(st.current===0, 'no current streak after a 9-day gap, got '+st.current);
  ok(st.total===1 && st.best===1, 'history still counted');
}

H('7. Fun stats');
{
  const base=new Date(); base.setHours(9,0,0,0);
  const A = boot({ exam:'CCAR-F',
    sessions:[{ts:1,exam:'CCAR-F',mode:'quick',total:4,correct:3,ms:120000}],
    history:{
      [Q1]:[{correct:false,conf:'guess',ts:base.getTime()-DAY},
            {correct:true, conf:'sure', ts:base.getTime()}],
      [Q2]:[{correct:true, conf:'sure', ts:base.getTime()+1000}],
      [Q3]:[{correct:true, conf:'sure', ts:base.getTime()+2000},
            {correct:false,conf:'unsure',ts:base.getTime()+3000}],
    }});
  const f=A.funStats('CCAR-F');
  ok(f.answers===5, '5 answers, got '+f.answers);
  ok(f.turned===1, '1 question turned around, got '+f.turned);
  ok(f.stillWrong===1, '1 still ending wrong, got '+f.stillWrong);
  ok(f.bestStreak===3, 'best correct run is 3, got '+f.bestStreak);
  ok(f.peakHour===9, 'peak hour 9, got '+f.peakHour);
  ok(f.busiestDay.n===4, 'busiest day has 4 answers, got '+f.busiestDay.n);
  ok(f.secPerQ===30, '120s over 4q = 30s each, got '+f.secPerQ);
  ok(f.minutes===2, '2 minutes total, got '+f.minutes);
}

H('8. Empty state never throws');
{
  const A = boot(null);
  ok(A.funStats('CCAR-F')===null, 'funStats null with no data');
  ok(A.confTrend('CCAR-F').length===0, 'empty trend');
  ok(Object.keys(A.modeStats('CCAR-F')).length===0, 'no modes');
  const st=A.streakStats();
  ok(st.total===0 && st.best===0 && st.current===0, 'zeroed streaks');
  const c=A.confStats([]);
  ok(c.avg===null && c.calibration===null, 'null rather than NaN');
}

console.log(fail ? String.fromCharCode(10)+fail+' FAILURES'
                 : String.fromCharCode(10)+'Analytics tests passed');
process.exit(fail ? 1 : 0);
