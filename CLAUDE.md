# Working in this repo

A single-page browser study app for the four Anthropic Claude certifications.
No framework, no bundler, no runtime dependencies — `app/index.html` loads
plain `<script>` tags in order. Node is used only for build, tests and audits.

The repo root `index.html` is a standalone overview page (GitHub Pages
landing), not the app. It has no scripts and is not part of the build.

## Commands

```bash
npm test            # build dist/, then all 21 suites (tools/run-tests.js)
npm run validate    # data integrity — run after ANY data-file edit
npm run check       # validate + UI audit + HTML check + full suite
npm run build       # write dist/
```

`npm install` is unnecessary and produces no lockfile: there are no
dependencies. Node >= 18.

Run `npm run validate` after editing anything in `src/data/`. It catches a bad
domain id, a missing `why`, an out-of-range answer index — all of which
otherwise fail silently by excluding a question from drills.

## Releases

Pushing a `v*` tag runs `.github/workflows/release.yml`, which runs the full
check and publishes `dist/anthropic-certification-trainer.html` as a release
asset under a fixed name, so `releases/latest/download/...` always serves the
newest build. Don't create releases by hand with `gh release create` or the web
UI; the workflow fails if the release already exists.

Release only when asked, not as part of finishing a change. Each release is a
new file colleagues are told to download, so small fixes wait and ship with the
next one worth sending.

Bump with `npm version patch|minor|major`, which commits package.json and
creates a matching tag, then `git push --follow-tags`. The workflow rejects a
tag that doesn't match package.json, and build.js stamps that version into the
file's `<meta name="generator">`. Pick the bump by what changed for the person
studying:

- patch: corrected answers, typos, layout fixes
- minor: new questions, notes, labs or features
- major: a change that resets or migrates saved progress

## Layout

- `index.html` — overview page, published by GitHub Pages; standalone
- `app/index.html` — the app: markup, all CSS, and the `<script src>` list
- `src/app.js` — the app (~4.7k lines); `src/sim.js`, `src/strikeout.js`
- `src/data/data-*.js` — question banks, notes, labs, flashcards, scaffolds
- `tools/` — build and audits, never shipped
- `tests/` — 21 suites, never shipped
- `dist/` — generated, gitignored; rebuild with `npm run build`

### Adding a data file

Add the `<script src>` to `app/index.html`, as `../src/data/<file>.js`. Most
suites parse those tags and load whatever is listed, so the markup is the
registration point. Tools and tests refer to files by bare name (`app.js`,
`data-notes.js`) and resolve them through `tools/paths.js` — moving a file
between `src/` and `src/data/` is one edit there, not twenty at the call
sites. `paths.js` also maps the bare name `index.html` to `app/index.html`
and resolves `../`-prefixed script paths against `app/`.

## Question schema

```js
{ id:"ar-d2-18", exam:"CCAR-F", d:"d2", kind:"recall",
  q:"...", a:1, opts:["...","...","...","..."], why:"..." }
```

`a` is the **0-based index** into `opts`. `exam` may be an array for questions
shared between certifications, with `also:{...}` mapping the domain per exam.
`scn` ties a question to a scenario; `kind` is `recall` or `scenario`.

Question-writing conventions worth keeping:

- The stem must name its subject. "Match the tool to its job" reads as though
  a diagram is missing — name the tools in the question itself.
- Distractors should be parallel in length and specificity. If the correct
  option is the longest and most precise, length alone gives it away.
- Avoid "both"/"neither" options that only make sense after reading the other
  choices.

## Style

Match what is already there rather than importing outside conventions:

- Comments explain **why**, not what, and are written in prose. Several
  non-obvious decisions are recorded in comments — read them before changing
  the code they sit above; they usually encode a bug that was already fixed.
- Tests assert on behaviour and carry a sentence explaining the trap they
  pin. When a test contradicts an intended change, update the test and its
  explanation deliberately — do not work around it.
- Both pages must pass `npm run audit:html` (tag nesting, head metadata,
  alt text, duplicate ids, in-page anchors).
- The app's CSS lives in `app/index.html`. Font sizes must stay on the
  17-step scale;
  `npm run audit:ui` enforces this.
- A `<button>` does not inherit the page font. State `font-family` explicitly
  on button-like controls or they fall back to the serif reading face.

## Content accuracy

Questions are original work verified against the official exam guides; no exam
content is reproduced. `docs/VERIFICATION.md` is the source audit for the hard
tier. When a question touches the Claude API — model ids, parameters, limits —
verify against current documentation rather than memory. The scaffolds in
`data-starters.js` hand users model ids to copy, so keep them current.
