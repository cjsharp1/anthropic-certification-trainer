// Notes split into an index plus one view per domain. These check the
// routing, the index, the note page and that nothing was lost in the move.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;

let NODES = [];
// Walk the rendered tree rather than the flat NODES list, so a lookup only
// sees nodes actually attached to what is on screen now.
function walk(root, hit, out) {
  (root.children || []).forEach(c => { if (hit(c)) out.push(c); walk(c, hit, out); });
  return out;
}
function mk(t) {
  const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', title: '', value: '', children: [], onclick: null, ontoggle: null,
    hidden: false, disabled: false, open: false, type: '',
    classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
                 toggle: (c, f) => { const on = f === undefined ? !n._cls.has(c) : f;
                                     if (on) n._cls.add(c); else n._cls.delete(c); return on; },
                 contains: c => n._cls.has(c) },
    appendChild(c) { n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    addEventListener() {}, removeAttribute() {}, setAttribute(k, v) { n._attrs[k] = v; },
    focus() {}, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 232, top: 0, bottom: 0 }), scrollIntoView() {} };
  // elements carry CSS custom properties (--v on history dots)
  n.style.setProperty = (k, v) => { n.style[k] = v; };
  Object.defineProperty(n, 'className', {
    get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  // Setting innerHTML to '' detaches the children, as a browser does;
  // without this a re-render leaves stale nodes behind.
  Object.defineProperty(n, 'innerHTML', { get: () => n._h || '',
    set: v => { n._h = v; if (!v) n.children = []; } });
  NODES.push(n);
  return n;
}

let pushed = [];
function boot(state, hash, prefs) {
  NODES = []; pushed = [];
  // prefs seeds the standalone preference key (cct-readsize) that the
  // note header's text-size control reads and writes.
  const store = Object.assign({}, prefs || {});
  store['claude-cert-trainer-v1'] = JSON.stringify(state || {
    exam: 'CCAR-F', history: {}, seen: {}, flags: {}, labs: {},
    streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {}, planOrder: 'blueprint' });
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const views = {};
  const root = mk('html');
  const ctx = { console, structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
    parseInt, parseFloat, isFinite, setTimeout(f) { typeof f === 'function' && f(); },
    setInterval: () => 1, clearInterval() {},
    performance: { now: () => 0 }, alert() {}, confirm: () => true, CSS: { escape: x => String(x) },
    localStorage: { getItem: k => store[k] ?? null, setItem(k, v) { store[k] = v; }, removeItem() {} },
    location: { hash: hash || '' },
    history: { pushState(st, t, h) { pushed.push({ st, h }); ctx.location.hash = h; },
               replaceState(st, t, h) { if (h) ctx.location.hash = h; } },
    document: {
      documentElement: root,
      body: { classList: { add() {}, remove() {} } },
      getElementById: getId,
      querySelector: s => {
        const m = /^#([\w-]+)$/.exec(s);
        if (!m) return null;
        // A real querySelector finds what has been rendered, not the
        // placeholder getId() hands out for static markup — the note
        // header's controls are built at render time.
        const hit = walk(getId('noteBody'), n => n.id === m[1], [])[0];
        return hit || getId(m[1]);
      },
      querySelectorAll: s => {
        if (s === '.view') return Object.values(views);
        if (s === '[data-view]') return ctx.__navButtons || [];
        return [];
      },
      createElement: mk, createElementNS: (ns, t) => mk(t), addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {}, innerHeight: 900,
              matchMedia: () => ({ matches: false, addEventListener() {} }) } };
  // stand-in nav buttons so go() can highlight one
  ctx.__navButtons = ['dash', 'study', 'notes', 'labs', 'progress', 'stats'].map(v => {
    const b = mk('button'); b.dataset.view = v; return b; });
  ['dash','study','notes','note','labs','progress','stats','quiz','cards','review','result']
    .forEach(v => { views['view-' + v] = getId('view-' + v); });
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].forEach(m =>
    vm.runInContext(fs.readFileSync(P.resolve(m[1]), 'utf8'), ctx, { filename: m[1] }));
  vm.runInContext('globalThis.__n={renderNotes,renderNoteView,noteBody,openNote,go,'
    + 'parseHash,syncHistory,noteFor,hasRead,EXAMS,NOTES,ROUTES,S,'
    + 'SIZE_DEFAULT,SIZE_STEP,clampSize,getNav:()=>currentNote};', ctx);
  return { api: ctx.__n, byId, ctx, store, root };
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);
const by = c => NODES.filter(n => n._cls && n._cls.has(c));

