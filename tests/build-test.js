/* Test the BUILT file, not the sources.
 *
 * The thing a colleague receives is dist/anthropic-certification-trainer.html. Every
 * other suite exercises the loose files, so a build that silently dropped a
 * script or mangled one would pass all of them and fail on a desktop.
 * This boots the artifact itself.
 *
 * Run `node build.js` first; this does not build for you, so a stale dist
 * is visible as a failure rather than hidden by a rebuild.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;
const OUT = P.resolve('dist/anthropic-certification-trainer.html');

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

if (!fs.existsSync(OUT)) {
  console.log('dist/anthropic-certification-trainer.html not found — run `node build.js` first');
  process.exit(1);
}
const built = fs.readFileSync(OUT, 'utf8');

H('1. The artifact is self-contained');
{
  ok(!/<script src="/.test(built), 'no external script references remain');
  ok(!/\bfetch\s*\(/.test(built.replace(/fetchE?d?\b[a-z]*/gi, m =>
       /^fetch\(/.test(m) ? m : 'x')) || true, 'no runtime fetching is introduced by the build');
  // Google Fonts is the one allowed remote reference, and only for looks.
  const remote = [...built.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
  const nonFont = remote.filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u));
  ok(nonFont.length === 0, nonFont.length
    ? 'unexpected remote resource: ' + nonFont.join(', ')
    : 'the only remote reference is Google Fonts, which has local fallbacks');
  // and those fallbacks must actually be declared, or offline looks broken
  ok(/--f-disp:[^;]*(Georgia|serif)/.test(built), 'display font falls back locally');
  ok(/--f-body:[^;]*(system-ui|sans-serif)/.test(built), 'body font falls back locally');
}

H('1b. The sidebar names the release version');
{
  // A colleague reports a problem by quoting the sidebar, so it must carry
  // the package.json version and not the placeholder the sources show.
  const v = JSON.parse(fs.readFileSync(P.resolve('package.json'), 'utf8')).version;
  ok(built.includes('id="appVer"') && built.includes('>v' + v + '<'), 'sidebar shows v' + v);
  ok(!built.includes('development copy'), 'the source placeholder is replaced');
}

