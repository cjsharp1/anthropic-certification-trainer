/* CCAR-F — hard tier. See data-questions-hard-ao.js for the standard these
 * are written to, and VERIFICATION.md for the source behind each answer.
 *
 * Architect Foundations is a judgment exam, so the hard tier here leans on
 * designs that are nearly right: the candidate has to find the one place a
 * reasonable-looking architecture breaks, rather than recall a fact.
 */
QUESTIONS.push(

/* ---- d1: Agentic Architecture & Orchestration (27%) ---- */

{ id:"hd-d1-01", exam:"CCAR-F", d:"d1", difficulty:"hard", kind:"scenario",
  q:"An agent loop checks <code>stop_reason</code> and handles <code>tool_use</code> and <code>end_turn</code>. Anything else falls through to a branch that returns the accumulated text to the user. A nightly job using it produces a complete-looking report most nights and a truncated one roughly once a week. What is the defect?",
  a:3,
  opts:["The loop is not retrying on transient failures, so an occasional network error ends the run early with whatever text had accumulated.",
        "The job runs without an iteration cap, so on heavy nights the agent exhausts its budget partway through and returns early.",
        "Tool results are being appended in the wrong order on nights when several tools are called, so the model loses the thread.",
        "The fall-through treats every other stop reason as success, so a <code>max_tokens</code> stop returns partial output as though it were finished."],
  why:"A catch-all branch that returns accumulated text turns every unhandled stop reason into a silent success. <code>max_tokens</code> is the one that bites here: generation halts wherever it happened to be, so the text reads as plausible and is incomplete, and it only appears on nights when the report runs long. The other options describe real failures that would look different — a network error or a hit iteration cap leaves a trace, and reordered tool results produce confused content rather than truncated content. Branch on every value explicitly and treat an unknown one as an error, not as done."},

{ id:"hd-d1-02", exam:"CCAR-F", d:"d1", difficulty:"hard", kind:"scenario",
  q:"A support agent calls <code>issue_refund</code>. The tool succeeds, the network drops before the result reaches the orchestrator, and the orchestrator's retry logic calls it again. The team proposes moving the refund call later in the sequence so there is less time for a drop. Assess the proposal.",
  a:0,
  opts:["It does not address the failure: the window is smaller but still open, and a repeat charge is prevented by an idempotency key at the tool, not by timing.",
        "It is sound, because the shorter the gap between the call and the confirmation, the lower the probability that a retry fires against a completed action.",
        "It is unnecessary, because an orchestrator should never retry a tool call that has side effects, and the retry policy is the thing to change.",
        "It helps but is incomplete: it should be paired with a confirmation step that asks the user whether the refund arrived before any retry."],
  why:"Reordering changes how often the race is lost, not whether it can be. The guarantee has to come from the tool: an idempotency key means the second call recognizes the first and returns the original result instead of refunding twice. The third option is tempting and too absolute — side-effecting calls do need retrying when the failure is genuinely a lost response, which is exactly this case. Asking the user is slow, unreliable, and pushes a correctness problem onto them."},

{ id:"hd-d1-03", exam:"CCAR-F", d:"d1", difficulty:"hard", kind:"scenario",
  q:"A design review covers two systems. System A summarizes five named documents, concurrently. System B reads a request, works out which checks apply, and dispatches those. Both run work in parallel. Which patterns are these?",
  a:2,
  opts:["Both are parallelization: concurrency is the defining property, and the difference is only in how the work is enumerated.",
        "A is parallelization, B is prompt chaining, because B's steps run in a sequence decided before any of them start.",
        "A is parallelization, B is orchestrator–worker, because B decides the subtasks at runtime after seeing the request.",
        "A is orchestrator–worker and B is routing, because A has a coordinator combining results and B classifies before dispatching."],
  why:"Concurrency is shared by both, which is exactly why questions pair them: the distinction is who decides the units of work. In A they are known before the run — five named documents. In B a coordinator examines the request and determines the breakdown, which is orchestrator–worker. The fourth option misreads both: combining results does not make A an orchestrator, and B does more than classify-and-dispatch because it decides how many checks and which."},

{ id:"hd-d1-04", exam:"CCAR-F", d:"d1", difficulty:"hard", kind:"scenario",
  q:"An agent must never send an email without human approval. Three designs are proposed: a system-prompt rule stating it, a <code>PreToolUse</code> hook on the send tool, and removing the send tool so the agent writes a draft another system picks up. Which satisfies \"never\"?",
  a:1,
  opts:["All three, because each one prevents the send in normal operation and the differences are about convenience rather than correctness.","The hook and the draft design both do, while the system-prompt rule shifts probability rather than enforcing anything.","Only the draft design, because a hook is configuration that a developer can edit and so cannot carry a guarantee.","The hook alone, because the draft design still lets the agent compose the message and a downstream system may dispatch it unreviewed."],
  why:"\"Never\" is an enforcement word, and enforcement runs in code regardless of what the model decides. The hook blocks the call before it executes; removing the tool makes the action unreachable. The prompt is text competing with other text. The third option over-corrects: a hook is editable by whoever can edit the repo, which is a question of who you are defending against, and it still enforces against the model. The fourth misreads the draft design — composing a draft is not sending, and the approval sits in the downstream system."},

{ id:"hd-d1-05", exam:"CCAR-F", d:"d1", difficulty:"hard", kind:"scenario",
  q:"A subagent crashes mid-task. The orchestrator catches the exception and returns an empty string as the tool result so the loop can continue. The run completes and the final answer omits that subagent's section without mentioning it. What is the fix?",
  a:2,
  opts:["Let the exception propagate, so the run fails loudly rather than producing an answer with a silent hole in it.",
        "Retry the subagent until it succeeds, since an empty result is never a useful input to the next step.",
        "Return a structured result saying the step failed and why, so the model can report the gap or route around it.",
        "Cache the last successful output from that subagent and substitute it, so the section is populated with the best available content."],
  why:"An empty string is indistinguishable from a step that genuinely found nothing, which is why the gap went unmentioned. A structured failure gives the model something to reason about: it can say the section is missing, try another route, or stop. Failing the whole run discards work that succeeded and is too blunt for a partial failure. Unbounded retry hammers a dependency that may be permanently down. Substituting stale output is the worst of the four — it produces a confident answer from data that was never fetched."},

{ id:"hd-d1-06", exam:"CCAR-F", d:"d1", difficulty:"hard", kind:"scenario",
  q:"An evaluator–optimizer loop has run 40 iterations on one document without the critic passing it. Cost is mounting. Where does the design need changing?",
  a:0,
  opts:["It needs a cap with a defined outcome at the limit, because a loop whose exit depends on a judgment may never reach it.","The critic is too strict, because a bar no document has cleared in 40 attempts is set above what the generator can produce.","The generator is too weak, because a more capable tier would satisfy the existing critic in far fewer iterations.","The pattern is wrong, because a single-pass chain with one final review would suit this work at a fraction of the cost."],
  why:"The structural fault is that nothing bounds the loop: convergence depends on two components agreeing, and no amount of tuning guarantees they will. A cap plus a defined behavior at it — ship the best attempt, escalate, fail — makes the cost bounded whatever the critic does. The second and third options may both improve the convergence rate and neither removes the possibility of a run that never ends. The fourth throws away a pattern that is right for the task."},

/* ---- d2: Tool Design & MCP Integration (18%) ---- */

{ id:"hd-d2-01", exam:"CCAR-F", d:"d2", difficulty:"hard", kind:"scenario",
  q:"Two tools exist: <code>search_orders</code> (\"Search orders\") and <code>lookup_order</code> (\"Look up an order\"). The model picks the wrong one about a third of the time. A developer proposes listing the preferred tool first in the array. Assess.",
  a:3,
  opts:["Reasonable as a first attempt, since the model reads the tool array in order and earlier definitions carry more weight in selection.",
        "Wrong approach: the two should be merged into one tool with a mode parameter, because any two tools this similar are one tool.",
        "Reasonable, but it should be paired with a system-prompt instruction naming which tool to prefer for which kind of request.",
        "Ordering has no effect on selection. The descriptions do not say when each applies, and that is what has to change."],
  why:"Selection is driven by the name, description and input schema — not by position in the array, so the proposal cannot work. Both descriptions restate the tool name and neither says when it applies or when it does not, which is the actual defect: one presumably takes a query and returns many, the other takes an id and returns one. Merging is sometimes right and is a larger change than the problem warrants. A system-prompt instruction is a probabilistic patch over a description that could simply be correct."},

{ id:"hd-d2-02", exam:"CCAR-F", d:"d2", difficulty:"hard", kind:"scenario",
  q:"An MCP server exposes <code>delete_event</code> as a Tool. A team building a read-only calendar assistant against that server asks how to prevent deletions. What is the right answer?",
  a:1,
  opts:["Declare <code>delete_event</code> as a Resource in the client configuration, since Resources are read-only by definition.",
        "Configure the client to expose only the tools the assistant needs, so <code>delete_event</code> is never offered to the model.",
        "Add a system-prompt instruction that the assistant is read-only and must not call any tool that modifies the calendar.",
        "Ask the server's maintainers to split it into a read-only server and a separate one carrying the write operations."],
  why:"The Tool/Resource distinction is a server-side design decision about the nature of an operation, and a consuming client cannot reclassify someone else's side-effecting tool — which rules out the first option. What a client does control is which tools it surfaces, and a tool never offered cannot be called. The prompt instruction is the usual probabilistic non-answer. Splitting the server works and asks another team for a change you do not need: you can already solve it on your side."},

{ id:"hd-d2-03", exam:"CCAR-F", d:"d2", difficulty:"hard", kind:"scenario",
  q:"An agent's tool returns, on failure, the full 400-line stack trace from the underlying service. The team argues it gives the model maximum information to recover with. What is wrong with that reasoning?",
  a:2,
  opts:["Stack traces leak internal detail about the service, so the real objection here is disclosure rather than anything about the model's reasoning.","The model cannot parse a 400-line trace reliably, so the tokens are spent on material it will not extract the failure from in any case.","A tool result is the input to the next decision, and 400 lines of trace crowds out the part that says what failed and what to try.","A 400-line trace risks exceeding what a single tool result may return, so the part naming the failure may be the part that gets truncated."],
  why:"More information is not automatically more useful when it competes for the same context. What the next decision needs is the outcome and an actionable reason; the trace buries both and spends window that the rest of the task needs. The first option names a real secondary concern. The second is wrong on the facts — a trace is readable, it is just mostly irrelevant. Keep the trace in your logs, where a human debugging the service will actually want it."},

/* ---- d3: Claude Code Configuration & Workflows (20%) ---- */

{ id:"hd-d3-01", exam:"CCAR-F", d:"d3", difficulty:"hard", kind:"scenario",
  q:"A <code>PreToolUse</code> hook is meant to block commits to <code>main</code>. It detects the branch correctly, logs \"blocked: commit to main\", and exits with code 1. Commits to main are still going through. What is wrong?",
  a:0,
  opts:["Exit code 1 is a non-blocking error. Only exit code 2 blocks the call, so the hook detects correctly and stops nothing.","The hook is registered on the wrong event. Blocking has to happen in PostToolUse, where exit code 1 is read as a veto.","Hooks cannot block git operations. Git runs as a subprocess outside the tool lifecycle, so the exit code goes nowhere.","The hook must write its decision as JSON. An exit code of 1 is advisory on its own and the runner continues regardless."],
  why:"This is a bug that ships easily because every observable part of it works: the hook fires, the condition matches, the message appears in the log, and the commit proceeds. Exit 1 signals a non-blocking error; exit 2 is what denies the call. <code>PostToolUse</code> runs after the tool has already executed and cannot prevent anything, which is the opposite of the fix. The third option is simply false, and the fourth describes an alternative decision format rather than the reason this hook fails."},

{ id:"hd-d3-02", exam:"CCAR-F", d:"d3", difficulty:"hard", kind:"scenario",
  q:"A CI job runs a code review on every pull request. It already passes a non-interactive flag and a structured output format. It still hangs on about one run in five, always on pull requests that touch more files than usual. What is the most likely cause?",
  a:2,
  opts:["The timeout is too short for large diffs, so the job is being killed partway and the pipeline reports it as a hang.",
        "Output is being buffered rather than streamed, so the pipeline sees no progress on long runs and treats the job as stalled.",
        "A tool the run needs on larger diffs is not pre-authorized, so it stops at a permission prompt that nothing in CI can answer.",
        "The structured format is being emitted only at the end, so the pipeline's progress check fires before any output appears."],
  why:"The scenario deliberately rules out the two facts people reach for first: non-interactive mode is set and the output format is structured. What is left is authorization, and the correlation with larger diffs is the clue — a bigger change set reaches a tool the smaller ones never needed. A permission prompt in an environment with no human is an indefinite wait, which is what a hang is. The first option describes a kill rather than a hang, and the others would affect every run rather than the large ones."},

{ id:"hd-d3-03", exam:"CCAR-F", d:"d3", difficulty:"hard", kind:"scenario",
  q:"An organization needs a rule that engineers cannot disable: no AI-assisted commit may skip the pre-commit hooks. Where does it go, and why not the other layers?",
  a:3,
  opts:["Committed project settings, because they live with the repository and anyone cloning it picks them up without being told at all.","A hook in the repository, because hooks run in code, and enforcement in code is exactly what a non-negotiable rule requires.","Project memory, because it loads into every single session, which is where the model will read the rule and then act on it.","Managed settings, because every repository-level layer is editable by anyone with commit access, which is who the rule constrains."],
  why:"The question names the adversary: an engineer in a hurry who can edit the repository. That eliminates the three repo-level answers, however well they enforce against the model. A committed hook does run in code — the second option is right about the mechanism and wrong about the threat, which is what makes it the hardest distractor here. Managed settings sit outside the repository and cannot be edited locally. Reserve that layer for the genuine non-negotiables; putting ordinary conventions there makes the configuration rigid and invites workarounds."},

/* ---- d4: Prompt Engineering & Structured Output (20%) ---- */

{ id:"hd-d4-01", exam:"CCAR-F", d:"d4", difficulty:"hard", kind:"scenario",
  q:"A pipeline needs every response to match one JSON schema. A developer sets <code>tool_choice</code> to <code>any</code> with three tools declared, and still sees responses in two different shapes. Why?",
  a:1,
  opts:["any permits a text answer when no tool fits, so the responses that differ are the ones where the model declined to call anything.","<code>any</code> guarantees that some tool is called, not which one, so with three tools declared the output can match any of three schemas.","any applies only to the first turn of a conversation, so later turns revert to the default, where prose is a valid response.","any is advisory rather than binding, so a schema guarantee needs validation on the response, whatever the setting says."],
  why:"The distinction between presence and shape is the whole question. <code>any</code> forces a tool call, so every response is a tool call — and with three tools available, which schema you get is still the model's choice. Naming the specific tool pins it to one. The first option contradicts what <code>any</code> means, and the third invents a turn restriction. The fourth is reasonable advice that does not explain the observed behavior, which is what was asked."},

{ id:"hd-d4-02", exam:"CCAR-F", d:"d4", difficulty:"hard", kind:"scenario",
  q:"Cost is dominated by a 12,000-token system prompt sent on every request. Caching is enabled and the usage data shows <code>cache_read_input_tokens</code> at zero across requests that look identical. What should you check first?",
  a:2,
  opts:["Whether the prompt clears the minimum cacheable length for the model in use, since a short prompt is silently not cached.",
        "Whether the five-minute lifetime is expiring between requests, since traffic that arrives in bursts can fall outside the window.",
        "Whether anything before the breakpoint varies between requests, because the cache matches on an exact prefix hash.",
        "Whether the requests are hitting different model versions, since a cache entry written by one version cannot be read by another."],
  why:"Zero reads across requests that look identical points at the prefix rather than the timing: a cache entry is a hash of everything up to the breakpoint, so a timestamp, a request id, or a reordered field anywhere in that span produces a different hash every time. The first option is a real cause of silent non-caching and 12,000 tokens clears every model's minimum, so the scenario rules it out. Expiry would show intermittent reads rather than none. Fix it by moving the breakpoint to the last genuinely identical block."},

{ id:"hd-d4-03", exam:"CCAR-F", d:"d4", difficulty:"hard", kind:"scenario",
  q:"A prompt places a 30,000-token document first, then the instruction, then the specific question. A reviewer argues the instruction should come first so the model knows what it is looking for while it reads. Assess.",
  a:0,
  opts:["The current order is what the guidance recommends: long inputs near the top, with the query after them, which measurably improves quality on multidocument inputs.","The reviewer is right about this: an instruction read before the document frames what to extract, and that avoids a wasted second pass back over the same material.","Neither ordering matters much at this length, because the whole prompt is processed in a single pass rather than sequentially in the way that a human reader works.","Both positions are wrong: at 30,000 tokens the document should be chunked and summarized before the question is put, whatever ordering is then settled on for the parts."],
  why:"This is a case where the intuitive answer and the measured one differ, which is why it is worth knowing rather than reasoning out. The documented guidance is to put long-form data at the top, above the query and instructions, and queries at the end have been found to improve response quality substantially on complex multidocument inputs. The third option is wrong in a subtle way — the prompt is processed at once, and position still affects how strongly content is weighted. The fourth solves a problem the scenario has not reported."},

/* ---- d5: Context Management & Reliability (15%) ---- */

{ id:"hd-d5-01", exam:"CCAR-F", d:"d5", difficulty:"hard", kind:"scenario",
  q:"A client retries on every failure with exponential backoff. Traffic is healthy but a tenth of requests now return <code>400 invalid_request_error</code> after three retries each. What is wrong with the policy?",
  a:3,
  opts:["Backoff is too aggressive: three retries with exponential delay takes long enough that later requests pile up behind the failing ones.",
        "The retries are hiding a capacity problem, and the 400s are the API's way of shedding load once the organization's limits are reached.",
        "Nothing is wrong with the policy; a 10% failure rate points at malformed requests from one caller and the policy is behaving correctly.",
        "A 400 means the request itself is malformed, so retrying it changes nothing: the same request fails identically three more times."],
  why:"Retry policy has to distinguish failures that may succeed later from failures that cannot. A 400 is the latter — the request is wrong, and sending it again spends quota and delay to receive the same answer. Transient codes such as 429 and 529 are what backoff is for. The second option confuses a 400 with a 429. The third is half-right about the source and draws the wrong conclusion: a malformed request from one caller is a bug to surface immediately, not something to retry quietly."},

{ id:"hd-d5-02", exam:"CCAR-F", d:"d5", difficulty:"hard", kind:"scenario",
  q:"A synthesis step over a long aggregated input reliably reports findings from the first and last documents and misses the middle ones. The input fits the context window with room to spare. What is happening?",
  a:1,
  opts:["The aggregation is silently truncating the middle documents, since the total is near enough to the limit that a boundary is being hit.",
        "Material in the middle of a long prompt competes with everything around it, so content there carries less weight than at either end.",
        "The documents in the middle are being deduplicated against the first and last, so their distinct findings never reach the model.",
        "The synthesis instruction is at the end, so the model has already formed its summary by the time it reads what to look for."],
  why:"Fitting in the window is not the same as being weighted evenly within it: attention across a long prompt is uneven, and the ends dominate. The symptom here — first and last reported, middle dropped — is that effect almost exactly, which is why the scenario states the input fits. The first and third options propose mechanisms that would lose the content entirely rather than under-weight it. The fourth has the ordering backwards: the instruction at the end is the recommended placement."},

{ id:"hd-d5-03", exam:"CCAR-F", d:"d5", difficulty:"hard", kind:"scenario",
  q:"A long-running assistant is approaching its context limit. Three options are on the table: summarize the oldest turns, drop superseded tool results, or start a fresh session carrying forward the conclusions. How do you choose?",
  a:2,
  opts:["Summarize, because it is the only one of the three that preserves the whole history in some form and so cannot lose anything that later turns out to matter.","Start fresh, because every form of compaction degrades the material, and a clean session with the constraints restated is the most predictable state to be in.","By what the remaining work needs: prune what is genuinely superseded first, summarize what must survive in outline and restart when the task itself has moved on.","Drop the superseded tool results, because they are the largest consumer of window and removing them is lossless where the other two options are not."],
  why:"All three are legitimate and they are not interchangeable: superseded tool results can go at no cost, an argument you may need to revisit should be summarized rather than deleted, and a session whose task has genuinely changed is better restarted than compacted. The fourth option is right that pruning is the cheapest move and wrong to treat it as the whole answer, because it only helps while there is something genuinely superseded to remove. Choosing by what the remaining work needs is the judgment the question is testing."}

);
