// The sidebar splits navigation by scope: things that belong to the selected
// exam sit in the switcher card, things that span every exam sit in the
// footer. These check that split holds, that the readiness readout works as
// the Progress link, and that it still tracks the exam you switch to.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;

let NODES = [];
function mk(t) {
  const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', title: '', value: '', children: [], onclick: null, onchange: null,
    hidden: false, disabled: false, open: false, type: '', options: [],
    classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
                 toggle: (c, f) => { const on = f === undefined ? !n._cls.has(c) : f;
                                     if (on) n._cls.add(c); else n._cls.delete(c); return on; },
                 contains: c => n._cls.has(c) },
    appendChild(c) { n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    addEventListener() {}, removeAttribute(k) { delete n._attrs[k]; },
    setAttribute(k, v) { n._attrs[k] = v; },
    focus() {}, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232, top: 0, bottom: 0 }), scrollIntoView() {} };
  n.style.setProperty = (k, v) => { n.style[k] = v; };
  Object.defineProperty(n, 'className', {
    get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(n, 'innerHTML', { get: () => n._h || '',
    set: v => { n._h = v; if (!v) n.children = []; } });
  NODES.push(n);
  return n;
}

/* The real markup is in index.html, so parse the sidebar out of it rather
   than restating its structure here — a test that builds its own markup
   would keep passing after the real nav was rearranged. */
const HTML = fs.readFileSync(P.resolve('index.html'), 'utf8');
const RAIL = /<aside class="rail">([\s\S]*?)<\/aside>/.exec(HTML)[1];
const block = re => (re.exec(RAIL) || [, ''])[1];
const SWITCH = block(/<div class="examswitch">([\s\S]*?)<\/div>\s*<nav/);
const FOOT = block(/<div class="railfoot"[^>]*>([\s\S]*?)<\/div>\s*<div class="railgrip"/);
const viewsIn = s => [...s.matchAll(/data-view="([\w-]+)"/g)].map(m => m[1]);

function boot(state, hash) {
  NODES = [];
  const store = { 'claude-cert-trainer-v1': JSON.stringify(state || {
    exam: 'CCAR-F', history: {}, seen: {}, flags: {}, labs: {},
    streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {}, planOrder: 'blueprint' }) };
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const views = {};
  const root = mk('html');
  // Stand-ins for the real sidebar buttons, created from the parsed markup so
  // the set under test is whatever index.html actually ships.
  const navButtons = viewsIn(RAIL).map(v => { const b = mk('button'); b.dataset.view = v; return b; });
  const ctx = { console, structuredClone, Math, Date, JSON, Object, Array, String, Number,
    Set, Map, parseInt, parseFloat, isFinite,
    setTimeout(f) { typeof f === 'function' && f(); },
    setInterval: () => 1, clearInterval() {},
    performance: { now: () => 0 }, alert() {}, confirm: () => true,
    CSS: { escape: x => String(x) },
    localStorage: { getItem: k => (k in store ? store[k] : null),
                    setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; } },
    location: { hash: hash || '' },
    history: { pushState(s, t, h) { ctx.location.hash = h; },
               replaceState(s, t, h) { if (h) ctx.location.hash = h; } },
    document: {
      documentElement: root,
      body: { classList: { add() {}, remove() {} } },
      getElementById: getId,
      querySelector: s => { const m = /^#([\w-]+)$/.exec(s); return m ? getId(m[1]) : null; },
      querySelectorAll: s => {
        if (s === '.view') return Object.values(views);
        if (s === '[data-view]') return navButtons;
        if (s === '[data-theme-set]') return [];
        if (s === '.view:not([hidden])') return [];
        return [];
      },
      createElement: mk, createElementNS: (ns, t) => mk(t), addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {}, innerHeight: 900,
              matchMedia: () => ({ matches: false, addEventListener() {} }) } };
  ['dash','study','notes','note','labs','progress','stats','settings',
   'quiz','cards','review','result'].forEach(v => { views['view-' + v] = getId('view-' + v); });
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  [...HTML.matchAll(/<script src="([^"]+)"><\/script>/g)].forEach(m =>
    vm.runInContext(fs.readFileSync(P.resolve(m[1]), 'utf8'), ctx, { filename: m[1] }));
  vm.runInContext('globalThis.__v={go,examMeta,parseHash,initRouting,readiness,EXAMS,PASS_MARK,S,'
    + 'setExam:c=>{S.exam=c;}};', ctx);
  return { api: ctx.__v, byId, navButtons, ctx };
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

H('1. Exam-scoped and global navigation are separated');
{
  // The switcher card is exam state, not navigation: a picker and a
  // readiness readout. Every link in the rail is a nav button below it.
  ok(viewsIn(SWITCH).length === 0, 'the switcher card holds no nav links');
  ok(viewsIn(FOOT).includes('stats'), 'Analytics is in the global footer');
  ok(viewsIn(FOOT).includes('settings'), 'Settings is in the global footer');
  // Progress was retired: its content moved to the Dashboard and Analytics.
  ok(!viewsIn(RAIL).includes('progress'), 'nothing in the rail points at the retired page');
  const all = viewsIn(RAIL);
  const dupes = all.filter((v, i) => all.indexOf(v) !== i);
  ok(dupes.length === 0, dupes.length ? 'duplicated: ' + dupes.join(', ') : 'no link appears twice');
}

H('1b. The retired Progress route still resolves');
{
  // Old bookmarks and Back entries must not land on a blank page.
  const { api, byId } = boot();
  api.go('progress');
  ok(byId['view-dash'].hidden === false, '#progress opens the Dashboard');
  ok(!byId['view-progress'] || byId['view-progress'].hidden !== false,
     'and there is no Progress view to show');
  ok(!/id="view-progress"/.test(HTML), 'the old view markup is gone');
}

H('1c. An old link keeps its exam and stops being an old link');
{
  // #progress/CCDV-F should open the CCDV-F dashboard — not whichever exam
  // happened to be selected — and the address bar should no longer say
  // "progress", or copying the URL hands out a stale link again.
  const { api, byId, ctx } = boot(null, '#progress/CCDV-F');
  const r = api.parseHash();
  ok(r && r.view === 'dash', 'the retired view translates to dash');
  ok(r.exam === 'CCDV-F', 'and the exam in the link survives translation');
  vm.runInContext('initRouting();', ctx);
  ok(byId['view-dash'].hidden === false, 'the dashboard is showing');
  ok(vm.runInContext('S.exam', ctx) === 'CCDV-F', 'on the exam the link named');
  ok(!/progress/.test(ctx.location.hash), 'the stale hash was rewritten: ' + ctx.location.hash);
  ok(/CCDV-F/.test(ctx.location.hash), 'and still names the exam');
}

H('2. The old empty Analytics badge is gone');
{
  // #navStreak was in the markup but nothing ever wrote to it, so Analytics
  // carried a permanently blank span where a figure appeared to belong.
  ok(!/id="navStreak"/.test(HTML), 'the unpopulated streak badge was removed');
  ok(!/id="navScore"/.test(HTML), 'the duplicate score badge was removed');
}

H('3. The readiness readout states the exam\'s standing, and is not a link');
{
  const { api, byId } = boot();
  api.examMeta();
  const meta = byId['examSwMeta'];
  ok(String(meta.textContent).length > 0, 'the readout has text: ' + meta.textContent);
  ok(!/<button[^>]*class="swprogress"/.test(SWITCH), 'it is not wrapped in a button');
  ok(!/swgo/.test(SWITCH), 'and carries no go-to affordance');
  // "931 / 720 · 94% covered" is too terse to stand alone, so the long form
  // is available on hover and to assistive tech.
  ok(/pass mark|to pass/i.test(meta.title || ''),
     'a title explains the numbers: ' + meta.title);
}

H('4. An untouched exam reads as not started, without a score');
{
  const { api, byId } = boot();
  api.examMeta();
  const txt = byId['examSwMeta'].textContent;
  ok(/to pass/.test(txt), 'shows the pass mark rather than a score: ' + txt);
  ok(!/\/\s*\d/.test(txt.replace(/\d+ items/, '')), 'no scaled score is claimed yet');
  ok(/Nothing attempted/i.test(byId['examSwMeta'].title || ''),
     'the title says nothing has been attempted: ' + byId['examSwMeta'].title);
}

H('5. Once studying, it shows the scaled score and coverage');
{
  const st = { exam: 'CCAR-F', history: {}, seen: {}, flags: {}, labs: {},
    streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {},
    simAttempts: [], planOrder: 'blueprint' };
  const { ctx } = boot(st);
  /* CCAR-F has a simulation bank, so its projected score comes from
     simulation attempts rather than drill history. Seed one sitting that
     covers every domain — drill answers alone would project nothing. */
  vm.runInContext(
    'S.simAttempts=[(function(){'
    + 'var byDom={},answers={},n=0,ok=0;'
    + 'EXAMS["CCAR-F"].domains.forEach(function(d){'
    + '  var qs=SIM_QUESTIONS.filter(function(q){'
    + '    return q.exam==="CCAR-F"&&(q.domains||[]).indexOf(d.id)>=0;}).slice(0,12);'
    + '  qs.forEach(function(q){n++;ok++;answers[q.id]={picked:q.correct,ok:true};'
    + '    byDom[d.id]=byDom[d.id]||{n:0,ok:0};byDom[d.id].n++;byDom[d.id].ok++;});'
    + '});'
    + 'return {ts:Date.now(),exam:"CCAR-F",mode:"exam",total:n,correct:ok,'
    + ' ms:1000,filled:0,target:n,auto:false,drill:null,'
    + ' byObj:{},byDom:byDom,byScn:{},answers:answers};})()];', ctx);
  vm.runInContext('examMeta();', ctx);
  const txt = vm.runInContext('document.getElementById("examSwMeta").textContent', ctx);
  ok(/\d+ \/ \d+/.test(txt), 'shows score over the pass mark: ' + txt);
  ok(/% covered/.test(txt), 'and the coverage percentage');
  const label = vm.runInContext(
    'document.getElementById("examSwMeta").title', ctx);
  ok(/scaled score/i.test(label || ''), 'the title spells out what the numbers mean: ' + label);
}

H('6. Switching exam re-points the readout at the new exam');
{
  const { api, byId } = boot();
  api.examMeta();
  const first = byId['examSwMeta'].textContent;
  api.setExam('CCAO-F');
  api.examMeta();
  const second = byId['examSwMeta'].textContent;
  const ccao = api.EXAMS['CCAO-F'];
  ok(second.indexOf(String(ccao.questions)) === 0,
     'the readout now describes CCAO-F: ' + second);
  // CCAR-F and CCAO-F happen to share a question count and pass mark, so an
  // untouched readout reads identically for both. The accessible label names
  // the exam outright, which is what actually proves the switch took effect.
  ok(/CCAR-F/.test(first) === false || first === second, 'readout text is exam-agnostic when unstarted');
  ok(/CCAO-F/.test(byId['examSwMeta'].title || ''),
     'the title names the new exam: ' + byId['examSwMeta'].title);
  api.setExam('CCDV-F');
  api.examMeta();
  ok(byId['examSwMeta'].textContent.indexOf(String(api.EXAMS['CCDV-F'].questions)) === 0,
     'and an exam with a different item count changes the visible text too: '
     + byId['examSwMeta'].textContent);
}

H('7. The active page is highlighted in the rail');
{
  const { api, navButtons } = boot();
  const dash = navButtons.find(b => b.dataset.view === 'dash');
  const stats = navButtons.find(b => b.dataset.view === 'stats');
  api.go('dash');
  ok(dash._cls.has('on'), 'the Dashboard tab is marked active');
  ok(!stats._cls.has('on'), 'Analytics is not');
  api.go('stats');
  ok(!dash._cls.has('on'), 'the highlight clears when you leave');
  ok(stats._cls.has('on'), 'and moves to Analytics');
}

H('8. The readout is plain text in the switcher card');
{
  // It was briefly a button linking to the Dashboard. That duplicated the
  // tab directly below it, so it went back to being a readout.
  ok(!/swprogress/.test(HTML), 'no link wrapper remains');
  ok(!/swgo/.test(HTML), 'and no chevron affordance');
  ok(/<div class="swmeta" id="examSwMeta">/.test(SWITCH),
     'the readout is a plain element in the switcher');
  ok(/\.swmeta\{/.test(HTML), 'it still has its own style rule');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Nav tests passed');
process.exit(fail ? 1 : 0);
