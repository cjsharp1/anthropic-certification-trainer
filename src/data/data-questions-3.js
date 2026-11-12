/* Question bank, part 3 — see data-questions.js for schema and sourcing notes.
 * Depth on the heaviest-weighted domains: CCAR-F D1/D3/D4, CCDV-F v1/v2.
 */
QUESTIONS.push(

/* ================= CCAR-F · D1 — Agentic Architecture (27%) ================= */
{ id:"ar-d1-19", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"An agent completes a task but the final message contains no summary of what it did — the user only sees the last tool result. What is the design error?",
  a:1,
  opts:["The context window is too small, since both the tool output and a closing summary have to fit","The loop terminates on the tool result rather than letting the model produce a closing turn","Temperature is set too low, so nothing at all is produced beyond the mechanical tool call","The tools return too much data, so the summary gets crowded out of the final message"],
  why:"The loop is exiting one turn early. After the last tool_result is returned, the model needs another pass to synthesize what happened into an answer. A loop that breaks as soon as no further tool call appears — or that stops on the tool result itself — skips that synthesis. Terminate on the model's text response, not on the absence of a tool call."},

{ id:"ar-d1-20", exam:"CCAR-F", d:"d1", kind:"recall",
  q:"What is the defining characteristic of the prompt chaining pattern?",
  a:1,
  opts:["Several models run concurrently over the same input and then their outputs are combined","A fixed sequence where each step's output feeds the next, allowing validation between steps","A coordinator decides at runtime which subtasks are needed and then assigns them out","Output is critiqued and then regenerated repeatedly until it passes a defined bar"],
  why:"A predetermined sequence of dependent steps. Its practical advantage is the gate between steps: you can validate intermediate output and fail fast rather than discovering a problem at the end. The other options describe parallelization, orchestrator–worker, and evaluator–optimizer respectively."},

{ id:"ar-d1-21", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"A routing agent classifies incoming requests and dispatches each to a specialized handler. Which pattern is this, and what is the main failure mode?",
  a:1,
  opts:["Parallelization; the main risk is that the specialized handlers produce conflicting results","Routing; a misclassification sends the request down an entirely wrong path","Evaluator–optimizer; the main risk is that the loop never converges on an answer","Prompt chaining; the main risk is that a step is skipped and its output never produced"],
  why:"Routing, and its characteristic weakness is that the classification step is a single point of failure — everything downstream is correct work on the wrong branch. Mitigate with a fallback or general-purpose branch for low-confidence classifications, rather than forcing every request into a specialized handler."},

{ id:"ar-d1-22", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"Your evaluator–optimizer loop has run twelve iterations without the critique passing. What should the design include?",
  a:1,
  opts:["A more capable model for the critic, so its judgment converges more quickly","A maximum iteration cap with a defined outcome when it is reached","A stricter critique prompt, so the evaluator stops rejecting acceptable drafts","More few-shot examples, so the optimizer learns what an acceptable draft looks like"],
  why:"Any loop whose exit depends on a model judgment needs a bound, because the critic may be unsatisfiable — demanding something the generator cannot produce, or applying inconsistent standards run to run. Cap the iterations and define what happens at the cap: return the best attempt, escalate, or fail explicitly. Without that, the loop can run until something else stops it."},

{ id:"ar-d1-23", scn:["research"], exam:"CCAR-F", d:"d1", kind:"recall",
  q:"Which conditions suggest decomposing work into subagents rather than one agent?",
  multi:true, a:[0,1,3],
  opts:["Subtasks are independent and can run concurrently","One subtask produces large volumes of intermediate output","The task has exactly two steps","Subtasks need different tool access or permissions"],
  why:"Independence enables concurrency, context isolation contains verbose intermediate work, and differing tool or permission needs are cleanly expressed as separate agents with separate grants. A two-step task doesn't justify the coordination overhead — subagents add latency, token cost, and failure modes that only pay off at real complexity."},

{ id:"ar-d1-24", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"An agent repeatedly calls the same tool with identical arguments, getting the same result each time. What does this indicate and what addresses it?",
  a:1,
  opts:["Normal retry behavior, which resolves itself once the underlying call has finally succeeded","The model is not registering the result as progress, so detect repeats in the loop and intervene","The tool is broken and is silently returning stale data, so it needs replacing or repairing","Temperature is too low, so the model keeps on making the identical choice on each iteration"],
  why:"Identical repeated calls mean the result isn't advancing the model's state — often because it's unhelpfully shaped, empty in an ambiguous way, or doesn't actually answer what was asked. Detect the repeat in the loop and break out or inject guidance, then fix the underlying cause by improving what the tool returns. Left alone, it burns the full iteration budget."},

{ id:"ar-d1-25", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"You need deterministic audit records of every action an agent takes. Where does that responsibility sit?",
  a:1,
  opts:["In the prompt, by asking the model to log each of the actions as it takes them","In the execution layer, which records every tool call and result independently of the model","In the model's reasoning output, which explains what it chose to do and for what reason","In the final summary message, which recounts all of the actions taken during the run"],
  why:"An audit trail must be trustworthy, which rules out anything the model produces — a model asked to log its own actions may omit, misdescribe, or hallucinate entries, and that is precisely the failure an audit exists to catch. Record in the execution layer where every call passes through code you control."},

/* ================= CCAR-F · D3 — Claude Code Config (20%) ================= */
{ id:"ar-d3-17", scn:["devprod"], exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"A hook is intended to block a dangerous command but the command runs anyway. The hook script exits 1 on detection. What is wrong?",
  a:1,
  opts:["The hook is on the wrong tool — the matcher never fires on 1","Exit 1 is non-blocking — exit 2 is the blocking code","Hooks cannot block commands at all — they only observe 1 of them","The matcher pattern is too broad — it matches more than 1 thing"],
  why:"The logic is right and the exit code is wrong. Only exit 2 blocks and feeds stderr back; every other non-zero code is reported as a non-blocking error while the action proceeds. This is an easy bug to ship because the hook <em>appears</em> to work — it detects correctly and logs correctly, it just never stops anything."},

{ id:"ar-d3-18", exam:"CCAR-F", d:"d3", kind:"recall",
  q:"What is the difference between configuration that shapes behavior and configuration that enforces it?",
  a:1,
  opts:["Both of them are equally reliable (instructions, hooks); only the file's location differs","Shaping (instructions, rules) is probabilistic; enforcing (hooks, permissions) is deterministic","Enforcement (hooks, permissions) runs afterwards; shaping (instructions, rules) runs first","Shaping (instructions) covers the simple rules; enforcing (hooks) covers the complex ones"],
  why:"This is the organizing distinction for the whole configuration domain. Instructions influence a probabilistic system and will sometimes be missed; hooks and permission rules execute in code outside the model's discretion. Any question containing 'guarantee', 'must never', or 'even if' is pointing at the enforcement layer."},

{ id:"ar-d3-19", exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"Two teams in a monorepo need different conventions for their own directories. Cleanest approach?",
  a:1,
  opts:["One root configuration file holding both sets of conventions behind conditions","Directory-level configuration in each team's subtree, loaded when work touches it","A hook that checks the file path on every edit and applies the right rules","Separate repositories, one per team, each with its own configuration"],
  why:"Nested directory configuration scopes naturally: each team's conventions load when work touches their subtree, and neither team's context carries the other's rules. A root file with conditional language makes every session read both sets and asks the model to apply the right one. A hook enforces where guidance suffices, and splitting the repo is a large change to solve a configuration question."},

{ id:"ar-d3-20", scn:["research"], exam:"CCAR-F", d:"d3", kind:"recall",
  q:"Why does a subagent definition specify its own tool access?",
  a:1,
  opts:["To improve speed — a shorter tool list is matched against more quickly","To apply least privilege — a subagent gets only the tools its job requires","Because tools cannot be inherited — each subagent must declare its own","To reduce token cost — fewer definitions ride along with each request"],
  why:"Scoping tools per subagent is least privilege applied to delegation: a read-only research agent has no business holding write or execute access. It limits the blast radius if that agent is confused or injection-compromised, and it sharpens routing by removing irrelevant options from its decision."},

{ id:"ar-d3-21", exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"A workflow should run only when you explicitly invoke it, never when the model decides it is relevant. What do you configure?",
  a:1,
  opts:["A permission rule that requires approval first","The frontmatter flag that disables model invocation","A PreToolUse hook that blocks automatic runs","A deny rule placed on the underlying tools"],
  why:"The skill-definition frontmatter has a flag for exactly this, leaving the workflow available to you while removing it from the model's options. Permission prompts and blocking hooks achieve a similar end messily — they let the model attempt it and then interrupt you — and denying the underlying tools would break your own invocation too."},

{ id:"ar-d3-22", exam:"CCAR-F", d:"d3", kind:"recall",
  q:"What does a session-scoped memory or context file give you that a prompt does not?",
  a:1,
  opts:["Faster responses, because the context does not have to be re-parsed each turn","Persistence across sessions without re-stating it each time","Guaranteed compliance, since memory is read before anything in the prompt","Lower token cost, because memory files are not counted as input tokens"],
  why:"Persistence and consistency: it loads automatically each session, so the same context applies without anyone remembering to paste it, and a team shares one authoritative copy. It does not change the probabilistic nature of the instruction — loaded context is still guidance, which is why guarantees belong in hooks and permissions."},

/* ================= CCAR-F · D4 — Prompt & Structured Output (20%) ================= */
{ id:"ar-d4-17", scn:["extract"], exam:["CCAR-F","CCDV-F"], d:"d4", also:{"CCDV-F":"v4"}, kind:"scenario",
  q:"You need the model to extract fields that are sometimes genuinely absent from the source. How should the schema handle this?",
  a:1,
  opts:["Mark every field required, so the model cannot quietly leave one out","Allow nulls or omission for genuinely optional fields, so absence is representable","Use a sentinel default such as 'unknown' for every field that may be missing","Require the model to supply its best guess rather than leaving a field empty"],
  why:"If absence isn't representable in the schema, a required field forces the model to invent something — the schema itself manufactures hallucination. Model optionality honestly, so 'not present in the source' is a valid, distinguishable answer. Sentinel strings like 'unknown' work but are weaker than a real null, since they're easy to mistake for extracted content downstream."},

{ id:"ar-d4-18", exam:["CCAR-F","CCDV-F"], d:"d4", also:{"CCDV-F":"v4"}, kind:"scenario",
  q:"A classification prompt returns labels outside your defined set occasionally. Strongest fix?",
  a:1,
  opts:["List all of the valid labels again at the end of the prompt","Constrain the output with a schema enumerating the allowed values","Lower the temperature setting on the request down to zero","Add several more worked examples of each of the labels"],
  why:"An enum in the schema makes an out-of-set label structurally impossible rather than merely discouraged. Repetition, lower temperature, and more examples all reduce the frequency of the problem without eliminating it — and 'occasionally wrong' is exactly the failure mode that survives probabilistic mitigation and surfaces in production."},

{ id:"ar-d4-19", exam:"CCAR-F", d:"d4", kind:"recall",
  q:"What is the role of a system prompt versus the messages array?",
  a:1,
  opts:["They are interchangeable; the system prompt is just the first message by convention","System carries stable instructions, persona and constraints; messages carry the conversation","The system prompt is where examples belong, while instructions go in the messages array","Instructions in the messages array take precedence, since they arrive later in the request"],
  why:"System holds what's true for every request — role, rules, format, stable examples — and messages hold the exchange itself. Keeping the boundary clean makes the system prompt cacheable, keeps instructions separate from untrusted user data, and makes the whole thing easier to reason about when behavior goes wrong."},

{ id:"ar-d4-20", exam:["CCAR-F","CCDV-F"], d:"d4", also:{"CCDV-F":"v4"}, kind:"scenario",
  q:"Cost is dominated by a large system prompt sent on every request, and caching is already enabled but hit rates are low. What should you investigate first?",
  a:1,
  opts:["Whether the model being used supports prompt caching at the tier it was actually requested on","Whether the prefix is long enough to meet the minimum and stable enough to match between calls","Whether the output ceiling has been set high enough for the cached prompt to be of any use","Whether streaming is interfering with the cache write that happens on the very first request"],
  why:"Two conditions must both hold: the cacheable prefix has to exceed a minimum length — below it caching is skipped silently, with no error to alert you — and it must be byte-identical between calls. Check the length first, then diff two real payloads for the varying byte. Streaming and output limits have no bearing on cache behavior."},

{ id:"ar-d4-21", exam:"CCAR-F", d:"d4", kind:"scenario",
  q:"A prompt produces good results but a colleague's near-identical version does not. What is the most useful next step?",
  a:1,
  opts:["Assume the difference is run-to-run randomness and keep the version you have","Diff the two prompts and test the differing elements against a fixed set of inputs","Move both to a more capable model, where small wording differences matter less","Average the two prompts into a single version combining both sets of wording"],
  why:"Treat it as an experiment rather than a mystery: isolate what actually differs and test each change against the same inputs. 'Prompting is unpredictable' is the belief that prevents learning what in your prompt is doing the work. Averaging two prompts is not a meaningful operation."},

/* ================= CCDV-F · v1 — Applications & Integration (33.1%) ================= */
{ id:"dv-v1-16", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"Your application must support conversation history longer than the context window. What is the integration-level responsibility?",
  a:1,
  opts:["The API truncates the history itself, automatically, once it grows too long","Your code decides what to keep, summarize, or drop before sending","The model ignores whatever overflows, silently, and works from the rest","Raise the output ceiling, creating room, so the conversation keeps fitting"],
  why:"The API does not silently trim for you — an over-budget request is rejected. Deciding what survives is your application's job: a sliding window, a rolling summary, retrieval over past turns, or some combination. Build it in before it's needed, because the failure arrives abruptly as a hard error on a long conversation."},

{ id:"dv-v1-17", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"Which practices make an integration testable without calling the live API?",
  multi:true, a:[0,1,3],
  opts:["Abstracting the client behind an interface you can substitute","Recording real responses as fixtures for replay","Testing only in production","Separating prompt construction from the network call so it can be asserted on"],
  why:"An interface boundary lets you inject a fake, recorded fixtures give deterministic tests over realistic payloads, and separating prompt building from the call makes the construction logic unit-testable on its own. Testing only in production isn't a strategy — it's the absence of one, and it makes every deploy a live experiment."},

{ id:"dv-v1-18", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"Your service calls Claude on behalf of many users and one user's heavy usage degrades everyone else. What is missing?",
  a:1,
  opts:["A faster model tier, so each user's requests complete more quickly","Per-user rate limiting and quota enforcement in your own service","A larger context window, so heavy users need fewer total requests","Streaming responses, so the connection is released sooner per call"],
  why:"Your upstream quota is a shared resource, so without per-user limits one heavy consumer can exhaust it for everyone. Enforce fairness in your own service — per-user rate limits, quotas, or queue prioritization. No model or transport choice addresses an allocation problem."},

{ id:"dv-v1-19", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"You need to show partial results to the user but also store the complete response. With streaming, how do you handle this?",
  a:1,
  opts:["Make two entirely separate requests, one streamed for display and one for the record","Accumulate the streamed deltas and assemble the final message as the stream completes","Streaming cannot produce a complete response at all, so one of the two must be chosen","Store each of the deltas as its own record and reassemble the message when it is read"],
  why:"Streaming delivers incrementally and gives you the complete message at the end — accumulate the deltas as you render them, then persist the assembled result (SDK helpers do this for you). Duplicate requests double cost and can return different content. Storing raw deltas leaves reassembly as a problem for every future reader."},

{ id:"dv-v1-20", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"What does a well-designed API error response from your own service expose about an upstream model failure?",
  a:1,
  opts:["The raw upstream error and stack trace","A stable error code and actionable message","Nothing — fail silently","The full request payload"],
  why:"Clients need a stable, actionable contract; they can't do anything with an upstream provider's internal error shape, and forwarding raw errors leaks implementation detail and sometimes sensitive content. Log the full detail with a correlation ID server-side and return a clean code. Silent failure is worse than either — the caller can't distinguish it from success."},

{ id:"dv-v1-21", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"A long-running agentic request keeps hitting your load balancer's connection timeout. Which approach resolves this properly?",
  a:1,
  opts:["Raise the timeout indefinitely","Stream, or move to an async job","Reduce the agent's capabilities","Retry on timeout"],
  why:"Streaming keeps bytes moving so idle-timeout logic doesn't trigger, and for genuinely long work an async job with polling removes the long-lived connection entirely. Raising timeouts ties up connections and defers the limit; retrying restarts expensive work that was probably progressing fine."},

/* ================= CCDV-F · v2 — Model Selection & Optimization (16.8%) ================= */
{ id:"dv-v2-11", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"A pipeline has an easy triage step and a hard analysis step. How should model selection work?",
  a:1,
  opts:["Use the most capable model throughout, for consistency","Route each step to the cheapest model that meets its accuracy bar","Use the cheapest available model throughout the pipeline","Alternate between models to balance the cost against quality"],
  why:"Match the tier to the task. A small fast model handles triage at a fraction of the cost, and the capable model earns its price on the step that needs it. This per-step routing is one of the largest cost levers in a multi-step pipeline — uniform selection either overpays on easy steps or underperforms on hard ones."},

{ id:"dv-v2-12", exam:"CCDV-F", d:"v2", kind:"recall",
  q:"Which measurements should drive a model-selection decision?",
  multi:true, a:[0,1,3],
  opts:["Accuracy on a representative evaluation set","Latency at the percentiles your product cares about","Benchmark scores published by the vendor","Cost per completed task, not per token"],
  why:"Decide on your own task, your own latency requirements, and the cost of completing real work — a cheaper per-token model that needs retries or longer prompts can cost more per finished task. Published benchmarks indicate general capability but say nothing about your specific workload, which is the only thing you're actually buying."},

{ id:"dv-v2-13", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"Token usage is higher than expected and you suspect the prompt. Where do you look first?",
  a:1,
  opts:["The model's internal processing, hidden from you, and not reported","Usage per request, split into input, output and cached portions","The number of API calls, multiplied by whatever each one costs you","Network overhead, driven by the size of the requests being sent"],
  why:"Measure before guessing. The usage data on each response separates input from output and shows cached versus uncached input, which immediately tells you whether the problem is an oversized prompt, verbose output, or caching that isn't hitting. Call counts alone conflate all three."},

{ id:"dv-v2-14", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"Tool definitions in your agent total several thousand tokens on every request. What is the tradeoff to manage?",
  a:1,
  opts:["Tool definitions are not billed, so their size only affects request latency","They cost context and input on every call, so unused tools should be trimmed","Tools are only billed when the model actually calls one, not when defined","Definitions are cached automatically after the first call, so the cost is one-off"],
  why:"Every declared tool is sent and billed on every request whether or not it's called, and it competes for context. Trim tools that aren't needed for a given task, load them on demand where supported, and consolidate near-duplicates. Caching can help, but only if the tool block is stable and sits in the cached prefix."},

/* ================= CCDV-F · v3 — Agents and Workflows (14.7%) ================= */
{ id:"dv-v3-09", exam:"CCDV-F", d:"v3", kind:"scenario",
  q:"An agent needs to work across several steps where a later step may invalidate an earlier one. What does the design need?",
  a:1,
  opts:["More tools, because the agent can then correct an invalidated step without redoing the sequence","Explicit state the agent can read and revise, rather than relying on conversation history alone","A larger context window, because every earlier step then stays visible when a later one changes","A lower temperature, because the agent then revises earlier steps less often than it now does"],
  why:"Conversation history is append-only: a superseded fact stays visible alongside its correction, and the model may act on either. Externalize working state so there is one current answer to 'what do we believe now,' with the agent updating it as things change. This is what makes long multi-step runs stable."},

{ id:"dv-v3-10", exam:"CCDV-F", d:"v3", kind:"recall",
  q:"What belongs in the loop's code rather than the model's judgment?",
  multi:true, a:[0,1,3],
  opts:["Iteration and budget limits","Retry policy for transient tool failures","Which tool best answers the current question","Termination conditions"],
  why:"Control flow — limits, retries, when to stop — belongs in code where it's deterministic and testable. Tool <em>selection</em> is the judgment you're actually employing a model for. Mixing these up in either direction causes trouble: control flow in prompts is unreliable, and hard-coded tool selection throws away the model's main contribution."},

/* ================= CCDV-F · v6 — Security and Safety (8.1%) ================= */
{ id:"dv-v6-07", exam:"CCDV-F", d:"v6", kind:"scenario",
  q:"A multi-tenant application uses one agent to serve all customers. What is the critical control?",
  a:1,
  opts:["Instructing the agent to keep each tenant's data strictly separate","Enforcing tenant scoping in the data layer so queries cannot cross","Using a separate conversation per tenant so context never mixes","Clearing the context between requests from different tenants"],
  why:"Tenant isolation must hold even if the agent is confused or injection-compromised, so it belongs in the data layer: scoped credentials or queries that make cross-tenant access impossible. Separate conversations and cleared context help with context bleed but do nothing if the agent can still query another tenant's rows — and an instruction is the weakest form of a boundary that must never be crossed."},

{ id:"dv-v6-08", exam:"CCDV-F", d:"v6", kind:"recall",
  q:"Which inputs should be treated as untrusted in an agentic system?",
  multi:true, a:[0,1,2,3],
  opts:["End-user messages","Web pages the agent fetches","Documents uploaded by users","Tool results from third-party services","Your own system prompt"],
  why:"All of them. Anything originating outside your trust boundary can carry text designed to steer the agent, and the indirect channels — a fetched page, an uploaded document, a third-party API response — are the dangerous ones precisely because nobody is watching them the way they watch the chat box. Your system prompt is the trusted instruction layer — it is the thing everything else is untrusted relative to."},

/* ================= CCAR-P — Architect Professional ================= */
{ id:"pr-p1-02", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"An enterprise requires that no customer data leaves their network boundary. How does this constrain the architecture?",
  a:1,
  opts:["It rules out using the service, since any call leaves the network","It drives deployment choice, data handling and redaction before any call","Encryption in transit satisfies the requirement without any design changes","It applies only to data used for training, not to inference requests"],
  why:"It's a deployment and data-flow constraint rather than a blocker. Options include a cloud deployment within an approved boundary, contractual and residency guarantees, or redacting and tokenizing sensitive fields before any call. Encryption in transit doesn't address it — the data still leaves the boundary, which is the thing being prohibited."},

{ id:"pr-p3-03", exam:"CCAR-P", d:"p3", kind:"scenario",
  q:"Stakeholders want to know if the system is 'good enough to ship.' What makes that question answerable?",
  a:1,
  opts:["A high score on a recognized public benchmark covering this kind of task","Acceptance criteria tied to business outcomes, on representative data","The confidence of the team that built and tested the system","A demonstration that runs successfully in front of stakeholders"],
  why:"'Good enough' is only meaningful against a pre-agreed bar, defined in terms of outcomes the business cares about and measured on data resembling production. Settling that before building prevents the far worse conversation where everyone discovers they held different thresholds after the work is done. Demos and confidence are not measurements."},

{ id:"pr-p6-02", exam:"CCAR-P", d:"p6", kind:"scenario",
  q:"A system must produce reproducible output for audit purposes. What is realistic to promise?",
  a:1,
  opts:["Identical output for identical input, every run, without exception","Logged inputs, versions and outputs, so a past decision can be reconstructed","Deterministic behavior, guaranteed, by setting the temperature to zero","Nothing: reproducibility is impossible, so a model cannot be audited"],
  why:"Promise reconstructability, not bit-identical regeneration. Even at temperature zero, model versions change and exact reproduction isn't guaranteed over time. What auditors actually need is the record: what went in, which version ran, what came out, and who approved it. Over-promising determinism creates a commitment you cannot keep."},

/* ================= CCAO-F — Associate Foundations ================= */
{ id:"as-a1-03", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"Two runs of the same prompt give different answers. What does this tell you?",
  a:1,
  opts:["One of the two runs is broken; that one should be discarded as unreliable","Output varies by nature; if the difference matters, tighten the prompt or validation","The model is simply unreliable; consistency cannot be expected from it at all","You must always run it twice; compare the pair before trusting either of them"],
  why:"Variation is expected — these are probabilistic systems. The useful question is whether the difference is material: variation in wording is fine, variation in a figure or conclusion is a signal that your prompt underspecifies the task or that the output needs validation. Running twice and comparing is a reasonable diagnostic, not a workflow."},

{ id:"as-a5-02", exam:"CCAO-F", d:"a5", kind:"recall",
  q:"What should guide choosing between a faster, cheaper model and a more capable one?",
  a:1,
  opts:["Always use the most capable model available for every task","Task difficulty, verified against examples of your actual work","The newest release, since it supersedes the earlier models","Cost alone, choosing the cheapest tier that returns an answer"],
  why:"Test both on work that resembles yours. Many everyday tasks — summarizing, reformatting, straightforward classification — run well on a fast model, while genuinely hard reasoning benefits from a capable one. Defaulting to the most capable wastes time and money on easy work; defaulting to cheapest fails on hard work. The evidence is in your own examples."},

{ id:"as-a6-02", exam:"CCAO-F", d:"a6", kind:"scenario",
  q:"Your team wants consistent Claude behavior across everyone's work. What helps most?",
  a:1,
  opts:["Everyone learning to write prompts to the same standard of quality","Shared, version-controlled project configuration and prompt templates","A longer onboarding document covering how the team uses the tool","Everyone using the same model tier for the same kinds of work"],
  why:"Consistency comes from shared artifacts, not shared intentions. Version-controlled configuration and templates mean everyone starts from the same baseline and improvements propagate to the whole team. Individual skill varies, a document describes practice without enforcing it, and the same model with different prompts still produces different results."},

{ id:"as-a2-03", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"A workflow saves time but occasionally produces an error a reviewer must catch. How should you think about it?",
  a:1,
  opts:["Abandon the workflow, since an error reaching a reviewer is unacceptable","Weigh the time saved against review cost and the consequence of a missed error","Remove the review step, since it consumes most of the time being saved","Accept the occasional error as an unavoidable cost of automating the step"],
  why:"This is the real calculation for most practical automation: net value depends on time saved, review effort, and what it costs when a mistake slips through. For low-stakes work with quick review, a small error rate is easily worth it; for high-stakes output, the same rate may not be. Removing review to save time inverts the logic exactly when it matters most."}

);
