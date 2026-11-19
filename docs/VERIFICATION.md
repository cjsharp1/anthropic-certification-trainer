# Hard-tier verification log

Every question in the `difficulty:"hard"` banks is checked against a primary
source before it ships. A wrong answer in an expert-tier question is worse
than no question at all: it is stated with more confidence, explained at more
length, and the candidate has less ability to tell it is wrong.

**Primary sources, in order of authority**

1. The official Anthropic exam guides (Partner Academy, v1.0 July 2026) — the
   blueprint, domain weights and task objectives. These define what is *in
   scope*; they rarely settle a factual claim.
2. [platform.claude.com/docs](https://platform.claude.com/docs) — the product
   and API documentation. This settles factual claims about behaviour,
   parameters, limits and recommended practice.
3. Reasoning from documented behaviour, where no page states the answer
   outright. Flagged as `inference` below, with the documented premises named.

A question whose correct answer cannot be grounded in 1 or 2, and cannot be
derived from them by short uncontroversial steps, does not ship.

## Status

| bank | questions | verified |
|---|---|---|
| CCAO-F hard | 16 | 16 |
| CCAR-F hard | 18 | 18 |
| CCDV-F hard | 16 | 16 |
| CCAR-P hard | 15 | 15 |
| Exam Simulation — fact-bearing | 118 | 118 |
| Exam Simulation — judgement | 152 | not verified |

The hard-tier rows are verified one question at a time. The simulation rows
are the pass recorded under *Exam Simulation bank* below: its fact-bearing
questions were checked by topic cluster against the product documentation,
and its judgement questions — where the answer is a defensible design call
rather than a documented fact — have not been through a verification pass.

## CCAO-F

### Prompting (a4)

**hd-a4-01** — adding evaluative adjectives ("compelling", "on-brand") does
not improve output; supplying information does.
*Source:* Prompting best practices, *Be clear and direct*:
> "Being specific about the output you want can help enhance results. If you
> want Claude to do more than the task strictly requires, explicitly request
> it rather than relying on the model to infer this from vague prompts."

and:
> "Be specific about the output format and constraints you want."

The distractor "evaluative adjectives are discounted during generation" is
rejected: nothing documents a discounting mechanism, and the real reason is
that the adjectives carry no information, not that they are ignored.
**Verified.**

**hd-a4-02** — an approved example beats adjectives for conveying voice, on a
prompt that is already well specified.
*Source:* Prompting best practices, *Use examples effectively*:
> "Examples are one of the most reliable ways to steer Claude's output
> format, tone, and structure. A few well-crafted examples (known as few-shot
> or multishot prompting) improve accuracy and consistency."

Note the documentation specifically names **tone** as something examples
steer, which is the claim the question turns on. **Verified.**

**hd-a4-03** — a prompt that works for its author and not a colleague usually
depends on context the author supplies without noticing.
*Source:* Prompting best practices, *Be clear and direct*:
> "Think of Claude as a brilliant but new employee who lacks context on your
> norms and workflows."
> "**Key test:** Show your prompt to a colleague with minimal context on the
> task and ask them to follow it. If they'd be confused, Claude will be too."

The documentation proposes exactly this test, which makes the scenario a
direct application of it. **Verified.**

### Output evaluation (a1)

**hd-a1-01** — a citation that points at a real section but misstates its
content is a reliability failure, and reclassifies the rest of the document as
unverified. `inference` from the exam guide's Output Evaluation objectives
(verifying claims against sources) plus the ordinary meaning of verification.
No documentation page states this case; the reasoning is short and
uncontroversial. **Verified as inference.**

**hd-a1-02** — an omission cannot be detected from the output, only from the
source. `inference`, and a strong one: the other three options all attempt
detection from the output, which is definitionally impossible for something
absent from it. **Verified as inference.**

**hd-a1-03** — re-running tests stability, not truth; only the source tests
truth. `inference` from documented sampling behaviour: responses vary between
runs, so agreement across runs measures consistency of the model's own
reasoning over the same material. **Verified as inference.**

**hd-a1-04** — "churn fell 12%" is ambiguous between a 12.5% relative fall and
a one-point absolute fall. *Arithmetic:* 8.0 → 7.0 is −1.0 absolute and
−12.5% relative. Both readings are correct; the question is about which a
reader will take. **Verified by arithmetic.**

**hd-a1-05** — a review rule skipped consistently in one place is a design
signal. `inference` from the exam guide's Output Evaluation objective on
scaling review to consequence. **Verified as inference.**

### Workflow (a2)

**hd-a2-01** — two caught errors evidence that the reviewer caught two errors,
not that review catches errors. `inference`; the distinction is about what the
evidence supports, not about product behaviour. **Verified as inference.**

**hd-a2-02** — a first workflow should be frequent and checkable rather than
painful-and-ambiguous. `inference` from the exam guide's Workflow Integration
objectives. Consistent with the existing drill bank's treatment. **Verified as
inference.**

### Governance (a3)

**hd-a3-01** — postcode plus date of birth frequently re-identifies an
individual, so stripping names does not take a dataset out of scope.
*External, well-established:* quasi-identifier re-identification is the
standard result in data-protection practice (the classic finding is that a
small number of quasi-identifiers uniquely identify most of a population).
The question deliberately does not quote a statistic, because the precise
figure varies by population and dataset. **Verified.**

**hd-a3-02** — a performance review is the manager's assessment; summarising
the inputs is a different thing. `inference` from the exam guide's
Governance objectives on accountability for consequential decisions about
individuals. **Verified as inference.**

### Model selection (a5)

**hd-a5-01** — the tier decision is the price difference against 240 items ×
4 minutes. *Arithmetic:* 8,000 × (97% − 94%) = 240 items; × 4 min = 16 hours
per month. The question supplies every figure needed. **Verified by
arithmetic.**

### Troubleshooting (a7)

**hd-a7-01** — re-running on a previously-good input isolates the variable.
`inference`; standard controlled-comparison reasoning, and the only option
that holds the input constant. **Verified as inference.**

**hd-a7-02** — the diagnostic for saturation is whether early detail is still
honoured, not elapsed time. `inference` from documented context behaviour:
the window holds the conversation so far, so what matters is how much has
accumulated rather than how long the session has lasted. **Verified as
inference.**

### Configuration (a6)

**hd-a6-01** — supplied knowledge is treated as current, so a superseded
document must be removed rather than annotated. `inference` from documented
behaviour: material in context is used as given, and nothing marks a document
as stale. The rejected option (an instruction stating precedence) is a
probabilistic control where removal is deterministic — the same
shape-versus-enforce distinction the notes already teach. **Verified as
inference.**

## CCAR-F

Sources: the CCAR-F exam guide for scope, and platform.claude.com/docs for
behaviour. Architect Foundations is largely a judgement exam, so several
answers here are `inference` from documented mechanics rather than quotation.

**hd-d1-01** — a catch-all `stop_reason` branch turns `max_tokens` into a
silent success. Documented stop reasons: `max_tokens` halts generation at the
output ceiling, leaving syntactically plausible but incomplete output.
**Verified.**

**hd-d1-02** — reordering a side-effecting call narrows the race window
without closing it; an idempotency key at the tool is the guarantee.
`inference` from the general property that a lost response is
indistinguishable from a failed call. **Verified as inference.**

**hd-d1-03** — parallelization versus orchestrator–worker turns on whether
the subtasks are known before the run starts. Matches the pattern definitions
in our blueprint-checked d1 notes. **Verified.**

**hd-d1-04** — "never" requires enforcement in code; a system-prompt rule
shifts probability. The shape-versus-enforce distinction the CCAR-F guide
tests directly and the notes cover in d1 and d3. **Verified.**

**hd-d1-05** — a crashed subagent should return a structured failure, not an
empty string, which is indistinguishable from a genuine empty result.
`inference`, consistent with the existing d1 drill questions. **Verified as
inference.**

**hd-d1-06** — an evaluator-optimizer loop needs an iteration cap because
convergence depends on a judgement that may never be reached. `inference`
from the pattern definition. **Verified as inference.**

**hd-d2-01** — tool selection is driven by name, description and input
schema; position in the tool array has no effect. Tool-use documentation on
how Claude chooses a tool. **Verified.**

**hd-d2-02** — Tool versus Resource is a server-side design decision, and a
consuming client cannot reclassify a side-effecting tool but can choose which
tools it exposes. MCP documentation. **Verified.**

**hd-d2-03** — a 400-line stack trace crowds out what the next decision needs
from a tool result. `inference`, consistent with documented guidance on
keeping tool results scoped. **Verified as inference.**

**hd-d3-01** — only exit code 2 blocks a `PreToolUse` hook; exit 1 is a
non-blocking error. Claude Code hooks documentation. This specific fact is
what the question turns on. **Verified.**

**hd-d3-02** — a CI run that comes back incomplete on larger diffs despite
non-interactive mode hit a tool that was not pre-authorized. Corrected
2026-11-18: the question originally said the run *hangs* at a permission
prompt, but the headless documentation says "In a Manual mode `claude -p` run,
a call that needs approval is denied unless something approves it", so the run
continues without that call. The key and the lesson (pre-authorize what a CI
run needs) are unchanged; the symptom is now an incomplete review.
**Verified.**

**hd-d3-03** — a rule engineers must not be able to disable belongs in the
managed layer, because every repository-level layer is editable with commit
access. Settings precedence documentation. **Verified.**

**hd-d4-01** — `tool_choice: any` guarantees that some tool is called, not
which one; naming the tool pins the schema. Tool-use documentation on forcing
tool use. **Verified.**

**hd-d4-02** — zero cache reads across identical-looking requests points at a
varying prefix. Prompt caching documentation:
> "Cache writes occur only at your breakpoint. Marking a block with
> `cache_control` writes exactly one cache entry: a hash of the prefix ending
> at that block. Changing any block at or before the breakpoint produces a
> different hash."

The 12,000-token figure in the stem sits above every model's minimum
cacheable length, so that alternative cause is excluded by construction.
**Verified.**

**hd-d4-03** — long documents go at the top, with the query after them.
Prompting best practices:
> "Put long-form data at the top: Place your long documents and inputs near
> the top of your prompt, above your query, instructions, and examples. This
> improves performance across all models."

and:
> "Queries at the end can improve response quality by up to 30 percent in
> tests, especially with complex, multidocument inputs."

This is a case where the intuitive answer and the measured one differ, which
is why the question exists. **Verified.**

**hd-d5-01** — a 400 is not retryable. API errors documentation: 400 is
`invalid_request_error`, "an issue with the format or content of your
request". The retryable transients are 429, 500 and 529. **Verified.**

**hd-d5-02** — material in the middle of a long prompt carries less weight
than content at either end. Follows from the long-form placement guidance
above, which exists because position affects weighting. **Verified.**

**hd-d5-03** — choosing between pruning, summarizing and restarting depends
on what the remaining work needs. `inference`, consistent with the d5 notes.
**Verified as inference.**

## CCDV-F

Developer Foundations is the exam where specific API behaviour is fair game,
so most of these are quotations rather than inference.

**hd-v1-01** — retrying a 400 resends the identical malformed request. API
errors, 400 `invalid_request_error`. **Verified.**

**hd-v1-02** — 529 is API-side overload; a rate limit is 429. API errors:
> "529 - `overloaded_error`: The API is temporarily overloaded."
> "429 - `rate_limit_error`: Your organization has hit a rate limit..."

The acceleration-limit distractor is also addressed there: those surface as
429, not 529, and are handled by ramping traffic gradually. **Verified.**

**hd-v1-03** — 413 is `request_too_large` and the Messages API limit is
128 MB per request, so splitting does clear the error. API errors, Request
size limits. **Verified.**

**hd-v1-04** — a mid-stream error arrives as an event, not a status, because
200 was already sent. API errors:
> "When receiving a streaming response over server-sent events (SSE), an
> error can occur after the API returns a 200 response. In that case, error
> handling doesn't follow these standard mechanisms."

**Verified.**

**hd-v1-05** — a large `max_tokens` without streaming risks a dropped idle
connection. API errors, Long requests:
> "Some networks might drop idle connections after a variable period of time,
> which can cause the request to fail or time out without receiving a
> response from Anthropic."

with the documented remedy being streaming or the Batches API. **Verified.**

**hd-v1-06** — log the request id, model id and stop reason; sample content
rather than logging every body. API errors on `request-id` for support, plus
our own v1 notes. **Verified.**

**hd-v2-01** — both cache counters at zero means the prompt was never cached,
and the minimum cacheable length varies by model. Prompt caching:
> "Shorter prompts cannot be cached, even if marked with `cache_control`. No
> error is returned; check `cache_creation_input_tokens` and
> `cache_read_input_tokens` in the response - if both are 0, the prompt
> wasn't cached."

The 800-token figure is chosen deliberately: above the 512-token minimum of
current models, below the 1,024-token minimum of several others, which is
why the model in use decides it. **Verified.**

**hd-v2-02** — the cache lifetime runs from the start of the request, so four
minutes of streaming consumes four of the five minutes. Prompt caching:
> "The lifetime is measured from the start of the request that writes or
> reads the cache entry, not from the end of its response. Time spent
> generating a response counts against the lifetime: if a response takes 4
> minutes to stream, a follow-up request that reuses the same cached prefix
> must start within about 1 minute of that response completing."

The question is built directly on this passage. **Verified.**

**hd-v2-03** — retried calls are billed, so cost must be compared per
completed task. Arithmetic plus the per-call billing model. **Verified.**

**hd-v3-01** — an agent on a fixed five-step sequence buys variability for
nothing. `inference`, consistent with the v3 notes. **Verified as
inference.**

**hd-v3-02** — one representation for "no records" and "could not reach the
data" hides the distinction from the next decision. `inference`. **Verified
as inference.**

**hd-v4-01** — injection is mitigated by delimiting untrusted content and
constraining capability, not by instructing the model to ignore
instructions. Our v6 notes, covering the guide's Security objectives.
**Verified.**

**hd-v5-01** — a tool description is guidance; confirmation on a destructive
action has to be enforced outside the model. `inference` from the
shape-versus-enforce distinction. **Verified as inference.**

**hd-v6-01** — file read plus network reach is an exfiltration path neither
capability creates alone. `inference`; the capability-combination idea the v6
notes already teach. **Verified as inference.**

**hd-v7-01** — user-level settings layer over committed project settings, so
two developers sharing a repository can still resolve differently. Settings
precedence documentation. **Verified.**

**hd-v8-01** — a suite that passes while users complain is unrepresentative,
and more cases of the same kind will not close the gap. `inference`,
consistent with the v8 notes. **Verified as inference.**

## CCAR-P

Professional questions turn on tradeoffs rather than facts, so these are
predominantly `inference` from the guide's objectives. Where a claim is
checkable it is checked.

**hd-p1-01** — a silently-served stale fallback makes staleness invisible to
the user and to the logs. `inference`. **Verified as inference.**

**hd-p1-02** — the controls are the requirement; a library delivers them
in-process where a gateway's extra hop does not fit a latency budget.
`inference`. **Verified as inference.**

**hd-p1-03** — reconstructing a past decision needs the model version and
prompt version, not only the inputs and the output. `inference` from the
audit objectives, consistent with the p1 notes. **Verified as inference.**

**hd-p2-01** — surface the tradeoff, recommend the simpler design, build what
the client then chooses. The guide's Solution Design objectives on advising
stakeholders. The "present it as what it is not" distractor is rejected on
straightforward grounds. **Verified.**

**hd-p2-02** — a plateau at 94.6% against a 99% bar is closed by routing
low-confidence cases to a human, not by further prompt work. `inference`,
consistent with the p2 notes. **Verified as inference.**

**hd-p2-03** — splitting by privilege boundary contains a compromise that a
single agent holding the union of privileges would not. `inference`, the same
reasoning as the capability-combination questions. **Verified as inference.**

**hd-p3-01** — two points on 60 cases is about one item. Arithmetic: 1/60 is
1.67 points, so a two-point gap is roughly one case changing hands.
**Verified by arithmetic.**

**hd-p3-02** — calibrating a judge on a sample drawn from the same
distribution cannot reveal a blind spot shared with the generator.
`inference`. **Verified as inference.**

**hd-p4-01** — an approval gate is a control only where refusal is a live
possibility. `inference` from the governance objectives. **Verified as
inference.**

**hd-p4-02** — a version change requires re-validating the safety cases,
because an aggregate score hides movement in low-volume, high-consequence
categories. `inference`, consistent with the p4 notes. **Verified as
inference.**

**hd-p5-01** — a defensible projection is a range with its drivers named.
Arithmetic: 90,000 x $0.012 = $1,080. The reasoning about why a pilot figure
understates production cost is `inference`. **Verified.**

**hd-p5-02** — pinning holds the system still and does nothing about input
drift. `inference`, the complement of the version-pinning questions.
**Verified as inference.**

**hd-p6-01** — a shared parameterized prompt component beats both four
independent prompts and a central team owning all of them. `inference`,
consistent with the p6 notes. **Verified as inference.**

**hd-p6-02** — accumulated stale instructions dilute the current ones.
`inference` from documented attention behaviour over long prompts.
**Verified as inference.**

**hd-p7-01** — adoption, line counts and sentiment all measure activity
rather than outcome. `inference` from the p7 objectives on measuring
developer productivity. **Verified as inference.**

## Exam Simulation bank — fact-based verification

The hard-tier log above checks one question at a time. The simulation bank is
283 questions, and roughly half of them turn on a judgement about architecture
rather than on a documented fact — those are reviewed as reasoning, not
verified against a source, and are not listed here.

This section covers the **118 fact-bearing questions**: the ones whose answer
depends on a flag, an API field, a config key or a documented mechanism, where
a source can confirm or refute the answer outright. They were grouped into 16
topic clusters so one documentation check settles every question that rests on
the same fact, and each cluster was checked against the primary source —
`code.claude.com/docs` for Claude Code behaviour, `platform.claude.com/docs`
for the API.

Verified **2026-11-11**. Each cluster below records what the source says and
what changed as a result.

### Confirmed, no change needed

**Built-in tools** (17 questions) — Grep searches file *contents*, Glob matches
file *paths*, Read reads a file, Bash runs a command. Confirmed verbatim from
the tools reference, which also states the names are exact: "The tool names are
the exact strings you use in permission rules, subagent tool lists, and hook
matchers." Annotated 2026-11-18: the same page now says that on macOS, Linux
and WSL Glob and Grep are left out of the default tool set and Claude searches
through Bash, so the eight questions that teach Glob and Grep as defaults carry
a current-state note.

**Non-interactive CLI** (8) — `-p` / `--print` confirmed: "Add the `-p` (or
`--print`) flag to any `claude` command to run it non-interactively." The
distractors used across these questions are genuinely fictional: no `--batch`
flag and no `CLAUDE_HEADLESS` environment variable appear in the CLI reference.

