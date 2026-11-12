// The speech layer's real work is turning a note into listenable text.
// Markup, tables and identifiers all read badly if passed through raw.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;

const store = {};
const mk = () => ({
  className: '', style: {}, hidden: false, dataset: {}, textContent: '', innerHTML: '',
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  appendChild() {}, append() {}, addEventListener() {}, focus() {}, setAttribute() {},
  querySelector: () => mk(), querySelectorAll: () => [], children: [],
  getBoundingClientRect: () => ({ width: 232 }),
});

const ctx = {
  console, structuredClone, Math, Date, JSON, Object, Array, String, Number,
  parseInt, parseFloat, isFinite, setTimeout() {}, setInterval: () => 1, clearInterval() {},
  performance: { now: () => 0 }, alert() {}, confirm() { return true; },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
  location: { hash: '' }, history: { pushState() {}, replaceState() {} },
  document: {
    documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
    body: { classList: { add() {}, remove() {} } },
    querySelector: () => mk(), querySelectorAll: () => [],
    createElement: mk, addEventListener() {}, getElementById: () => null,
  },
  window: { scrollTo() {}, addEventListener() {} },
};
ctx.globalThis = ctx;
vm.createContext(ctx);

for (const f of ['data-exams.js', 'data-questions.js', 'data-questions-2.js',
                 'data-questions-3.js', 'data-questions-4.js', 'data-questions-5.js',
                 'data-labs.js', 'data-starters.js', 'data-notes.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f });
}
vm.runInContext('globalThis.__t={speakable,noteToSpeech,ttsSupported,ttsRate,setTtsRate,'
  + 'ttsVoices,setTtsVoice,NOTES,EXAMS,EXAM_ORDER,S};', ctx);
const T = ctx.__t;

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };

console.log('\n1. Markup is stripped, not spoken');
const h = 'Branch on every <code>stop_reason</code> value, <strong>including</strong> '
        + 'ones you <em>don\'t</em> expect.';
const sp = T.speakable(h);
ok(!/[<>]/.test(sp), 'no angle brackets survive');
ok(!/code|strong|em>/.test(sp), 'no tag names leak: "' + sp.slice(0, 60) + '..."');
ok(/including/.test(sp), 'emphasised words are kept');

console.log('\n2. Identifiers are expanded so they read correctly');
ok(/stop reason/.test(T.speakable('<code>stop_reason</code>')), 'stop_reason -> stop reason');
ok(/tool use/.test(T.speakable('tool_use')), 'tool_use -> tool use');
ok(/max tokens/.test(T.speakable('max_tokens')), 'max_tokens -> max tokens');
ok(/M C P/.test(T.speakable('MCP servers')), 'MCP is spelled out');
ok(/CLAUDE dot M D/.test(T.speakable('CLAUDE.md')), 'CLAUDE.md is pronounceable');
ok(/Domain 3/.test(T.speakable('D3 covers config')), 'D3 -> Domain 3');

console.log('\n3. Symbols become words or pauses, never silence');
ok(/then/.test(T.speakable('draft \u2192 critique')), 'arrow -> "then"');
ok(/,/.test(T.speakable('one \u2014 two')), 'em dash becomes a pause');
ok(/less than/.test(T.speakable('&lt;5')), 'entity expanded');
const nothingLeft = T.speakable('<div></div>');
ok(nothingLeft === '', 'empty markup yields nothing to speak');

console.log('\n4. A note becomes an ordered set of segments');
const segs = T.noteToSpeech('CCAR-F', 'd1');
ok(segs.length > 20, segs.length + ' segments for D1');
ok(/Domain 1/.test(segs[0].text), 'opens by naming the domain: "' + segs[0].text.slice(0, 50) + '..."');
ok(/big idea/i.test(segs[1].text), 'then the big idea');
ok(segs.every(s => s.text && s.text.trim()), 'no empty segments');
ok(segs.every(s => !/[<>]/.test(s.text)), 'no markup anywhere in the output');

console.log('\n5. Block types are announced so you know what you are hearing');
const all = segs.map(s => s.text).join(' | ');
ok(/Takeaway\./.test(all), 'takeaways announced');
ok(/Watch out\./.test(all), 'warnings announced');
ok(/Section\./.test(all), 'section headings announced');

console.log('\n6. Tables are read as header-value pairs, not bare cells');
const withTable = T.noteToSpeech('CCAR-F', 'd1').map(s => s.text).join(' | ');
ok(/Table\./.test(withTable), 'table is introduced');
ok(/stop reason:/.test(withTable) || /Pattern:/.test(withTable),
   'cells are paired with their column header');

