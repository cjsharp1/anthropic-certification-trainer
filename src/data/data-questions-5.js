/* Question bank, part 5 — written after verifying the app against the official
 * Anthropic exam guides v1.0 (July 2026), downloaded 2026-10-27 from
 * anthropic-partners.skilljar.com/page/partner-certifications
 *
 * These cover task statements the official CCAR-F blueprint tests that earlier
 * parts of the bank missed entirely: plan mode, skill frontmatter, session
 * forking, built-in tool selection, position effects, confidence calibration,
 * and provenance in multi-source synthesis.
 */
QUESTIONS.push(

/* ---- CCAR-F D3: plan mode, skills, commands (Task 3.2 / 3.4) ---- */
{ id:"ar-d3-23", exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"You're restructuring a monolith into microservices — dozens of files, plus decisions about service boundaries and module dependencies. Which approach?",
  a:0,
  opts:["Plan mode: explore, understand dependencies, design before changing anything","Direct execution, incrementally, letting the implementation reveal the boundaries","Direct execution, with comprehensive upfront instructions written for each service","Direct execution, switching to plan mode only when unexpected complexity appears"],
  why:"Plan mode exists for exactly this: large-scale change, multiple valid approaches, architectural decisions. Incremental direct execution risks expensive rework when a dependency surfaces late. Detailed upfront instructions assume you already know the right structure before exploring. The 'switch if it gets complicated' option is the subtle distractor — the complexity is already stated in the requirements, not something that might emerge."},

{ id:"ar-d3-24", scn:["devprod"], exam:"CCAR-F", d:"d3", kind:"recall",
  q:"Which frontmatter options does a SKILL.md support?",
  multi:true, a:[0,1,3],
  opts:["context: fork","allowed-tools","output-format","argument-hint"],
  why:"<code>context: fork</code> runs the skill in an isolated sub-agent context so verbose output doesn't pollute the main conversation. <code>allowed-tools</code> restricts what it can do while running. <code>argument-hint</code> prompts for parameters when invoked bare. Output format is a CLI flag, not skill frontmatter."},

{ id:"ar-d3-25", scn:["codegen","devprod"], exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"A skill performs a codebase analysis that produces pages of output, and it's crowding the main conversation. What fixes it?",
  a:1,
  opts:["Ask the skill to summarize before returning","Add context: fork to the skill's frontmatter","Move the skill to user scope","Restrict its allowed-tools"],
  why:"<code>context: fork</code> runs the skill in an isolated sub-agent context and returns only its result, so the verbose intermediate work never enters the parent conversation. A summarize instruction is probabilistic; scope controls who can use it, not where it runs; and restricting tools limits capability without addressing output volume."},

{ id:"ar-d3-26", exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"A new team member isn't getting coding standards that everyone else seems to have. What's the likely cause, and the first diagnostic?",
  a:1,
  opts:["Their version is outdated, since an older build cannot read the format; check the version","The standards live in user-level config rather than project-level; check which files loaded","Their editor is not syncing the directory, so the files never arrive; have them re-clone","The standards file has grown too long, so later rules are ignored; shorten it and retest"],
  why:"User-level configuration applies only to that user and isn't shared through version control, so an instruction placed there never reaches a teammate. Confirm it by checking which memory files actually loaded in the session before rewriting anything — diagnose first, then move the standards to project scope."},

/* ---- CCAR-F D1: session management (Task 1.7) ---- */
{ id:"ar-d3-27", scn:["codegen"], exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"You want to compare two refactoring strategies starting from the same codebase analysis you already completed. What mechanism fits?",
  a:2,
  opts:["Run both of them in the same session, one after the other","Start two fresh sessions and redo the analysis in each one","Fork the session so each branch inherits the shared analysis","Resume the original session twice, once for each strategy"],
  why:"Forking creates independent branches from a shared baseline — both inherit the completed analysis, and neither contaminates the other. Running sequentially in one session lets the first attempt's reasoning bias the second. Fresh sessions repeat the expensive analysis twice."},

{ id:"ar-d3-28", exam:"CCAR-F", d:"d3", kind:"scenario",
  q:"You resume a session days later, but the files it analyzed have since changed. What's the reliable approach?",
  a:1,
  opts:["Resume the session and simply let it work on from the understanding it already built","Tell it which files changed so it re-reads those, or start fresh with a structured summary","Resume the session and ask it to re-read every single one of the files it consulted","Always start fresh instead, since a resumed session cannot be relied on once files change"],
  why:"A resumed session holds stale tool results and will reason from file contents that no longer exist. Naming the changed files gets targeted re-analysis cheaply. When prior results are broadly stale, starting fresh with an injected summary is more reliable than resuming. Blanket re-reading wastes the context that resumption was meant to preserve."},

/* ---- CCAR-F D2: built-in tools (Task 2.5) ---- */
{ id:"ar-d2-18", exam:"CCAR-F", d:"d2", kind:"recall",
  q:"Which statement correctly describes what Grep and Glob each do?",
  a:1,
  opts:["Glob searches file contents; Grep matches file paths and name patterns","Grep searches file contents; Glob matches file paths and name patterns","Both of them search file contents; Glob is simply the faster of the two","Both of them match file paths; Grep additionally filters results by file type"],
  why:"Grep is content search — finding callers of a function, locating an error string. Glob is path matching — finding every <code>**/*.test.tsx</code>. Confusing them is a common error because both 'search'. Neither tool is a faster version of the other, and neither filters by file type — they answer different questions."},

{ id:"ar-d2-19", exam:"CCAR-F", d:"d2", kind:"scenario",
  q:"An Edit fails because the anchor text appears several times in the file. What's the reliable fallback?",
  a:2,
  opts:["Retry the same Edit with the identical anchor text","Use Grep to count the occurrences before retrying","Read the full file, then Write it back with the change","Split the file so the anchor appears only once"],
  why:"Edit depends on a unique text match. When the anchor isn't unique it can't safely target the change, and Read-then-Write handles it reliably by operating on the whole file. Retrying changes nothing, and counting occurrences diagnoses the problem without resolving it."},

{ id:"ar-d2-20", exam:"CCAR-F", d:"d2", kind:"scenario",
  q:"An agent has 18 tools and selection reliability is poor. Beyond description quality, what's the structural principle?",
  a:1,
  opts:["Tool count does not affect selection reliability at all once each description is written clearly enough","Scope each agent to the tools its role needs, with limited cross-role tools for high-frequency cases","Consolidate everything down into a single tool that takes an action parameter selecting the behavior","Add a routing tool whose only job is to pick the right tool out of the full catalog for the model"],
  why:"Too many tools degrades selection by increasing decision complexity — the guide contrasts 18 tools against a workable 4–5. Scope each agent to its role, then add a narrow cross-role tool where one need is frequent enough to justify the round trip it saves. A routing tool adds a decision rather than removing one."},

/* ---- CCAR-F D5: position effects, calibration, provenance ---- */
{ id:"ar-d5-15", scn:["research"], exam:"CCAR-F", d:"d5", kind:"scenario",
  q:"A synthesis step over a long aggregated input reliably reports findings from the first and last sources but omits several in the middle. What's happening and what helps?",
  a:1,
  opts:["Context overflow — reduce the number of sources until the whole of the input fits","The lost-in-the-middle effect — put key summaries first and use explicit section headers","Temperature is too high, so the model wanders away from the sources in the middle","The model is too small for the input length, and needs upgrading to a much larger tier"],
  why:"Models process the beginning and end of long inputs more reliably than the middle. The input fits, so this isn't overflow. Mitigate by placing a key-findings summary at the start and organizing the body under explicit headers so retrieval doesn't depend on position alone."},

{ id:"ar-d5-16", scn:["extract"], exam:"CCAR-F", d:"d5", kind:"scenario",
  q:"An extraction pipeline reports 97% overall accuracy and the team wants to cut human review. What should you check first?",
  a:1,
  opts:["Whether 97% clears the business threshold","Accuracy broken down by document type and by field","Whether the model self-reports high confidence","The total volume processed"],
  why:"An aggregate can hide a segment failing badly — near-perfect on the common document type, poor on a rarer one that happens to matter. Segment the accuracy before reducing review. Self-reported confidence is unreliable until calibrated against labeled data, and volume says nothing about correctness."},

{ id:"ar-d5-17", scn:["extract"], exam:"CCAR-F", d:"d5", kind:"recall",
  q:"You've automated high-confidence extractions. What keeps you honest about error rates over time?",
  a:1,
  opts:["Re-running the original evaluation set once every month","Stratified random sampling of high-confidence extractions","Monitoring the total throughput through the whole pipeline","Asking the model itself to flag its own likely mistakes"],
  why:"Sampling the high-confidence population is what detects both the ongoing error rate and novel failure patterns that appear after launch. The original eval set only re-measures cases you already knew about. Throughput isn't a quality signal, and a model that was confidently wrong won't flag itself."},

{ id:"ar-d5-18", scn:["research"], exam:"CCAR-F", d:"d5", kind:"scenario",
  q:"Two credible sources report different figures for the same statistic. What should the synthesis output do?",
  a:2,
  opts:["Use the more recent figure, since the newer source supersedes the older one","Average the two figures so neither source dominates the reported result","Present both with source attribution and annotate the conflict","Omit the statistic entirely, since a disputed figure cannot be relied on"],
  why:"Preserve both values with attribution and flag the disagreement — resolving it arbitrarily destroys information the reader needs to judge. Averaging is meaningless for figures measured differently. Note too that requiring publication dates in structured output prevents a temporal difference being misread as a contradiction in the first place."},

{ id:"ar-d5-19", exam:"CCAR-F", d:"d5", kind:"scenario",
  q:"Source attribution keeps getting lost by the time findings reach the final report. Where does the fix belong?",
  a:1,
  opts:["Instruct the synthesis agent to cite its sources more carefully in the output","Require subagents to emit structured claim-source mappings that synthesis preserves","Have the coordinator re-verify each claim against the original source material","Include the full source documents in the synthesis prompt so citations survive"],
  why:"Attribution is lost during summarization when findings are compressed without carrying their mappings. Fix it at the source: each subagent emits the claim alongside its evidence excerpt, source identifier, and date, and synthesis merges those structures rather than flattening them to prose. Re-verification is expensive, and shipping full documents defeats the point of the pipeline."},

/* ---- CCDV-F: gaps from that blueprint ---- */
{ id:"dv-v3-11", exam:"CCDV-F", d:"v3", kind:"recall",
  q:"Which are agentic abstraction frameworks you might build on, as distinct from the Claude Agent SDK?",
  multi:true, a:[0,1,3],
  opts:["Strands","LangGraph","JSON-RPC","PydanticAI"],
  why:"Strands, LangGraph and PydanticAI are agent frameworks named in the Developer blueprint under Agent Patterns and Frameworks. JSON-RPC is MCP's message format, not a framework — it belongs to the Tools and MCPs domain."},

{ id:"dv-v2-15", exam:"CCDV-F", d:"v2", kind:"recall",
  q:"Which prompting approaches are distinguished under LLM fundamentals?",
  multi:true, a:[0,1,2],
  opts:["Zero-shot","Single-shot","Multi-shot","Back-shot"],
  why:"Zero-shot gives no examples, single-shot one, multi-shot several. The terminology matters because the blueprint tests it alongside model options such as fast mode, extended thinking, adaptive thinking, and effort levels."},

{ id:"dv-v1-22", exam:"CCDV-F", d:"v1", kind:"scenario",
  q:"Your team wants the same prompt behavior reproducible across environments and over time. Which configuration practices matter?",
  multi:true, a:[0,1,3],
  opts:["Pin the model version rather than a floating alias","Version the prompts themselves alongside code","Raise max_tokens so output is never truncated","Track plugin dependencies explicitly"],
  why:"Model version pinning, prompt versioning, and plugin dependency tracking are the configuration-management practices the Developer blueprint names. They make behavior reviewable and changes deliberate. The output ceiling affects length, not reproducibility."},

{ id:"dv-v4-04", exam:"CCDV-F", d:"v4", kind:"recall",
  q:"What does 'defensive parsing' mean when consuming model output?",
  a:1,
  opts:["Wrapping the parse in a try/except, because a malformed response can crash","Validating the response rather than assuming it matches the expected shape","Using a stricter regular expression, because it matches only valid output","Parsing only the first line, because that part is least likely malformed"],
  why:"Treat output as untrusted until validated: check the shape, check the values, and stay skeptical of confident-sounding content. The blueprint names 'skepticism toward confident output' explicitly, because fluency and correctness are independent. Swallowing exceptions hides the failure rather than handling it."},

{ id:"dv-v6-09", exam:"CCDV-F", d:"v6", kind:"recall",
  q:"Which belong to secure-by-design practice for a Claude application?",
  multi:true, a:[0,1,2],
  opts:["Least privilege for every component","Identity and access management","PII handling and data-leakage prevention","Raising temperature to make behavior less predictable to attackers"],
  why:"Least privilege, IAM, and explicit PII/leakage handling are the named secure-by-design principles. Temperature has nothing to do with security — that distractor appears in the official sample question on prompt injection, where unpredictability is irrelevant to whether an injection succeeds."}

);
