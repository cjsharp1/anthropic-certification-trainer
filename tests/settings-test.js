// Display controls moved out of the sidebar onto a Settings page. These check
// the route, that each setting states where it applies, and — the part that
// actually broke when the controls were rebuilt per visit — that the stored
// value survives navigating away and back, and that the buttons still work
// on the second visit against freshly created elements.
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;

let NODES = [];
function mk(t) {
  const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
    textContent: '', title: '', value: '', children: [], onclick: null,
    hidden: false, disabled: false, open: false, type: '',
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

// Walk the rendered tree rather than the flat NODES list, so a query only
// sees nodes actually attached to what is on screen now.
function walk(root, hit, out) {
  (root.children || []).forEach(c => { if (hit(c)) out.push(c); walk(c, hit, out); });
  return out;
}

function boot(store0) {
  NODES = [];
  const store = Object.assign({}, store0 || {});
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const views = {};
  const root = mk('html');
  root.style.setProperty = (k, v) => { root.style[k] = v; };
  const ctx = { console, structuredClone, Math, Date, JSON, Object, Array, String, Number,
    Set, Map, parseInt, parseFloat, isFinite, Number_isFinite: Number.isFinite,
    setTimeout(f) { typeof f === 'function' && f(); },
    setInterval: () => 1, clearInterval() {},
    performance: { now: () => 0 }, alert() {}, confirm: () => true,
    CSS: { escape: x => String(x) },
    localStorage: { getItem: k => (k in store ? store[k] : null),
                    setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; } },
    location: { hash: '' },
    history: { pushState(st, t, h) { ctx.location.hash = h; },
               replaceState(st, t, h) { if (h) ctx.location.hash = h; } },
    document: {
      documentElement: root,
      body: { classList: { add() {}, remove() {} } },
      getElementById: getId,
      querySelector: s => {
        const m = /^#([\w-]+)$/.exec(s);
        if (m) {
          // A real querySelector finds whatever is in the document, which for
          // the settings controls means the nodes renderSettings() just built
          // — not the placeholder getId() hands out for static markup. Search
          // the rendered tree first so initSize() binds to the
          // same buttons the test clicks.
          const hit = walk(getId('settingsBody'), n => n.id === m[1], [])[0];
          return hit || getId(m[1]);
        }
        if (s === '.rail') return mk('aside');
        return null;
      },
      querySelectorAll: s => {
        if (s === '.view') return Object.values(views);
        if (s === '[data-view]') return ctx.__navButtons || [];
        // theme buttons are rendered into the settings page
        if (s === '[data-theme-set]')
          return walk(getId('settingsBody'), n => n.dataset && n.dataset.themeSet, []);
        return [];
      },
      createElement: mk, createElementNS: (ns, t) => mk(t), addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {}, innerHeight: 900,
              matchMedia: () => ({ matches: false, addEventListener() {} }) } };
  ctx.__navButtons = ['dash', 'study', 'notes', 'labs', 'progress', 'stats', 'settings']
    .map(v => { const b = mk('button'); b.dataset.view = v; return b; });
  ['dash','study','notes','note','labs','progress','stats','settings',
   'quiz','cards','review','result'].forEach(v => { views['view-' + v] = getId('view-' + v); });
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].forEach(m =>
    vm.runInContext(fs.readFileSync(P.resolve(m[1]), 'utf8'), ctx, { filename: m[1] }));
  vm.runInContext('globalThis.__s={renderSettings,go,ROUTES,SETTINGS_SCOPE,'
    + 'applySize,SIZE_DEFAULT,SIZE_STEP,'
    + 'initTheme,initSize};', ctx);
  return { api: ctx.__s, byId, ctx, store, root };
}

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);
const inBody = (b, cls) => walk(b, n => n._cls && n._cls.has(cls), []);

H('1. Settings is a real route with a view container');
{
  const { api } = boot();
  ok(api.ROUTES.includes('settings'), 'settings is in ROUTES');
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  ok(/id="view-settings"/.test(html), 'view container exists');
  ok(/id="settingsBody"/.test(html), 'render target exists');
  ok(/data-view="settings"/.test(html), 'sidebar links to it');
}

