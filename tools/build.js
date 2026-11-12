#!/usr/bin/env node
/* Build one shareable file.
 *
 *   node build.js            -> dist/anthropic-certification-trainer.html
 *   node build.js --open     -> and open it
 *
 * The app has no runtime dependencies: no fetch, no XHR, no dynamic import.
 * Everything it needs is already in the 18 scripts index.html loads, so the
 * build is an inline-and-concatenate rather than a bundler. Google Fonts
 * stays as a <link>; every family has a local fallback, so the file still
 * works offline, it just renders in Georgia and the system sans.
 *
 * What a colleague gets is one .html they can double-click. Their progress
 * lives in their own browser's localStorage, so sending them a newer build
 * never touches what they have already answered.
 */
const fs = require('fs');
const P = require('./paths');
const path = require('path');

const ROOT = P.ROOT;
const OUT_DIR = P.resolve('dist');
const OUT = path.join(OUT_DIR, 'anthropic-certification-trainer.html');

function die(msg) { console.error('build failed: ' + msg); process.exit(1); }

const htmlPath = P.resolve('index.html');
if (!fs.existsSync(htmlPath)) die('index.html not found in ' + ROOT);
let html = fs.readFileSync(htmlPath, 'utf8');

/* The scripts, in the order index.html loads them. Order matters: the data
   files populate globals that app.js reads at startup, and data-questions.js
   declares QUESTIONS that the rest push onto. */
const tags = [...html.matchAll(/[ \t]*<script src="([^"]+)"><\/script>\r?\n?/g)];
if (!tags.length) die('no <script src> tags found — has index.html changed shape?');

let inlined = 0, bytes = 0;
const htmlDir = path.dirname(htmlPath);
tags.forEach(([tag, src]) => {
  const p = path.resolve(htmlDir, src);
  if (!fs.existsSync(p)) die('missing ' + src + ', referenced by index.html');
  const code = fs.readFileSync(p, 'utf8');
  bytes += code.length;
  // A literal </script> inside a string would close the block early. None
  // exists today, but a future question about script tags would break the
  // build silently, so split it rather than trusting that.
  const safe = code.replace(/<\/script>/gi, '<\\/script>');
  html = html.replace(tag, '<script>\n/* ' + src + ' */\n' + safe + '\n</script>\n');
  inlined++;
});

/* A build stamp, so a colleague can tell which copy they have when they ask
   whether their version includes something. */
const stamp = new Date().toISOString().slice(0, 10);
html = html.replace('</head>',
  '<meta name="generator" content="build.js ' + stamp + '">\n</head>');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);

/* Sanity-check the thing we just wrote rather than assuming it works.
   Anything that would stop it booting shows up here, not on someone's
   desktop. */
const written = fs.readFileSync(OUT, 'utf8');
const problems = [];
if (/<script src="/.test(written)) problems.push('an external <script src> survived');
const blocks = (written.match(/<script>/g) || []).length;
if (blocks < inlined) problems.push('expected ' + inlined + ' script blocks, found ' + blocks);
['QUESTIONS', 'NOTES', 'LABS', 'EXAMS', 'SIM_QUESTIONS', 'SIM_OBJECTIVES'].forEach(g => {
  if (!written.includes(g)) problems.push('global ' + g + ' is missing from the bundle');
});
if (problems.length) die(problems.join('; '));

const mb = (written.length / 1024 / 1024).toFixed(2);
console.log('inlined ' + inlined + ' scripts (' + (bytes / 1024).toFixed(0) + ' KB of JS)');
console.log('wrote   dist/anthropic-certification-trainer.html  ' + mb + ' MB');
console.log('');
console.log('Share that one file. It needs no install and no server —');
console.log('double-clicking it opens the app. Progress is saved per browser.');

if (process.argv.includes('--open')) {
  const { execFile } = require('child_process');
  const cmd = process.platform === 'win32' ? 'explorer'
    : process.platform === 'darwin' ? 'open' : 'xdg-open';
  execFile(cmd, [OUT], () => {});
}
