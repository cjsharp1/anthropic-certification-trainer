/* UI consistency checks for index.html.
 *
 * The stylesheet had drifted to 43 distinct font sizes across 149 rules,
 * many within 2% of each other — invisible as design, real as maintenance.
 * This pins the scale and the heading structure so it cannot creep back. */
const fs = require('fs'), path = require('path');
const P = require('./paths');
const dir = process.argv[2] || P.ROOT;
const html = fs.readFileSync(P.resolve('index.html'), 'utf8');
const app = fs.readFileSync(P.resolve('app.js'), 'utf8');
const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));

const SCALE = [0.62, 0.68, 0.72, 0.76, 0.8, 0.86, 0.95, 1, 1.06, 1.12,
               1.2, 1.35, 1.5, 1.72, 1.9, 2.3, 2.8];
let err = [];

// 1. every rem font-size is on the scale
const sizes = [...style.matchAll(/font-size:\s*(?:calc\()?([\d.]+)rem/g)].map(m => +m[1]);
const off = [...new Set(sizes)].filter(v => !SCALE.includes(v));
if (off.length) err.push('font sizes off the scale: ' + off.join(', ')
  + '\n    scale is ' + SCALE.join(' '));

// 2. no two steps closer than 5%
for (let i = 1; i < SCALE.length; i++) {
  const r = SCALE[i] / SCALE[i - 1];
  if (r < 1.05) err.push('scale steps ' + SCALE[i - 1] + ' and ' + SCALE[i]
    + ' differ by only ' + Math.round((r - 1) * 100) + '%');
}

// 3. each view has exactly one h1, and no level is skipped
const views = [...html.matchAll(/<section class="view" id="view-([a-z]+)"[^>]*>([\s\S]*?)<\/section>/g)];
views.forEach(v => {
  const hs = [...v[2].matchAll(/<(h[1-6])\b/g)].map(m => +m[1][1]);
  if (!hs.length) return;                       // rendered entirely from JS
  if (hs.filter(h => h === 1).length > 1)
    err.push('view-' + v[1] + ' has ' + hs.filter(h => h === 1).length + ' h1 elements');
  for (let i = 1; i < hs.length; i++)
    if (hs[i] - hs[i - 1] > 1)
      err.push('view-' + v[1] + ' skips from h' + hs[i - 1] + ' to h' + hs[i]);
});

// 4. JS-rendered section headings stay at h2/h3, under the view's h1
const jsLevels = [...app.matchAll(/el\('(h[1-6])'/g)].map(m => m[1]);
const stray = [...new Set(jsLevels)].filter(h => !['h1', 'h2', 'h3'].includes(h));
if (stray.length) err.push('app.js renders ' + stray.join(', ')
  + ' — section headings should be h2 or h3 under the view h1');

// 5. the graded result is announced
if (!/id="qExplain"[^>]*aria-live/.test(html))
  err.push('the quiz explanation has no aria-live, so grading is silent to a screen reader');

/* The exam jump strip is a fixed grid, not a wrap. Its column count has to
   stay in step with how many questions a sitting actually has: at the wrong
   count a 63-question exam strands a row of three, which was the original
   complaint. Check against the real exam sizes rather than a magic number. */
{
  const m = /\.examstrip\{[^}]*grid-template-columns:repeat\((\d+),/.exec(style);
  if (!m) {
    err.push('.examstrip is no longer a fixed-column grid; row balance is unchecked');
  } else {
    const cols = +m[1];
    // exam sizes come from the data, so adding an exam is covered too
    const exams = fs.readFileSync(P.resolve('data-exams.js'), 'utf8');
    const sizes = [...exams.matchAll(/questions:\s*(\d+)/g)].map(x => +x[1]);
    const stranded = sizes.filter(q => {
      const last = q % cols;
      return last !== 0 && last <= Math.max(3, cols / 8);
    });
    if (stranded.length) {
      err.push('.examstrip at ' + cols + ' columns strands a short final row for '
        + stranded.join(', ') + '-question sittings');
    }
    // and the cells must stay big enough to hit at the full measure
    const measure = /--measure:\s*(\d+)px/.exec(style);
    if (measure) {
      const inner = +measure[1] - 32;          // exambar padding and border
      const gap = +((/\.examstrip\{[^}]*gap:(\d+)px/.exec(style) || [, 5])[1]);
      const cell = (inner - (cols - 1) * gap) / cols;
      if (cell < 22) err.push('.examstrip cells are ' + cell.toFixed(1)
        + 'px at the full measure, too small to hit comfortably');
    }
  }
}

/* Stray control characters. A mangled escape in a build script once wrote
   a literal U+0081 into a CSS content value, which renders as a tofu box
   next to whatever followed it. Nothing legitimate in this project uses the
   C1 range or zero-width characters, so any occurrence is a mistake. */
{
  const FILES = ['index.html', 'app.js', 'data-notes.js', 'data-exams.js'];
  FILES.forEach(f => {
    const p = P.resolve(f);
    if (!fs.existsSync(p)) return;
    const text = fs.readFileSync(p, 'utf8');
    const re = new RegExp("[\u0080-\u009F\u200B-\u200D\uFEFF]", "g");
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split(String.fromCharCode(10)).length;
      err.push(f + ':' + line + ' has a stray U+'
        + m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
        + ' — probably a mangled escape');
    }
  });
}

console.log(err.length ? 'UI ISSUES:\n  ' + err.join('\n  ')
  : 'UI consistent: ' + [...new Set(sizes)].length + ' font sizes, all on the '
    + SCALE.length + '-step scale; heading levels sound');
process.exit(err.length ? 1 : 0);