H('2. The controls are no longer in the page chrome');
{
  // The whole point of the move: index.html must not ship these as static
  // markup, or two copies of each control would exist and fight over ids.
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  ['sizeDown', 'sizeUp', 'sizeLabel']
    .forEach(id => ok(!new RegExp('id="' + id + '"').test(html), id + ' is not static markup'));
  ok(!/id="ctlToggle"/.test(html), 'the Display toggle is gone');
  ok(!/showctl/.test(html), 'its mobile CSS is gone too');
}

H('2b. One content measure governs the whole site');
{
  // Page width used to be set in seven places at four different values
  // (1480 / 820 / 680 / 560px plus three --read-measure expressions), so the
  // column jumped as you moved between pages. Now .main sets it once.
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  const app = fs.readFileSync(P.resolve('app.js'), 'utf8');

  ok(/--measure:\s*\d+px/.test(html), ':root declares one content measure');
  const main = /\.main\{([\s\S]*?)\}/.exec(html);
  ok(!!main && /max-width:calc\(var\(--measure\)/.test(main[1]),
     '.main is what applies it');
  // Left-aligned, not centred: the column must stay put against the
  // sidebar as the window resizes rather than drifting sideways.
  ok(!!main && !/margin:[^;}]*auto/.test(main[1]), 'and does not centre the column');

  // No component may re-cap the page. Widths in ch are text measures against
  // their own type, and the flashcard stack is a deliberately narrow
  // component — neither is an alternative page width.
  const OK_PX = ['.flash', '.cardactions', '.cardmark', '.cardtop', '#resultBody',
                 '.ttsvoice', '.qhtrack'];
  let cur = null;
  const rogue = [];
  html.split(String.fromCharCode(10)).forEach(l => {
    const m = /^([.#][^{\s][^{]*)\{/.exec(l);
    if (m) cur = m[1].trim();
    if (!/max-width:/.test(l) || /@media/.test(l)) return;
    if (/max-width:\s*(calc\(var\(--measure|\d+ch|100%)/.test(l)) return;
    if ((cur || '').startsWith('.main')) return;
    if (OK_PX.some(p => (cur || '').startsWith(p))) return;
    rogue.push(cur);
  });
  ok(rogue.length === 0, rogue.length
    ? 'these still set their own page width: ' + rogue.join(', ')
    : 'no component overrides the site measure');

  // Nor may a narrower component centre itself inside the column: with a
  // left-aligned page that reintroduces the drift in miniature. Scan each
  // rule body as a whole rather than line by line, since the margin and the
  // max-width are often declared on different lines of the same rule.
  const floaters = [];
  html.split(/(?=^[.#][^{\s][^{]*\{)/m).forEach(chunk => {
    const m = /^([.#][^{\s][^{]*)\{([\s\S]*?)\}/.exec(chunk);
    if (!m) return;
    const sel = m[1].trim(), body = m[2];
    // Only PIXEL caps are page-like. A ch cap is a text measure, and text
    // centred inside a component (the flashcard answer) is deliberate.
    if (!/max-width:\s*\d+px/.test(body)) return;
    if (/margin[a-z-]*:[^;}]*\bauto\b/.test(body)) floaters.push(sel);
  });
  ok(floaters.length === 0, floaters.length
    ? 'these centre themselves in a left-aligned layout: ' + floaters.join(', ')
    : 'no capped component centres itself');

  // The width control itself is gone, along with its stored preference.
  ok(!/--read-measure/.test(app), 'no reading-measure variable in the app code');
  ok(!/applyWidth|stepWidth|initWidth|WIDTH_DEFAULT/.test(app),
     'the width control functions were removed');
  ok(!/cct-readwidth/.test(app), 'and it no longer stores a width preference');
  ok(!/id="widthDown"|id="widthUp"|id="widthLabel"/.test(html),
     'no width stepper in the markup');
}

H('2c. The text-size setting still reaches the study notes only');
{
  const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
  const app = fs.readFileSync(P.resolve('app.js'), 'utf8');
  ok(/setProperty\('--user-read-scale'/.test(app), 'the size control writes --user-read-scale');
  ok(!/setProperty\('--read-scale'/.test(app), 'nothing writes the global --read-scale');
  ok(/--read-scale:1;/.test(html), ':root pins the scale to 1 for the rest of the app');

  const block = /#view-note\{([\s\S]*?)\}/.exec(html);
  ok(!!block, '#view-note declares its own variables');
  if (block) {
    ok(/--read-scale:\s*var\(--user-read-scale,\s*1\)/.test(block[1]),
       'the note view adopts the user text size');
    ok(!/--read-measure/.test(block[1]), 'and no longer overrides the column width');
  }

  const NOTE = ['.n', '#noteBody', '#view-note', '.keysum', '.keysrc', '.keyli',
                '.keyitem', '.bigidea', '.lablabel', '.confbox', '.conf', '.nchecks'];
  let cur = null;
  const leaks = [];
  html.split(String.fromCharCode(10)).forEach((l, i) => {
    const m = /^([.#][^{\s][^{]*)\{/.exec(l);
    if (m) cur = m[1].trim();
    if (/--read-scale:|user-read-scale/.test(l)) return;
    if (/calc\([^)]*var\(--read-scale\)/.test(l) && !NOTE.some(p => (cur || '').startsWith(p)))
      leaks.push((i + 1) + ' ' + cur);
  });
  ok(leaks.length === 0, leaks.length
    ? 'still scales outside the notes: ' + leaks.slice(0, 5).join(', ')
    : 'no rule outside the note surface scales with the setting');
  ok(!/quiz-scale/.test(html), 'the quiz no longer tracks the reading size');
}

H('3. Settings holds only what applies everywhere');
{
  const { api, byId } = boot();
  api.renderSettings();
  const body = byId['settingsBody'];
  const rows = inBody(body, 'setrow');
  // The reading controls moved to the note header once they were scoped to
  // that one surface, leaving the theme as the only global preference.
  ok(rows.length === 1, 'one preference row, got ' + rows.length);
  ok(inBody(rows[0], 'settitle')[0].textContent === 'Colour theme',
     'and it is the theme');
  ok(!inBody(body, 'sizelabel').length, 'no reading steppers here any more');
  ok(Object.keys(api.SETTINGS_SCOPE).join() === 'theme',
     'nothing else claims a scope: ' + Object.keys(api.SETTINGS_SCOPE).join());
  ok(/every page/i.test(api.SETTINGS_SCOPE.theme.join(' ')),
     'theme is documented as global');
  const list = inBody(body, 'setscopelist')[0];
  ok(list && String(list.textContent).trim().length > 0,
     'the row still states where it applies: ' + (list && list.textContent));
  // The global reset stays; it is not a display preference.
  ok(/Reset everything/.test(NODES.map(n => n.textContent).join(' ')),
     'Manage data is still on this page');
}

/* Sections 4-8 used to live here, exercising the reading steppers through
   renderSettings(). They moved to notes-view-test.js along with the controls
   themselves — the behaviour is unchanged, only the page that renders it. */

H('4. Theme buttons work from the settings page');
{
  const { api, byId, store, root } = boot();
  api.renderSettings();
  const body = byId['settingsBody'];
  const btns = walk(body, n => n.dataset && n.dataset.themeSet, []);
  ok(btns.length === 3, '3 theme buttons, got ' + btns.length);
  const dark = btns.find(b => b.dataset.themeSet === 'dark');
  dark.onclick();
  ok(store['cct-theme'] === 'dark', 'the choice was persisted');
  ok(root._attrs['data-theme'] === 'dark', 'data-theme was set on the root');
  ok(dark._cls.has('on'), 'the chosen button is marked active');
  const auto = btns.find(b => b.dataset.themeSet === 'system');
  auto.onclick();
  ok(!('data-theme' in root._attrs), 'system removes the attribute so the OS decides');
}

H('5. Stored reading preferences still apply at boot');
{
  // The controls live on one page now, but the values have to take effect at
  // boot regardless of which page you land on.
  const { ctx, root } = boot({ 'cct-readsize': '1.12' });
  vm.runInContext('initSize();', ctx);
  ok(root.style['--user-read-scale'] === '1.12', 'text size applied without the page, got '
     + root.style['--user-read-scale']);
  ok(root.style['--user-read-measure'] === undefined,
     'and nothing sets a column width any more');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Settings tests passed');
process.exit(fail ? 1 : 0);
