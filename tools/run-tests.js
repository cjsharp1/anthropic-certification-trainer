/* Runs every suite in tests/ and exits non-zero if any fails.
 *
 * The README's shell loop works in bash but not in cmd.exe, and `npm test`
 * should behave the same on every platform. build-test.js reads dist/, so
 * the build runs first — otherwise a fresh clone fails on a missing file
 * rather than on anything real.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const run = (file, label) => {
  try {
    execFileSync(process.execPath, [file], { cwd: root, stdio: 'pipe' });
    return true;
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    console.log('FAIL  ' + label);
    console.log(out.toString().split('\n').slice(-12).join('\n'));
    return false;
  }
};

console.log('building dist/ first (build-test.js reads it)');
if (!run(path.join('tools', 'build.js'), 'tools/build.js')) process.exit(1);

const dir = path.join(root, 'tests');
const suites = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
let failed = 0;
for (const f of suites) {
  if (!run(path.join('tests', f), 'tests/' + f)) failed++;
  else console.log('ok    tests/' + f);
}

console.log('');
console.log(failed === 0
  ? 'All ' + suites.length + ' suites passed'
  : failed + ' of ' + suites.length + ' suites failed');
process.exit(failed === 0 ? 0 : 1);
