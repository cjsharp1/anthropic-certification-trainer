/* Where things live.
 *
 * The app's files are split across src/, src/data/ and the project root, but
 * the tools and test suites refer to them by bare filename ('app.js',
 * 'data-notes.js', 'index.html') — that is how they read, and restating a
 * directory at every call site would be noise that goes stale.
 *
 * resolve() does that mapping in one place. A script asks for a filename and
 * gets an absolute path, so moving a file between src/ and src/data/ is a
 * change here rather than a change in twenty scripts.
 *
 * Used by tests/ as well as tools/, via a relative require.
 */
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DATA = path.join(SRC, 'data');

/* A bare filename -> the directory that holds it. Anything unrecognised is
   treated as project-root relative, which covers index.html, README.md and
   paths a caller has already qualified ('dist/…', 'docs/…'). */
function resolve(file) {
  if (path.isAbsolute(file)) return file;
  const base = path.basename(file);
  if (base !== file) return path.join(ROOT, file);   // already qualified
  if (/^data-.*\.js$/.test(base)) return path.join(DATA, base);
  if (['app.js', 'sim.js', 'strikeout.js'].includes(base)) return path.join(SRC, base);
  return path.join(ROOT, base);
}

/* Drop-in for fs.readFileSync(path.join(dir, f)) call sites. */
function read(file, enc) { return require('fs').readFileSync(resolve(file), enc || 'utf8'); }
function exists(file) { return require('fs').existsSync(resolve(file)); }

module.exports = { ROOT, SRC, DATA, resolve, read, exists };
