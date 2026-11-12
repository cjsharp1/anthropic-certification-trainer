/* CCAR-F — Claude Certified Architect (Foundations), additional questions.
 * Written against the official exam guide task statements and data-notes.js.
 * Deliberately covers angles the earlier parts did not: cost and latency of
 * agentic designs, observability, partial failure, schema evolution,
 * permission precedence, and the reliability half of D5.
 *   d1 Agentic Architecture (27%)  d2 Tool Design & MCP (18%)
 *   d3 Claude Code Config (20%)    d4 Prompt Engineering (20%)
 *   d5 Context & Reliability (15%)
 */
QUESTIONS.push(

/* ---- d1: Agentic Architecture & Orchestration ---- */

{ id:"ar-d1-26", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"An agentic loop costs roughly four times what a single prompt costs for the same task. When is that defensible?",
  a:2,
  opts:["Whenever the output quality comes out measurably higher than whatever the single prompt gave you","Never, because one well-written prompt should always be preferred on cost grounds whatever happens","When the task genuinely needs the model to decide its own path, and a fixed sequence cannot express it","Whenever the available budget allows for it, since agentic designs are more capable in the general case"],
  why:"Agency buys the ability to handle a path you cannot enumerate, and that is what justifies the cost. If the sequence is knowable, a workflow produces the same answer more cheaply and predictably — so 'quality is higher' is not sufficient unless a fixed path could not have reached it."},

{ id:"ar-d1-27", exam:"CCAR-F", d:"d1", kind:"recall",
  q:"What does the evaluator–optimizer pattern require that prompt chaining does not?",
  a:1,
  opts:["More than one model tier, with a cheaper model generating and a stronger one judging","A criterion the evaluator can apply consistently, and a bound on iterations","Parallel execution, so the draft and the critique can be produced at the same time","External state storage to carry the draft between the evaluator and the optimizer"],
  why:"The loop only terminates if the critique is decidable and there is a cap for when it never passes. Chaining has neither need because each step runs once. Tiers, parallelism and external state are orthogonal."},

{ id:"ar-d1-28", scn:["research"], exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"A subagent returns a result the orchestrator cannot parse. What should the orchestrator do?",
  a:3,
  opts:["Retry the subagent until it finally returns something that parses, since the underlying work has already been done once","Discard the unparseable result and carry on with whatever the other subtasks in the run managed to return successfully","Pass the raw unparsed text straight into the final answer and leave the reader to make sense of it for themselves","Treat it as a failed subtask with a bounded retry, then surface the failure rather than inventing a result"],
  why:"An unparseable result is a failure, and the loop needs it recorded as one. Silent discard produces a confidently incomplete answer, passing raw text corrupts the output, and unbounded retries can hang the run."},

{ id:"ar-d1-29", exam:"CCAR-F", d:"d1", kind:"recall",
  q:"Which signals indicate an agentic design should be replaced by a workflow?",
  multi:true, a:[0,1,3],
  opts:["Every run follows the same tool sequence in practice","Cost per run varies widely with no quality benefit","The task requires several different tools","Debugging a failure requires reading a long trace to find where it diverged"],
  why:"Identical paths in practice, cost variance without payoff, and traces that are hard to reason about all say the agency is not earning its keep. Needing several tools does not: a workflow can call them in a defined order."},

{ id:"ar-d1-30", scn:["research"], exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"Three parallel subagents each return a confident but contradictory finding. How should the orchestrator resolve this?",
  a:0,
  opts:["Apply an explicit reconciliation step, such as a defined precedence rule or an escalation path","Take the majority answer, since two subagents agreeing are unlikely to be wrong in the same way","Take the most detailed answer, since the finding with the most supporting work is best grounded","Re-run all three subagents and keep the finding that appears most often across the repeated runs"],
  why:"Parallel designs need the merge semantics decided up front, because disagreement is the expected case rather than an anomaly. Majority voting assumes independent errors, length is not evidence, and re-running produces more opinions without a rule for choosing."},

{ id:"ar-d1-31", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"You need to know why an agent took a particular action three days ago. What must the design have captured?",
  a:2,
  opts:["The final response, the conclusion that was reached, and the action that the agent took","The iteration count, the elapsed time, and how much work had been done before it stopped","The full sequence of messages sent, tools called with their arguments, and results returned","The total token count, the window size, and how much of the context the decision used"],
  why:"Reconstructing a decision requires the inputs the model actually saw and what each tool returned. Final output, iteration count and token totals tell you that something happened without telling you why."},

{ id:"ar-d1-32", exam:"CCAR-F", d:"d1", kind:"recall",
  q:"What makes an agent's iteration cap a design decision rather than a safety net?",
  a:1,
  opts:["It prevents runaway cost, which really is the only reason that the limit needs to exist at all","It determines what happens to partial work when the cap is reached, which the system must define","It is required by the API itself, which rejects any loop that does not declare some maximum","It improves the overall response quality, by stopping the agent before it over-thinks a task"],
  why:"Hitting the cap is a state the system enters, so the design has to say what the agent returns, what is persisted and whether a human is notified. Treating it purely as a cost guard leaves that undefined."},

{ id:"ar-d1-33", scn:["research"], exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"An orchestrator spawns five subagents; two finish quickly and three are still running when a timeout fires. What is the right behavior?",
  a:1,
  opts:["Discard everything, fail the whole of the run, and treat any partial result as untrustworthy","Return the completed work, clearly marked as partial, and record which subtasks did not finish","Wait for the remaining three to finish up, since the timeout was probably set far too short","Substitute the orchestrator's own best guess, filling in whichever gaps did not complete"],
  why:"Partial results are usually worth something if their incompleteness is visible. Discarding wastes work that succeeded, waiting defeats the timeout, and filling gaps with a guess produces output nobody can distinguish from a complete answer."},

{ id:"ar-d1-34", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"Latency for an agentic feature is unacceptable in production. Which change usually helps most?",
  a:2,
  opts:["Raising the output ceiling, so fewer continuation calls are needed per run","Switching to a model with a larger context window so less compaction is required","Identifying steps that do not depend on each other and running them in parallel","Lowering the temperature, so the agent reaches its conclusion in fewer iterations"],
  why:"Agent latency is dominated by sequential round trips, so removing false dependencies attacks the actual cost. Token ceiling and window size do not change the number of turns, and temperature affects neither."},

{ id:"ar-d1-35", scn:["research"], exam:"CCAR-F", d:"d1", kind:"recall",
  q:"Which responsibilities belong to the orchestrator rather than to a subagent?",
  multi:true, a:[0,1,3],
  opts:["Deciding how results are combined","Enforcing the overall budget and deadline","Executing the tool calls for its own subtask","Handling a subtask that fails or times out"],
  why:"Combination, budget and failure handling are global concerns the orchestrator alone can see. Executing its own tool calls is exactly what the subagent is for."},

{ id:"ar-d1-36", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"A human approval gate was added before a destructive action, but testing shows the agent occasionally proceeds without it. Where is the flaw?",
  a:0,
  opts:["The gate is implemented as an instruction, so it is advisory and must be enforced outside the model","The prompt's wording is simply not emphatic enough about approval being mandatory before acting","The model tier is far too weak to reliably follow a multi-step instruction when under pressure","The approval request itself is malformed, so the agent never recognizes the thing as a gate"],
  why:"Anything the model can choose to skip is not a guarantee. A real gate blocks the action in code or configuration — a permission rule or hook — so the agent cannot proceed regardless of what it decides."},

/* ---- d2: Tool Design & MCP Integration ---- */

{ id:"ar-d2-21", scn:["extract"], exam:"CCAR-F", d:"d2", also:{"CCDV-F":"v5"}, kind:"scenario",
  q:"You need to add a required field to a tool's input schema that existing callers do not send. How should you roll it out?",
  a:1,
  opts:["Add it as required now, let existing callers fail, and fix them as they surface","Add it as optional with a defined default, migrate callers, then tighten the schema","Create a second tool carrying the new field, then deprecate the original one","Accept it when sent, infer a value when absent, and never tighten the schema"],
  why:"Widening before narrowing keeps every existing call valid during the migration. Making it required immediately breaks callers at once, a parallel tool doubles the selection surface, and silently ignoring it leaves the schema lying about what the tool needs."},

{ id:"ar-d2-22", exam:"CCAR-F", d:"d2", also:{"CCDV-F":"v5"}, kind:"recall",
  q:"Why does tool description quality affect reliability more than tool count alone?",
  a:2,
  opts:["Descriptions are cached after the first call, so their cost stops scaling with the tool count","A longer description produces a longer tool call, which crowds out the rest of the context window","Selection matches against descriptions, so two that overlap cause wrong calls","The API validates each description against its input schema and rejects the ones that disagree"],
  why:"The model routes by reading descriptions, so two that overlap produce inconsistent selection even in a small catalog. Count makes the problem worse but description clarity is the mechanism."},

{ id:"ar-d2-23", exam:"CCAR-F", d:"d2", kind:"scenario",
  q:"An MCP server your agent depends on becomes unavailable. What should the agent design already specify?",
  a:3,
  opts:["That the agent retries, waits, and then simply keeps on trying until the server comes back","That the agent falls back to a different model, with an equivalent capability built into it","That the run fails immediately, surfacing the gap rather than hiding it away from the caller","Which capabilities degrade, what the user is told, and whether the run can continue without it"],
  why:"An MCP server is an operational dependency, so its absence is a state the design must cover: what still works, what the user is told, and whether to continue or stop. Unbounded retries hang the run and immediate failure throws away work that did not need that server."},

{ id:"ar-d2-24", exam:"CCAR-F", d:"d2", also:{"CCDV-F":"v5"}, kind:"scenario",
  q:"A tool performs a write that must never happen twice, but the agent may retry after a timeout. What does the tool need?",
  a:0,
  opts:["An idempotency key, so a repeated call with the same key is recognized rather than re-executed","A longer timeout, so that the first call returns well before any retry could be fired off","A confirmation prompt, so that a duplicate write is caught before it ever gets executed","A read-only variant, so that the agent is able to check the state before it writes at all"],
  why:"A timeout does not tell you whether the write landed, so the retry must be safe by construction. Idempotency makes the duplicate a no-op. Longer timeouts shrink the window without closing it, and a prompt does not help an automated retry."},

{ id:"ar-d2-25", exam:"CCAR-F", d:"d2", kind:"recall",
  q:"Which practices reduce the security surface of a tool-using agent?",
  multi:true, a:[0,1,3],
  opts:["Granting each tool only the access that tool requires","Separating read tools from tools that write or delete","Exposing every available tool so the model can choose freely","Validating tool arguments server-side rather than trusting the model"],
  why:"Narrow per-tool scopes, separated destructive operations and server-side validation all limit what a wrong or manipulated call can do. Exposing everything does the opposite and degrades selection as well."},

{ id:"ar-d2-26", exam:"CCAR-F", d:"d2", also:{"CCDV-F":"v5"}, kind:"scenario",
  q:"A tool returns results that are correct but ordered unpredictably, and downstream steps depend on the order. Where should this be fixed?",
  a:1,
  opts:["In the prompt, which should ask the model for a sorted, stable result","In the tool, which should return a defined, stable order","In a second tool, which sorts the output of the first, after it returns","In the downstream step, which should accept any order, stable or not"],
  why:"A contract the downstream depends on belongs in the tool, where it holds every time. Asking the model to sort makes correctness depend on it remembering, and an extra tool adds a call and a selection decision for something the first tool should have guaranteed."},

/* ---- d3: Claude Code Configuration & Workflows ---- */

{ id:"ar-d3-29", exam:"CCAR-F", d:"d3", also:{"CCDV-F":"v7"}, kind:"scenario",
  q:"A project rule and a user-level rule conflict. Which applies, and why does it matter?",
  a:2,
  opts:["The user rule, because configuration closest to the individual is the most specific","The more recent rule, because later configuration supersedes what came before it","The project rule, because a fixed precedence chain decides it and project outranks user","Neither consistently, because the model weighs both and picks whichever fits the moment"],
  why:"Settings resolve by a fixed chain — managed, CLI args, local, project, user — so the project rule wins and the outcome is the same on every machine. The user layer sits at the bottom of that chain rather than the top, which is the intuition the first option appeals to. Recency plays no part, and nothing is left to the model to weigh at the time."},

{ id:"ar-d3-30", scn:["devprod"], exam:"CCAR-F", d:"d3", also:{"CCDV-F":"v7"}, kind:"recall",
  q:"What does a deny permission rule guarantee that an instruction does not?",
  a:0,
  opts:["It holds regardless of what the model decides, and wins over an allow at a lower scope","It produces a much clearer error message, so the reason for the refusal is obvious","It applies only within interactive sessions, where a human can actually see the refusal","It can be overridden on a per-run basis with a flag when the action is genuinely needed"],
  why:"Deny is enforcement rather than guidance: it survives the model being persuaded otherwise, and conflicts resolve in its favor. An instruction is advisory however firmly it is worded."},

{ id:"ar-d3-31", scn:["devprod","ci"], exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"A hook must run before every commit and block it when checks fail, including in headless CI runs. What matters most?",
  a:1,
  opts:["That it prints a message naming the failed check, so a reader sees 1 clear cause for it","That it is a PreToolUse hook exiting 2, configured at a scope the CI run actually loads","That it runs in under 1 second, so that every commit the team makes still stays fast","That it is documented in project memory, so all 12 of the team know that it exists"],
  why:"Blocking requires the pre-execution event and exit code 2, and the configuration has to be in a layer the headless run reads — a hook defined only in a local file the CI checkout lacks does nothing. Messaging, speed and documentation do not make it enforce."},

{ id:"ar-d3-32", exam:"CCAR-F", d:"d3", also:{"CCDV-F":"v7"}, kind:"scenario",
  q:"Onboarding a new engineer, you want the agent to know the project's conventions on day one. Where does that belong?",
  a:2,
  opts:["In the team wiki, where any of the engineers can look them up","In each individual engineer's own personal configuration file","In committed project memory, so it arrives with the checkout","In the system prompt that is sent along with every request"],
  why:"Committed configuration travels with the repository, so a fresh clone has it immediately and improvements reach everyone. A wiki is not loaded by the agent, personal configuration has to be set up per person, and hand-built system prompts are not how project context is supplied."},

{ id:"ar-d3-33", scn:["devprod"], exam:"CCAR-F", d:"d3", kind:"recall",
  q:"Which statements about plan mode are correct?",
  multi:true, a:[0,2],
  opts:["It produces a proposed approach for review before changes are made","It runs tools in a sandbox and discards the results","It suits large or ambiguous changes where the approach itself is the risk","It is required before any file edit"],
  why:"Plan mode separates deciding what to do from doing it, which is valuable precisely when the approach is the uncertain part. It is not a sandbox and it is not mandatory — a small, well-understood edit does not need it."},

{ id:"ar-d3-34", scn:["ci"], exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"A headless run must fail the build when the agent cannot complete the task. What does the integration need?",
  a:3,
  opts:["A longer timeout, so the agent has room to finish before CI gives up on it","Verbose logging enabled, so the failure is visible in the build output","A retry wrapper, so a transient failure does not fail the build by itself","Machine-parseable output plus an exit status the build step actually checks"],
  why:"CI reacts to exit status and structured output, so the run has to emit both and the pipeline has to inspect them. Timeouts, logging and retries do not by themselves turn a failed run into a failed build."},

/* ---- d4: Prompt Engineering & Structured Output ---- */

{ id:"ar-d4-22", scn:["extract"], exam:"CCAR-F", d:"d4", also:{"CCDV-F":"v4"}, kind:"scenario",
  q:"A schema-validated output passes validation but is semantically wrong — a negative amount where only positives make sense. What does this show?",
  a:1,
  opts:["The schema is malformed, since a valid one, correctly written, would have rejected it","Schema validates structure, not meaning, so semantic rules need their own check","The model tier is too low, so the constraint, though expressed, was never applied","The prompt needs more examples, showing clearly, concretely what a valid value is"],
  why:"A type of 'number' is satisfied by any number. Constraints that depend on meaning have to be enforced separately, in the schema's own validation rules where expressible or in code after parsing."},

{ id:"ar-d4-23", scn:["extract"], exam:"CCAR-F", d:"d4", also:{"CCDV-F":"v4"}, kind:"recall",
  q:"Why is a tool call more reliable than text parsing for structured output?",
  a:2,
  opts:["Tool calls are billed at a lower rate than an equivalent text response","A tool call is produced without the reasoning step, so there is less to go wrong","The arguments arrive already structured and schema-checked, not extracted from prose","A tool call either succeeds or is rejected outright, so a malformed one never reaches your code"],
  why:"Text responses can wrap valid JSON in commentary, fences or apology, each of which breaks a parser. Tool arguments arrive as structured data validated against the declared schema. They can still be semantically wrong, and they are not cheaper."},

{ id:"ar-d4-24", exam:"CCAR-F", d:"d4", also:{"CCDV-F":"v4"}, kind:"scenario",
  q:"Validation fails on a structured response. How many times should you re-prompt before giving up?",
  a:1,
  opts:["Retry until it succeeds — however long that takes — since the schema has to be met","A small bounded number — around three — then fail loudly rather than return data you know is wrong","Once, then fall back to plain text — unstructured — and salvage what can be read","Without any limit at all, but log each — every one — so the rate stays visible"],
  why:"A few attempts clear transient formatting slips; beyond that the prompt or schema is the problem and more calls just spend budget. Failing loudly surfaces it, whereas unlimited retries hide a systematic fault behind cost."},

{ id:"ar-d4-25", exam:"CCAR-F", d:"d4", kind:"recall",
  q:"What does prompt caching require to actually take effect?",
  multi:true, a:[0,2],
  opts:["The cached content must sit at the front of the request as a stable prefix","The output must be structured","The prefix must exceed the minimum cacheable length and be reused before it expires","Temperature must be zero"],
  why:"Caching matches a prefix, so the stable material has to come first, be long enough to qualify and be reused within its lifetime. Output shape and sampling settings are unrelated — a cache that never hits usually fails one of the two real conditions."},

{ id:"ar-d4-26", exam:"CCAR-F", d:"d4", also:{"CCDV-F":"v4"}, kind:"scenario",
  q:"The same prompt gives noticeably different quality depending on where the key instruction sits. What is the practical guidance?",
  a:0,
  opts:["Put the critical instruction where it will not be buried, near the start and restated at the end","Always place the instruction after the input, so the model reads the material before the task itself","Position has no measurable effect on quality; only the wording of the instruction changes the outcome","Repeat the instruction between every section so that it is never far from whatever is being read"],
  why:"Material in the middle of a long prompt competes with everything around it, so the instruction belongs at a position of prominence and is worth restating after a long document. Scattering it throughout adds length without adding clarity."},

{ id:"ar-d4-27", scn:["extract"], exam:"CCAR-F", d:"d4", kind:"scenario",
  q:"You want the model to show its reasoning for an audit trail, but the consumer needs clean structured output. How do you reconcile these?",
  a:2,
  opts:["Ask for both of them in one response and strip the reasoning out before passing it downstream","Drop the reasoning requirement entirely, since the structured result is what the consumer needs","Separate them, with reasoning in its own field or a prior step and the result delivered alone","Use a more capable model, which reaches the right answer without needing to show any work"],
  why:"Mixing prose reasoning into the parsed payload is what breaks consumers. Giving reasoning its own field or its own step keeps both available without either corrupting the other."},

/* ---- d5: Context Management & Reliability ---- */

{ id:"ar-d5-20", exam:"CCAR-F", d:"d5", also:{"CCDV-F":"v1"}, kind:"scenario",
  q:"A retried operation ran twice and charged a customer twice. Which part of the design failed?",
  a:2,
  opts:["The retry limit was too high, so the operation was attempted more than once","The timeout was too short, so a slow but successful call looked like a failure","Side-effecting operations were retried without a record of which had already fired","The model emitted the tool call twice, so the operation ran on both occasions"],
  why:"A timeout tells you the response was lost, not whether the write landed, so a retry is only safe when the system can recognize the operation as already done. Tuning the timeout or the retry count narrows the window without closing it, and this happens even when the model behaves correctly."},

{ id:"ar-d5-21", exam:"CCAR-F", d:"d5", also:{"CCDV-F":"v1"}, kind:"recall",
  q:"What distinguishes compaction from simply truncating a conversation?",
  a:1,
  opts:["Compaction is faster, because it simply discards the tokens without reading what any of them contain","Compaction preserves the decisions and constraints that still matter while discarding the transcript","Truncation keeps more usable tokens, because it never rewrites any of the original content at all","They are the same operation, and compaction is merely the name used when the model performs it"],
  why:"Truncation drops whatever falls outside a window regardless of importance, which is how a system loses a constraint agreed early on. Compaction is a deliberate summarization that keeps what still governs the work."},

{ id:"ar-d5-22", exam:"CCAR-F", d:"d5", kind:"scenario",
  q:"An agent is about to exceed the context window mid-task. Which approach preserves the most useful work?",
  a:0,
  opts:["Summarize progress into a compact state record and continue from that","Drop the oldest of the messages until whatever remains fits again","Restart the whole of the task again from the very beginning","Switch to a model with a larger window and then resend it all"],
  why:"A deliberate state record keeps the conclusions and drops the transcript, which is the highest-value trade. Dropping oldest-first discards the framing that is often most important, restarting wastes everything, and a bigger window defers the same problem at higher cost."},

{ id:"ar-d5-23", exam:"CCAR-F", d:"d5", kind:"recall",
  q:"Which symptoms suggest context saturation rather than a prompt defect?",
  multi:true, a:[0,1,3],
  opts:["Answers become vaguer as the session lengthens","Detail supplied early is ignored later","The same error appears on the very first request","The model starts generalizing instead of citing what it read"],
  why:"Degradation that correlates with session length, and the loss of specifics that were supplied earlier, point at saturation. A failure present on the first request cannot be saturation — nothing has accumulated yet."},

{ id:"ar-d5-24", exam:"CCAR-F", d:"d5", kind:"scenario",
  q:"Intermittent failures occur in production but cannot be reproduced locally. What makes them diagnosable?",
  a:2,
  opts:["Raising the log level everywhere, capturing full detail, on the next occurrence","Automatic retries on failure, revealing whether the problem is transient, or persistent","Traces from the failing runs themselves, with messages, tool calls, results and stop reasons","Replaying the prompts locally, in a loop, until the failure reproduces on your machine"],
  why:"Intermittent failures depend on the exact inputs and timing of the failing run, so you need that run's own record. Blanket logging produces volume without the sequence, retries mask the signal, and local loops reproduce conditions that are not the failing ones."},

{ id:"ar-d5-25", exam:"CCAR-F", d:"d5", also:{"CCDV-F":"v1"}, kind:"scenario",
  q:"A request fails with a rate limit error. What is the correct client behavior?",
  a:1,
  opts:["Retry immediately, on the basis that the limit may have cleared by the time it lands","Back off with increasing delay and jitter, respecting any retry hint the response provides","Fail the whole operation, on the basis that the quota will not clear within the request","Switch to a different model tier, which draws on an entirely separate rate limit pool"],
  why:"Immediate retries add to the overload that caused the rejection, and synchronized retries from many clients make it worse — which is why jitter matters. A rate limit is transient, so failing outright gives up on recoverable work."}

);