H('1. The note route exists and parses a domain');
{
  const { api } = boot(null, '#note/CCAR-F/d3');
  ok(api.ROUTES.includes('note'), 'note is a route');
  const r = api.parseHash();
  ok(r && r.view === 'note', 'view parsed');
  ok(r.exam === 'CCAR-F', 'exam parsed');
  ok(r.dom === 'd3', 'domain parsed');
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  ok(/id="view-note"/.test(html), 'view container exists');
  ok(/id="noteBody"/.test(html), 'render target exists');
}

H('2. The index lists one card per domain with a note');
{
  const { api } = boot(null);
  api.renderNotes();
  const avail = api.EXAMS['CCAR-F'].domains.filter(d => api.noteFor('CCAR-F', d.id));
  const cards = by('notecard');
  ok(cards.length === avail.length, cards.length + ' cards for ' + avail.length + ' notes');
  ok(by('ncname').length === cards.length, 'each card names its domain');
  ok(by('ncbig').length === cards.length, 'each card previews the big idea');
  ok(cards.every(c => typeof c.onclick === 'function'), 'each card is clickable');
  ok(by('noteidxsum').length === 1, 'summary line rendered');
}

H('3. Read state shows on the index');
{
  const st = { exam: 'CCAR-F', history: {}, seen: {}, flags: {}, labs: {},
               streak: { last: null, days: 0 }, sessions: [],
               read: { 'CCAR-F/d1': Date.now(), 'CCAR-F/d3': Date.now() },
               cards: {}, planOrder: 'blueprint' };
  const { api } = boot(st);
  api.renderNotes();
  ok(by('notecard').filter(c => c._cls.has('read')).length === 2, 'two cards marked read');
  ok(by('nctick').length === 2, 'two ticks shown');
}

H('4. A single note renders its own page');
{
  const { api } = boot(null);
  api.renderNoteView('d3');
  ok(by('notehtitle').length === 1, 'one title');
  ok(by('notebody').length === 1, 'the note body is present');
  ok(by('noteacts').length === 1, 'action row present');
  ok(by('notecard').length === 0, 'index cards are NOT also rendered');
  const n = api.noteFor('CCAR-F', 'd3');
  ok(by('nsec').length >= n.sections.length, 'every section heading rendered');
}

H('5. Prev/next follow the blueprint order');
{
  const { api } = boot(null);
  const avail = api.EXAMS['CCAR-F'].domains.filter(d => api.noteFor('CCAR-F', d.id));
  // middle note: both steps present
  api.renderNoteView(avail[1].id);
  ok(by('notestep').length === 2, 'middle note has prev and next');
  // first note: next only
  NODES = [];
  api.renderNoteView(avail[0].id);
  const first = by('notestep');
  ok(first.length === 1 && first[0]._cls.has('next'), 'first note has next only');
  // last note: prev only
  NODES = [];
  api.renderNoteView(avail[avail.length - 1].id);
  const last = by('notestep');
  ok(last.length === 1 && last[0]._cls.has('prev'), 'last note has prev only');
}

H('6. Navigating pushes a linkable history entry');
{
  const { api, ctx } = boot(null);
  api.openNote('CCAR-F', 'd3');
  ok(ctx.location.hash === '#note/CCAR-F/d3', 'hash is ' + ctx.location.hash);
  ok(pushed.length === 1, 'one history entry pushed');
  ok(pushed[0].st.dom === 'd3', 'the entry remembers the domain');
  api.go('notes');
  ok(ctx.location.hash === '#notes/CCAR-F', 'back to the index changes the hash');
  ok(pushed.length === 2, 'the index is its own entry, so Back works');
}

H('7. Opening a note for another exam switches the exam');
{
  const { api } = boot(null);
  ok(api.S.exam === 'CCAR-F', 'starts on CCAR-F');
  api.openNote('CCDV-F', 'v1');
  ok(api.S.exam === 'CCDV-F', 'exam switched to CCDV-F');
}

H('8. A bad or stale domain falls back rather than rendering blank');
{
  const { api } = boot(null);
  let threw = null;
  try { api.renderNoteView('nope'); } catch (e) { threw = e.message; }
  ok(!threw, 'no throw on an unknown domain' + (threw ? ': ' + threw : ''));
  ok(by('notehtitle').length === 1, 'it still renders a note');
}

H('9. Every exam and every domain renders');
{
  const bad = [];
  ['CCAO-F', 'CCDV-F', 'CCAR-F', 'CCAR-P'].forEach(code => {
    const st = { exam: code, history: {}, seen: {}, flags: {}, labs: {},
                 streak: { last: null, days: 0 }, sessions: [], read: {}, cards: {},
                 planOrder: 'blueprint' };
    const { api } = boot(st);
    try { api.renderNotes(); } catch (e) { bad.push(code + ' index: ' + e.message); }
    api.EXAMS[code].domains.filter(d => api.noteFor(code, d.id)).forEach(d => {
      try { api.renderNoteView(d.id); } catch (e) { bad.push(code + '/' + d.id + ': ' + e.message); }
    });
  });
  ok(bad.length === 0, bad.length ? bad.join(' | ') : 'all 27 notes render in their own view');
}

