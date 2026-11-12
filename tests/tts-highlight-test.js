// The highlight bug was an ordering bug: the note re-render rebuilt the DOM
// AFTER speakSegment() had marked a node, so the first clicked paragraph
// never showed as highlighted. These tests drive the real functions against
// a DOM stub that actually tracks classes and attributes.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;

const store = {};
let NODES = [];               // every node currently "in the document"
function attach(n) { if (!n || NODES.includes(n)) return; NODES.push(n);
  (n.children || []).forEach(attach); }
function detach(n) { if (!n) return; const i = NODES.indexOf(n); if (i >= 0) NODES.splice(i, 1);
  (n.children || []).forEach(detach); }

function mk(tag) {
  const n = {
    tag: tag || 'div', _cls: new Set(), dataset: {}, style: {}, hidden: false,
    textContent: '', innerHTML: '', title: '', value: '', children: [], onclick: null,
    classList: {
      add: c => n._cls.add(c), remove: c => n._cls.delete(c),
      toggle: c => n._cls.has(c) ? n._cls.delete(c) : n._cls.add(c),
      contains: c => n._cls.has(c),
    },
    appendChild(c) { n.children.push(c); attach(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.appendChild(c)); },
    addEventListener() {}, removeAttribute() {}, setAttribute() {}, focus() {},
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232, top: 300, bottom: 400 }),
    scrollIntoView() { n._scrolled = true; },
  };
  Object.defineProperty(n, 'innerHTML', {
    get: () => n._html || '',
    set: v => { if (!v) { n.children.forEach(detach); n.children = []; } n._html = v; },
  });
  // el() assigns .className directly, so mirror it into the classList set.
  // elements carry CSS custom properties (--v on history dots)
  n.style.setProperty = (k, v) => { n.style[k] = v; };
  Object.defineProperty(n, 'className', {
    get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  return n;   // created, but not attached until appendChild
}

const bar = mk('div');
const byId = {};
// renderNotes() touches a lot of chrome; hand it a node for any id it asks for.
const getId = id => (byId[id] || (byId[id] = mk('div')));

// Spoken utterances, so we can assert playback actually started.
const spoken = [];
class Utt { constructor(t) { this.text = t; } }

const ctx = {
  console, structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
  parseInt, parseFloat, isFinite, encodeURIComponent, decodeURIComponent,
  setTimeout: f => { typeof f === 'function' && f(); }, setInterval: () => 1, clearInterval() {},
  performance: { now: () => 0 }, alert() {}, confirm: () => true,
  CSS: { escape: s => String(s) },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; },
                  removeItem: k => { delete store[k]; } },
  location: { hash: '' }, history: { pushState() {}, replaceState() {} },
  SpeechSynthesisUtterance: Utt,
  speechSynthesis: {
    speaking: false, paused: false,
    getVoices: () => [],
    speak(u) { spoken.push(u.text); this.speaking = true; },
    cancel() { this.speaking = false; }, pause() {}, resume() {},
  },
  document: {
    documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {},
                       classList: { add() {}, remove() {} } },
    body: { classList: { add() {}, remove() {} } },
    getElementById: id => getId(id),
    // The real selectors the highlight code uses.
    querySelector(sel) {
      let m = /^\[data-seg="(.*)"\]$/.exec(sel);
      if (m) return NODES.find(n => n.dataset && n.dataset.seg === m[1]) || null;
      m = /^#([\w-]+)$/.exec(sel);
      if (m) return getId(m[1]);
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.speaking') return NODES.filter(n => n._cls && n._cls.has('speaking'));
      return [];
    },
    createElement: mk, addEventListener() {},
  },
  window: { scrollTo() {}, addEventListener() {}, innerHeight: 900, matchMedia: () => ({ matches:false, addEventListener(){} }) },
};
ctx.globalThis = ctx;
vm.createContext(ctx);

for (const f of ['data-exams.js','data-questions.js','data-questions-2.js',
                 'data-questions-3.js','data-questions-4.js','data-questions-5.js',
                 'data-labs.js','data-starters.js','data-notes.js','app.js']) {
  vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), ctx, { filename: f });
}
vm.runInContext('globalThis.__t={startSpeaking,stopSpeaking,highlightSpoken,'
  + 'noteToSpeech,speakSegment,ttsSupported,getTTS:()=>TTS};', ctx);
const T = ctx.__t;

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const marked = () => NODES.filter(n => n._cls && n._cls.has('speaking'));

console.log('\n1. Speech is actually supported in this harness');
ok(T.ttsSupported() === true, 'stub exposes speechSynthesis');

console.log('\n2. Clicking a paragraph highlights THAT paragraph');
// Render through the REAL renderer so startSpeaking's internal renderNotes()
// actually replaces these nodes - that replacement is what the bug destroyed.
const segs = T.noteToSpeech('CCAR-F', 'd1');
const midKey = segs.find(s => /^s2-b/.test(s.key)).key;