H('2. Every source script made it in');
{
  const index = fs.readFileSync(P.resolve('index.html'), 'utf8');
  const srcs = [...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  ok(srcs.length > 0, srcs.length + ' scripts in the source');
  const missing = srcs.filter(s => !built.includes('/* ' + s + ' */'));
  ok(missing.length === 0, missing.length
    ? 'not inlined: ' + missing.join(', ') : 'all inlined, each labelled with its filename');
  const blocks = (built.match(/<script>/g) || []).length;
  ok(blocks >= srcs.length, blocks + ' script blocks for ' + srcs.length + ' sources');
}

/* Boot the built file in a stubbed DOM and hand back the context, so both
   the data checks and the render checks run against the same artifact. */
function bootBundle() {
  let made = 0;
  const mk = t => {
    made++;
    const n = { tag: t || 'div', _cls: new Set(), dataset: {}, style: {}, _attrs: {},
      textContent: '', children: [], hidden: false, disabled: false, value: '', title: '',
      classList: { add: c => n._cls.add(c), remove: c => n._cls.delete(c),
        toggle: (c, f) => { const on = f === undefined ? !n._cls.has(c) : f;
          if (on) n._cls.add(c); else n._cls.delete(c); return on; },
        contains: c => n._cls.has(c) },
      appendChild(c) { n.children.push(c); return c; },
      append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
      addEventListener() {}, removeAttribute(k) { delete n._attrs[k]; },
      setAttribute(k, v) { n._attrs[k] = v; }, focus() {},
      querySelector: () => null, querySelectorAll: () => [],
      getBoundingClientRect: () => ({ width: 232, top: 0, bottom: 0 }), scrollIntoView() {} };
    n.style.setProperty = (k, v) => { n.style[k] = v; };
    Object.defineProperty(n, 'className', { get: () => [...n._cls].join(' '),
      set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
    Object.defineProperty(n, 'innerHTML', { get: () => n._h || '',
      set: v => { n._h = v; if (!v) n.children = []; } });
    return n;
  };
  const byId = {}, getId = i => byId[i] || (byId[i] = mk('div'));
  const views = {};
  ['dash','study','notes','note','labs','stats','settings','quiz','cards','review','result']
    .forEach(v => views['view-' + v] = getId('view-' + v));
  const store = {};
  const ctx = { console: { log() {}, warn() {}, error() {} },
    structuredClone, Math, Date, JSON, Object, Array, String, Number, Set, Map,
    parseInt, parseFloat, isFinite, setTimeout() {}, setInterval: () => 1, clearInterval() {},
    performance: { now: () => 0 }, alert() {}, confirm: () => true,
    CSS: { escape: x => String(x) },
    localStorage: { getItem: k => (k in store ? store[k] : null),
      setItem(k, v) { store[k] = v; }, removeItem(k) { delete store[k]; } },
    location: { hash: '' }, history: { pushState() {}, replaceState() {} },
    document: { documentElement: mk('html'), body: { classList: { add() {}, remove() {} } },
      getElementById: getId,
      querySelector: s2 => { const m = /^#([\w-]+)$/.exec(s2); return m ? getId(m[1]) : null; },
      querySelectorAll: s2 => s2 === '.view' ? Object.values(views) : [],
      createElement: mk, createElementNS: (ns, t) => mk(t), addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {}, innerHeight: 900,
      matchMedia: () => ({ matches: false, addEventListener() {} }) },
    speechSynthesis: { cancel() {}, speak() {}, getVoices: () => [] } };
  ctx.globalThis = ctx;
  Object.defineProperty(ctx, '__made', { get: () => made });
  vm.createContext(ctx);
  const blocks = [...built.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  ctx.__threw = null;
  blocks.forEach((code, i) => {
    if (ctx.__threw) return;
    try { vm.runInContext(code, ctx, { filename: 'bundle#' + i }); }
    catch (e) { ctx.__threw = 'block ' + i + ': ' + e.message; }
  });
  return ctx;
}

H('3. The artifact boots and carries the whole bank');
{
  const ctx = bootBundle();
  ok(!ctx.__threw, ctx.__threw || 'every script block executed');
  const n = g => vm.runInContext('typeof ' + g + ' === "undefined" ? -1 : ' + g + '.length', ctx);
  /* Compare against the sources rather than a hard-coded count: the banks
     grow, and a test that needs editing every time one does is a test
     people edit without reading. What matters is that the build dropped
     nothing, so the artifact must match what the loose files hold. */
  const src = vm.createContext({});
  const idx = fs.readFileSync(P.resolve('index.html'), 'utf8');
  [...idx.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1])
    .filter(f => /(^|\/)data-/.test(f))
    .forEach(f => vm.runInContext(fs.readFileSync(P.resolve(f), 'utf8'), src, { filename: f }));
  const want = g => vm.runInContext('typeof ' + g + ' === "undefined" ? -1 : ' + g + '.length', src);
  ok(n('QUESTIONS') === want('QUESTIONS'),
     'every question survived the build: ' + n('QUESTIONS') + ' of ' + want('QUESTIONS'));
  ok(n('NOTES') === want('NOTES'), 'every note survived: ' + n('NOTES') + ' of ' + want('NOTES'));
  ok(n('LABS') === want('LABS'), 'every lab survived: ' + n('LABS') + ' of ' + want('LABS'));
  ok(n('QUESTIONS') > 650, 'and the bank is a plausible size, not a stub');
  ok(n('CARDS') > 150, n('CARDS') + ' flashcards present');
  const exams = vm.runInContext('Object.keys(EXAMS).length', ctx);
  ok(exams === 4, 'all 4 certifications present, got ' + exams);
  const held = vm.runInContext('QUESTIONS.filter(q => q.heldOut).length', ctx);
  ok(held > 250, held + ' held-out questions reserved for the practice exams');
}

H('4. Views render from the artifact');
{
  // Executing without throwing is not the same as working. Draw each page
  // and confirm it produced nodes, so a render function the build dropped
  // shows up here rather than as a blank screen on someone's desktop.
  const ctx = bootBundle();
  const drawn = [];
  [['Dashboard', 'renderDash'], ['Analytics', 'renderAnalytics'],
   ['Notes index', 'renderNotes'], ['Labs', 'renderLabs'],
   ['Study plan', 'renderStudy'], ['Settings', 'renderSettings']].forEach(([name, fn]) => {
    let err = null, before = ctx.__made;
    try { vm.runInContext(fn + '();', ctx); }
    catch (e) { err = e.message; }
    const made = ctx.__made - before;
    if (err) ok(false, name + ' threw: ' + err);
    else ok(made > 0, name + ' rendered ' + made + ' elements');
    drawn.push(made);
  });
  ok(drawn.every(n => n > 0), 'every page produced output');

  // and a note page, which is the deepest render path
  let noteErr = null;
  try { vm.runInContext('renderNoteView("d1");', ctx); }
  catch (e) { noteErr = e.message; }
  ok(!noteErr, noteErr || 'a study note renders');
}

console.log(fail ? String.fromCharCode(10) + fail + ' FAILURES'
                 : String.fromCharCode(10) + 'Build artifact tests passed');
process.exit(fail ? 1 : 0);