H('9b. The index is a list: every row carries number, name and meta');
{
  // The landing page is a list rather than a grid of cards, so each row has
  // to supply the three aligned columns the CSS lays out. A row missing its
  // meta span collapses the right-hand column for the whole list.
  const { api } = boot(null);
  api.renderNotes();
  const rows = by('notecard');
  ok(rows.length > 0, rows.length + ' rows rendered');
  const need = ['ncnum', 'ncname', 'ncbig', 'ncmeta'];
  let bad = [];
  rows.forEach((r, i) => {
    need.forEach(c => {
      if (!(r.children || []).some(k => k._cls && k._cls.has(c))) bad.push('row ' + i + ' missing .' + c);
    });
    if (!r._attrs || !r._attrs['aria-label']) bad.push('row ' + i + ' has no aria-label');
  });
  ok(bad.length === 0, bad.length ? bad.slice(0, 4).join('; ') : 'every row has num, name, summary and meta');
  // The weight and read time live inside the meta column, not loose in the row.
  const meta = rows[0] && (rows[0].children || []).find(k => k._cls && k._cls.has('ncmeta'));
  ok(meta && (meta.children || []).some(k => k._cls && k._cls.has('ncweight')),
     'weight sits inside the meta column');
}

H('10. The note body kept everything the old view had');
{
  const { api } = boot(null);
  const n = api.noteFor('CCAR-F', 'd1');
  api.renderNoteView('d1');
  ok(by('bigidea').length === 1, 'big idea');
  ok(by('keysum').length === 1, 'takeaway summary');
  if (n.confusions && n.confusions.length) ok(by('confbox').length === n.confusions.length, 'confusion pairs');
  if (n.checks && n.checks.length) ok(by('nchecks').length === 1, 'check-yourself list');
  const tables = n.sections.reduce((a, s) => a + s.body.filter(p => p && p.table).length, 0);
  if (tables) ok(by('ntable').length === tables, tables + ' tables');
}

H('11. The text-size control sits in the note header');
{
  // It only affects this page, so it lives on it. Column width used to have
  // a matching stepper here; the site has one content measure now, so text
  // size is the only reading preference left.
  const { api, byId } = boot(null);
  api.renderNoteView('d1');
  const head = byId['noteBody'];
  const steppers = walk(head, n => n._cls && n._cls.has('sizerow'), []);
  ok(steppers.length === 1, 'exactly one stepper, got ' + steppers.length);
  const labels = walk(head, n => n._cls && n._cls.has('sizelabel'), []);
  ok(labels.length === 1, 'with a single value button');
  ok(labels[0].textContent === '18px', 'showing a px value: ' + labels[0].textContent);
  ok(!/ch$/.test(labels[0].textContent), 'and no column-width control remains');
  // The visible caption is hidden on narrow screens, so the group names itself.
  ok(/text size/i.test(steppers[0].title || ''),
     'the group carries its own name: ' + steppers[0].title);
}

H('12. It renders with the stored value, not the default');
{
  const { api, byId } = boot(null, '', { 'cct-readsize': '1.18' });
  api.renderNoteView('d1');
  const label = walk(byId['noteBody'], n => n._cls && n._cls.has('sizelabel'), [])[0];
  ok(label.textContent === '21px', 'stored 1.18 reads as 21px, got ' + label.textContent);
}

H('13. Stepping writes through, and scopes the change to the note view');
{
  const { api, byId, store, root } = boot(null);
  api.renderNoteView('d1');
  const steps = walk(byId['noteBody'], n => n._cls && n._cls.has('stepbtn'), []);
  const up = steps.find(b => /increase reading text size/i.test(b._attrs['aria-label'] || ''));
  ok(!!up, 'the increase button exists');
  up.onclick();
  ok(Number(store['cct-readsize']) > api.SIZE_DEFAULT, 'the new size was persisted');
  // It must write the SCOPED variable: --read-scale is pinned to 1 at :root
  // so the rest of the app keeps its standard typography.
  ok(root.style['--user-read-scale'] === String(Number(store['cct-readsize'])),
     'it set --user-read-scale, got ' + root.style['--user-read-scale']);
  ok(root.style['--read-scale'] === undefined, 'and left the global scale alone');
  // Nothing here may touch the page width any more.
  ok(root.style['--user-read-measure'] === undefined, 'and set no column width');
}

H('14. Clicking the value resets it');
{
  const { api, byId, store } = boot(null, '', { 'cct-readsize': '1.3' });
  api.renderNoteView('d1');
  const label = walk(byId['noteBody'], n => n._cls && n._cls.has('sizelabel'), [])[0];
  ok(label.textContent !== '18px', 'starts at the stored value: ' + label.textContent);
  label.onclick();
  ok(Number(store['cct-readsize']) === api.SIZE_DEFAULT, 'reset to the default');
  ok(label.textContent === '18px', 'and the label followed');
}

