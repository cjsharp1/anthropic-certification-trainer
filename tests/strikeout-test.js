/* Right-click to rule an option out.
 *
 * The behaviour that matters: the mark toggles, it survives the re-renders
 * that happen while you are still working on a question, it never changes
 * which answer is selected or scored, it follows the option rather than the
 * screen position when options are shuffled, and it is cleared once the
 * answer is revealed.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = require('../tools/paths');
const dir = P.ROOT;

let fail = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL:', m); fail++; } else console.log('  ok:', m); };
const H = t => console.log(String.fromCharCode(10) + t);

/* ---------- DOM stub with real event dispatch ---------- */
function mk(tag) {
  const n = {
    tag: tag || 'div', _cls: new Set(), _attrs: {}, _h: '',
    dataset: {}, style: {}, children: [], handlers: {},
    textContent: '', title: '', hidden: false, disabled: false,
    classList: {
      add: c => c && n._cls.add(c), remove: c => n._cls.delete(c),
      toggle: (c, f) => { const on = f === undefined ? !n._cls.has(c) : f;
                          if (on) n._cls.add(c); else n._cls.delete(c); return on; },
      contains: c => n._cls.has(c)
    },
    appendChild(c) { if (c) n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => c && typeof c === 'object' && n.children.push(c)); },
    setAttribute(k, v) { n._attrs[k] = v; },
    getAttribute(k) { return n._attrs[k] === undefined ? null : n._attrs[k]; },
    removeAttribute(k) { delete n._attrs[k]; },
    addEventListener(ev, fn) { (n.handlers[ev] = n.handlers[ev] || []).push(fn); },
    dispatch(ev, detail) {
      const e = Object.assign({ preventDefault() { e._d = true; }, stopPropagation() {} }, detail || {});
      (n.handlers[ev] || []).forEach(fn => fn(e));
      return e;
    },
    focus() {}, querySelector: () => null, querySelectorAll: () => []
  };
  Object.defineProperty(n, 'className', {
    get: () => [...n._cls].join(' '),
    set: v => { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  });
  Object.defineProperty(n, 'innerHTML', { get: () => n._h, set: v => { n._h = v; } });
  return n;
}

const ctx = { console, Object, Set, Array, String };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(P.resolve('strikeout.js'), 'utf8')
  + ';globalThis.__o={enableStrike,applyStrike,isStruck,toggleStrike,clearStrikes,repaintStrikes};',
  ctx, { filename: 'strikeout.js' });
const { enableStrike, applyStrike, isStruck, clearStrikes, repaintStrikes } = ctx.__o;

const rightClick = btn => btn.dispatch('contextmenu', { button: 2 });
const press = (btn, key) => btn.dispatch('keydown', { key });

H('1. Toggling');
let locked = false;
const b = mk('button'); b.className = 'opt';
enableStrike(b, 'q1', 'A', { locked: () => locked });
ok(!b._cls.has('struck'), 'an option starts unstruck');
rightClick(b);
ok(b._cls.has('struck'), 'right-click strikes it');
ok(isStruck('q1', 'A'), 'and the state is recorded');
rightClick(b);
ok(!b._cls.has('struck'), 'right-clicking again restores it');
ok(!isStruck('q1', 'A'), 'and the state is cleared');

H('2. It suppresses the browser menu');
const e = rightClick(b);
ok(e._d === true, 'the context menu is prevented, so the gesture is ours');

H('3. Keyboard users get the same toggle');
clearStrikes(null);
const k = mk('button'); k.className = 'opt';
enableStrike(k, 'q1', 'B', { locked: () => locked });
press(k, 'x');
ok(k._cls.has('struck'), 'X strikes an option');
press(k, 'X');
ok(!k._cls.has('struck'), 'and unstrikes it');
press(k, 'Backspace');
ok(k._cls.has('struck'), 'Backspace works too');
press(k, 'a');
ok(k._cls.has('struck'), 'an unrelated key changes nothing');

H('4. Assistive tech is told');
clearStrikes(null);
const a = mk('button'); a.className = 'opt';
enableStrike(a, 'q2', 'A', {});
rightClick(a);
ok(a.getAttribute('data-struck') === 'true', 'a struck option is marked up');
rightClick(a);
ok(a.getAttribute('data-struck') === null, 'and unmarked when restored');

H('5. Strikes are scoped per question and per option');
clearStrikes(null);
const o1 = mk('button'), o2 = mk('button'), other = mk('button');
enableStrike(o1, 'q1', 'A', {});
enableStrike(o2, 'q1', 'B', {});
enableStrike(other, 'q2', 'A', {});
rightClick(o1);
ok(isStruck('q1', 'A'), 'striking A on q1 marks it');
ok(!isStruck('q1', 'B'), 'leaves B on the same question alone');
ok(!isStruck('q2', 'A'), 'and leaves A on a different question alone');

