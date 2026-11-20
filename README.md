# Anthropic Certification Trainer

A self-contained study app for the four Anthropic Claude certifications. Open
`app/index.html` in a browser — no install, no server, no build step. Progress
saves to browser localStorage, so use the same browser each time.

The repo root `index.html` is a project overview page, not the app.

> **Unofficial.** This is an independent study aid. It is not affiliated with,
> endorsed by, or sponsored by Anthropic. “Claude”, “Anthropic” and the
> certification names are trademarks of their respective owner. Every question
> and note here is original work written against the publicly available exam
> guides — no exam content is reproduced. See [Sources](#sources).

**Sharing it with someone?** Send them the
[latest release download](https://github.com/cjsharp1/anthropic-certification-trainer/releases/latest/download/anthropic-certification-trainer.html),
or run `node tools/build.js` and send the single file it writes to `dist/`. See
[Sharing](#sharing) below.

## Certifications covered

Listed in the order the official guides' recommended experience implies.
**No exam has prerequisites** — every guide states that explicitly, so this is a
readiness progression, not a required sequence.

| Level | Code | Certification | Items | Fee | Recommended experience |
|---|---|---|---|---|---|
| 1 | **CCAO-F** | Associate — Foundations | 60 | $99 | None |
| 2 | **CCDV-F** | Developer — Foundations | 53 | $125 | 1-5 yrs SWE, 6+ months Claude |
| 2 | **CCAR-F** | Architect — Foundations | 60 | $125 | 6+ months Claude (API/SDK/Code/MCP) |
| 3 | **CCAR-P** | Architect — Professional | 63 | $175 | 3+ yrs systems architecture |

Developer and Architect Foundations are siblings rather than a sequence: they
overlap heavily (46 bank questions count toward both), so studying one advances
the other.

> **Scope: CCAR-F is the developed track.** Most of the work so far has gone
> into **CCAR-F (Architect — Foundations)** — it has the deepest question
> coverage, the fullest study notes, and the only exam simulation. The other
> three are usable but less complete, and will be brought up to the same
> standard later. If you are studying for CCAO-F, CCDV-F or CCAR-P, treat
> this as a work in progress rather than finished material.

All four: 120 minutes, scaled 100-1000, **720 to pass**, 12-month validity.
Credentials expire after 12 months; on-time renewal is a free non-proctored
assessment, but a lapsed credential means retaking the full exam at full fee.

CCAR-F and CCDV-F have more questions in the bank than the real exam has
items, so a full mock draws a fresh selection each time. CCAR-P and CCAO-F run
shorter mocks until their banks grow — the app caps at pool size rather than
repeating questions within one session.

## What it does

**Study plan.** Sequences each domain through read → drill cards → quiz → build,
ordered by how much unearned exam weight the domain still carries. The heaviest
gap is always at the top, and mastered domains sink. Each step is a button that
goes straight to the thing.

**Study notes.** Concept-first explanations covering **100% of exam weight for
all four certifications** (27 domains, ~300 minutes of reading). These teach the
reasoning the scenario questions test rather than listing facts. Each note
layers its content so you can read it at three depths:

- **Takeaways** — 234 pulled-out conclusions across the notes, highlighted
  inline and collected in a list at the top of each domain. Once you've marked
  a domain read, that list opens by default, so re-review is a 30-second scan
  rather than a re-read.
- **Prose, tables and traps** — the full explanation, with comparison tables,
  a "watch for" callout on each trap, and "On the exam" notes saying how a
  point actually gets tested.
- **"Why this works"** — collapsed by default. Mechanism and background for a
  second pass: why caching misses on a prepended block, why the model repeats
  a tool call, why a prompt can't be a guarantee.

Each note also ends with an "easily confused" section pairing the concepts the
exams deliberately conflate, and self-check prompts to answer before quizzing.

**Flashcards.** 194 atomic facts with Leitner spacing across five boxes — got it
promotes, missed resets to box 1 and is due again immediately. Box 5 is
effectively retired at 21 days. For the recall-level facts that benefit from
repetition rather than re-reading.

**Quizzing.** Quick quiz (10), weak-area drill and per-domain drill. Questions
are multiple-choice and multiple-response, matching the exam format. Every
question explains why the wrong options are wrong, not just which one is right.

For **CCAR-F** these three sit alongside the Exam Simulation, which is now the
only full-length sitting: the recall-based "Full-length practice" and "Timed
mock" are retired there, and the quick quiz draws from the held-out pool as
well as the drill pool, since there is no longer a recall sitting to reserve it
for. The hard tier has moved into the simulation bank, where its long scenario
questions get a per-option explanation instead of one shared note.

The other three certifications are unchanged — they keep both full-length modes
and their own hard tier until each gains a simulation bank of its own. Nothing
in the saved progress of any certification is affected.

Right-click an option to rule it out, and right-click again to restore it — the
same elimination the real exam offers, and the natural way to work a question
where two of four options would both work. A ruled-out option is only greyed
and struck through, never disabled, so you can still pick it if you change your
mind. Marks clear once the answer is revealed and are never saved between
sessions. On a keyboard, focus an option and press X.

**Exam Simulation (CCAR-F).** A separate bank of 303 scenario questions, kept
apart from the fact-recall drills because it is a different kind of exam. A
sitting draws 4 of the 6 documented scenarios and asks 15 questions on each —
60 questions in 120 minutes, single-select, long plain-prose stems where two
options often work and one is best. Scenario context is shown at the head of
each block.

Run it timed with no feedback until you submit, or in practice mode with
feedback after each answer: why your option falls short, why the best one wins,
the tiebreaker principle that separates them, the rationale, source links, and
a callout where the live product has moved on since the exam guide.

Results come back the way the real score report does — percent correct per test
objective — plus breakdowns by domain and scenario, and a history table showing
each objective across attempts. Every past attempt on the start screen can be
reopened to its results, and the missed-question review lists each question's
four options in the order you saw them, with your answer and the best answer
marked, before the explanations. There is also a drill that takes any set of
objectives you tick. Scaled-score figures are labelled as approximations: the
real exam weights by item difficulty, which can't be reproduced from outside.

Every scenario holds at least 29 questions, so a sitting always draws a full
4 x 15 paper with no top-up and no two sittings repeat the same selection. The
honest-shortfall machinery is still there: if a future selection leaves a
scenario short, the extras appear in their own block and the count is stated on
the start screen and in the results, rather than being passed off as part of a
scenario.

Every one of the 37 score-report objectives has at least 8 questions behind it,
so the objective breakdown has no blank rows and no thin ones, and the
weak-objective drill can take any combination you tick. Section 12 of
`tests/sim-test.js` enforces that floor.

**Weak-area tracking.** Four mechanisms feed it:

- *Mastery scoring* — weighted toward recent answers, so improvement shows and
  old mistakes fade.
- *Confidence rating* — after each answer you mark Confident / Unsure / Guessed.
  A correct-but-guessed answer scores 0.45 instead of 1.0, so luck doesn't read
  as knowledge. Confidently wrong scores below zero, because a believed-false
  fact is worse than a known gap.
- *Manual flags* — flag any domain as "needs work" yourself, for things the app
  can't observe (something you read, a lab that went badly).
- *Spaced repetition* — questions you missed resurface sooner; mastered ones
  recede. Unseen questions come first, and nothing repeats until the pool is
  exhausted.

**Readiness estimate.** A projected scaled score per exam, weighted by real
domain weights, shown against the 720 pass mark. It only counts domains you've
actually attempted, and coverage is reported separately so a high score on 10%
of the bank doesn't read as ready.

**Question exposure.** On the Analytics page, one chart per question pool
showing how many questions have come up how often, and whether you get each
right now. The pools are counted separately because a question is only ever
served by one of them: drill questions by quizzes and drills, held-out
questions by the full mock, and the Exam Simulation bank by sittings and
objective drills. The simulation chart counts sittings rather than individual
answers, and scores each question from the most recent sitting that asked it.
It appears under CCAR-F only, since that is the only certification with a
simulation bank.

**Hands-on labs.** 19 build projects, filtered to the active certification and
grouped Core → Depth → Optional. Every domain of every exam has at least one. The Developer exam
assumes ~6 months of real building and the Architect exams are scenario-based,
so some of this is only learnable by building. Each lab states what it proves, what to build, verifiable checkpoints, a stretch
goal, and the specific mistake worth making on purpose. **All code examples are
TypeScript** (the Developer exam lists TypeScript proficiency under recommended
experience); the hooks lab stays in bash, since Claude Code hooks are shell
commands whatever the project is written in. Each also carries a
collapsed **Getting started** block (setup, the first move, and a code skeleton)
and a **hint for every checkpoint** — 104 in total, hidden until you ask.
Checkpoint progress is tracked.

Keyboard: in quizzes `1`–`6` select an option and `Enter` advances; in
flashcards `space` flips and then `1` / `2` grade.

### Study coverage

Columns follow the pathway order used in the app.

| | CCAO-F | CCDV-F | CCAR-F | CCAR-P |
|---|---|---|---|---|
| Questions | 174 | 243 | 237 | 156 |
| Labs | 3 | 12 | 9 | 9 |
| Lab domain coverage | 7/7 | 8/8 | 5/5 | 7/7 |
| Notes (domains) | 7/7 | 8/8 | 5/5 | 7/7 |
| Exam weight in notes | 100% | 100% | 100% | 100% |
| Reading time | 72 min | 76 min | 73 min | 79 min |
| Flashcards | 35 | 40 | 70 | 49 |

Notes, flashcards and labs now cover **every domain of every certification**.
CCAR-P and CCAO-F have lighter question banks than the two focus exams; their
notes and labs carry more of the teaching load there.

## Sources

Verified against the **official Anthropic exam guides**, downloaded from the
Partner Academy certifications page and read directly:

- [anthropic-partners.skilljar.com/page/partner-certifications](https://anthropic-partners.skilljar.com/page/partner-certifications)

**All four** were checked line-by-line against their official Exam Guide v1.0
(July 2026) on **2026-10-27**: blueprint, weights, item counts, fees, domain
numbering, and task objectives all confirmed against the source PDFs.

Material in sibling folders of this repo is not used as a source of truth.

### Scope markers

The CCAR-F guide publishes an explicit out-of-scope list. Three note sections
cover material it excludes — prompt caching internals, streaming/SSE, and rate
limiting — and each now carries a **Scope** callout saying so. The content is
kept rather than deleted because it is squarely in scope for CCDV-F (Claude API
Mechanics, Cost and Token Management).

### Re-verify before exam day

The guides are marked "subject to change without notice." Re-download them and
re-check `src/data/data-exams.js` before you sit anything. Questions tagged
`volatile: true` depend on specifics that shift between model releases; the app
flags these in the explanation.

## Adding questions

Append to any `src/data/data-questions-*.js` file, or create
`src/data/data-questions-10.js` and add a `<script>` tag for it in
`index.html`. Each file calls `QUESTIONS.push(...)`
except the first, which declares the array.

```js
{ id:"ar-d1-99",              // unique; convention: <exam><domain>-<n>
  exam:"CCAR-F",              // code, or ["CCAR-F","CCDV-F"] for shared items
  d:"d1",                     // domain id within the FIRST listed exam
  also:{"CCDV-F":"v3"},       // domain mapping for the other exams (shared only)
  kind:"scenario",            // "scenario" | "recall"
  q:"Question text, may contain <code>markup</code>.",
  multi:true,                 // omit for single-answer
  a:[0,2],                    // index, or array of indexes when multi
  opts:["...","...","...","..."],
  why:"Why the right answer is right AND why each distractor fails.",
  volatile:true               // optional: version-sensitive fact
}
```

Labs live in `src/data/data-labs.js` with the same append-and-go approach.

### Adding notes and flashcards

Both live in `src/data/data-notes.js`. A note teaches one domain:

```js
{ exam:"CCAR-P", d:"p1", mins:7,
  big:"The one idea that unlocks this domain.",
  sections:[
    { h:"Section heading", body:[
      "A paragraph, which may contain <code>markup</code>.",
      { key:"The pulled-out takeaway. Highlighted inline AND collected at the
             top of the note. Use <strong> for the operative words." },
      { table:[["Header","Header"],["cell","cell"]] },   // row widths must match
      { list:["bullet","bullet"] },
      { warn:"A trap or gotcha, rendered with a clay rule." },
      { exam:"How this point actually gets tested." },
      { why:{ q:"Why does this work?", a:"Mechanism, collapsed by default." } }
    ]}
  ],
  confusions:[ {a:"Thing A", b:"Thing B", split:"What actually separates them."} ],
  checks:[ "A prompt to answer before quizzing." ]
}
```

A flashcard is one fact:

```js
{ exam:"CCAR-P", d:"p1", f:"Front — the prompt", b:"Back — the answer",
  volatile:true }   // optional: version-sensitive
```

Card progress is keyed by exam + domain + the first 40 characters of the front,
so keep fronts distinct within a domain. `tools/validate.js` checks for collisions,
malformed tables, domains that don't exist, and notes carrying fewer than one
takeaway per two sections.

### Editing Exam Simulation questions

The Exam Simulation bank (CCAR-F) lives in `src/data/data-sim-questions.js`
and `data-sim-objectives.js`. Both were originally generated by an importer
(`tools/import-sim.js`) from JSON drops in `ccar-f-handoff/`. The question
sets are final, so the importer and its input were retired — **these two files
are now the source of truth and are edited directly.**

Section 12 of `tests/sim-test.js` enforces what the importer used to check on
every run: unique ids, exactly four options with exactly one marked correct, a
`correct` key that matches it, an explanation on every option, a scenario that
resolves against the exam guide, the required text fields, and no dangling
question ids in the objectives index. Run it after editing:

```bash
node tests/sim-test.js
```

Note that `tools/validate.js` covers the recall bank (`QUESTIONS`) only — the
simulation bank is checked by that suite instead.

The bank holds 303 questions in six sets: the two from the original handoff,
`reference_mock_v6` (128 questions) converted from the mock simulator in
`reference/`, the 18-question hard tier, and `objective_balance` (75
questions) written to even out per-objective coverage — before it, the 37
score-report objectives ranged from 2 to 24 questions each, which made
"drill by test objective" far thinner for some objectives than others. Every
objective now has at least 8. `ci_depth` (20 questions) came later: the CI scenario held only 19
questions against a 15-question block, so most sittings repeated the same ones. Each question should carry only the objectives
it actually tests: copying a task statement's whole objective list onto a
question inflates the counts without adding coverage, and an accuracy review
had to undo that on eight questions. Section 12 of the sim suite checks the floor
holds if the bank changes again. Two things about that conversion
are worth knowing if you ever edit those questions:

- **Per-option explanations.** Every option carries its own explanation. The
  mock-simulator source instead had a two-part narrative ("why the answer is
  right" and "why the distractors fail"); that narrative is preserved verbatim
  in each question's `rationale`, and the per-option explanations were written
  during conversion against each option's own text.
- **Template placeholders.** 11 questions used `{V}`/`{U}` tokens that the
  source app substituted at render time. This app renders stems as-is, so each
  was resolved to one fixed industry.

The hard-tier questions were written for the drill bank but match the
simulation in style — long narrative stems, concrete figures, a judgement
between close options — so they are served there instead. Each carries its
original drill id in `origin`, and the source verification for every one is
logged in `docs/VERIFICATION.md`. They remain in `QUESTIONS` as well, so
coverage and mastery figures are unaffected; only the separate "Hard
questions" button is retired for CCAR-F.

Scenario identity is by the `scn` id on each question, which matches
`EXAMS['CCAR-F'].scenarios` in `data-exams.js` — that id is what the app
groups and labels by. Each question also carries a `scenario` string recording
how its original source spelled the name, which is why some CI/CD questions
read "Claude Code for CI/CD" where the guide says "Claude Code for Continuous
Integration". Nothing reads that field; the displayed name always comes from
the exam guide via the `scn` id.

### Validating after edits

```bash
node tools/validate.js
```

Checks for duplicate ids, answer indexes out of range, domain ids that don't
exist in the referenced exam, multi/single answer-count mismatches, and thin
explanations. Run it after adding questions — a bad domain id would otherwise
silently exclude a question from drills.

## Sharing

The app has no runtime dependencies — no fetch, no XHR, no dynamic imports — so
everything it needs can live in one file.

```
node tools/build.js         # writes dist/anthropic-certification-trainer.html  (~1 MB)
node tools/build.js --open  # …and opens it
```

Send that one file. The recipient double-clicks it; there is nothing to install
and no server to run. It works offline, though the fonts fall back to Georgia
and the system sans without a connection (Google Fonts is the only remote
reference, and every family has a local fallback).

Each person's progress lives in their own browser's localStorage, so sending a
colleague a newer build never disturbs what they have already answered. They can
replace their copy whenever you ship an update.

`node tests/build-test.js` boots the built file and checks it carries all 764
questions, 27 notes and 19 labs, and that every page still renders — run it
after `tools/build.js` if you are about to send the file to someone.

### Releases

Every release on GitHub carries the built file as an asset, under the same name
each time, so this link always serves the newest one:

```
https://github.com/cjsharp1/anthropic-certification-trainer/releases/latest/download/anthropic-certification-trainer.html
```

To cut a release, bump the version and push the tag:

```
npm version minor          # or patch / major — commits package.json and tags v1.1.0
git push --follow-tags
```

Choose the bump by what changed for someone studying: **patch** for corrected
answers, typos and layout fixes; **minor** for new questions, notes, labs or
features; **major** for a change that resets or migrates saved progress.

`.github/workflows/release.yml` runs on any `v*` tag. It runs `npm run check`,
refuses the tag if it does not match the version in `package.json`, builds, and
publishes a release with the file attached and notes generated from the commits
since the previous tag. The build stamps that version into the file's
`<meta name="generator">`, so a colleague can tell which release they have.

## Files

The tree separates what ships from what checks it. The app is `app/index.html`,
still a double-click away; everything it loads lives under `src/`. The root
`index.html` is the overview page GitHub Pages publishes.

```
index.html             project overview page (GitHub Pages landing)
README.md

app/
  index.html           app shell, styles, view markup

src/                   the app — what app/index.html loads and build.js inlines
  app.js               state, mastery scoring, selection, rendering
  sim.js               Exam Simulation: sittings, scoring, results
  strikeout.js         right-click to rule an option out
  data/
    data-exams.js      exam blueprints — domains and weights
    data-questions*.js question bank (9 drill + 4 held-out + 4 hard)
    data-sim-*.js      Exam Simulation bank + objectives
    data-labs.js       hands-on build projects
    data-starters.js   lab starter files
    data-notes.js      study notes + flashcards

tools/                 build and audits — never shipped
  paths.js             maps a bare filename to its folder (see below)
  build.js             writes the single-file dist/ build
  run-tests.js         runs every suite (what `npm test` calls)
  validate.js          integrity checker for the data files
  dupcheck.js          near-duplicate question detector
  coverage.js          blueprint coverage report
  notes-consistency.js cross-checks notes against the blueprints
  ui-audit.js          font scale and layout consistency
  html-check.js        tag nesting, head metadata, alt text, anchors

tests/                 behaviour suites (21) — never shipped
  *-test.js
  tts-highlight-regress.js   mutation harness for the highlight suite

docs/                  VERIFICATION.md — hard-tier source audit
.github/workflows/     release.yml — publishes the built file on a v* tag
dist/                  the shareable single file (generated)
```

### How scripts find files

Tools and tests refer to app files by bare name — `app.js`, `data-notes.js`,
`index.html` — rather than by path. `tools/paths.js` turns a name into a
location:

```js
const P = require('../tools/paths');   // from tests/; './paths' from tools/
P.resolve('data-notes.js')             // -> src/data/data-notes.js
P.resolve('app.js')                    // -> src/app.js
P.resolve('docs/VERIFICATION.md')      // already qualified — left alone
```

So moving a file between `src/` and `src/data/` is one edit in `paths.js`
rather than an edit in every script that reads it. Most suites don't even
name the data files: they parse the `<script src>` tags out of `app/index.html`
and load whatever is listed, so adding a data file to the markup is enough.

### Running everything

Node 18 or newer. There are no dependencies to install — `npm` is used only
as a script runner, so `npm install` is unnecessary.

```bash
npm test            # build dist/, then run all 21 suites
npm run validate    # data integrity
npm run build       # write dist/
npm run check       # validate + UI audit + full suite
```

`npm test` builds first because `build-test.js` reads `dist/`. To run the
tools directly instead:

```bash
node tools/validate.js       # data integrity
node tools/build.js          # write dist/
node tools/run-tests.js      # every suite, any platform
```

## License

[MIT](LICENSE) — © 2026 Chris Sharp.

The `dist/` build is not committed; it is generated output. Run
`node tools/build.js` to produce it.
