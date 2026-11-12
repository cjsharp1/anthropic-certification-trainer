// Mutation testing: reintroduce each bug, confirm the suite catches it.
// Everything is done with plain substring/line edits -- no regex escaping,
// which is where earlier versions of this harness silently no-opped.
const fs = require('fs'), cp = require('child_process');
const P = require('../tools/paths');
const DIR = P.ROOT;
const APP  = P.resolve('app.js');
// Snapshot the CURRENT app.js at run time. An on-disk snapshot from an
// earlier session silently reverts whatever changed since -- this harness
// did exactly that once, eating two unrelated fixes.
const GOOD = APP + '.regress-backup';
/* The suite this harness mutates app.js against. It lives beside this file;
   an earlier version pointed at a scratch path outside the project, which
   broke as soon as that temp directory was cleared. */
const TEST = require('path').join(__dirname, 'tts-highlight-test.js');
// This harness rewrites app.js in place, so another suite running at the
// same time would read a mutated file. Refuse to start if one is already
// running, and always clear the lock on the way out.
const LOCK = APP + '.regress-lock';
if (fs.existsSync(LOCK)) {
  console.error('another mutation run is in progress (' + LOCK + ')');
  process.exit(1);
}
fs.writeFileSync(LOCK, String(process.pid));
const release = () => { try { fs.unlinkSync(LOCK); } catch (e) {} };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });

const good = fs.readFileSync(APP, 'utf8');   // snapshot taken now
fs.writeFileSync(GOOD, good);               // crash-safety copy
const EOL = good.includes('\r\n') ? '\r\n' : '\n';
const lines = good.split(/\r?\n/);

const find = (needle, from = 0) => {
  const i = lines.findIndex((l, n) => n >= from && l.includes(needle));
  if (i < 0) throw new Error('anchor not found: ' + needle);
  return i;
};

function run(label, mutate) {
  const copy = lines.slice();
  mutate(copy);
  const broken = copy.join(EOL);
  if (broken === good) { console.log('SKIPPED ' + label + ' (no change)'); return false; }
  fs.writeFileSync(APP, broken);
  const r = cp.spawnSync('node', [TEST], { encoding: 'utf8', cwd: DIR });
  fs.writeFileSync(APP, good);
  const caught = r.status !== 0;
  console.log((caught ? 'CAUGHT  ' : 'MISSED  ') + label);
  (r.stdout.match(/^ {2}FAIL:.*$/gm) || []).slice(0, 3)
    .forEach(x => console.log('          ' + x.trim()));
  return caught;
}

const results = [
  // Two guards protect the highlight: startSpeaking renders BEFORE it speaks,
  // and renderNotes re-applies the mark after any rebuild. Removing just one
  // leaves the other covering it, so strip both.
  run('first clicked paragraph never highlights (both guards removed)', L => {
    const i = find('rebuild first');            // renderNotes() ... speakSegment()
    [L[i], L[i + 1]] = [L[i + 1], L[i]];        // put speaking back in front
    const j = find('highlightSpoken(false)');
    L.splice(j, 1);                             // and remove the safety net
  }),

  run('details block hijacks the disclosure click', L => {
    const i = find('tagOwnClick(w, segKey, s)');
    L[i] = L[i].replace('tagOwnClick(w, segKey, s)', 'tag(w, segKey)');
  }),

  run('speaker button lets the click reach the details', L => {
    const i = find('ev.preventDefault()');
    L.splice(i, 2);                             // drop both event guards
  }),
];

fs.writeFileSync(APP, good);
fs.unlinkSync(GOOD);
const all = results.every(Boolean);
console.log(all ? '\nAll three regressions are caught.' : '\nSome slipped through.');
// app.js is restored above; the lock clears on exit.
process.exit(all ? 0 : 1);
