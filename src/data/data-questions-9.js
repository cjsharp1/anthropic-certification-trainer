/* CCDV-F — Claude Certified Developer (Foundations), additional questions.
 * Written against the official exam guide task statements and data-notes.js,
 * covering angles earlier parts left thin: pagination and batching, versioned
 * deploys, streaming edge cases, deterministic test doubles, MCP transports,
 * secret handling and debugging method.
 *   v1 Applications & Integration (33.1%)  v2 Model Selection (16.8%)
 *   v3 Agents and Workflows (14.7%)        v4 Prompt & Context (11%)
 *   v5 Tools and MCPs (10.6%)              v6 Security and Safety (8.1%)
 *   v7 Claude Code (3.1%)                  v8 Eval, Testing, Debugging (2.6%)
 */
QUESTIONS.push(

/* ---- v1: Applications and Integration ---- */

{ id:"dv-v1-23", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"A streamed response is interrupted halfway by a network drop. What should the client do with the partial text?",
  a:2,
  opts:["Display it as the answer, since the user has already seen it arrive","Append it to the history as an assistant turn so the context stays continuous","Discard it unless the stream completed, while a partial turn misrepresents it","Retry the request and concatenate the two partials into one complete response"],
  why:"An interrupted stream is an incomplete turn; storing it tells the next request the model said something it never finished. Concatenating two partials fabricates a response that was never generated, and showing it as final presents truncation as an answer."},

{ id:"dv-v1-24", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"Which conditions should cause your client to retry a request?",
  multi:true, a:[0,2,3],
  opts:["A 429 rate limit response","A 400 invalid request error","A 529 overloaded response","A connection reset before any response arrived"],
  why:"Rate limits, overload and transport failures are transient and clear on their own. A 400 means the request itself is malformed, so retrying it unchanged produces the identical error and wastes the attempt."},

{ id:"dv-v1-25", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"Your service must process 50,000 documents by morning with nobody waiting on any single result. What fits?",
  a:1,
  opts:["Parallel synchronous calls behind a thread pool sized to your limit","The Batches API, built for high-volume asynchronous work at lower cost","Streaming each document to a queue consumer as results arrive","A single long-running agentic session working through the set"],
  why:"No latency requirement plus very high volume is exactly the batch case, and it is cheaper per token than synchronous calls. Thread pools burn rate limit headroom for a deadline you do not have, and streaming addresses perceived latency for a waiting user."},

{ id:"dv-v1-26", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"A tool returns 20,000 rows but the agent only needs enough to answer. What belongs in the integration?",
  a:0,
  opts:["Pagination or a result cap in the tool, with a way to request more","A larger context window, set on every one of the requests","Instructions telling the model to ignore all of the extra rows","A more capable model tier, used for making the tool call itself"],
  why:"Bounding the payload at the source protects the context budget and the bill on every call. The model cannot ignore what it has already been made to read, and a bigger window or stronger model just pays more to carry the same waste."},

{ id:"dv-v1-27", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"What makes an integration's behavior reproducible across environments?",
  multi:true, a:[0,1,3],
  opts:["Pinning an explicit model version rather than a floating alias","Keeping prompts in version control with the code that sends them","Using the same API key everywhere","Recording the parameters sent with each request"],
  why:"A pinned version, versioned prompts and a record of the parameters let you reconstruct any past call. Sharing one key across environments is a security problem and does nothing for reproducibility."},

{ id:"dv-v1-28", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"You need to roll out a prompt change without risking every user at once. What does the integration need?",
  a:2,
  opts:["A feature flag that can disable the Claude-backed path entirely if quality drops","A staging environment mirroring production, so the change is proven before release","Prompt versions selectable per request, so a subset can be reverted instantly","A longer QA cycle, giving reviewers time to check the new prompt on real cases"],
  why:"Treating the prompt as a deployable, switchable artefact gives you a canary and an instant rollback. Staging and QA reduce the chance of a bad change without providing a way to limit or undo one in production."},

{ id:"dv-v1-29", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"Your API key is currently read from a config file committed to the repository. What is the correct fix?",
  a:1,
  opts:["Encrypt the file, keep it committed, rely on the passphrase to protect it","Move it to a secret manager, rotate the exposed key, keep it server-side","Restrict repository access, audit the list, leave the credential in place","Obfuscate the key, commit it still, trust that nobody recognizes it"],
  why:"A committed key must be treated as compromised, so rotation is part of the fix rather than an optional extra. Encryption and access restriction leave it in history, and obfuscation is not a control."},

{ id:"dv-v1-30", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"Why must the API key never reach a browser or mobile client?",
  a:3,
  opts:["Browsers and mobile clients cannot make the HTTPS requests the API requires","Calling from a client adds a network hop, which increases latency for the user","The SDKs block client-side use, so the call fails before it reaches the API","Anything shipped to a client is extractable, so the key stays server-side"],
  why:"Minification and TLS do not hide a value that the client must possess to use. The pattern is a server endpoint that authenticates your user and calls the model with a key they never see."},

{ id:"dv-v1-31", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"One tenant's heavy usage is starving everyone else on a shared integration. What addresses this?",
  a:0,
  opts:["Per-tenant quotas and fair queueing, so one caller cannot exhaust the limit","A larger rate limit, so that there is headroom for the heaviest tenant","Retrying the starved requests rather more aggressively until they land","A faster model tier, so that each tenant's requests clear more quickly"],
  why:"Without per-tenant accounting, a single caller legitimately consumes the shared budget. A bigger limit raises the ceiling that one tenant can still exhaust, and more retries from starved callers add load."},

{ id:"dv-v1-32", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"An agentic request routinely exceeds your load balancer's idle timeout. What is the appropriate design change?",
  a:2,
  opts:["Raise the idle timeout, generously, to cover the longest expected request","Split the work into more calls, each one returning inside the timeout","Make it asynchronous: accept the job, return an id, let the client poll","Stream the response, keeping traffic flowing, so the connection stays live"],
  why:"Work that outlives a reasonable request lifetime should not be held on an open connection. Streaming keeps the socket busy but still ties completion to one connection, and raising timeouts pushes the limit without removing the coupling."},

{ id:"dv-v1-33", exam:"CCDV-F", d:"v1", kind:"recall",
  q:"What should a tool_result block always carry?",
  multi:true, a:[0,2],
  opts:["The tool_use_id of the call it answers","The original tool definition","An error flag when the tool failed, with a message the model can act on","The model's reasoning about the result"],
  why:"The id pairs the result with its call, and the error flag distinguishes failure from a legitimate empty answer. The definition was already sent, and the reasoning belongs to the model rather than your result payload."},

{ id:"dv-v1-34", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"You want to verify a bug fix without calling the live API in CI. What makes this practical?",
  a:1,
  opts:["A shorter timeout in the test environment, so a slow call fails fast","A seam between building a request and sending it, so a recorded response fits","A lower temperature during tests, so the same input returns the same output","Running the suite against a cheaper model tier to keep CI costs acceptable"],
  why:"Testability comes from being able to inject a response, which requires the transport to be replaceable. A cheaper tier still makes a network call, non-deterministic and billable, and sampling settings do not make a test repeatable."},

/* ---- v2: Model Selection and Optimization ---- */

{ id:"dv-v2-16", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"A conversation re-sends a 30,000-token document on every turn. What reduces cost most directly?",
  a:0,
  opts:["Cache the document as a stable prefix, billed at the cache-read rate","Switch the whole of the conversation over to a much cheaper tier","Reduce the max_tokens on every single one of the turns that is taken","Summarize the document once at the start, then discard the original"],
  why:"The document is a large, unchanging prefix reused every turn, which is the textbook caching case. A cheaper tier cuts the rate but still pays for every token, the output ceiling is not the cost here, and summarizing loses detail the conversation may need."},

{ id:"dv-v2-17", exam:"CCDV-F", d:"v2", kind:"recall",
  q:"What is true about how a cache write is billed relative to a cache read?",
  a:1,
  opts:["Writes and reads bill identically, at the base rate, on every call","A write costs more than base, a read much less, so reuse decides the payoff","Writes are free, reads bill at base, so caching always pays off","Caching changes latency, not price, so the bill is unaffected"],
  why:"Writing the cache carries a premium and reading it is heavily discounted, which is why the break-even depends on reuse. Caching a prefix read once is a net loss."},

{ id:"dv-v2-18", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"A pipeline has a cheap triage step and an expensive analysis step. How should model selection work?",
  a:2,
  opts:["Use the most capable model for both of the steps, which keeps quality consistent","Use the cheapest available model for both and accept the quality that this gives","Match each step independently: a fast tier for triage, a capable one for analysis","Alternate between the tiers across runs, balancing the cost against the accuracy"],
  why:"Per-step selection is the point of having tiers: the triage step does not get better on a stronger model, and the analysis step does. Uniform choices pay for capability that is wasted or accept errors that matter."},

{ id:"dv-v2-19", exam:"CCDV-F", d:"v2", kind:"recall",
  q:"Which measurements should settle a tier-downgrade decision?",
  multi:true, a:[0,1,3],
  opts:["Quality scored on a fixed, representative dataset","Cost per request at realistic volume","The model's published benchmark scores","Latency at the percentile your users actually experience"],
  why:"Your own dataset, your own volume and your own tail latency are what determine fitness. Published benchmarks describe different tasks and cannot stand in for scoring on your data."},

{ id:"dv-v2-20", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"Token usage is far above your estimate. Where do you look first?",
  a:3,
  opts:["The temperature setting, which changes the output length, on every call","The model version, since a newer one will count its tokens differently","The number of active users, which multiplies the cost of every request","What is actually sent: system prompt, tool definitions, re-sent history"],
  why:"Input volume is usually the surprise: tool definitions and a long system prompt ride along on every call, and conversation history grows silently. Sampling settings and version do not change token counts."},

{ id:"dv-v2-21", exam:"CCDV-F", d:"v2", kind:"scenario",
  q:"Extended thinking is enabled for a high-volume classification endpoint. What is the likely effect?",
  a:1,
  opts:["Better accuracy on the classification, at no meaningful extra cost at all","Latency and billed thinking tokens on a task whose hard part is not reasoning","Lower overall cost, since the reasoning produces much shorter final answers","No change at all, since the short classification inputs skip the thinking"],
  why:"Reasoning budget is spent whether or not the task needs working out, and at volume that overhead dominates. It earns its cost on multi-step problems, not on straightforward classification."},

/* ---- v3: Agents and Workflows ---- */

{ id:"dv-v3-12", exam:"CCDV-F", d:"v3", kind:"scenario",
  q:"Your agent loop appends the model's turn but forgets to append the tool_result before looping. What happens?",
  a:0,
  opts:["The next request is malformed: a tool_use with no result, so it is rejected","The model silently retries the tool call on the following turn","The loop continues but with degraded quality from the missing result","The tool result is inferred from the surrounding conversation context"],
  why:"Every tool_use block must be answered by a tool_result with the matching id in the following user turn. Omitting it is a structural error in the request, not a quality problem."},

{ id:"dv-v3-13", exam:"CCDV-F", d:"v3", kind:"scenario",
  q:"An agent must call three tools whose results feed each other, but one of them is slow. How should the loop be structured?",
  a:1,
  opts:["Call all three in parallel and reconcile any inconsistencies afterwards","Respect the real dependencies: parallelize only the independent calls","Sequence every tool call so the trace stays readable and each result is available","Order them by expected duration, calling the slow one last so it blocks nothing"],
  why:"Parallelism is correct exactly where there is no dependency, and incorrect where a later call needs an earlier result. Blanket parallelism produces calls made with missing inputs; blanket sequencing pays latency it does not owe. Ordering by speed ignores what actually constrains the work."},

{ id:"dv-v3-14", exam:"CCDV-F", d:"v3", kind:"scenario",
  q:"Five document summaries are independent of one another. How should the work be structured?",
  a:2,
  opts:["One agentic session, since it can work through them in turn","A prompt chain of five steps, since each summary is a step","Parallel calls, since no summary depends on another","A single prompt holding all five, since they share one context"],
  why:"Independence is what makes parallelism correct and it removes four round trips of latency. Chaining and sequential sessions impose an ordering the work does not have, and one combined prompt invites the outputs to blur together."},

{ id:"dv-v3-15", exam:"CCDV-F", d:"v3", kind:"scenario",
  q:"A later step in a workflow invalidates an earlier step's result. What does the design need?",
  a:1,
  opts:["A more capable model at each step, so the earlier result is right the first time","A way to revisit the earlier step, or a loop with a termination condition","Retry logic on the final step, so the whole chain re-runs whenever the last output is wrong","A larger context window, so every intermediate result stays visible to the later steps"],
  why:"A pure chain assumes each step is final, so work that can invalidate what came before needs either a bounded loop or a defined revision path. Model capability and retries do not supply the missing control flow."},

{ id:"dv-v3-16", exam:"CCDV-F", d:"v3", kind:"recall",
  q:"What belongs in the loop's code rather than the model's judgment?",
  multi:true, a:[0,1,3],
  opts:["Enforcing the iteration limit","Executing the tool and handling its errors","Deciding which tool best fits the request","Persisting state so the run can resume"],
  why:"Limits, execution and persistence are deterministic responsibilities that must hold regardless of what the model outputs. Choosing the tool for a given request is the judgment the model is there to provide."},

{ id:"dv-v3-17", exam:"CCDV-F", d:"v3", kind:"scenario",
  q:"An agent keeps calling the same tool with identical arguments and getting identical results. What should the loop do?",
  a:3,
  opts:["Raise the iteration limit, give it room, and let it work past the sticking point","Lower the temperature, vary the choice, and let another tool be picked instead","Feed the result into the system prompt, make it visible, and let the asking stop","Detect the repetition, break out, and surface the stall before the budget burns"],
  why:"Identical call and identical result means no progress is being made, and more iterations only spend budget. Detecting the cycle and stopping turns a silent stall into a visible failure."},

/* ---- v4: Prompt and Context Engineering ---- */

{ id:"dv-v4-05", exam:"CCDV-F", d:"v4", kind:"scenario",
  q:"You cache a long stable system prompt, then prepend a short per-request line to it. What happens to the cache?",
  a:0,
  opts:["It misses: the prefix differs from byte zero","Only the new line is uncached","The cache still hits because the bulk is unchanged","The cache rebuilds automatically with no cost"],
  why:"Caching matches a prefix from the start of the request, so anything inserted ahead of the cached block invalidates all of it. Variable content belongs after the stable material, not before it."},

{ id:"dv-v4-06", exam:"CCDV-F", d:"v4", kind:"recall",
  q:"Where do few-shot examples belong, and roughly how many?",
  a:1,
  opts:["In the user turn, including as many examples as will fit","In the system prompt: two to five, covering format and edge cases","Interleaved through the conversation as each case comes up","A single example is always sufficient to establish the pattern"],
  why:"A handful in the system prompt pins format and edge-case handling without crowding the actual request. Piling in more lengthens every call for diminishing returns, and a single example rarely shows how exceptions are handled."},

{ id:"dv-v4-07", exam:"CCDV-F", d:"v4", kind:"scenario",
  q:"Your prompt template puts the retrieved document before the instruction for short inputs, and the behavior changes when documents get long. What should you standardize on?",
  a:2,
  opts:["Document first always: material, then task, then whatever question follows","Instruction first always: task, then material, then the question restated","A fixed layout: stable instructions, then the document, then the task restated","Order by length: short inputs one way, long inputs the other, measured per call"],
  why:"A fixed layout makes behavior predictable and keeps the cacheable prefix at the front. Restating the task after a long document counters the instruction being buried. Varying the order per request forfeits both the cache and any consistency."},

{ id:"dv-v4-08", exam:"CCDV-F", d:"v4", kind:"scenario",
  q:"A CI pipeline breaks whenever the model returns JSON wrapped in prose. Which fix actually holds?",
  a:1,
  opts:["Instruct the model more firmly to return only JSON","Take the output through a tool call, schema-checked","Strip everything before the first brace","Lower the temperature"],
  why:"Tool arguments are structured by construction, which removes the parsing step entirely. Firmer instructions reduce the rate without eliminating it, and brace-stripping breaks on any brace inside the prose."},

{ id:"dv-v4-09", exam:"CCDV-F", d:"v4", kind:"recall",
  q:"What belongs in the system prompt rather than the user turn?",
  multi:true, a:[0,1,3],
  opts:["Role and standing behavioral rules","Output format requirements that apply to every call","The specific document to analyse this time","Few-shot examples establishing the expected shape"],
  why:"Standing instructions, format rules and examples apply to every request and are the stable prefix worth caching. The document varies per call and belongs in the user turn, after the cacheable material."},

{ id:"dv-v4-10", exam:"CCDV-F", d:"v4", kind:"scenario",
  q:"A prompt works on short inputs but degrades on long ones. What is the most likely cause?",
  a:2,
  opts:["The model tier is too low to handle the extra material reliably","The output ceiling is too small, so the answer is cut short on longer inputs","The instruction is buried mid-input, competing with everything around it","The temperature is too high, so longer inputs produce more variable output"],
  why:"Position matters as input grows: an instruction that was prominent in a short prompt becomes one passage among many. Restating it after the long content usually recovers the behavior."},

/* ---- v5: Tools and MCPs ---- */

{ id:"dv-v5-01", exam:"CCDV-F", d:"v5", kind:"recall",
  q:"Which transports does MCP define?",
  a:1,
  opts:["HTTP polling and WebSocket","stdio and Streamable HTTP","gRPC and stdio","WebSocket only"],
  why:"The specification defines stdio for local servers and Streamable HTTP for remote ones, with JSON-RPC 2.0 as the message format over both."},

{ id:"dv-v5-02", exam:"CCDV-F", d:"v5", kind:"scenario",
  q:"You want an MCP server to expose reference documents the model can read but never modify. Which primitive?",
  a:0,
  opts:["A Resource, which is addressable read-only content","A Tool that carries a read-only description","A Prompt template exposed by that same server","A Tool whose write path returns an error instead"],
  why:"Resources are the read-only content primitive; Tools are actions the model invokes. Relying on a description or a runtime error to prevent writes leaves the capability exposed and the restriction advisory."},

{ id:"dv-v5-03", exam:"CCDV-F", d:"v5", kind:"scenario",
  q:"Your agent exposes 40 tools across several MCP servers and selection accuracy is falling. What helps most?",
  a:2,
  opts:["A more capable model, which handles a much larger tool catalog rather more reliably than this","Longer and more detailed descriptions, so that each tool is distinguishable from all the rest","Reducing the catalog available on any single request to the tools that task could plausibly need","Ordering the tools so that the most frequently used ones all appear first in the definitions"],
  why:"Selection degrades with the size of the choice set, so narrowing what is offered per request attacks the cause. Longer descriptions add tokens to every call, and ordering is not how matching works."},

{ id:"dv-v5-04", exam:"CCDV-F", d:"v5", kind:"recall",
  q:"Where does the code behind an MCP tool actually run?",
  a:3,
  opts:["Inside the model, which runs the tool as part of its generation","In the Anthropic API, which executes tools on your behalf","In the SDK client library, which ships the tool runtime","On the MCP server, which your side operates and secures"],
  why:"The model only emits a request to call a tool. Execution happens on the server you run, which is why its permissions, validation and availability are your responsibility."},

{ id:"dv-v5-05", exam:"CCDV-F", d:"v5", kind:"scenario",
  q:"An MCP server is shared by three applications, and one of them needs a breaking change to a tool. How should this be handled?",
  a:1,
  opts:["Change the tool and update all three applications at once","Version the tool, so existing consumers keep working",
        "Fork the server for that application","Ask the other two to stop using that tool"],
  why:"A shared server is a contract with several independent consumers, so a breaking change needs a migration path rather than a flag day. Forking recreates the duplication the shared server was meant to remove."},

{ id:"dv-v5-06", exam:"CCDV-F", d:"v5", kind:"scenario",
  q:"A tool needs a value the model cannot know, such as the authenticated user's id. How should it be supplied?",
  a:0,
  opts:["Injected server-side from the session, never from a model-supplied argument","Added into the system prompt each turn, so the model can pass it along","Declared as a required field in the tool's own input schema","Requested from the user in conversation before that tool is called"],
  why:"Identity must come from the authenticated session, or the model could pass any id and act as another user. Putting it in the schema makes impersonation a single wrong argument away."},

/* ---- v6: Security and Safety ---- */

{ id:"dv-v6-10", exam:"CCDV-F", d:"v6", kind:"scenario",
  q:"An injection reached your agent last week and nobody noticed until a customer reported it. What should the postmortem change?",
  a:1,
  opts:["The system prompt, so it warns the model about this particular phrasing","What the run records, so an unexpected tool call is visible without a report","The model tier, so the agent is less likely to be fooled next time","The fetch step, so pages from unfamiliar domains are refused before reading"],
  why:"Reaching the customer first means detection failed, not just prevention — and the next injection will use a phrasing nobody anticipated. Logging the tool calls each run makes, and alerting on ones the task did not call for, catches the class rather than the instance. Hardening the prompt and raising the tier both address the attempt you already know about; refusing unfamiliar domains breaks the feature for the ordinary case."},

{ id:"dv-v6-11", exam:"CCDV-F", d:"v6", kind:"recall",
  q:"Which practices limit damage if an agent is manipulated?",
  multi:true, a:[0,1,3],
  opts:["Per-tool least-privilege credentials","Human confirmation before irreversible actions","Setting temperature to zero","Server-side validation of tool arguments"],
  why:"Narrow credentials, a gate on irreversible actions and server-side validation all hold regardless of what the model was persuaded to emit. Temperature affects sampling, not authorization, and a deterministic model follows a successful injection just as reliably."},

{ id:"dv-v6-12", exam:"CCDV-F", d:"v6", kind:"scenario",
  q:"Logs from your integration are being shipped to a third-party analytics service. What must be checked?",
  a:1,
  opts:["That the logs are compressed, so the volume stays within the service's limits","Whether message content carrying customer data is sent, and whether that is allowed","That the log format is parseable by the analytics service's ingestion pipeline","That log volume stays within the quota you are paying that service for"],
  why:"Shipping prompts and completions can export personal data to another processor. The right control is deciding what gets captured in the first place rather than assuming the destination is safe."},

{ id:"dv-v6-13", exam:"CCDV-F", d:"v6", kind:"recall",
  q:"What should an error response from your own API expose to the caller?",
  a:2,
  opts:["The full upstream error including the request body","Nothing beyond a generic failure","Enough to act on: a stable code and whether to retry","The model version and prompt used"],
  why:"Callers need to distinguish retryable from permanent failures, which requires a meaningful code. Passing the raw upstream error can leak prompts, keys or internal structure, while a bare failure forces blind retries."},

{ id:"dv-v6-14", exam:"CCDV-F", d:"v6", kind:"scenario",
  q:"A customer asks whether their data is used to train models. Where should the answer come from?",
  a:0,
  opts:["The commercial terms and data-handling documentation that govern your account","The model itself, by asking it directly how your own data gets handled","The SDK documentation, which describes the data that the client sends","An engineer's recollection of what the default setting used to be set to"],
  why:"Data-handling commitments are contractual and account-specific, so the agreement is the authority. The model does not know your contract, and defaults change."},

{ id:"dv-v6-15", exam:"CCDV-F", d:"v6", kind:"scenario",
  q:"An agent has shell access for a legitimate build task. What limits the blast radius?",
  a:3,
  opts:["A system prompt that clearly states which of the commands the agent must never run","Logging every command the agent executes, so that misuse can be identified afterwards","A more capable model, which is a good deal less likely to choose a destructive command","A restricted account in an isolated environment, with destructive commands denied by policy"],
  why:"Isolation and an enforced deny list hold even if the model is wrong or manipulated. Prompts are advisory, logging is after the fact, and capability does not constrain permissions."},

/* ---- v7: Claude Code ---- */

{ id:"dv-v7-01", exam:"CCDV-F", d:"v7", kind:"scenario",
  q:"A CI job runs claude -p \"review this diff\" and hangs indefinitely. The -p flag is present. What is the likely cause?",
  a:1,
  opts:["The prompt exceeds what the model can accept, so the request never completes","Something is waiting on input that will never come, typically a permission prompt","The API is overloaded and the client is retrying with backoff rather than failing","The repository is too large to read, so the agent is still indexing files"],
  why:"Headless mode still blocks when an action needs approval and there is no one to approve it. The fix is configuring permissions so the required actions are allowed or denied outright rather than prompted."},

{ id:"dv-v7-02", exam:"CCDV-F", d:"v7", kind:"recall",
  q:"What does a headless run need to be useful in a build pipeline?",
  multi:true, a:[0,1,3],
  opts:["Machine-parseable output","A meaningful exit status the pipeline checks","Interactive confirmation of each edit","Permissions resolved in advance so nothing waits for approval"],
  why:"Structured output, a checked exit code and pre-resolved permissions are what let a pipeline act on the result. Interactive confirmation is precisely what a headless run cannot do."},

{ id:"dv-v7-03", exam:"CCDV-F", d:"v7", kind:"scenario",
  q:"Two teams in one monorepo need different conventions for their own directories. What is the cleanest mechanism?",
  a:2,
  opts:["One root memory file describing both sets of conventions clearly","Separate repositories, so each team's configuration stands alone","Path-scoped rules, so each directory's conventions apply to its files","A hook that checks the path and applies the right convention"],
  why:"Path scoping expresses exactly this: rules attached to the files they govern, combining with repository-wide context. A single file mixing both invites the wrong convention being applied, and splitting the repository is a large change for a configuration problem."},

{ id:"dv-v7-04", exam:"CCDV-F", d:"v7", kind:"scenario",
  q:"You want an exploration task to run without filling the main session with the files it reads. What fits?",
  a:0,
  opts:["A subagent, which works in its own context and returns only its conclusion","A slash command that runs the exploration and reports what it found","A larger context window, so the files read do not crowd out the work","A memory file describing what the exploration should look for"],
  why:"Context isolation is the reason subagents exist: the search output stays in their window and only the answer comes back. A bigger window still accumulates everything in the main session, and commands and memory files do not provide a separate context."},

{ id:"dv-v7-05", exam:"CCDV-F", d:"v7", kind:"scenario",
  q:"A rule in a committed memory file 'is not working'. What is the most useful first check?",
  a:3,
  opts:["Rewrite the rule more forcefully, since wording determines whether it is followed","Move it to a higher-precedence scope so nothing below can override it","Replace it with a hook, which enforces rather than suggests the behavior","Confirm which configuration the session loaded, and what overrides it"],
  why:"Rules usually fail because they were never loaded or are overridden, not because of wording. Checking what the session actually reads settles it before any rewrite."},

{ id:"dv-v7-06", exam:"CCDV-F", d:"v7", kind:"scenario",
  q:"You want a workflow to run only when you explicitly invoke it, never at the model's discretion. What fits?",
  a:1,
  opts:["A subagent definition file","A slash command, run on invocation","A memory file instruction","A PostToolUse hook rule"],
  why:"Slash commands are user-invoked by definition. Subagents and memory instructions can be drawn on when the model judges them relevant, and a hook fires on an event rather than on your request."},

/* ---- v8: Eval, Testing, and Debugging ---- */

{ id:"dv-v8-05", exam:"CCDV-F", d:"v8", kind:"scenario",
  q:"A bug appears in production but never locally. What is the most direct way to investigate?",
  a:2,
  opts:["Add more logging and wait for the problem to recur in production","Run the same prompt locally many times until it eventually fails","Capture the failing request and its parameters, then replay it exactly","Increase the retry count so a transient failure resolves itself"],
  why:"The failing input is the thing you do not have locally, so capturing and replaying it reproduces the conditions. Blind logging and local repetition exercise inputs that are already working."},

{ id:"dv-v8-06", exam:"CCDV-F", d:"v8", kind:"recall",
  q:"What makes an evaluation suite worth trusting?",
  multi:true, a:[0,1,3],
  opts:["Cases drawn from real production inputs","Known past failures kept as regression cases","A single aggregate score","Explicit criteria a second person would apply the same way"],
  why:"Real inputs, regression cases and reproducible criteria are what make a score mean something. One aggregate number hides the failures that matter most, which is why it is reported alongside them rather than instead of them."},

{ id:"dv-v8-07", exam:"CCDV-F", d:"v8", kind:"scenario",
  q:"Your tests pass consistently but users report poor output. What should you suspect first?",
  a:1,
  opts:["The model has regressed since the tests were written, so the same checks now pass on worse output","The tests measure something other than what users value, often format compliance rather than usefulness","The tests run too infrequently to catch the regression before users encounter it","Users are applying it to inputs outside what the system was designed to handle"],
  why:"Green tests alongside user complaints point at a measurement gap. A regression would show up as failures, and frequency does not change what is being measured."},

{ id:"dv-v8-08", exam:"CCDV-F", d:"v8", kind:"recall",
  q:"Which practices make an integration testable without the live API?",
  multi:true, a:[0,1,3],
  opts:["A replaceable transport so recorded responses can be injected","Fixtures covering tool_use and error responses, not just the happy path","Setting temperature to zero against the live API","Asserting on the request your code builds, independently of any response"],
  why:"An injectable transport, realistic fixtures and request-shape assertions give deterministic tests with no network. A zero-temperature live call is still a billable network request and is not guaranteed identical."},

{ id:"dv-v8-09", exam:"CCDV-F", d:"v8", kind:"scenario",
  q:"An agent sometimes produces a correct answer and sometimes not, from the same input. How should your eval handle this?",
  a:0,
  opts:["Run it several times and report a success rate, while one pass says little","Run it once and record the result, treating that as the case's outcome","Set temperature to zero and run once, which makes the result repeatable","Remove the case, since one that varies cannot be scored meaningfully"],
  why:"For a stochastic system a single trial cannot distinguish a 95% case from a 55% one. Repeating and reporting the rate measures what the user will actually experience; deleting the case hides the least reliable behavior."}

);