**Structured CLI output** (2) — `--output-format` with options `text`, `json`,
`stream-json`, and `--json-schema`: "Get validated JSON output matching a JSON
Schema after the agent completes its workflow (print mode only)."

**MCP scope and auth** (4) — scopes are local, project and user, and local
takes precedence. `.mcp.json` is the project-scoped file shared through version
control, and `${VAR}` expansion keeps credentials out of it. `/mcp` shows
server status and per-server tool counts.

**MCP resources vs tools** (2) — the three primitives are confirmed through the
discovery requests `tools/list`, `prompts/list` and `resources/list`. The
read-content-versus-take-action distinction these questions draw is consistent
with that but is not stated as a definition on the page; treated as
`inference`.

**Skills `context: fork`** (9) — confirmed: the frontmatter `context` field set
to `fork` runs the skill "in a forked subagent context", isolated from the
conversation, returning only its result. The docs add a caveat worth knowing:
despite the name it does not fork the current conversation, so a skill that
needs session history should not use it. `BAL-037` already tests exactly that
distinction.

**Hooks** (16) — `PreToolUse` ("Before a tool call executes. Can block it") and
`PostToolUse` ("After a tool call succeeds") confirmed, along with 31 other
events. Hooks live in `settings.json`, not `CLAUDE.md`: "Hooks are defined in
JSON settings files." They can be scoped to a tool: "The `matcher` field
filters when hooks fire."