H('15. Limits disable the step buttons');
{
  const { api, byId } = boot(null, '', { 'cct-readsize': '0.76' });   // SIZE_MIN
  api.renderNoteView('d1');
  const steps = walk(byId['noteBody'], n => n._cls && n._cls.has('stepbtn'), []);
  const down = steps.find(b => /decrease reading text size/i.test(b._attrs['aria-label'] || ''));
  const up = steps.find(b => /increase reading text size/i.test(b._attrs['aria-label'] || ''));
  ok(down.disabled === true, 'at the minimum the decrease button is disabled');
  ok(up.disabled === false, 'the increase button is still live');
}

H('16. Moving to another note re-wires the rebuilt control');
{
  // renderNoteView() rebuilds the whole page, so a handler bound on the
  // first note points at a discarded node. This is the case that breaks
  // silently if the re-init call is ever dropped.
  const { api, byId, store } = boot(null);
  api.renderNoteView('d1');
  api.renderNoteView('d2');
  const steps = walk(byId['noteBody'], n => n._cls && n._cls.has('stepbtn'), []);
  const up = steps.find(b => /increase reading text size/i.test(b._attrs['aria-label'] || ''));
  ok(typeof up.onclick === 'function', 'the rebuilt button has a handler');
  up.onclick();
  ok(Number(store['cct-readsize']) === api.clampSize(api.SIZE_DEFAULT + api.SIZE_STEP),
     'and it still steps, got ' + store['cct-readsize']);
  ok(walk(byId['noteBody'], n => n._cls && n._cls.has('sizelabel'), []).length === 1,
     'exactly one control after the move');
}

H('17. Diagrams render, and stay safe and themeable');
{
  // Figures were added to show mechanisms the prose would otherwise make
  // the reader assemble. They are hand-authored SVG in the note data, so
  // the constraints that keep them safe and legible are worth pinning.
  const { api, byId } = boot(null);
  api.renderNoteView('d1');
  const figs = by('nfig');
  ok(figs.length > 0, figs.length + ' figures rendered in CCAR-F d1');
  const holders = by('nfigsvg');
  ok(holders.length === figs.length, 'each figure has an svg holder');
  ok(holders.every(h => /<svg/.test(h.innerHTML)), 'each holder carries svg markup');
  const caps = NODES.filter(n => n.tag === 'figcaption');
  ok(caps.length === figs.length, 'each figure has a caption stating its claim');

  // Every figure in every note, checked against the authoring rules.
  const notes = api.NOTES;
  const all = [];
  notes.forEach(n => (n.sections || []).forEach(s =>
    (s.body || []).forEach(b => { if (b && b.fig) all.push({ n, fig: b.fig }); })));
  ok(all.length > 0, all.length + ' figures across the notes');
  const bad = [];
  all.forEach(({ n, fig }) => {
    const where = n.exam + '/' + n.d;
    if (!/viewBox=/.test(fig.svg)) bad.push(where + ': no viewBox, cannot scale');
    if (!/currentColor/.test(fig.svg)) bad.push(where + ': not drawn in currentColor');
    if (/<script|<style|<foreignObject/i.test(fig.svg)) bad.push(where + ': unsafe content');
    // the xmlns declaration is not a fetch; anything else remote is
    const remote = fig.svg.replace(/xmlns="[^"]*"/g, '');
    if (/https?:\/\//.test(remote)) bad.push(where + ': references something remote');
    if (!fig.cap || fig.cap.length < 40) bad.push(where + ': caption too thin to state a claim');
    // a fixed width/height defeats the responsive scaling the CSS sets up
    if (/<svg[^>]*\swidth="/.test(fig.svg)) bad.push(where + ': hard-coded width');
  });
  ok(bad.length === 0, bad.length ? bad.slice(0, 4).join('; ')
    : 'all ' + all.length + ' are scalable, themed, self-contained and captioned');
}

H('18. A diagram is narrated by its caption');
{
  // Unhandled block types are skipped silently by the segmenter, which
  // would desynchronise the read-aloud highlight from the page.
  const { api, ctx } = boot(null);
  const segs = vm.runInContext('noteToSpeech("CCAR-F", "d1")', ctx);
  ok(Array.isArray(segs) && segs.length > 0, segs.length + ' spoken segments');
  const figSegs = segs.filter(s => /^Figure\./.test(s.text || ''));
  ok(figSegs.length === 2, 'both d1 figures are spoken, got ' + figSegs.length);
  ok(figSegs.every(s => (s.text || '').length > 50),
     'each reads its full caption rather than announcing an image');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Notes view tests passed');
process.exit(fail ? 1 : 0);
