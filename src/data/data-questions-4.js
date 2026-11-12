/* Question bank, part 4 — see data-questions.js for schema and sourcing notes.
 * Fills out CCAR-P and CCAO-F so both can run a full-length mock,
 * plus further depth on the two focus exams.
 */
QUESTIONS.push(

/* ================= CCAR-P · p1 — Integration (19%) ================= */
{ id:"pr-p1-03", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"A client's Claude integration must call three internal systems, one of which is a legacy service with a 30-second response time. How should the architecture handle it?",
  a:1,
  opts:["Block the agent loop until the legacy service eventually responds","Make that call asynchronous with a defined interim state","Remove the legacy system from scope and work without its data","Cache its responses indefinitely so it is called only once per item"],
  why:"One slow dependency should not set the pace for the whole interaction. Make the call asynchronous with a clear interim state the agent and user can work with, and reconcile when it returns. Blocking ties up resources and degrades every request; indefinite caching trades correctness for speed without anyone deciding that tradeoff."},

{ id:"pr-p1-04", exam:"CCAR-P", d:"p1", kind:"scenario",
  q:"Several teams will consume the same Claude capability. What integration pattern reduces duplicated effort and drift?",
  a:1,
  opts:["Each team integrates directly against the API","A shared service encapsulating prompts, validation and policy","A shared document describing the approach each team should follow","One team owns all AI features"],
  why:"Encapsulate the capability behind one service so prompt construction, validation, and policy live in a single place and improvements reach every consumer. Direct integration per team guarantees divergence, a document describes practice without enforcing it, and centralizing all features in one team creates a bottleneck rather than a platform."},

{ id:"pr-p1-05", exam:"CCAR-P", d:"p1", kind:"recall",
  q:"What should an integration contract between your AI service and its consumers specify?",
  multi:true, a:[0,1,3],
  opts:["Stable error codes and their meanings","Latency expectations and timeout behavior","The exact prompt text used internally","Output schema and versioning policy"],
  why:"Consumers need the interface: what errors mean, how long to wait, what shape comes back, and how changes are versioned. Internal prompt text is an implementation detail — exposing it invites consumers to depend on it, which removes your freedom to improve it."},

/* ================= CCAR-P · p2 — Solution Design (17%) ================= */
{ id:"pr-p2-03", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"A client wants a single agent to handle customer support, billing operations, and internal reporting. What is the architectural concern?",
  a:1,
  opts:["One agent cannot reliably select between that many different tools on each request","They need different permissions and risk controls, so combining maximizes blast radius","It would simply be too slow, since every request has to carry the whole tool catalog","The context window cannot hold all the instructions that three domains would require"],
  why:"Conflating roles means the union of all their privileges sits behind one conversation: a support interaction gains billing authority it should never have. Separate agents with separate permissions keep failures and injections contained. Tool count and context are secondary to the security boundary."},

{ id:"pr-p2-04", exam:"CCAR-P", d:"p2", kind:"scenario",
  q:"Reviewing a proposed design, you notice there is no defined behavior for when the model's output fails validation. What should you require?",
  a:1,
  opts:["Better prompts, tested against the schema, so that validation does not fail","An explicit path: bounded retry, then fallback or escalation, recorded","Removal of the validation step, which adds a failure mode, not a safeguard","Validation in testing only, not in production, so releases are never blocked"],
  why:"Validation will fail sometimes — that is why it exists. The design has to say what happens next and bound it: retry a limited number of times, then fall back or escalate, and record the event so the rate is visible. Hoping better prompts prevent failure leaves the system with undefined behavior exactly when something has gone wrong."},

/* ================= CCAR-P · p3 — Evaluation & Optimization (16%) ================= */
{ id:"pr-p3-04", exam:"CCAR-P", d:"p3", kind:"scenario",
  q:"Your eval suite passes consistently but users still report poor results. What is the most likely explanation?",
  a:1,
  opts:["Users are using it wrong","The eval set does not represent real usage","The model has degraded","The metrics are miscalculated and do not reflect the real result"],
  why:"A suite that passes while users complain is measuring the wrong thing — usually because it was built from imagined cases rather than observed ones. Sample real traffic, find where it diverges from your set, and fold those cases in. 'Users are using it wrong' describes usage your design failed to anticipate, which is your problem to solve."},

{ id:"pr-p3-05", exam:"CCAR-P", d:"p3", kind:"recall",
  q:"Which optimization steps should be validated against evals before rollout?",
  multi:true, a:[0,1,2,3],
  opts:["Switching to a cheaper model tier","Shortening the system prompt","Enabling prompt caching","Changing the output schema","Renaming internal variables in the calling code"],
  why:"All of them. Each looks locally safe and can shift behavior: a cheaper tier changes capability, a shorter prompt may drop a constraint that was doing quiet work, caching can change what content sits in the prefix, and a schema change alters what the model is asked to produce. Re-run the suite on every one. A refactor that cannot change what is sent to the model has no effect on output quality, so it needs no eval run."},

/* ================= CCAR-P · p4 — Governance & Risk (14%) ================= */
{ id:"pr-p4-03", exam:"CCAR-P", d:"p4", kind:"scenario",
  q:"A system makes recommendations that affect people's access to a service. What governance element is essential?",
  a:1,
  opts:["A disclaimer telling users that AI was involved in it","A documented basis for each decision, and a way to contest it","A model accurate enough to be trusted without review","Response times fast enough to feel interactive to users"],
  why:"Decisions affecting people require explicability and recourse: a record of what drove each recommendation, and a path for someone to challenge it and reach a human. A disclaimer notifies without providing either. Accuracy reduces error rates but says nothing about what happens to the person on the wrong end of one."},

{ id:"pr-p4-04", exam:"CCAR-P", d:"p4", kind:"recall",
  q:"What belongs in a risk register for a production Claude system?",
  multi:true, a:[0,1,2],
  opts:["Failure modes with likelihood and impact","Mitigations and who owns each","Residual risk accepted by a named decision-maker","The model's benchmark scores"],
  why:"A risk register records what can go wrong, how likely and how bad, what reduces it, who owns that, and — critically — what residual risk was knowingly accepted and by whom. Benchmark scores are capability evidence, not risk management, and including them tends to substitute a reassuring number for the actual analysis."},

/* ================= CCAR-P · p5 — Stakeholder & Lifecycle (14%) ================= */
{ id:"pr-p5-03", exam:"CCAR-P", d:"p5", kind:"scenario",
  q:"Six months after launch, quality complaints are rising although nothing in your system changed. What lifecycle practice should have been in place?",
  a:1,
  opts:["An annual review, since the original acceptance criteria need revisiting","Ongoing monitoring of real output quality, since usage drifts","A larger evaluation set, since the launch set was too small to be reliable","Fuller documentation, since how the system should behave was never written down"],
  why:"Systems degrade relative to a moving world: users bring new cases, the business changes, upstream data shifts. Continuous quality monitoring on live traffic catches drift; a point-in-time eval only proves the system was right once. Annual review is far too coarse to catch a gradual slide."},

{ id:"pr-p5-04", exam:"CCAR-P", d:"p5", kind:"scenario",
  q:"An executive sponsor asks for a cost projection before a rollout. What makes the estimate defensible?",
  a:1,
  opts:["The vendor's published list price per token for the tier that was chosen","Measured token usage per task times projected volume, with a range for growth","The pilot's total spend to date, scaled up by the number of users expected","A fixed per-user license estimate, based on comparable tooling elsewhere"],
  why:"Build from measured usage on real tasks, not list price — actual consumption includes retries, tool-call round trips, and prompt overhead that a per-token figure hides. Give a range rather than a point estimate, and state the volume assumption, so the sponsor can see which variable moves the number."},

/* ================= CCAR-P · p6 — Models, Prompting, Context (13%) ================= */
{ id:"pr-p6-03", exam:"CCAR-P", d:"p6", kind:"scenario",
  q:"Different teams have written their own prompts for the same underlying task, with varying quality. What architectural remedy fits?",
  a:1,
  opts:["Mandate that a central team reviews every prompt before any team uses it","A shared library of versioned, tested templates teams compose against","Ban custom prompts so every team uses the same standard wording","Standardize on one model tier so prompt differences matter less"],
  why:"Give teams a tested artifact to build on rather than a gate to pass through: versioned templates spread improvements automatically and leave room for legitimate variation. Central review becomes a bottleneck, banning customization ignores real differences between use cases, and the model is not the source of the variance."},

{ id:"pr-p6-04", exam:"CCAR-P", d:"p6", kind:"recall",
  q:"When designing context strategy for a long-lived assistant, what should be decided explicitly?",
  multi:true, a:[0,1,3],
  opts:["What must persist across sessions versus within one","What may be summarized and what must stay verbatim","Which model to use","Where durable state lives and who can read it"],
  why:"Context strategy is a set of deliberate decisions about retention, fidelity, and storage — including the access controls on whatever persists, since durable conversation state often contains sensitive material. Model choice is a related but separate decision that follows from the workload."},

/* ================= CCAR-P · p7 — Developer Productivity (7%) ================= */
{ id:"pr-p7-03", exam:"CCAR-P", d:"p7", kind:"scenario",
  q:"You want to measure whether AI-assisted development is actually helping. What is a reasonable approach?",
  a:1,
  opts:["Count the lines of code generated with assistance versus without","Track outcomes such as cycle time and defect rate, plus reported experience","Count tool invocations as a proxy for how much the assistance is used","Survey developer satisfaction, which captures whether the tooling feels helpful"],
  why:"Measure outcomes that matter — how long work takes end to end and whether quality holds — paired with qualitative input, since numbers alone miss friction developers feel. Volume metrics like generated lines or invocation counts reward activity rather than results, and optimizing for them actively misleads."},

/* ================= CCAO-F — Associate Foundations ================= */
{ id:"as-a1-04", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"Claude produces a table of figures for a report. What should you check before using it?",
  a:1,
  opts:["That the formatting is consistent throughout","That the figures trace back to the source data","That the table has been sorted correctly","That the column headers are clear to a reader"],
  why:"Arithmetic and transcription are exactly where confident-looking output can be quietly wrong, and a well-formatted table makes errors less visible rather than more. Trace the numbers to the source. Formatting, sorting, and headers matter for readability, but a tidy table of wrong figures is worse than a messy one."},

{ id:"as-a1-05", exam:"CCAO-F", d:"a1", kind:"recall",
  q:"Which signals suggest output needs closer verification?",
  multi:true, a:[0,1,2],
  opts:["Specific statistics or dates","Claims about recent events","Named sources or quotations","Formatting that matches your request"],
  why:"Specific facts, recent events, and attributed quotations are the categories where errors are both most likely and most consequential. Matching the requested format tells you the instruction was followed — it says nothing about whether the content is accurate, and the polish can make verification feel unnecessary."},

{ id:"as-a2-04", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"You built a useful prompt and colleagues want to use it. What is the most durable way to share it?",
  a:1,
  opts:["Paste it into a team chat message, so that everyone can copy it out from there","Store it in a shared, version-controlled location with notes on when to use it","Email it round to the team, so each person has their own copy that they can adapt","Describe it in a meeting, so that people understand the reasoning behind it first"],
  why:"A shared versioned location gives one authoritative copy that improves over time and carries guidance on when it applies. Pasted and emailed copies fork immediately, so a fix made by one person never reaches anyone else, and nobody can tell which version is current."},

{ id:"as-a3-03", exam:"CCAO-F", d:"a3", kind:"recall",
  q:"Which responsibilities stay with the human when using Claude for work output?",
  multi:true, a:[0,1,2,3],
  opts:["Accuracy of what is published","Appropriateness for the audience","Compliance with policy and regulation","Judgment about whether to act on a recommendation","Generating the first draft"],
  why:"All of them. The tool changes how the work is produced, not who is accountable for it. This is the central responsible-use principle at Associate level: the person sending, publishing, or acting on output owns it regardless of what drafted it. Drafting is precisely what you are delegating. What stays with you is judgment about the result, not the production of it."},

{ id:"as-a4-03", exam:"CCAO-F", d:"a4", kind:"scenario",
  q:"You need output in a very specific structure for a downstream process. Best prompting approach?",
  a:1,
  opts:["Describe the required structure in careful detail","Provide a filled-in example of the exact structure","Ask for output that is 'well-structured' instead","Request the output twice over and compare the two"],
  why:"A concrete example removes ambiguity that prose descriptions leave open — the model matches a demonstrated shape more reliably than it reconstructs one from description. 'Well-structured' is subjective, and comparing two outputs diagnoses inconsistency without fixing the underspecification causing it."},

{ id:"as-a5-03", exam:"CCAO-F", d:"a5", kind:"scenario",
  q:"A task needs careful reasoning over a complex document, and accuracy matters more than speed. What should guide your choice?",
  a:1,
  opts:["The cheapest option, because cost per call is what compounds at volume","A more capable model, since the task's difficulty justifies it","The fastest option, because a long document already takes time to process","Several cheaper calls, because splitting the document spreads the difficulty"],
  why:"Match capability to difficulty. Careful reasoning over complex material is where a capable model earns its cost, and errors here are expensive in rework and trust. Splitting a task requiring integrated understanding into fragments often makes it worse, since no single call sees the whole picture."},

{ id:"as-a6-03", exam:"CCAO-F", d:"a6", kind:"scenario",
  q:"Your organization has guidelines about which data may be used with AI tools. Where should those live for daily work?",
  a:1,
  opts:["In an onboarding slide deck, so that everyone sees them when they first join","Somewhere people encounter them at the moment of use, not only at onboarding","In the IT policy wiki, alongside all of the organization's other data rules","In a yearly training module that every member of staff must complete"],
  why:"Guidance consulted once at onboarding is not recalled months later under time pressure. Put it where the decision happens — in the tool's configuration, in the workspace, in a template — so the right behavior is the easy path. Wikis and annual modules serve as reference, not as the primary control."},

{ id:"as-a7-03", exam:"CCAO-F", d:"a7", kind:"scenario",
  q:"A prompt that worked well last month now gives worse results on similar inputs. What is worth checking first?",
  a:1,
  opts:["Assume the model has got worse and switch to a more capable tier","Whether the inputs have actually changed in some way the prompt did not anticipate","Rewrite the prompt completely, since the old version has clearly stopped working","Switch to a different tool, since the prompt is no longer producing value"],
  why:"'Similar inputs' often turn out not to be — a new document format, longer content, or a case the prompt never covered. Compare a failing input against one that used to work before concluding anything about the model. A full rewrite discards what was working and makes the cause harder to identify."},

{ id:"as-a7-04", exam:"CCAO-F", d:"a7", kind:"recall",
  q:"Which adjustments typically improve a weak prompt?",
  multi:true, a:[0,1,3],
  opts:["Stating the audience and purpose","Giving an example of the desired output","Adding emphatic language","Specifying what to exclude as well as include"],
  why:"Audience and purpose let the model make judgment calls you did not spell out, an example pins the format, and stating exclusions resolves ambiguity about scope. Emphatic language adds insistence without information — if the instruction was unclear, capitalizing it does not clarify it."},

{ id:"as-a2-05", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"You are deciding whether to automate a step with Claude. What makes a step a poor candidate?",
  a:1,
  opts:["It happens frequently enough that automating it would save real time","Verifying the output costs nearly as much effort as doing the work","It involves writing, which is what the model is strongest at doing","It requires output in a specific format the model must match exactly"],
  why:"The value of automation is the work saved net of verification. When checking the output takes about as long as producing it yourself, there is little gain and an added error path. Frequency, writing, and format requirements are all neutral or favorable — frequency in particular increases the payoff."},

{ id:"as-a5-04", exam:"CCAO-F", d:"a5", kind:"recall",
  q:"What does a larger context window let you do?",
  a:1,
  opts:["Get more accurate answers, since the model has more room to reason","Include more material in a single conversation before running out of room","Produce longer output automatically, scaled to the size of the window","Avoid the need to verify output, since more context means fewer errors"],
  why:"It is a capacity for input, not a quality improvement: more documents or a longer conversation fit before you must summarize or split. Output length is a separate limit, accuracy depends on the model and the task, and nothing about capacity reduces the need to check results."},

{ id:"as-a3-04", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"A colleague shares AI-generated analysis that influenced a business decision, and it turns out to contain an error. What is the main process lesson?",
  a:1,
  opts:["Stop using AI for any analysis that will go on to feed a business decision","Output feeding a decision needs a verification step proportional to the stakes","Use a considerably more capable model tier for analysis work in the future","Add a disclaimer to all future analyses noting that AI was involved in them"],
  why:"The failure is in the process, not the tool: analysis that drives a decision needs review scaled to what the decision costs if wrong. Abandoning the tool forfeits real value, a better model lowers but does not eliminate error rates, and a disclaimer shifts blame without catching anything."}

);