**stop_reason** (22) — all seven values confirmed: `end_turn`, `max_tokens`,
`stop_sequence`, `tool_use`, `pause_turn`, `refusal`,
`model_context_window_exceeded`. `content_filter` does not exist, which several
questions rely on as a distractor. Checking `stop_reason` rather than
inspecting the text is confirmed as the way to detect truncation — a
`max_tokens` response can look complete.

**tool_choice and parallel tool use** (15 + 1) — the four modes `auto`, `any`,
`tool`, `none` confirmed. `disable_parallel_tool_use` is real and the docs are
explicit about where it lives: "set `disable_parallel_tool_use: true` inside
the `tool_choice` object. It is not a top-level request parameter." Parallel
use is on by default, and all `tool_result` blocks must return "all together in
the next user message" — splitting them is labelled Wrong. A failed tool
returns `tool_result` with `is_error: true`.

**Message Batches** (11) — "All usage is charged at 50 percent of the standard
API prices", "most batches completing within 1 hour", expiring at 24 hours, and
unsuitable for work that needs an immediate response. Results "can be returned
in any order" and must be matched by `custom_id`.

**Context management** (11) — context editing and compaction are confirmed as
different features: the strategies "Clear specific content from conversation
history" while compaction "Generates a summary and replaces full conversation
history." Strategy types `clear_tool_uses_20250919` and
`clear_thinking_20251015` confirmed.

