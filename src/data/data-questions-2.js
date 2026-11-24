/* Question bank, part 2 — see data-questions.js for schema and sourcing notes.
 * Continues the same QUESTIONS array via QUESTIONS.push(...).
 * Weighted toward CCAR-F and CCDV-F per study priority.
 */
QUESTIONS.push(

/* ========================================================================
   CCAR-F · D1 — Agentic Architecture & Orchestration (27%) — continued
   ======================================================================== */
{ id:"ar-d1-10", scn:["research"], exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"An orchestrator spawns workers, each returning a partial analysis, and then synthesizes a final answer. One worker returns a result that contradicts the others. What should the orchestrator do?",
  a:2,
  opts:["Discard the outlier automatically, since the majority view is more likely correct","Average the results so no single worker dominates the synthesized conclusion","Surface the disagreement in the synthesis rather than silently resolving it","Re-run all the workers until their results converge on a consistent answer"],
  why:"Silently dropping an outlier destroys the signal that something is wrong — the dissenting worker may be the only correct one. Averaging is meaningless for qualitative analysis. Re-running until agreement manufactures false consensus. The useful behavior is to carry the disagreement forward so a human or a later step can adjudicate with the evidence intact."},

{ id:"ar-d1-11", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"You need an agent to stop and ask the user before an irreversible action, but it sometimes proceeds anyway. What is the structural fix?",
  a:2,
  opts:["Strengthen the wording in the system prompt so that it asks first","Add few-shot examples that demonstrate asking before acting","Gate the action behind an approval mechanism outside the model","Lower the temperature so that it follows the rule more reliably"],
  why:"'Sometimes proceeds anyway' is the definition of a probabilistic control failing. Any fix that lives in the prompt has the same failure mode on the next run. Put the gate in the execution path — a permission prompt, an approval queue, or a hook that blocks the call — so the action is impossible without approval regardless of what the model decides."},

{ id:"ar-d1-12", scn:["research"], exam:"CCAR-F", d:"d1", kind:"recall",
  q:"What distinguishes orchestrator–worker from parallelization?",
  a:1,
  opts:["Orchestrator–worker runs its subtasks concurrently; parallelization runs the same subtasks one after another","A coordinator dynamically decomposes the task and assigns subtasks; parallelization runs known independent tasks concurrently","Parallelization requires subagents holding separate contexts; orchestrator–worker runs inside one conversation","They describe one underlying pattern; the name changes depending on whether subagents are involved in it"],
  why:"The difference is who decides the subtasks. In parallelization you already know the independent units of work and fan them out. In orchestrator–worker a coordinator examines the problem, decides how to break it up at runtime, delegates, and synthesizes. Dynamic decomposition is the distinguishing feature, not concurrency — both can run concurrently."},

{ id:"ar-d1-13", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"A long-running agent needs to resume work after a process restart. What must be externalized?",
  multi:true, a:[0,2,3],
  opts:["Conversation state needed to continue","The model's internal reasoning from prior turns","Progress markers for completed work","Results of side-effecting operations already performed"],
  why:"Durable state is whatever you cannot reconstruct: the conversation so far, what has already been completed, and which side effects already fired (so you don't repeat them). The model's internal reasoning from earlier turns is not recoverable or re-injectable as such — which is precisely why decisions that matter should be written into durable state rather than left implicit in reasoning."},

{ id:"ar-d1-14", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"Your agent calls a flaky third-party API that fails roughly 10% of the time. Where does retry logic belong?",
  a:1,
  opts:["In the prompt, instructing the model to retry failed calls","In the tool implementation, transparent to the model","In the orchestration loop, re-invoking the model","Nowhere — surface every failure to the user"],
  why:"A transient network failure is an implementation detail of the tool, not a decision the model should spend a turn on. Retrying inside the tool keeps the loop clean and deterministic. Asking the model to notice failures and retry wastes turns, is unreliable, and clutters the conversation with error-handling chatter that competes with the actual task."},

{ id:"ar-d1-15", scn:["research"], exam:"CCAR-F", d:"d1", kind:"recall",
  q:"Why is emitting several subagent-spawn calls in a single response different from emitting them across separate turns?",
  a:1,
  opts:["There is no difference; the runtime batches the spawns either way before executing","Calls in one response fan out concurrently; separate turns execute sequentially","Separate turns are faster because each spawn gets the full context window to itself","Only one spawn is permitted per response, so several must be split across turns"],
  why:"Multiple tool calls in one response can be executed in parallel, so the subagents run concurrently and total wall-clock time is roughly the slowest one. Issuing them across turns forces each to complete before the next begins. When tasks are independent, batching the spawns into one response is the difference between parallel and serial execution."},

{ id:"ar-d1-16", exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"An agent must summarize a 500-page document that exceeds the context window. Which approach fits?",
  a:1,
  opts:["Raise max_tokens, send the whole document, and let the ceiling absorb it","Chunk the document, summarize each chunk, then summarize the summaries","Raise the temperature, ask for concision, and fit the result in one pass","Split it across several user messages, all within one conversation"],
  why:"Hierarchical summarization — map then reduce — is the standard answer when input exceeds the window. Splitting across several messages in one conversation doesn't help, since they all accumulate in the same window. <code>max_tokens</code> limits output, not input, and temperature has nothing to do with capacity."},

{ id:"ar-d1-17", scn:["research"], exam:"CCAR-F", d:"d1", kind:"scenario",
  q:"Two subagents both write to the same output file and the results are being clobbered. Best fix?",
  a:2,
  opts:["Instruct each subagent in its prompt to check whether the file already has content","Run the subagents sequentially so the second writes only after the first has finished","Have each write to a distinct location and merge the results in the orchestrator","Add a retry on write failure so a clobbered write is detected and performed again"],
  why:"Give each worker its own output location and make merging an explicit orchestrator responsibility. Serializing the work fixes the symptom at the cost of the parallelism you wanted. A prompt instruction is probabilistic, and retries don't help when the problem is a last-writer-wins race rather than a failure."},

{ id:"ar-d1-18", exam:"CCAR-F", d:"d1", kind:"recall",
  q:"When is a single well-designed prompt preferable to an agentic loop?",
  a:1,
  opts:["Never, because an agentic loop is the better choice","When the task is well-defined and achievable in one pass","When the task requires a great many tool calls","When the output has to be structured to a schema"],
  why:"Agency buys flexibility for open-ended work and costs you predictability, latency, token spend, and debuggability. If one pass does the job, that's the right answer. The general guidance is to use the simplest construct that works and add agency only when a fixed path demonstrably cannot handle the task."},

/* ========================================================================
   CCAR-F · D2 — Tool Design & MCP Integration (18%) — continued
   ======================================================================== */
{ id:"ar-d2-11", exam:["CCAR-F","CCDV-F"], d:"d2", also:{"CCDV-F":"v5"}, kind:"scenario",
  q:"Two tools have overlapping purposes and Claude picks inconsistently between them. Beyond rewriting descriptions, what structural change helps most?",
  a:1,
  opts:["Rename one of the tools so it sorts alphabetically first","Merge them into one tool with a parameter distinguishing the modes","Remove one of them and let the model work around the absence","Add a third tool whose job is routing to the right one"],
  why:"If two tools are genuinely similar enough to confuse a reader, they'll confuse the model. Merging them into one tool with an explicit mode parameter removes the choice entirely and replaces it with a parameter value the schema can document. Adding a routing tool adds another decision rather than eliminating one, and ordering has no bearing on selection."},

{ id:"ar-d2-12", exam:["CCAR-F","CCDV-F"], d:"d2", also:{"CCDV-F":"v5"}, kind:"recall",
  q:"What belongs in a well-written tool description?",
  multi:true, a:[0,1,2,3],
  opts:["What the tool does","When to use it","When NOT to use it, especially versus similar tools","What it returns and its limits","The name of the engineer who maintains it"],
  why:"All four. The description is the model's only basis for routing, so it should read like guidance to a new colleague: purpose, applicability, explicit boundaries against neighbouring tools, and the shape and limits of what comes back. The when-NOT clause does disproportionate work when several tools are similar. Ownership metadata belongs in your own docs, not in the description: everything there is sent to the model on every request and competes with the routing signal."},

{ id:"ar-d2-13", exam:["CCAR-F","CCDV-F"], d:"d2", also:{"CCDV-F":"v5"}, kind:"scenario",
  q:"You expose the same tools to three different applications and keep having to update each one. What does MCP offer here?",
  a:1,
  opts:["A lower token cost on every call, since the tool definitions get sent to the server only once","The tools live in one server consumed by many clients, so updates propagate without changing each app","Automatic selection of the right tool, which the server performs before the model ever sees them","A guaranteed structured output shape, enforced centrally by the server rather than by each app"],
  why:"That duplication is the problem MCP is designed for: implement the tools once in a server, and every client connects to it. Update the server and all clients pick up the change on reconnect. It's an integration and distribution protocol — it doesn't change token economics, routing, or output guarantees."},

{ id:"ar-d2-14", exam:["CCAR-F","CCDV-F"], d:"d2", also:{"CCDV-F":"v5"}, kind:"recall",
  q:"In MCP, what distinguishes a Tool from a Resource?",
  a:1,
  opts:["Tools execute considerably faster; the model invokes them directly rather than through the client layer","Tools are model-invoked actions that may have side effects; Resources are client-controlled read-only data","Resources were the original primitive; they are now deprecated in favor of read-only declared Tools","Tools must return structured JSON; Resources are restricted to returning plain text content only"],
  why:"The split is control and side effects. The model decides to call a Tool, and a Tool may change something. Resources are read-only data the <em>client</em> chooses to supply, addressed by URI. That's why you can't make a destructive operation safe by calling it a Resource — the classification describes what an operation is, it doesn't constrain it."},

{ id:"ar-d2-15", scn:["extract"], exam:["CCAR-F","CCDV-F"], d:"d2", also:{"CCDV-F":"v5"}, kind:"scenario",
  q:"A tool returns 50,000 tokens of raw JSON on every call and the conversation is saturating. Best fix?",
  a:1,
  opts:["Move to a model with a far larger context window, so the payload no longer saturates it","Have the tool return a filtered, summarized result shaped to what the model actually needs","Call the tool a good deal less often and cache its result between the calls that remain","Raise the output ceiling, so the model is able to work through the whole of the payload"],
  why:"Tool output is part of your context budget, and dumping raw payloads into it is a design error — the tool should return what the model needs to reason with, not everything the upstream API happened to send. Filter, paginate, or summarize server-side. A bigger window just delays saturation, and calling less often sacrifices capability to avoid fixing the tool."},

{ id:"ar-d2-16", exam:["CCAR-F","CCDV-F"], d:"d2", also:{"CCDV-F":"v5"}, kind:"recall",
  q:"Which tool_choice settings guarantee that at least one tool is called?",
  multi:true, a:[1,2],
  opts:["auto","any","the named tool form","none"],
  why:"<code>any</code> forces some tool call, letting the model choose which; the named form forces one specific tool. <code>auto</code> permits a plain text reply, and <code>none</code> forbids tools entirely. Remember the distinction tested most often: <code>any</code> guarantees a call happens, but only the named form guarantees <em>which</em>."},

{ id:"ar-d2-17", scn:["extract"], exam:["CCAR-F","CCDV-F"], d:"d2", also:{"CCDV-F":"v5"}, kind:"scenario",
  q:"A tool's input schema marks a field optional, but the operation genuinely requires it. What happens?",
  a:1,
  opts:["The API rejects the tool definition, since a required operation needs a required field","The model may omit the field, and your tool must handle the missing value","The field is treated as required anyway, because the operation cannot run without it","The model always supplies optional fields when the description explains their purpose"],
  why:"The schema is the contract the model works from. An optional field will sometimes be omitted, and your implementation then has to cope — usually by returning a structured error asking for it, which costs a round trip. If the operation needs it, mark it required so the constraint is enforced at the schema level where it belongs."},

/* ========================================================================
   CCAR-F · D3 — Claude Code Configuration & Workflows (20%) — continued
   ======================================================================== */
{ id:"ar-d3-10", scn:["devprod"], exam:["CCAR-F","CCDV-F"], d:"d3", also:{"CCDV-F":"v7"}, kind:"recall",
  q:"Which hook event fires before a tool runs and can prevent it?",
  a:1, opts:["PostToolUse","PreToolUse","SessionStart","Stop"],
  why:"PreToolUse runs before the call and can block it by exiting 2 or returning a deny decision — it is the only tool-level event with veto power. PostToolUse runs after and can only feed context back. SessionStart and Stop fire at session boundaries, nowhere near an individual tool call."},

{ id:"ar-d3-11", exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"You want TypeScript naming conventions applied to every .tsx file across a monorepo, but not to other files. Best mechanism?",
  a:2,
  opts:["A root CLAUDE.md instruction","A CLAUDE.md in each directory containing .tsx files","A path-scoped rules file matching the .tsx glob","A PreToolUse hook checking file extensions"],
  why:"Path-scoped rules exist exactly for this: the instruction loads only when a matching file is in play, and the glob applies repo-wide without a file per directory. A root CLAUDE.md loads always and applies to everything, per-directory files are unmaintainable at monorepo scale, and a hook enforces rather than guides — heavy-handed for a naming convention."},

{ id:"ar-d3-12", scn:["research","devprod"], exam:"CCAR-F", d:"d3", kind:"recall",
  q:"What is the practical difference between a skill and a subagent?",
  a:1,
  opts:["A skill runs in its own context window with its own tool access; a subagent is loaded into the current one","A skill is load-on-demand instructions in the current context; a subagent has its own window and tools","A subagent is a packaged prompt template loaded on demand; a skill is a background process with its own tools","A skill must be invoked explicitly by a slash command; a subagent is selected automatically by the model"],
  why:"A skill injects instructions into the session you're already in — cheap, and it shares your context. A subagent is a distinct assistant with an isolated window, its own system prompt, and its own tool access, which is what makes it useful for keeping bulky work out of the parent conversation. Choose based on whether you need instructions or isolation."},

{ id:"ar-d3-13", scn:["devprod"], exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"A team member reports that a rule in CLAUDE.md 'isn't working.' What is the most useful first diagnostic?",
  a:1,
  opts:["Rewrite the rule more forcefully so the model is less likely to ignore it","Check which configuration files actually loaded this session","Move the rule into a hook so it is enforced rather than merely suggested","Restart the session so the configuration is re-read from disk"],
  why:"Before assuming the rule is poorly worded, confirm it was loaded at all — the file may be at a scope that doesn't apply, shadowed, or in a directory that was never touched. Diagnose before redesigning. If it <em>did</em> load and is still ignored, that's the point at which moving to an enforcement mechanism is the right call."},

{ id:"ar-d3-14", exam:"CCAR-F", d:"d3", kind:"recall",
  q:"Why does committed project configuration need care around credentials?",
  a:1,
  opts:["Committed configuration is parsed on every single run, so a long credential measurably slows down session start-up","Committed files are shared and versioned, so a secret reaches everyone with repository access and persists in history","Project configuration is unable to read credentials at all, so they always have to be supplied through the environment","Only user-level configuration is encrypted at rest, so a project file leaves any secret it holds sitting in plain text"],
  why:"Anything committed is visible to everyone with repo access and remains in git history after deletion. Reference secrets by environment variable in shared config and keep real values in the environment or an uncommitted local file. Rotating an accidentally committed key is the only real remedy once it's in history."},

{ id:"ar-d3-15", scn:["ci"], exam:["CCAR-F","CCDV-F"], d:"d3", also:{"CCDV-F":"v7"}, kind:"scenario",
  q:"A headless run must produce machine-parseable output for a build script. What do you need?",
  a:1,
  opts:["Only the non-interactive flag, which is the thing that makes a run scriptable at all","Non-interactive mode plus a structured output format, with pre-authorized tool permissions","Interactive mode, with its output piped straight into the build script that consumes it","A PostToolUse hook that writes the result into a JSON file the build step then reads"],
  why:"Three things together: non-interactive so it runs and exits, a structured output format so the script can parse a verdict rather than scrape prose, and pre-authorized permissions so nothing blocks waiting for approval. Missing the last one is the classic cause of a CI job that hangs until it times out."},

{ id:"ar-d3-16", exam:"CCAR-F", d:"d3", kind:"recall",
  q:"What is the correct order of escalation when shaping agent behavior?",
  a:1,
  opts:["Start with a hook to guarantee it; relax the rule later if it proves stricter than the work needs","Start with a clear instruction; escalate to enforcement only after the probabilistic approach demonstrably fails","Start with permissions; restricting what is possible is simpler than describing what is wanted","Apply instruction, permission and hook at once; each one covers the gaps the others leave open"],
  why:"Reach for the simplest sufficient mechanism. A clear instruction is cheap, readable, and easy to change; hooks and permission rules are code to maintain and can block legitimate work in ways that are annoying to debug. Escalate when you have evidence the softer approach failed — or immediately when the requirement is a hard safety guarantee, where probabilistic is never acceptable."},

/* ========================================================================
   CCAR-F · D4 — Prompt Engineering & Structured Output (20%) — continued
   ======================================================================== */
{ id:"ar-d4-11", exam:["CCAR-F","CCDV-F"], d:"d4", also:{"CCDV-F":"v4"}, kind:"scenario",
  q:"Your prompt caching shows no cache reads despite apparently identical requests. What should you look for?",
  a:1,
  opts:["The TTL has expired between the two calls — each request writes a fresh, unread entry","Something in the prefix varies between calls — a timestamp, ID or unstable serialization","The model does not support caching at all — the marker is accepted and then ignored","The prefix is below the minimum length — so the request bills as ordinary input"],
  why:"Caching is an exact prefix match, so a single varying byte before the breakpoint misses every time. The usual culprits are an injected current time, a per-request ID, or a dict serialized in non-deterministic key order. Diff two actual request payloads byte by byte — it's almost always something small and invisible in the code."},

{ id:"ar-d4-12", exam:["CCAR-F","CCDV-F"], d:"d4", also:{"CCDV-F":"v4"}, kind:"recall",
  q:"In what order does a cacheable prefix get assembled?",
  a:1,
  opts:["messages, then system, then tools","tools, then system, then messages","system, then messages, then tools","Order does not matter"],
  why:"Tool definitions come first, then the system prompt, then messages. This matters because the prefix is cumulative: a change to tool definitions invalidates the cached system prompt and messages after it, even if those are untouched. Put the most stable content earliest, which is why tool definitions sit at the front."},

{ id:"ar-d4-13", exam:["CCAR-F","CCDV-F"], d:"d4", also:{"CCDV-F":"v4"}, kind:"scenario",
  q:"You need both long internal reasoning and a short final answer. What is the token trap?",
  a:1,
  opts:["Reasoning tokens are not billed, so the real cost is only the visible answer","The output ceiling covers reasoning plus the answer, so too small a ceiling leaves no room","Reasoning has to be requested separately, so the answer needs a second round trip","A short final answer cannot be combined with reasoning, which always produces long output"],
  why:"The response ceiling is a <em>total</em> output budget and reasoning tokens consume it. Allocate deep reasoning without raising the ceiling and the model can exhaust it mid-thought, leaving a truncated or empty answer. Size the ceiling for both, and remember reasoning bills at the output rate even though the user never sees it."},

{ id:"ar-d4-14", scn:["extract"], exam:"CCAR-F", d:"d4", kind:"scenario",
  q:"A validation retry loop re-sends a failed extraction with the error message appended. It still fails after three attempts. What should happen next?",
  a:2,
  opts:["Keep retrying until it succeeds","Return the last invalid result with a warning","Stop and raise a clear failure to the caller","Fall back to a regex parser"],
  why:"Cap the attempts and fail loudly. Unbounded retries burn budget on a problem that is probably systematic — a schema mismatch, or data that genuinely doesn't contain the field. Returning invalid data with a warning pushes a silent corruption downstream, and a regex fallback substitutes an even less reliable parser for the one that just failed."},

{ id:"ar-d4-15", scn:["extract"], exam:["CCAR-F","CCDV-F"], d:"d4", also:{"CCDV-F":"v4"}, kind:"recall",
  q:"What does a tool call's parsed input give you compared to JSON embedded in a text response?",
  a:1,
  opts:["Nothing — both arrive as text and both need parsing before use","The tool input arrives already structured, with no fences or prose to strip","Tool input is always a flat string, which is simpler to handle than nested JSON","Text responses are schema-validated too, so the difference is only in formatting"],
  why:"A tool call's input arrives as a structured object conforming to the schema you declared. JSON in a text response arrives as text that may carry code fences, a preamble, or trailing commentary you have to strip before parsing — and may not be valid at all. Avoiding that fragile cleanup step is a large part of why forced tool calls are the recommended path to structured output."},

{ id:"ar-d4-16", exam:"CCAR-F", d:"d4", kind:"scenario",
  q:"Output quality is inconsistent across runs with identical input. Which lever addresses this most directly?",
  a:1,
  opts:["A longer system prompt that describes the expected output in more detail","Lowering temperature and tightening format specification with examples","Adding tools so the model can look up what it would otherwise invent","Switching to streaming so partial output can be checked as it arrives"],
  why:"Inconsistency across identical inputs is variance: lower temperature reduces sampling randomness, and concrete examples narrow the space of outputs the model treats as acceptable. Length alone doesn't reduce variance — a longer vague prompt is still vague. Tools and streaming are unrelated to output consistency."},

/* ========================================================================
   CCAR-F · D5 — Context Management & Reliability (15%) — continued
   ======================================================================== */
{ id:"ar-d5-10", exam:"CCAR-F", d:"d5", kind:"scenario",
  q:"An agent's tool results accumulate until the window fills, but you need the full history preserved on your side. Which approach fits?",
  a:1,
  opts:["Client-side summarization that rewrites the earlier history down into shorter prose","Clearing old tool results from the model's view while your client retains the full record","Truncating the oldest messages permanently once the window has started to fill up","Starting an entirely new session whenever the accumulated results near the limit"],
  why:"The requirement is to preserve history <em>on your side</em> while reducing what the model carries. Clearing stale tool results from the model's view — leaving placeholders — does that, since your client keeps the complete record. Summarization rewrites and loses verbatim content, and truncation discards it outright."},

{ id:"ar-d5-11", exam:"CCAR-F", d:"d5", kind:"recall",
  q:"What makes up the context budget for a request?",
  multi:true, a:[0,1,2,3],
  opts:["The system prompt","Tool definitions","Message history","Reasoning tokens, where applicable","The model's maximum output ceiling"],
  why:"All of it shares one budget — and tool definitions are the component most often forgotten, at roughly a couple of hundred tokens each. Thirty tools can consume meaningful space before a single message is sent. The response then needs room on top, which is why long agentic loops can fill even a very large window. The output ceiling is a separate limit, not part of the input budget — confusing the two is the distinction this domain tests."},

{ id:"ar-d5-12", exam:["CCAR-F","CCDV-F"], d:"d5", also:{"CCDV-F":"v8"}, kind:"scenario",
  q:"Your monitoring shows rising latency and occasional overload errors from the API. Which responses are appropriate?",
  multi:true, a:[0,1,3],
  opts:["Back off more aggressively on overload errors than on rate limits","Shift latency-tolerant work to asynchronous batch processing","Increase request concurrency to get work through faster","Add circuit breaking so a struggling dependency doesn't exhaust your resources"],
  why:"Overload is system-wide rather than your quota, so it warrants a longer backoff than a rate limit. Moving deferrable work off the synchronous path reduces pressure, and circuit breaking stops a slow dependency from consuming all your threads. Raising concurrency during an overload adds load to a service already failing — the instinct to push harder makes it worse."},

{ id:"ar-d5-13", exam:"CCAR-F", d:"d5", kind:"recall",
  q:"When does retrieval beat putting documents directly in context?",
  a:1,
  opts:["Always, since retrieval costs far less than sending the whole document set every time","When the corpus is too large to fit, or only a small relevant subset is needed per query","Only for structured data, where a retrieval index can actually be built and kept reliable","When the documents change often, so that the context in the prompt would otherwise go stale"],
  why:"Retrieval earns its infrastructure when the corpus can't fit, or when each query needs only a slice of it — fetch the relevant chunks and spend context only on those. For a small, stable document set that fits comfortably, putting it directly in context is simpler, cacheable, and avoids retrieval quality becoming a failure mode of its own."},

{ id:"ar-d5-14", exam:"CCAR-F", d:"d5", kind:"scenario",
  q:"A conversation must survive across sessions, remembering user preferences and prior decisions. Which mechanism fits best?",
  a:1,
  opts:["A longer context window, so the whole history stays available across turns","Durable storage the agent reads at session start and writes to as facts change","Caching the conversation, so the previous session is restored on the next call","A lower temperature, so the agent recalls earlier facts more consistently"],
  why:"Context windows are per-session; nothing in them survives a restart however large they are. Cross-session memory needs an external store — a memory tool, a file, a database — loaded at session start and updated as things change. Caching is a cost optimization over repeated prefixes, not persistence."},

/* ========================================================================
   CCDV-F · v1 — Applications and Integration (33.1%) — continued
   ======================================================================== */
{ id:"dv-v1-09", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"Your backend calls the API synchronously inside a web request handler and users see timeouts under load. What is the structural fix?",
  a:1,
  opts:["Raise the HTTP timeout so the handler has room to finish the call","Move generation to a background job, returning a handle the client polls","Reduce the output ceiling so each generation completes inside the timeout","Add web workers so more requests can be held open concurrently"],
  why:"Model calls can take many seconds, so holding an HTTP request open for one ties up a worker and fails under concurrency. Decouple: accept the request, do the work in a background job, and let the client poll or receive a push. Raising the timeout and adding workers both scale the problem rather than removing it."},

{ id:"dv-v1-10", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"What is the correct shape of a multi-turn conversation sent to the API?",
  a:1,
  opts:["Only the latest user message, since the model is stateless between calls","The full alternating user/assistant history, starting with a user turn","Only the assistant's previous replies, which carry the conversation state","A single concatenated string containing the whole exchange so far"],
  why:"The API is stateless: each request carries the whole conversation. Messages alternate user and assistant and must begin with a user turn, and any tool_use turn must be followed by its matching tool_result. Sending only the newest message is the most common beginner bug — the model has no memory of turns you didn't include."},

{ id:"dv-v1-11", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"You need to process 50,000 documents overnight with no user waiting. Which approach and why?",
  a:1,
  opts:["Synchronous calls in a tight loop until the whole set is done","Asynchronous batch processing, for the discount and throughput","Streaming each document so results arrive as they complete","A single request containing all of the documents at once"],
  why:"No one is waiting and the volume is large — the defining case for batch. You get a significant discount and high throughput in exchange for giving up latency guarantees. A synchronous loop will fight rate limits for hours, streaming solves a problem you don't have, and one giant request exceeds every size limit."},

{ id:"dv-v1-12", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"Which belong in production observability for a Claude integration?",
  multi:true, a:[0,1,2],
  opts:["Latency percentiles, not just averages","Token usage and cost per request type","Error rates broken down by status code","The model's reasoning content for every call"],
  why:"Percentiles expose the tail that averages hide, per-type usage attributes cost to features, and error rates by status distinguish your bugs from upstream problems. Logging reasoning content for every call is expensive, often sensitive, and rarely diagnostic — capture it selectively when investigating, not by default."},

{ id:"dv-v1-13", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"A tool_use turn is in your message history but you never appended the matching result. What happens on the next call?",
  a:1,
  opts:["The model ignores the dangling call and answers without it","The API rejects a tool_use block with no matching tool_result","The tool is retried automatically on the subsequent request","The conversation silently truncates back to the last valid turn"],
  why:"Every tool_use block needs a matching tool_result in the following user turn, keyed by its id. A dangling call is a malformed conversation and the API rejects it. This bites when a tool throws and the error path skips appending a result — the fix is to always append a result, marked as an error, rather than nothing."},

{ id:"dv-v1-14", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"You are adding Claude to an existing service and want to limit the blast radius of an outage. Which patterns help?",
  multi:true, a:[0,1,3],
  opts:["A timeout shorter than your overall request budget","A defined fallback when the call fails or times out","Retrying indefinitely until success","A circuit breaker that stops calling a failing dependency temporarily"],
  why:"Bound the wait, define what the product does without the model, and stop hammering a dependency that is clearly down. Indefinite retry is the anti-pattern: it converts a degraded dependency into a resource exhaustion incident in your own service and delays recovery for everyone."},

{ id:"dv-v1-15", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"What does an idempotency key protect against in an integration?",
  a:1,
  opts:["Rate limiting, by ensuring a retry does not count twice","A retried request causing the same side effect twice","Schema validation errors when a request is sent again","Context overflow caused by duplicated conversation turns"],
  why:"When a response is lost to a timeout or network failure, the client can't tell whether the operation happened. Retrying risks doing it twice. An idempotency key lets the server recognize the repeat and return the original outcome instead of performing it again — which is why it's the robust answer wherever retries and side effects coexist."},

/* ========================================================================
   CCDV-F · v2 — Model Selection and Optimization (16.8%) — continued
   ======================================================================== */
{ id:"dv-v2-07", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"A summarization feature works well on your most capable model. Before switching to a cheaper one, what do you need?",
  a:1,
  opts:["Nothing in particular, since smaller models handle summarization well enough","A representative evaluation set and defined quality criteria to compare against","A larger context window, so that the smaller model sees the whole of the input","A lower temperature, so that the smaller model stays closer to the source text"],
  why:"The switch is only safe if you can measure what it costs you. Build the eval set and criteria first, then compare — sometimes the cheaper model is indistinguishable, sometimes it degrades on exactly the cases that matter. Without measurement you're trading unknown quality for known savings, and you won't find out until users do."},

{ id:"dv-v2-08", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"A conversational product has a strict latency budget. Which choices help most?",
  multi:true, a:[0,1,3],
  opts:["A faster, smaller model where accuracy allows","Streaming so output appears as it is generated","Batch processing to reduce cost","Caching the stable prompt prefix to cut input processing"],
  why:"Model tier and streaming address perceived and actual latency directly, and cache hits reduce the input the model must process before producing the first token. Batch is the opposite trade — it exchanges latency for cost, which is exactly wrong for an interactive product."},

{ id:"dv-v2-09", exam:"CCDV-F", d:"v2", kind:"recall",
  q:"Why is output usually priced higher than input?",
  a:1,
  opts:["Output is stored for longer than the input that produced it","Generation is sequential, and costlier than reading input","Output tokens are larger units than the input tokens counted","It is an arbitrary pricing distinction rather than a cost one"],
  why:"Input can be processed in parallel across the prompt, while output is produced token by token, each conditioned on the last. That sequential generation dominates the cost. The practical consequence: asking for a concise answer saves more than trimming a comparable amount of input, and verbose formats are expensive at scale."},

{ id:"dv-v2-10", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"Your agent re-sends a long document on every turn of a conversation about it. Better approach?",
  a:1,
  opts:["Truncate the document so each turn carries less of it along","Cache the document as a stable prefix, read cheaply thereafter","Summarize the document on each turn instead of re-sending it","Switch to a model whose pricing makes the repetition affordable"],
  why:"A long, unchanging document re-sent each turn is the canonical caching case: pay the write premium once, then every subsequent turn reads it at a fraction of input cost. Truncation loses information the conversation is about, and re-summarizing per turn pays a model call each time to solve a problem caching solves once."},

/* ========================================================================
   CCDV-F · v3 — Agents and Workflows (14.7%) — continued
   ======================================================================== */
{ id:"dv-v3-06", exam:"CCDV-F", d:"v3", kind:"scenario",
  q:"An agent's tool returns an error. What should your code send back?",
  a:1,
  opts:["Nothing — skip the result","A tool_result flagged as an error, with detail","A new user message describing the problem","An exception that halts the loop"],
  why:"Always append a tool_result, marked as an error, with text the model can act on — 'file not found at path X' lets it correct course, where 'error' does not. Skipping it produces a malformed conversation with a dangling tool_use. Injecting a separate user message breaks the expected structure, and halting throws away a recoverable situation."},

{ id:"dv-v3-07", exam:"CCDV-F", d:"v3", kind:"scenario",
  q:"You need an agent to handle a task you cannot fully specify in advance, but it must stay within strict bounds. How do you reconcile these?",
  a:1,
  opts:["Write a prompt detailed enough to cover every case the agent might encounter","Latitude in reasoning, constrained by tool design and permissions","Use a fixed workflow instead, since strict bounds and open-ended tasks are incompatible","Set temperature to zero so the agent behaves predictably within whatever bounds exist"],
  why:"Separate the two concerns. Flexibility belongs in reasoning — let the model decide how to approach the problem. Bounds belong in capability — it can only do what its tools and permissions allow, regardless of what it decides. Trying to enumerate every case in a prompt fails on the case you didn't imagine, which is precisely the one that matters."},

{ id:"dv-v3-08", exam:"CCDV-F", d:"v3", kind:"recall",
  q:"What makes a task a poor fit for an autonomous agent?",
  multi:true, a:[0,2],
  opts:["Every step is known in advance","The path depends on intermediate findings","Errors are costly and hard to reverse","The task requires several tools"],
  why:"A fully-known sequence should be a workflow — agency adds cost and unpredictability for nothing. High-stakes irreversible actions need gates and human approval rather than autonomy. Depending on intermediate findings and using several tools are the conditions agents are <em>for</em>, not arguments against them."},

/* ========================================================================
   CCDV-F · v4 — Prompt and Context Engineering (11%) — continued
   ======================================================================== */
{ id:"dv-v4-01", exam:"CCDV-F", d:"v4", kind:"scenario",
  q:"User-provided text is interpolated into your prompt template. What is the risk and the mitigation?",
  a:1,
  opts:["There is no real risk as long as the interpolated text is short and comes from your own users","Injected instructions may alter behavior; delimit untrusted input as data","The risk is malformed output; escaping quotes and braces in the interpolated text resolves it","The risk is nondeterminism; lowering temperature makes the model ignore embedded instructions"],
  why:"User text that reaches the prompt can contain instructions. Mark it clearly as data with delimiters, keep authoritative instructions in the system prompt, and — the part that actually matters — ensure the model's <em>capabilities</em> are constrained so a successful injection still can't do real damage. Quote escaping addresses a syntactic problem, not a semantic one."},

{ id:"dv-v4-02", exam:"CCDV-F", d:"v4", kind:"recall",
  q:"What should go in the system prompt rather than the user message?",
  multi:true, a:[0,1,3],
  opts:["Persona and tone","Output format requirements","The specific data for this request","Stable few-shot examples"],
  why:"Stable, request-independent content belongs in the system prompt: role, constraints, format rules, and examples. It's cacheable there and keeps instructions separate from data. The per-request payload goes in the user message — mixing it into the system prompt breaks caching and blurs the instruction/data boundary that injection defense depends on."},

{ id:"dv-v4-03", exam:"CCDV-F", d:"v4", kind:"scenario",
  q:"Your prompt works on short inputs but degrades badly on long ones. Likely cause and fix?",
  a:1,
  opts:["The model tier is too small to handle the longer input reliably","Key instructions are buried, so restate them at the end and delimit the input","Temperature is too high, so longer inputs produce more variance in the output","There are too few few-shot examples to cover the range the long inputs contain"],
  why:"With a long input, instructions at the top compete with everything after them. Structure helps: delimit the sections, and restate the critical requirement after the bulk content so it's adjacent to where the model begins generating. Adding examples to an already-long prompt usually makes the crowding worse."},

/* ========================================================================
   CCDV-F · v6 — Security and Safety (8.1%) — continued
   ======================================================================== */
{ id:"dv-v6-05", exam:"CCDV-F", d:"v6", kind:"scenario",
  q:"An agent can read files and make network requests. What is the specific combined risk?",
  a:1,
  opts:["Slower execution, since file and network access add latency per call","Exfiltration: reading local data and sending it out","Higher token costs from the volume of file content it reads in","Context overflow, as file contents accumulate across the session"],
  why:"Each capability is reasonable alone; together they form a complete exfiltration path, which a prompt injection can trigger without the user noticing. Mitigate by restricting which paths are readable and which destinations are reachable, rather than trusting the agent not to combine the two. Reason about capability <em>combinations</em>, not just individual permissions."},

{ id:"dv-v6-06", exam:"CCDV-F", d:"v6", kind:"recall",
  q:"Why is output filtering alone insufficient as a safety control?",
  a:1,
  opts:["It is far too slow to run inline on a response","It catches content, not actions already taken","It needs a separate model to do the filtering","It only works on plain text, not on anything else"],
  why:"By the time you inspect the output, any tool calls made along the way have already executed — the email sent, the record deleted. Filtering is a useful last layer for content, but actions need controls at the point of execution: permissions, approval gates, and least-privilege credentials."},

/* ========================================================================
   CCDV-F · v8 — Eval, Testing, and Debugging (2.6%) — continued
   ======================================================================== */
{ id:"dv-v8-03", exam:"CCDV-F", d:"v8", kind:"scenario",
  q:"You want automated grading of open-ended generated output. What should you watch out for with a model-as-judge?",
  a:1,
  opts:["A model judge is unreliable for open-ended output and should not be used for grading","It needs calibration against human judgment, and shares the generator's blind spots","It can only grade objectively checkable output such as code, not open-ended text","It must use the same model as the generator, or the scores are not comparable"],
  why:"Model-as-judge scales where human review can't, but it isn't free of the problems it's measuring: without explicit rubric criteria it drifts, and using the same model family can share blind spots with the generator. Calibrate against human-labeled examples, and prefer a different model or a fresh instance for the judge."},

{ id:"dv-v8-04", exam:"CCDV-F", d:"v8", kind:"recall",
  q:"What should an evaluation set contain beyond typical cases?",
  multi:true, a:[0,1,2],
  opts:["Edge cases and boundary conditions","Known past failures","Adversarial or malformed input","Only cases the system currently passes"],
  why:"Evals earn their keep on the hard cases: boundaries, previously-fixed bugs (so regressions get caught), and hostile input. A set containing only passing cases measures nothing and gives false confidence — every new failure you find in production should become a permanent case in the set."},

/* ========================================================================
   CCAR-P — Architect Professional — continued
   ======================================================================== */
{ id:"pr-p2-01", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"A client wants an agentic system where a deterministic pipeline would suffice. How do you advise?",
  a:1,
  opts:["Build the agentic system, since it will adapt as requirements grow","Recommend the simpler design, explaining the cost and predictability tradeoffs","Build both and compare them against the client's real workload","Defer to the client's stated preference without raising the tradeoff with them"],
  why:"Architectural advice means naming tradeoffs the client may not see: agents cost more per task, behave less predictably, and are harder to debug and audit. Recommend the simplest design that meets the requirement and document why. Deferring silently isn't neutral — it withholds exactly the expertise they engaged you for."},

{ id:"pr-p2-02", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"A design review asks how your system behaves when the model returns something unexpected. What should the architecture document show?",
  a:1,
  opts:["That the prompt is specific enough to prevent unexpected output","Explicit handling for truncation, refusal and validation failure","That the model is accurate enough for the failure rate to be low","Test results covering the happy path across realistic inputs"],
  why:"Reviewers are asking about failure modes, and 'the prompt prevents it' is not an answer — every probabilistic component eventually produces something you didn't plan for. Show the enumerated cases and what the system does in each. Accuracy figures and happy-path tests describe the cases that already work."},

{ id:"pr-p3-02", exam:"CCAR-P", d:"p3", kind:"scenario",
  q:"After a model version upgrade, output quality subtly changes. What process should already be in place?",
  a:1,
  opts:["Rolling back immediately whenever output quality appears to change","A pinned version plus a regression suite run before promoting a new one","Trusting that a newer model version is an improvement on the one it replaces","Manual review of a handful of outputs after each version upgrade"],
  why:"Version pinning makes the upgrade a deliberate, reviewable act rather than something that happens to you, and a regression suite tells you what changed before users find out. Subtle quality shifts are exactly what manual spot-checks miss. Rollback is the response <em>after</em> detection, not the detection mechanism."},

{ id:"pr-p4-02", exam:"CCAR-P", d:"p4", kind:"scenario",
  q:"Who is accountable when an AI-assisted system produces a harmful recommendation that a human approved?",
  a:1,
  opts:["The model provider, whose system produced the harmful recommendation","The deploying organization, which is why approval must be meaningful","The individual approver alone, since they had the final say on it","No one in particular, provided the process was followed correctly"],
  why:"Accountability sits with the organization deploying the system. The governance consequence is practical: an approval gate is only a control if the approver has the information, time, and authority to actually refuse. A gate that people click through under time pressure provides the appearance of oversight while adding none — and that gap is what an audit will find."},

{ id:"pr-p5-02", exam:"CCAR-P", d:"p5", kind:"scenario",
  q:"A pilot succeeded and leadership wants organization-wide rollout next month. What is the main risk to raise?",
  a:1,
  opts:["Model costs will rise roughly in proportion to the number of users added","Pilot conditions rarely hold at scale, so readiness must be re-validated","The model version used in the pilot may be deprecated before the rollout completes","Training the wider organization will take longer than the rollout schedule allows"],
  why:"Pilots are run by motivated volunteers on selected cases with the build team nearby. At scale you get indifferent users, messy real inputs, and no hand-holding, and systems that looked ready often aren't. Raise it as a validation question — what evidence would show readiness under realistic conditions — rather than as an objection to rolling out."},

{ id:"pr-p6-01", exam:"CCAR-P", d:"p6", kind:"scenario",
  q:"An application needs consistent behavior across several model tiers used for different tasks. What architectural choice helps?",
  a:1,
  opts:["Use a single model tier for everything so behavior cannot diverge","Centralize prompt construction and validation, so every tier meets one contract","Maintain a separate prompt per model, tuned to that model's behavior","Avoid structured output entirely, since it behaves differently between model tiers"],
  why:"Centralize the contract: one place that builds prompts and one place that validates results, so swapping a tier for a given task doesn't change the interface the rest of the system depends on. Duplicating prompts per model guarantees drift. Using one model everywhere forgoes the cost and latency benefits of matching tier to task."},

{ id:"pr-p7-02", exam:"CCAR-P", d:"p7", kind:"scenario",
  q:"Engineers report that agent-assisted development is inconsistent across teams. Which diagnostic comes first?",
  a:1,
  opts:["Survey satisfaction","Compare what configuration each team loads","Mandate a single model tier for everyone so one source of variance is removed","Increase training hours"],
  why:"Inconsistent behavior usually traces to inconsistent configuration, so look at what each team actually loads before investigating people or process. Satisfaction surveys measure perception, not cause. Mandates and training don't address a configuration gap, and will frustrate teams whose setup was already fine."},

/* ========================================================================
   CCAO-F — Associate Foundations — continued
   ======================================================================== */
{ id:"as-a2-01", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"You want to automate a recurring report your team writes by hand. What should you establish first?",
  a:1,
  opts:["Which model to use, since that determines quality and cost from the start","What a good output looks like, concretely enough to judge results against","How much the automated version will cost to run at the current frequency","Who will approve the output before it is sent on to its audience"],
  why:"Without an explicit standard you can't tell whether the automation is working — 'looks fine' drifts from reviewer to reviewer and week to week. Define the criteria using examples of good past reports, then evaluate against them. Model, cost, and approvals all follow once you know what you're aiming at."},

{ id:"as-a2-02", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"Which task is the best candidate for a first Claude workflow in a team new to it?",
  a:1,
  opts:["A high-stakes task with no tolerance at all for any error","A frequent, well-understood task where output is easy to verify","A task that nobody on the team currently understands well","The most complex task that is sitting on the team's backlog"],
  why:"Start where mistakes are cheap and verification is easy: a frequent task gives you volume to learn from, and verifiable output lets you see quality honestly. High-stakes and poorly-understood tasks are where early failures do lasting damage to both the work and the team's willingness to try again."},

{ id:"as-a4-02", exam:"CCAO-F", d:"a4", kind:"recall",
  q:"What makes a prompt instruction effective?",
  multi:true, a:[0,1,3],
  opts:["Stating what you want specifically","Explaining why, when the reason guides judgment","Using emphatic language","Showing the desired output format"],
  why:"Specificity and a concrete format example remove ambiguity, and explaining the purpose helps the model handle cases your instruction didn't anticipate. Emphatic language — capitals, 'VERY IMPORTANT', repetition — adds insistence without adding information, and if the instruction was unclear, saying it louder doesn't clarify it."},

{ id:"as-a6-01", exam:"CCAO-F", d:"a6", kind:"scenario", volatile:true, contentDate:"2026-11-24",
  q:"You repeatedly give Claude the same background about your team's conventions in every conversation. Better approach?",
  a:1,
  opts:["Keep pasting it, since that guarantees it is present every time","Store it as persistent project context that loads automatically","Shorten it until it fits in a single line you can paste quickly","Ask Claude to remember it for the next conversation you start"],
  why:"Recurring, stable context belongs in a configuration file that loads each session — written once, consistent for everyone on the team, and editable in one place. Pasting works but drifts as people edit their copies. Asking the model to remember doesn't persist across sessions, since each one starts fresh."},

{ id:"as-a7-02", exam:"CCAO-F", d:"a7", kind:"scenario",
  q:"Claude's answer is correct but far too long for your purpose. Most direct fix?",
  a:1,
  opts:["Ask it to try again — a second attempt is often tighter than the first one was","Specify the length and format you want — word count, bullet count or structure","Switch to a model whose replies run shorter — the same request, but less text","Split the question up into smaller ones — then combine all of the answers"],
  why:"Underspecified output length produces whatever the model judges reasonable. State the constraint concretely — 'three bullets, under 50 words each' — and you get it. 'Try again' gives no new information, and switching models doesn't address an instruction that never contained the requirement."},

{ id:"as-a3-02", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"You use Claude to draft client-facing content. What disclosure practice is appropriate?",
  a:1,
  opts:["Never mention AI involvement, since the work is yours once reviewed","Follow your organization's and the client's disclosure expectations","Disclose only if the client asks directly whether AI was involved","Add a standing disclaimer to everything, so disclosure is never overlooked"],
  why:"There's no single universal rule — expectations vary by organization, industry, and client, and some contexts have regulatory requirements. The constant is review: you are accountable for what you send regardless of how it was drafted. Blanket concealment and blanket disclaimers both substitute a reflex for the judgment the situation needs."}

);