H('6. Grading locks it');
clearStrikes(null);
locked = false;
const g = mk('button'); g.className = 'opt';
enableStrike(g, 'q3', 'C', { locked: () => locked });
locked = true;
rightClick(g);
ok(!g._cls.has('struck'), 'right-click does nothing once the answer is revealed');
press(g, 'x');
ok(!g._cls.has('struck'), 'nor does the keyboard');

H('7. Clearing');
clearStrikes(null);
const c1 = mk('button'), c2 = mk('button');
enableStrike(c1, 'q4', 'A', {});
enableStrike(c2, 'q5', 'A', {});
rightClick(c1); rightClick(c2);
clearStrikes('q4');
ok(!isStruck('q4', 'A'), 'clearing one question clears it');
ok(isStruck('q5', 'A'), 'and leaves the others');
clearStrikes(null);
ok(!isStruck('q5', 'A'), 'clearing everything clears the rest');

H('8. A repaint puts the marks back');
// The exam-mode selection repaint rebuilds class lists; without this a strike
// would silently vanish the moment you picked any answer.
clearStrikes(null);
const btns = ['A', 'B', 'C', 'D'].map(() => { const n = mk('button'); n.className = 'opt'; return n; });
const keys = ['A', 'B', 'C', 'D'];
btns.forEach((n, i) => enableStrike(n, 'q6', keys[i], {}));
rightClick(btns[1]); rightClick(btns[3]);
btns.forEach(n => { n.className = 'opt'; });          // simulate the repaint
const container = { querySelectorAll: () => btns };
repaintStrikes(container, 'q6', (n, i) => keys[i]);
ok(btns[1]._cls.has('struck') && btns[3]._cls.has('struck'), 'struck options come back struck');
ok(!btns[0]._cls.has('struck') && !btns[2]._cls.has('struck'), 'the others stay clear');

H('9. It follows the option, not the screen position');
// Both quizzes shuffle options. Keying on position would move the mark onto
// a different answer when the question re-rendered.
clearStrikes(null);
const shuffled = [mk('button'), mk('button'), mk('button'), mk('button')];
const orderA = ['C', 'A', 'D', 'B'];
shuffled.forEach((n, i) => { n.className = 'opt'; enableStrike(n, 'q7', orderA[i], {}); });
rightClick(shuffled[0]);                               // strike option C
ok(isStruck('q7', 'C'), 'striking position 0 strikes option C');
const orderB = ['B', 'D', 'C', 'A'];                   // re-rendered, reshuffled
const after = [mk('button'), mk('button'), mk('button'), mk('button')];
after.forEach((n, i) => { n.className = 'opt'; applyStrike(n, 'q7', orderB[i]); });
ok(after[2]._cls.has('struck'), 'after a reshuffle the mark is on C\'s new position');
ok(!after[0]._cls.has('struck'), 'and not on whatever now sits where C used to be');

H('10. Striking never answers the question');
// The whole point: ruling out is a note to yourself. It must not select, and
// a struck option must stay pickable in case you change your mind.
// Comments first: the file's own header explains that it does none of these,
// and a naive search would match that prose and pass for the wrong reason.
const src = fs.readFileSync(P.resolve('strikeout.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/\bsel\b/.test(src), 'strikeout.js never touches the selected class');
ok(!/disabled\s*=/.test(src), 'and never disables a button, so a struck option stays clickable');
ok(!/localStorage/.test(src), 'and never persists — it is scratch working for one question');

H('11. Both question types wire it up');
const appSrc = fs.readFileSync(P.resolve('app.js'), 'utf8');
const simSrc = fs.readFileSync(P.resolve('sim.js'), 'utf8');
ok(/enableStrike\(b, q\.id, idx/.test(appSrc), 'the recall quiz keys strikes by original option index');
ok(/enableStrike\(b, q\.id, key/.test(simSrc), 'the simulation keys strikes by option key');
ok(/applyStrike\(b, q\.id, idx\)/.test(appSrc), 'the exam-mode repaint restores them');
ok(/clearStrikes\(q\.id\)/.test(appSrc), 'grading a recall question clears its marks');
ok(/clearStrikes\(q\.id\)/.test(simSrc), 'and so does answering in practice mode');
ok(/clearStrikes\(null\)/.test(appSrc) && /clearStrikes\(null\)/.test(simSrc),
   'starting a session clears everything left over');

H('12. It ships');
const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
const iStrike = html.indexOf('strikeout.js');
ok(iStrike > -1, 'index.html loads strikeout.js');
ok(iStrike < html.indexOf('src="src/app.js"'), 'before app.js, which calls into it');
ok(iStrike < html.indexOf('src="src/sim.js"'), 'and before sim.js');
ok(/\.opt\.struck/.test(html), 'the struck style is defined');
ok(/line-through/.test(html), 'and it is a strike-through');

console.log('');
if (fail) { console.log(fail + ' failure' + (fail === 1 ? '' : 's')); process.exit(1); }
console.log('all strikeout checks passed');