**CLAUDE.md and memory** (26) — `.claude/commands/`, `.claude/rules/` with
`paths` frontmatter globs, and `@path` imports all confirmed. One correction
is recorded below.

### Corrected

**`--allowedTools` does not restrict tools.** The CLI reference defines it as
"Tools that execute without prompting for permission", and says plainly: "To
restrict which tools are available, use `--tools` instead." Two questions used
it as the restriction mechanism in their *correct* answer, which made the
answer wrong.

- **BAL-052** — correct option rewritten from `--allowedTools` to `--tools`.
- **W-009** — same correction; its explanation now names the difference, since
  the confusion is the point worth teaching.

**`--max-budget-usd` is the spend ceiling.** Documented as "Stop the run once
estimated spend on API calls reaches this amount (print mode only)."

- **BAL-051** — the correct option said "a spending cap on the job" without
  naming the flag. It now names it.

### Annotated with a current-state note

These questions test a mechanism that still works, under a name the product has
since changed. The answers stand; each now carries a `current_state_note`,
which is the field the bank already uses for "the guide says X, the product has
moved on".

**The Task tool is now the Agent tool.** From the subagents page: "In version
2.1.63, the Task tool was renamed to Agent. Existing `Task(...)` references in
settings and agent definitions still work as aliases."