// renderNotes() builds the note DOM; NODES is reset so only live nodes count.
function renderFresh() {
  // Detaching the old subtree is what a real re-render does; the browser
  // discards those nodes (and their .speaking class) along with it.
  NODES.forEach(n => { if (n._cls) n._cls.delete('speaking'); });
  NODES = [];
  vm.runInContext("renderNoteView('d1')", ctx);
}
renderFresh();
const live = k => NODES.find(n => n.dataset && n.dataset.seg === k);
ok(!!live(midKey), 'renderer produced a node for ' + midKey);

T.startSpeaking('CCAR-F', 'd1', midKey);
ok(spoken.length > 0, 'playback started (' + spoken.length + ' utterance queued)');
const hi = marked();
ok(hi.length === 1, 'exactly one node highlighted, got ' + hi.length);
// The node must be one that is currently IN the document, not an orphan left
// over from before the re-render.
ok(hi.length === 1 && NODES.includes(hi[0]),
   'the highlighted node is live in the document, not an orphan');
ok(hi.length === 1 && hi[0].dataset.seg === midKey,
   'and it is the clicked block (' + midKey + ')');

console.log('\n3. The highlight survives a further notes re-render');
renderFresh();
T.highlightSpoken(false);
const hi3 = marked();
ok(hi3.length === 1, 'still exactly one highlight, got ' + hi3.length);
ok(hi3.length === 1 && NODES.includes(hi3[0]), 'and it is the freshly rendered node');
ok(hi3.length === 1 && hi3[0].dataset.seg === midKey, 'still keyed ' + midKey);


console.log('\n4. Advancing moves the highlight, never accumulates it');
const TTS = T.getTTS();
TTS.i = TTS.segs.findIndex(s => s.key === midKey) + 1;
T.highlightSpoken(false);
const after = marked();
ok(after.length === 1, 'one highlight after advancing, got ' + after.length);
const nextKey = TTS.segs[TTS.i].key;
ok(after.length === 1 && after[0].dataset.seg === nextKey,
   'highlight followed to ' + nextKey);

console.log('\n5. Stopping clears the highlight');
T.stopSpeaking();
T.highlightSpoken(false);
ok(marked().length === 0, 'no highlight once playback stops');

console.log('\n6. A key with no matching node is harmless');
T.startSpeaking('CCAR-F', 'd1', 'title');
NODES.forEach(n => { if (n.dataset) delete n.dataset.seg; });
let threw = null;
try { T.highlightSpoken(true); } catch (e) { threw = e.message; }
ok(!threw, 'missing node does not throw' + (threw ? ': ' + threw : ''));
T.stopSpeaking();

console.log("\n7. A <details> block keeps its own click, and gets a speaker button");
{
  // Render a real note and inspect what the renderer attached to each block.
  // A details element with an onclick would be unopenable.
  NODES = [];
  const made = [];
  const realMk = mk;
  ctx.document.createElement = (t) => { const n = realMk(t); made.push(n); return n; };
  vm.runInContext("renderNoteView && renderNoteView('d1')", ctx);
  ctx.document.createElement = realMk;

  const details = made.filter(n => n.tag === 'details');
  ok(details.length > 0, details.length + ' <details> blocks rendered');

  const hijacked = details.filter(n => typeof n.onclick === 'function');
  ok(hijacked.length === 0,
     hijacked.length ? hijacked.length + ' <details> still swallow their click'
                     : 'no <details> has a click handler - expanding works');

  const addressable = details.filter(n => n.dataset && n.dataset.seg);
  ok(addressable.length > 0,
     addressable.length + ' remain addressable for the highlight');

  const buttons = made.filter(n => n._cls && n._cls.has('segspeak'));
  ok(buttons.length === addressable.length,
     buttons.length + ' speaker buttons for ' + addressable.length + ' why-blocks');
  ok(buttons.every(b => typeof b.onclick === 'function'),
     'every speaker button has its own handler');
  ok(!addressable.some(n => n._cls && n._cls.has('speakable')),
     'why-blocks are not .speakable (no whole-block click target)');
}

console.log("\n8. The speaker button does not bubble into the disclosure");
{
  const made = [];
  const realMk = mk;
  ctx.document.createElement = (t) => { const n = realMk(t); made.push(n); return n; };
  vm.runInContext("renderNoteView && renderNoteView('d1')", ctx);
  ctx.document.createElement = realMk;
  const b = made.find(n => n._cls && n._cls.has('segspeak'));
  ok(!!b, 'found a speaker button');
  const before = spoken.length;
  let prevented = false, stopped = false;
  b.onclick({ preventDefault: () => { prevented = true; },
              stopPropagation: () => { stopped = true; } });
  ok(prevented, 'calls preventDefault so the details does not toggle');
  ok(stopped, 'calls stopPropagation so the summary never sees the click');
  ok(spoken.length > before, 'and it actually starts playback');
}
console.log(fail ? `\n${fail} FAILURES` : '\nHighlight tests passed');
process.exit(fail ? 1 : 0);
