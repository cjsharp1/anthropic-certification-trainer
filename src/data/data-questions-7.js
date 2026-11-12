/* CCAR-P — Claude Certified Architect (Professional).
 * Written against the official exam guide task statements and data-notes.js.
 * Domain ids are weight-ordered and do NOT match the guide's domain numbers:
 *   p2 = D1 Solution Design & Architecture        (17%)
 *   p6 = D2 Claude Models, Prompting & Context    (13%)
 *   p1 = D3 Integration                           (19%)
 *   p3 = D4 Evaluation, Testing & Optimization    (16%)
 *   p4 = D5 Governance, Safety & Risk Management  (14%)
 *   p5 = D6 Stakeholder Communication & Lifecycle (14%)
 *   p7 = D7 Developer Productivity & Enablement    (7%)
 */
QUESTIONS.push(

/* ---- p2 / D1: Solution Design & Architecture (17%) ---- */

{ id:"pr-p2-05", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"A client describes a business problem and immediately proposes a multi-agent architecture. What should your first move be?",
  a:2,
  opts:["Validate that the agents they propose can communicate reliably at the expected scale","Estimate what the multi-agent design they propose would actually cost to run","Establish the business outcome and what counts as success, then pick the pattern","Propose a simpler single-agent design, before that complexity gets locked in"],
  why:"The architecture is a consequence of the requirement, not the starting point. Without a stated outcome and a definition of success you cannot evaluate any design, including the simpler one — proposing that is still answering a question nobody has framed."},

{ id:"pr-p2-06", exam:"CCAR-P", d:"p2", kind:"recall",
  q:"What makes a workflow preferable to an agent for a given task?",
  multi:true, a:[0,1,3],
  opts:["The steps are known in advance","Predictable cost and latency matter","The task involves several tools","Errors are costly and hard to reverse"],
  why:"A known sequence, bounded cost and expensive mistakes all point to a fixed path, where you can reason about what will happen. Needing several tools says nothing either way — a workflow can call tools in a defined order; what distinguishes an agent is deciding the order itself."},

{ id:"pr-p2-07", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"A design review asks what happens when the model returns output that fails schema validation. The design has no answer. How serious is this?",
  a:0,
  opts:["Serious, because undefined behavior at a known failure point is a gap","Minor, since validation failures are rare","Not an issue if the schema is well designed","Acceptable if the system retries automatically when validation fails"],
  why:"Schema validation failing is a certainty over enough calls, so leaving it undefined means the system's behavior at that moment is whatever the code happens to do. A good schema reduces the rate without eliminating it, and an unbounded retry is itself undefined behavior unless the cap and the give-up path are specified."},

{ id:"pr-p2-09", exam:"CCAR-P", d:"p2", kind:"recall",
  q:"What does end-to-end thinking add to an architecture review?",
  a:2,
  opts:["It ensures each component has been individually optimized for its job","It confirms the model tier chosen is appropriate for every step","It surfaces where latency, failure and cost accumulate across the path","It validates that the prompt design is sound at each stage of the flow"],
  why:"Components that each look acceptable can compose into something that is not — three 2-second calls and a retry become a timeout. Only the whole path shows accumulated latency, compounded failure probability and total cost per transaction."},

{ id:"pr-p2-10", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"A client wants to decompose a large task across several model calls. What determines a good decomposition?",
  a:3,
  opts:["Equal size of each step","Minimizing the number of calls","Matching the number of steps to the number of tools available","Each step produces a checkable intermediate result"],
  why:"Checkable intermediates are what make a decomposed system debuggable and let you place validation between stages. Equal sizing and call-count minimization optimize the wrong thing, and tool count is unrelated to where the natural seams are."},

{ id:"pr-p2-11", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"Stakeholders want an agent that can 'handle anything a user asks'. How should you frame the response?",
  a:1,
  opts:["Agree, and design for the maximum flexibility the model can support","Explain that unbounded scope means unbounded failure modes, so propose a defined set","Refuse the requirement, since no system can handle genuinely arbitrary requests","Propose the most capable model available to cover the widest range"],
  why:"An unbounded scope cannot be tested, costed or made safe, so the useful move is converting it into a defined set plus a stated behavior for everything outside it. Refusing addresses nothing, and a stronger model does not bound the problem."},

{ id:"pr-p2-12", exam:"CCAR-P", d:"p2", kind:"recall",
  q:"Which elements belong in an architecture decision record for a Claude system?",
  multi:true, a:[0,1,3],
  opts:["The alternatives considered and why they were rejected","The constraints that drove the choice","The expected token cost per call","How the decision should be revisited if assumptions change"],
  why:"A decision record exists so a future reader understands the reasoning: what else was on the table, what forced the outcome, and what would invalidate it. Token cost is an input to the decision rather than a record of it, and it dates quickly."},

{ id:"pr-p2-13", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"A proposed design routes every request through the most capable model for consistency. How should you assess this?",
  a:2,
  opts:["Sound, since consistent behavior across paths is worth the extra cost","Unsound, since the cheapest tier that clears the quality bar should be used","Reasonable to start with, then match tier to task difficulty once traffic shows","Consistency is a runtime concern rather than an architectural decision"],
  why:"Uniform routing is a defensible default before you know the traffic mix, and premature optimization to the cheapest tier is just the opposite error. What makes it a design rather than an assumption is measuring which paths genuinely need the capability."},

{ id:"pr-p2-14", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"A system must stay available when the model provider has a brief outage. Which design elements address this?",
  multi:true, a:[0,1,3],
  opts:["Timeouts with bounded retry and backoff","A defined degraded mode that does not depend on the model","A larger context window","Queueing work that can be processed later"],
  why:"Bounded retry handles the transient case, a degraded mode keeps the service useful when retries will not help, and queueing defers work that need not be synchronous. Window size is unrelated to availability."},

{ id:"pr-p2-15", exam:"CCAR-P", d:"p2", kind:"recall",
  q:"What distinguishes capability bloat from a well-scoped agent?",
  a:1,
  opts:["The number of model calls each request makes before it completes","Rarely-needed tools stay available on every call, degrading selection","The size of the system prompt once every tool has been described in it","The number of users the agent is expected to serve concurrently"],
  why:"Bloat is about the permanently available surface: more tools make selection harder on every request and each one is reachable if the agent is manipulated. Prompt size and call count are symptoms at most, and user count is unrelated."},

{ id:"pr-p2-16", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"Two teams propose different architectures for the same requirement. What is the most productive way to decide?",
  a:0,
  opts:["Identify what each optimizes for, then test both on the cases that matter","Choose the simpler of the two designs, since simplicity is the safer default","Choose the one proposed by the team with more relevant experience","Combine the strongest elements of both into a single design"],
  why:"Competing designs usually encode different assumptions about what matters, so making those explicit and testing against real cases turns a preference argument into evidence. Simplicity is a tiebreaker rather than a criterion, and combining designs without that analysis inherits the weaknesses of each."},

/* ---- p6 / D2: Claude Models, Prompting & Context Engineering (13%) ---- */

{ id:"pr-p6-08", exam:"CCAR-P", d:"p6", kind:"scenario",
  q:"A prompt performs well in testing but degrades in production on the same task. What should you examine first?",
  a:0,
  opts:["Whether production inputs differ from the test set","Whether the model version changed","Whether the prompt was modified during deployment to production","Whether latency is causing timeouts"],
  why:"The usual cause is that the test set was not representative — real inputs are messier, longer or differently distributed. Version drift and deployment differences are worth ruling out next, but input distribution explains the pattern most often."},

{ id:"pr-p6-09", exam:"CCAR-P", d:"p6", kind:"recall",
  q:"What governs whether prompt caching helps a given workload?",
  a:2,
  opts:["The total size of the prompt being sent on each request","The model tier in use, since caching behaves differently per tier","Whether a large stable prefix is reused enough to amortize the write","Whether the output is structured, which changes what can be cached"],
  why:"Caching stores a prefix, so the benefit depends on that prefix being both substantial and genuinely reused — caching something read once costs more than it saves. Tier and output shape do not determine the economics."},

{ id:"pr-p6-10", exam:"CCAR-P", d:"p6", kind:"scenario",
  q:"An application uses several model tiers for different tasks. What keeps behavior consistent across them?",
  a:1,
  opts:["Using identical prompts across every single one of the tiers the app calls","Define the output contract and validate it, whichever tier produced the result","Routing every one of the requests through the most capable tier available","Setting exactly the same temperature on each tier, so that sampling matches"],
  why:"Consistency is enforced at the boundary: a declared contract plus validation makes the tier an implementation detail. Identical prompts do not guarantee identical behavior across tiers, and uniform routing abandons the reason for tiering."},

{ id:"pr-p6-11", exam:"CCAR-P", d:"p6", kind:"scenario",
  q:"A long-running assistant gradually loses track of earlier decisions. What is the design-level fix?",
  a:3,
  opts:["Increase the context window so the earlier decisions remain visible","Use a more capable model, which holds a longer conversation better","Reduce the length of each response so the history accumulates more slowly","Externalize the decisions that must persist, and re-inject them each turn"],
  why:"Anything that must survive compaction has to live outside the transcript, in state the system re-supplies deliberately. A bigger window delays saturation without preventing it, and model or length changes do not address persistence."},

{ id:"pr-p6-12", exam:"CCAR-P", d:"p6", kind:"recall",
  q:"Which factors belong in a model selection decision for a production path?",
  multi:true, a:[0,1,2],
  opts:["Measured quality on representative examples","Cost and latency at expected volume","Rate limit headroom for peak traffic","The model's release date"],
  why:"Quality on your own data, the economics at real volume and whether capacity covers your peaks are the three things that decide fitness. Recency is a proxy at best and often misleading — a newer model is not automatically better for a specific task."},

/* ---- p1 / D3: Integration (19%) ---- */

{ id:"pr-p1-06", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"Several applications in the organization need the same Claude-backed capability. Which integration pattern fits?",
  a:1,
  opts:["Each application calls the API directly, using a prompt written for it","An MCP server or shared service, maintained once and consumed by all of them","A shared prompt library that every team copies from into its own code","A single application that all of the others call into whenever needed"],
  why:"Reuse across independently maintained applications is the case MCP and shared services exist for: one implementation to fix and version. Direct calls and copied libraries both fork immediately, so an improvement reaches only the team that made it."},

{ id:"pr-p1-08", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"An integration must call a legacy system that is slow and occasionally unavailable. How should the design accommodate it?",
  a:2,
  opts:["Call it synchronously and extend the overall request timeout to suit","Cache all of its responses indefinitely, so it is rarely called at all","Isolate it behind a timeout with a fallback, so failures do not cascade","Replace the legacy system entirely before integrating anything with it"],
  why:"Containing an unreliable dependency behind a timeout and an explicit fallback keeps its problems local. Extending the timeout propagates the slowness to every caller, indefinite caching serves stale data, and replacement is rarely available to the architect."},

{ id:"pr-p1-09", exam:"CCAR-P", d:"p1", kind:"recall",
  q:"What does least privilege mean concretely for an agent integration?",
  multi:true, a:[0,1,3],
  opts:["Each tool gets only the permissions that tool needs","Credentials are scoped per environment, not shared across them","All tools share one service account for simpler auditing","Write and delete operations are separated from read access"],
  why:"Per-tool scoping, per-environment credentials and separating destructive operations from reads all limit what a compromise or a mistake can reach. A single shared account does the opposite: it makes every action look identical in the audit trail and grants every tool the union of all permissions."},

{ id:"pr-p1-10", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"A retrieval-augmented system returns plausible but unsupported answers. Where should you look first?",
  a:0,
  opts:["Whether retrieval is returning relevant passages at all","Whether the model tier in use is strong enough","Whether the prompt actually asks for citations","Whether the context window is large enough for it"],
  why:"If retrieval is surfacing the wrong passages the model is reasoning from poor material, and no amount of capability or instruction fixes that. Evaluate the retrieval step independently before changing anything downstream."},

{ id:"pr-p1-11", exam:"CCAR-P", d:"p1", kind:"recall",
  q:"What should be logged per model call in a production integration?",
  multi:true, a:[0,1,3],
  opts:["Request ID for tracing with support","Token usage for cost attribution","The full text of every user message indefinitely","Stop reason, to tell completion from truncation"],
  why:"Request ID, token usage and stop reason are what you need to diagnose, attribute cost and detect truncation. Retaining full message text indefinitely is a privacy and retention liability rather than an observability requirement."},

{ id:"pr-p1-13", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"A tool in your integration fails intermittently. How should the failure be surfaced to the model?",
  a:2,
  opts:["Raise an exception, so that the loop terminates","Return an empty result from the tool call","Return a tool result flagged as an error, with detail","Retry it silently until the call finally succeeds"],
  why:"A structured error tells the model what happened so it can adapt — wait, try another route, or report. An exception kills the loop, an empty result is indistinguishable from a legitimate no-match, and silent retries can loop indefinitely on a persistent failure."},

{ id:"pr-p1-14", exam:"CCAR-P", d:"p1", kind:"recall",
  q:"When is MCP the right integration mechanism rather than direct SDK calls?",
  a:3,
  opts:["Whenever more than one tool is needed by the app","When latency is critical to the user experience","When the calling application is written in TypeScript","When the same tools serve several independent applications"],
  why:"MCP earns its operational cost through reuse across independently maintained consumers. For tools used by one application it adds a server to run and monitor for no benefit, and it does not improve latency."},

{ id:"pr-p1-15", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"Your integration must handle a traffic spike that exceeds your rate limit. What is the appropriate design response?",
  a:1,
  opts:["Retry immediately, on every rejection, until the request is finally accepted","Queue non-urgent work, apply backoff, and shed load by defined priority","Increase the client timeout, hold the request, and wait for capacity to clear","Route the overflow elsewhere, to a more capable tier, with separate capacity"],
  why:"Exceeding a limit requires reducing or deferring demand, with an explicit decision about what waits. Immediate retries worsen the overload, longer timeouts just hold connections open, and a different tier does not create capacity."},

{ id:"pr-p1-16", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"A design exposes an agent that can call internal APIs on a user's behalf. What must the integration enforce?",
  a:0,
  opts:["That the agent acts with the requesting user's permissions, not a service identity","That every call the agent makes is logged somewhere for later inspection","That responses are cached so the internal APIs get called a good deal less often","That the agent is limited to making a single tool call per user request"],
  why:"Without per-user authorization the agent becomes a path to anything the service account can reach, regardless of who asked. Logging records that after the fact, and caching and tool count are unrelated to the privilege boundary."},

{ id:"pr-p1-17", exam:"CCAR-P", d:"p1", kind:"recall",
  q:"What belongs in the observability design for a Claude system at scale?",
  multi:true, a:[0,2,3],
  opts:["Traces that capture the full tool sequence for a failing run","Average response length per day","Cost attribution by feature or tenant","Alerting on error-rate and latency changes, not just outages"],
  why:"Intermittent failures need the actual sequence from the failing run, cost needs attributing to whoever drives it, and degradation matters before it becomes an outage. Average response length is a number without a decision attached."},

/* ---- p3 / D4: Evaluation, Testing & Optimization (16%) ---- */

{ id:"pr-p3-06", exam:"CCAR-P", d:"p3", kind:"scenario",
  q:"An evaluation set was written by the team from imagination rather than real traffic. What is the main risk?",
  a:1,
  opts:["It is too small a sample to produce a statistically meaningful result","It encodes what the team expects, so it passes while failing on real inputs","It will be biased toward the easy cases the team thought of first","It cannot be automated, so scoring it will not scale with the suite"],
  why:"Hand-written sets reflect the authors' mental model, and the gap between that and real usage is exactly where production failures live. Size and difficulty are fixable; a systematically unrepresentative distribution is not fixable by adding more of the same."},

{ id:"pr-p3-08", exam:"CCAR-P", d:"p3", kind:"recall",
  q:"What makes 'is it good enough to ship' an answerable question?",
  multi:true, a:[0,1,3],
  opts:["A defined threshold agreed in advance","A dataset representative of production","A single accuracy percentage","Explicit treatment of which failure modes are unacceptable at any rate"],
  why:"Shipping decisions need a pre-agreed bar, a representative dataset and a statement of which failures are disqualifying regardless of frequency. A single aggregate number hides exactly those cases — 95% accuracy is unacceptable if the 5% is a safety failure."},

{ id:"pr-p3-09", exam:"CCAR-P", d:"p3", kind:"scenario",
  q:"You want to compare a cheaper model tier against the current one. How should the comparison be run?",
  a:0,
  opts:["Change only the tier and score both on the same fixed dataset","Deploy it to a subset of users and watch for complaints","Compare on new examples collected after making the change","Ask reviewers which of the outputs they prefer, unblinded"],
  why:"One variable against a fixed set is what isolates the tier's effect. Complaint volume is a lagging and noisy signal, a new dataset confounds the change with the data, and unblinded preference invites expectation bias."},

{ id:"pr-p3-10", exam:"CCAR-P", d:"p3", kind:"recall",
  q:"Which optimizations change behavior and therefore require re-validation?",
  multi:true, a:[0,2,3],
  opts:["Dropping to a cheaper model tier","Enabling prompt caching","Shortening the system prompt","Changing the output schema"],
  why:"Tier, prompt content and schema all change what comes back and must be re-scored. Prompt caching alters cost and latency while leaving the request content identical, which is what makes it the one lever that is behavior-neutral by itself."},

{ id:"pr-p3-11", exam:"CCAR-P", d:"p3", kind:"scenario",
  q:"Quality complaints rise six months after launch although nothing in your system changed. What is the most likely cause?",
  a:1,
  opts:["The model has silently degraded since the system was last evaluated","The inputs or expectations have drifted from what the system was built for","The evaluation suite stopped running and the regression went unnoticed","Infrastructure latency increased, so users perceive the output as worse"],
  why:"Systems age against a moving world: the traffic mix changes, usage broadens, expectations rise. That is why evals need refreshing from production data rather than being a launch artefact. The other explanations would be visible in monitoring."},

{ id:"pr-p3-12", exam:"CCAR-P", d:"p3", kind:"recall",
  q:"What does a mixed evaluation methodology combine?",
  a:2,
  opts:["Scores from several tiers, weighted, and combined into one overall figure","Automated tests, run at different frequencies, at each stage of the pipeline","Automated scoring for scale, human review for judgment, production for reality","Unit tests of the components, integration tests of the whole, run together"],
  why:"Each method covers the others' blind spots: automation scales but only measures what you encoded, human review catches quality machines miss but does not scale, and production signals reveal what neither anticipated."},

{ id:"pr-p3-13", exam:"CCAR-P", d:"p3", kind:"scenario",
  q:"A model version upgrade is available. What process should already be in place?",
  a:3,
  opts:["Automatic adoption of whichever version happens to be newest","A rollout schedule that has been agreed with the stakeholders","A plan to rewrite all of the prompts for the new version","A pinned version, a stored eval baseline and a rollback path"],
  why:"Pinning plus a baseline turns an upgrade into a measured decision, and a rollback path makes a bad outcome reversible. Automatic adoption removes the decision entirely, and a schedule or rewrite plan presupposes the upgrade is an improvement."},

{ id:"pr-p3-14", exam:"CCAR-P", d:"p3", kind:"scenario",
  q:"An LLM-as-judge evaluation gives scores that do not match human reviewers. What should you do?",
  a:0,
  opts:["Calibrate the judge against human labels, while disagreement means an ambiguous rubric","Trust the judge, because it applies one consistent standard to every single example","Trust the human reviewers instead and abandon the automated scoring altogether","Average the two sets of scores together so that neither source dominates the result"],
  why:"A judge is only useful once shown to agree with human labels on known cases, and persistent disagreement usually means the criteria are underspecified for both. Consistency is not correctness, abandoning automation loses the scale, and averaging two disagreeing measures produces a number that means nothing."},

/* ---- p4 / D5: Governance, Safety & Risk Management (14%) ---- */

{ id:"pr-p4-09", exam:"CCAR-P", d:"p4", kind:"recall",
  q:"Where should a human-in-the-loop checkpoint be placed?",
  a:1,
  opts:["After every single one of the model calls","Before an action that is costly or irreversible","At the very end of the whole workflow run","Only when the model signals its uncertainty"],
  why:"Review is expensive, so it belongs where it changes the outcome: immediately before the irreversible step. Reviewing everything makes the system unusable, reviewing at the end is too late, and model-signalled uncertainty is not reliable enough to gate on."},

{ id:"pr-p4-10", exam:"CCAR-P", d:"p4", kind:"scenario",
  q:"A prompt injection risk exists because the agent processes untrusted third-party content. What mitigates it?",
  a:0,
  opts:["Treat retrieved content as data, and constrain what the agent may do","Lower the temperature so the agent is less likely to follow an injected instruction","Instruct the model in its system prompt to ignore any instructions it encounters","Use a more capable model, which recognizes injection attempts more reliably"],
  why:"The durable control is limiting the agent's permissions so a successful injection cannot do much, combined with keeping untrusted text out of the instruction channel. Temperature is irrelevant, and an instruction to ignore instructions is itself just text the attacker competes with."},

{ id:"pr-p4-11", exam:"CCAR-P", d:"p4", kind:"recall",
  q:"Which failure modes should a safety review explicitly consider?",
  multi:true, a:[0,1,3],
  opts:["Confidently wrong output accepted without challenge","An agent taking an irreversible action on a misreading","Higher than expected token cost","Untrusted input steering the agent's behavior"],
  why:"Unchallenged errors, irreversible actions and injection are the harms a safety review exists to surface. Cost overrun is a real operational concern but belongs to budgeting rather than safety."},

{ id:"pr-p4-12", exam:"CCAR-P", d:"p4", kind:"scenario",
  q:"Leadership asks whether the system can be certified as always correct. How should you respond?",
  a:2,
  opts:["Yes — provided the evaluation is thorough enough to cover all the realistic cases","No — and on that basis the system should not be put into production at all here","No — commit instead to measured error rates, defined limits and proportionate controls","Defer — the model provider owns the model's behavior and ought to answer this"],
  why:"Guaranteeing correctness is not available, but that does not block deployment: the honest position is a measured error rate with controls sized to the impact. Promising certainty or refusing outright both misrepresent what is achievable."},

{ id:"pr-p4-13", exam:"CCAR-P", d:"p4", kind:"scenario",
  q:"Sensitive data must be used with the system but must not appear in logs. What is the right approach?",
  a:1,
  opts:["Encrypt the logs so the sensitive fields cannot be read at rest","Design what is logged, redacting sensitive fields at the point of capture","Restrict log access to administrators who already handle that data","Delete the logs after a short retention period so exposure is limited"],
  why:"Not capturing the data is the only control that holds regardless of who later gains access. Encryption, access restriction and short retention all reduce exposure of data that is already there."},

/* ---- p5 / D6: Stakeholder Communication & Lifecycle (14%) ---- */

{ id:"pr-p5-07", exam:"CCAR-P", d:"p5", kind:"recall",
  q:"What makes a cost projection for a Claude rollout defensible?",
  multi:true, a:[0,1,3],
  opts:["Measured token usage from representative traffic","Stated assumptions about volume growth","A per-seat license comparison","A sensitivity range rather than a single figure"],
  why:"Measured usage, explicit assumptions and a range that shows what happens if volume doubles are what survive scrutiny. A per-seat comparison describes a different pricing model and does not estimate your consumption."},

{ id:"pr-p5-08", exam:"CCAR-P", d:"p5", kind:"scenario",
  q:"How should an architectural decision be communicated to a non-technical sponsor?",
  a:1,
  opts:["In full technical detail, with the alternatives, so that nothing is hidden","In terms of the trade-off made, its cost, and what it rules out","As a recommendation, briefly stated, without the reasoning behind it","By deferring to the engineering team, who own the decision, to explain it"],
  why:"A sponsor needs the shape of the trade-off to own the decision: what was gained, what was given up, and what is now harder. Full detail obscures that, and a bare recommendation leaves them accountable for a choice they cannot evaluate."},

{ id:"pr-p5-09", exam:"CCAR-P", d:"p5", kind:"recall",
  q:"What belongs in an SLA for an AI-backed capability that differs from a conventional service?",
  multi:true, a:[0,2,3],
  opts:["Expected quality range, not just uptime","Guaranteed identical responses","Defined behavior during provider degradation","How quality regressions are detected and escalated"],
  why:"An AI service commits to a quality envelope, a degraded mode and a regression process in addition to availability. Identical responses cannot be guaranteed, so promising them creates a commitment you will breach."},

{ id:"pr-p5-10", exam:"CCAR-P", d:"p5", kind:"scenario",
  q:"Six months after launch, what lifecycle activities keep the system healthy?",
  multi:true, a:[0,1,3],
  opts:["Refreshing evals from recent production data","Reviewing cost against actual usage patterns","Rewriting prompts on a fixed schedule","Checking whether the original assumptions still hold"],
  why:"Evals drift from reality, costs diverge from the projection, and the assumptions behind the design expire. Rewriting prompts on a calendar changes a working system without evidence that anything is wrong."},

{ id:"pr-p5-11", exam:"CCAR-P", d:"p5", kind:"scenario",
  q:"A stakeholder expects the system to improve automatically over time. How should you correct this?",
  a:2,
  opts:["Agree: newer model versions arrive, land automatically, and lift quality on their own","Explain that improvement needs retraining, on your own data, at your own expense","Improvement comes from deliberate work: refreshed evals, prompt changes, upgrades","Explain that collected interactions feed back, over time, letting the system adapt"],
  why:"A deployed system does not improve on its own; every gain comes from a measured change someone made and validated. Model releases are an opportunity requiring evaluation, not an automatic upgrade, and the system is not being retrained."},

{ id:"pr-p5-12", exam:"CCAR-P", d:"p5", kind:"recall",
  q:"What should a post-launch review cover?",
  multi:true, a:[0,1,3],
  opts:["Whether the measured outcome matched the business case","Which failure modes actually occurred versus those anticipated","The total number of model calls","What the design got wrong and what should change"],
  why:"A review tests the business case against reality, compares predicted failures with actual ones, and records what to do differently. Raw call volume is an operational metric with no decision attached."},

/* ---- p7 / D7: Developer Productivity & Operational Enablement (7%) ---- */

{ id:"pr-p7-05", exam:"CCAR-P", d:"p7", kind:"recall",
  q:"Which mechanisms make a team's agent configuration genuinely consistent?",
  multi:true, a:[0,1,3],
  opts:["Committed project configuration in the repository","Hooks that enforce the non-negotiable rules","A written guideline document","Managed policy for anything that must not be editable locally"],
  why:"Consistency has to be structural: committed settings, hooks that enforce rather than suggest, and a managed layer for rules a developer must not be able to disable. A document describes the intent without making it hold."},

{ id:"pr-p7-07", exam:"CCAR-P", d:"p7", kind:"scenario",
  q:"A rule must hold even if a developer in a hurry tries to bypass it. Where does it belong?",
  a:2,
  opts:["In the project's committed configuration, where it ships","In team documentation that every developer has to read","In the managed layer, which a developer cannot edit locally","In a pre-commit hook that runs before any change lands"],
  why:"Anything in the repository is editable by anyone with commit access, so a rule that must survive a determined developer belongs in the managed layer. Documentation is advisory, and a pre-commit hook can be skipped."}

);