- **BAL-033**, **REF-089**, **REF-116** — noted. The mechanism each tests is
  unchanged and the alias still works, so no answer moved.

**`AgentDefinition` is the Agent SDK's subagent type; `allowedTools`
auto-approves.** Corrected 2026-11-18: an earlier version of this entry said
neither name exists in the product. Both do. The Agent SDK subagents page has
an "AgentDefinition configuration" table with `description`, `prompt`, `tools`
("If omitted, inherits every tool available to subagents") and
`disallowedTools`. `allowedTools` is a session option whose examples are
commented "Auto-approve these tools"; it does not restrict a subagent, which is
what the `tools` field does. In Claude Code the same fields are YAML
frontmatter in a Markdown file under `.claude/agents/`.

- **REF-090**, **REF-117** — noted. Both test scoping a subagent to its role,
  which is correct and well documented; the note now describes the SDK type
  accurately.
- **REF-089**, **REF-116**, **BAL-033** — the Task-to-Agent note now also says
  that `allowedTools` is the auto-approve list.

### Not verified

**`max_tokens` splitting (part of the stop_reason cluster).** Several questions
hold that the remedy for truncated structured output is to split the work into
smaller scoped calls rather than raise `max_tokens`. The docs confirm
`max_tokens` has a hard per-model ceiling and cannot be raised indefinitely,
but the splitting recommendation itself is not stated on the pages checked —
the documented remedies are raising the limit and continuation. The answers are
sound engineering and match the exam guide's framing, so they stand as
`inference` rather than as documented fact.