console.log('\n7. Every note in every exam converts without error');
let total = 0, bad = [];
T.EXAM_ORDER.forEach(code => {
  T.EXAMS[code].domains.forEach(d => {
    if (!T.NOTES.find(n => n.exam === code && n.d === d.id)) return;
    let out;
    try { out = T.noteToSpeech(code, d.id); }
    catch (e) { bad.push(code + '/' + d.id + ': ' + e.message); return; }
    if (!out.length) bad.push(code + '/' + d.id + ': empty');
    if (out.some(s => /[<>]|&[a-z]+;/.test(s.text))) bad.push(code + '/' + d.id + ': markup leaked');
    total += out.length;
  });
});
ok(bad.length === 0, bad.length ? bad.join('; ') : 'all 27 notes convert cleanly');
console.log('  (' + total + ' spoken segments across the whole app)');

console.log('\n8. Reading speed clamps and persists');
ok(T.setTtsRate(1.5) === 1.5, 'accepts 1.5');
ok(store['cct-ttsrate'] === '1.5', 'stored');
ok(T.ttsRate() === 1.5, 'read back');
ok(T.setTtsRate(9) === 2, 'clamps high to 2');
ok(T.setTtsRate(0.1) === 0.6, 'clamps low to 0.6');
store['cct-ttsrate'] = 'garbage';
ok(T.ttsRate() === 1, 'corrupt stored value falls back to 1');

console.log('\n9. Missing note returns nothing rather than throwing');
ok(T.noteToSpeech('CCAR-F', 'nope').length === 0, 'unknown domain -> empty');

console.log('\n10. Degrades without speech support');
ok(T.ttsSupported() === false, 'reports unsupported in this environment');

console.log("\n11. Every segment carries a key, and keys map to blocks");
{ const segs = T.noteToSpeech('CCAR-F','d1');
  const keyed = segs.filter(x=>x.key);
  ok(keyed.length===segs.length, 'all '+segs.length+' segments have a key');
  const title = segs.find(x=>x.key==='title');
  ok(!!title && /Domain 1/.test(title.text), 'title segment keyed "title"');
  ok(segs.some(x=>x.key==='big'), 'big-idea segment keyed "big"');
  ok(segs.some(x=>/^s0-b\d+$/.test(x.key)), 'body blocks keyed sN-bN');
}

console.log("\n12. Click-to-start resolves a key to the right segment");
{ const segs = T.noteToSpeech('CCAR-F','d1');
  const target = segs.find(x=>/^s2-b/.test(x.key));
  const at = segs.findIndex(x=>x.key===target.key);
  ok(at>0, 'a mid-note key resolves to index '+at+', not 0');
  // a table maps to several segments; clicking it must land on the FIRST
  const dupKeys = segs.map(x=>x.key).filter((k,i,a)=>a.indexOf(k)!==i);
  if (dupKeys.length) {
    const k = dupKeys[0];
    const first = segs.findIndex(x=>x.key===k);
    const all = segs.map((x,i)=>x.key===k?i:-1).filter(i=>i>=0);
    ok(first===Math.min(...all), 'multi-segment block starts at its first segment');
  } else { ok(true, '(no multi-segment blocks in this note)'); }
  ok(segs.findIndex(x=>x.key==='nope')===-1, 'unknown key resolves to -1, caller falls back to 0');
}

console.log("\n13. Keys are unique per block and stable across calls");
{ const a = T.noteToSpeech('CCAR-F','d3').map(x=>x.key);
  const b = T.noteToSpeech('CCAR-F','d3').map(x=>x.key);
  ok(JSON.stringify(a)===JSON.stringify(b), 'same keys on a second call');
  const blocks = [...new Set(a)];
  ok(blocks.length>5, blocks.length+' distinct blocks addressable');
}

console.log("\n14. Voice selection persists and degrades");
{ ok(Array.isArray(T.ttsVoices()), 'voice list is an array even with no speech support');
  ok(T.ttsVoices().length===0, 'empty in this environment');
  T.setTtsVoice('Some Voice');
  ok(store['cct-ttsvoice']==='Some Voice', 'choice stored');
  T.setTtsVoice('');
  ok(store['cct-ttsvoice']==='', 'cleared choice stored as empty');
}

console.log(fail ? `\n${fail} FAILURES` : '\nRead-aloud tests passed');
process.exit(fail ? 1 : 0);
