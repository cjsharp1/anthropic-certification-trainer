/* Structural HTML check for the pages this repo ships.
 *
 * Not a full validator — it catches the class of error that actually breaks
 * a page: mismatched or unclosed tags, a missing charset or viewport, an
 * image with no alt text, a duplicate id, an in-page anchor pointing at an
 * id that does not exist.
 *
 * Scripts, styles and comments are blanked before parsing so markup inside
 * a string or a comment is not read as a tag.
 *
 *   node tools/html-check.js index.html app/index.html
 */
const fs = require("fs");
const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node tools/html-check.js <file>..."); process.exit(2); }
let bad = 0;
for (const file of files) bad += check(file) ? 0 : 1;
process.exit(bad ? 1 : 0);

function check(file) {
  let html = fs.readFileSync(file, "utf8");

const VOID = new Set(["area","base","br","col","embed","hr","img","input",
  "link","meta","param","source","track","wbr"]);
const problems = [];

// Strip comments, scripts and styles so their contents aren't parsed as tags.
const stripped = html
  .replace(/<!--[\s\S]*?-->/g, m => " ".repeat(m.length))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, m => " ".repeat(m.length))
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, m => " ".repeat(m.length));

const lineAt = i => stripped.slice(0, i).split("\n").length;

const stack = [];
const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
let m;
while ((m = tagRe.exec(stripped))) {
  const [full, slash, rawName, attrs] = m;
  const name = rawName.toLowerCase();
  if (VOID.has(name)) continue;
  if (attrs.trim().endsWith("/")) continue;        // self-closed (svg etc.)
  if (!slash) {
    stack.push({ name, line: lineAt(m.index) });
  } else {
    if (!stack.length) {
      problems.push("L" + lineAt(m.index) + ": stray </" + name + ">");
      continue;
    }
    const top = stack[stack.length - 1];
    if (top.name === name) { stack.pop(); continue; }
    const depth = stack.map(s => s.name).lastIndexOf(name);
    if (depth === -1) {
      problems.push("L" + lineAt(m.index) + ": </" + name + "> never opened");
    } else {
      const unclosed = stack.splice(depth).slice(1);
      problems.push("L" + lineAt(m.index) + ": </" + name + "> closes early; "
        + "unclosed inside: " + unclosed.map(u => u.name + "@L" + u.line).join(", "));
      stack.pop();
    }
  }
}
stack.forEach(t => problems.push("L" + t.line + ": <" + t.name + "> never closed"));

// Document-level requirements
if (!/^\s*<!doctype html>/i.test(html)) problems.push("missing <!doctype html>");
if (!/<html[^>]+lang=/i.test(html)) problems.push("<html> missing lang");
if (!/<meta[^>]+charset=/i.test(html)) problems.push("missing charset meta");
if (!/<meta[^>]+name=["']viewport["']/i.test(html)) problems.push("missing viewport meta");
if (!/<title>[^<]+<\/title>/i.test(html)) problems.push("missing or empty <title>");

// Accessibility: images need alt text
for (const img of html.match(/<img\b[^>]*>/gi) || []) {
  if (!/\balt=/i.test(img)) problems.push("img without alt: " + img.slice(0, 60));
}
// Duplicate ids break anchors and label targeting
const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(x => x[1]);
const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
if (dupes.length) problems.push("duplicate id(s): " + [...new Set(dupes)].join(", "));

// In-page anchors must point at something real
for (const [, href] of html.matchAll(/href=["']#([^"']+)["']/g)) {
  if (!ids.includes(href) && !new RegExp('name=["\']' + href).test(html)) {
    problems.push("anchor #" + href + " has no matching id");
  }
}

  console.log(file + ": " + (problems.length ? problems.length + " problem(s)" : "clean"));
  problems.forEach(p => console.log("  " + p));
  return problems.length === 0;
}