**Retrieval over full-context, and counter-examples.** Two prompt-engineering
claims used in the bank were not found in the current docs: that retrieval is
preferred to putting a large corpus in context, and that counter-examples
reinforce what to avoid. Both are reasonable and widely held; neither is
documented on the pages checked. Recorded as `inference`.

### Source drift found while checking

Worth knowing before the next pass, since several bank citations point at URLs
that have moved:

- `prompt-engineering/long-context-tips` and
  `prompt-engineering/multishot-prompting` now both serve one consolidated page,
  `prompt-engineering/claude-prompting-best-practices`. 10 citations point at
  the old URLs.
- `agents-and-tools/tool-use/implement-tool-use` now serves `define-tools`.
- `api/handling-stop-reasons` gives its canonical URL as
  `build-with-claude/handling-stop-reasons`.

The 230 questions citing only the exam guide still rest on a single source that
establishes scope rather than correctness, and 124 of those citations point at
third-party mirrors of the guide rather than at Anthropic's own partner site.
Replacing those is a separate pass.

Update 2026-11-18: an accuracy review added a documentation source to each
fact-bearing question it could match to a page. 121 of 283 questions now cite
only the exam guide, 52 of them through a third-party mirror. What remains is
mostly judgement questions that no documentation page settles.

### Added 2026-11-18 to hold the objective floor

That day's review cut eight over-tagged questions back to the objectives each
actually tests (REF-018, REF-089, REF-090, REF-116 and REF-117 had all carried
O01, O03, O04, O05 and O06; REF-047, REF-053 and REF-057 were mapped to
objectives they don't test). That would have left O01, O03, O06, O14 and O31
below 8, so thirteen `objective_balance` questions were written. Each was
checked against the page it cites, on 2026-11-18:

- **BAL-063 to BAL-067 (O03)** — "The only content you pass from parent to
  subagent is the Agent tool's prompt string", and a subagent does not receive
  "the parent's system prompt" (Agent SDK subagents). What a complete handoff
  carries is judgement from those premises. **Verified as inference.**
- **BAL-068, BAL-069, BAL-071 (O06)** — the Agent SDK subagents troubleshooting
  list: a new `agents` directory is not watched until restart; programmatic
  `agents` override a filesystem agent with the same name; invalid frontmatter
  or a duplicate `name` stops a definition appearing. **Verified.**
- **BAL-070 (O06)** — `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`: default 3, and
  "`1` stops your subagents from spawning any of their own", leaving the bottom
  layer to do the work itself. **Verified.**
- **BAL-072 (O14)** — skills page: with `context: fork` "The subagent doesn't
  see your conversation history", and the result returns to the main
  conversation. **Verified.**
- **BAL-073, BAL-074 (O31)** — explicit inclusion and exclusion criteria, in
  the same framing as BAL-062 and W-026. **Verified as inference.**
- **BAL-075 (O01)** — parallel tool use page: with `tool_choice` `auto`,
  `disable_parallel_tool_use: true` "means Claude calls at most one tool in
  each response", and parallel use is on by default. **Verified.**

## Re-verification

Claims grounded in documentation should be re-checked when the docs change.
The exam guides are marked "subject to change without notice" and Pearson VUE
lists an exam update for **2026-12-07**, with refreshed guides due
**2026-11-17**.

That applies to the simulation section above as much as to the hard tier. Its
product facts came from `code.claude.com/docs` and `platform.claude.com/docs`
on 2026-11-11, and two of them had already moved under the bank's feet — the
Task tool renamed to Agent, and three documentation URLs consolidated. The
Claude Code surface moves faster than the exam guide, so the CLI, hooks,
subagent and MCP clusters are the ones most worth re-checking first.
