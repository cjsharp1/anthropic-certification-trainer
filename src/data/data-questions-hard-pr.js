/* CCAR-P — hard tier. See data-questions-hard-ao.js for the standard, and
 * VERIFICATION.md for the source behind each answer.
 *
 * Professional is the one exam where the distractors should be positions a
 * competent architect might actually defend in a review. The question is
 * rarely "which is correct" and usually "which tradeoff did this design
 * make without noticing".
 */
QUESTIONS.push(

/* ---- p1: Integration (19%) ---- */

{ id:"hd-p1-01", exam:"CCAR-P", d:"p1", difficulty:"hard", kind:"scenario",
  q:"A design puts a 2-second SLA on a user-facing path backed by a model call whose p99 is 6 seconds. The team proposes a 2-second timeout with a cached previous answer as the fallback. What should the review raise?",
  a:3,
  opts:["The p99 should be brought under 2 seconds by moving to a faster tier, since a timeout that fires on 1% of traffic is not a design so much as an admission.",
        "The SLA should be renegotiated, because committing to a latency the component cannot meet guarantees a breach the design then has to paper over.",
        "A cached answer is the wrong fallback for a user-facing path, and the honest behavior is to return an error the caller can act on.",
        "What the cached answer means to the user: served silently it is indistinguishable from a fresh one, so staleness becomes invisible rather than handled."],
  why:"The timeout and fallback are a reasonable shape and the design has not said what the user sees. A previous answer served silently is a correctness problem wearing a latency solution: the user cannot tell, and neither can anyone reading the logs later. Label it, or decide it is not acceptable. The first two options are worth discussing and both duck the question by changing the inputs. The third is defensible and too absolute, since a clearly-labeled stale answer beats an error for many read paths."},

{ id:"hd-p1-02", exam:"CCAR-P", d:"p1", difficulty:"hard", kind:"scenario",
  q:"Four teams each integrate the model directly. An architect proposes a shared gateway for policy, logging and version pinning. A team lead objects that their latency budget cannot absorb another hop. How should this resolve?",
  a:1,
  opts:["The gateway should simply be mandated outright, since consistent policy and audit across four teams outweighs a hop that is small next to the model call.","Measure the hop against that team's actual budget and if it genuinely does not fit, ship the controls as a library they link rather than a service they call.","The objecting team should be exempted and the gateway adopted by the other three, since one integration carrying its own controls is an acceptable cost.","The gateway should be made optional throughout, since teams will adopt it where their latency allows and fall back to direct integration where it does not."],
  why:"The controls are the requirement; the gateway is one way to deliver them. A library gives the same policy, logging and pinning in-process, which answers the objection without losing the thing worth having. The first option is probably right on the numbers and settles a factual question by assertion. The third and fourth both end with an integration nobody is governing, which is the exact problem the gateway was proposed to solve — and the exemption will not be the last one."},

{ id:"hd-p1-03", exam:"CCAR-P", d:"p1", difficulty:"hard", kind:"scenario",
  q:"An audit asks you to explain a decision the system made eight months ago. You hold the prompt template, the inputs, and the response. What is missing, and what does that prevent?",
  a:0,
  opts:["The model version and the prompt version in force at the time, without which you cannot show that today's reconstruction matches what actually ran.","The reasoning the model gave at the time, without which you can show what was produced but never show why it was produced that way.","Nothing material is missing: the inputs and the response together are the decision, and re-running them today demonstrates the same behavior.","An approver's sign-off, without which the record shows what the system did but not that any person accepted it at the time."],
  why:"A template and a response do not identify what ran: the template has changed since, and so has the model. Re-running today produces a result from today's system, which is a different claim from the one the audit is asking you to support. The fourth option names something that should also exist and is about authorization rather than reconstruction. The second is the tempting one — the model's stated reasoning reads like an explanation and is a plausible narrative, not a record of what determined the output."},

/* ---- p2: Solution Design & Architecture (17%) ---- */

{ id:"hd-p2-01", exam:"CCAR-P", d:"p2", difficulty:"hard", kind:"scenario",
  q:"A client asks for a multi-agent system. The work is a five-step pipeline with a known order. They have read about agents and are enthusiastic. What does the engagement call for?",
  a:2,
  opts:["Build what they asked for — they own the requirement, they have read the material, and overriding it exceeds the brief.","Build the pipeline and call it the multi-agent system — the outcome they are buying is the pipeline, not the label.","Show the comparison — cost, predictability, debuggability — recommend the pipeline, and build what they choose once the tradeoff is visible.","Propose the pipeline as phase one and the multi-agent design as phase two — their goal stays alive, and something ships."],
  why:"Surfacing a tradeoff the client cannot see is the expertise they engaged you for, and the decision stays theirs once it is visible. The first option mistakes deference for professionalism. The second is the one to be clear about: describing a pipeline as something it is not is a misrepresentation, whatever the outcome. The fourth sounds diplomatic and commits to a second phase that the comparison may show should never be built."},

{ id:"hd-p2-02", exam:"CCAR-P", d:"p2", difficulty:"hard", kind:"scenario",
  q:"A system must hit 99% accuracy. Measured accuracy is 94% and six weeks of prompt and model work has moved it to 94.6%. What is the architectural response?",
  a:1,
  opts:["Continue iterating, since 94.6% from 94% over six weeks is real progress and the remaining gap is a matter of sustained effort.",
        "Stop closing the gap in the model and design around it: route the least confident cases to a person so the system as a whole meets the bar.",
        "Challenge the 99% requirement, since a number arrived at without reference to what an error actually costs is not a real constraint.",
        "Move to a more capable tier, because six weeks of prompt work without a breakthrough indicates the task exceeds this model's capability."],
  why:"The evidence is that prompt-level work has plateaued, and the standard pattern is to automate the confident majority and route the rest — the system meets 99% even though the model does not. The third option is sometimes the right conversation and does not get to be the first move, because it asks the client to lower a bar before you have shown what you can build against it. The fourth is worth testing and is a tier change presented as a plan."},

{ id:"hd-p2-03", exam:"CCAR-P", d:"p2", difficulty:"hard", kind:"scenario",
  q:"Two designs meet the requirement. One is a single agent with eight tools; the other splits into three agents by privilege boundary — read-only research, drafting, and a billing agent. The second costs more in latency and coordination. When is it right?",
  a:0,
  opts:["When the privileges genuinely differ, because a single agent holds the union of them and one confused run or injection can reach all eight tools.","When the team is large enough that three agents can be owned and operated separately without the coordination overhead becoming its own bottleneck.","When the task is complex enough that a single agent's context would otherwise fill with material drawn from unrelated parts of the same work.","Whenever billing is involved at all, since financial operations should always be isolated from the rest of a system as a matter of standing policy."],
  why:"Splitting by privilege converts a design question into a containment one: with one agent, a successful injection during a support interaction reaches billing authority it never needed. The third option is a genuine reason to split and a weaker one, since context can be managed within a single agent. The second is about team structure rather than the system. The fourth reaches the right answer here by a rule that would also split things that do not need splitting."},

/* ---- p3: Evaluation, Testing & Optimization (16%) ---- */

{ id:"hd-p3-01", exam:"CCAR-P", d:"p3", difficulty:"hard", kind:"scenario",
  q:"Prompt A scores 91% and prompt B 93% on a 60-case eval. A team proposes shipping B. What is the sound reading?",
  a:2,
  opts:["Ship B, since two points is two points, and the higher score on the same suite, absent any other reason, settles it.","Re-run both three times, take the more frequent winner, and treat one pass over 60 cases as too noisy to trust.","Two points on 60 cases is about one item, which the suite cannot resolve, so decide on cost, latency or maintainability.","Ship A, since inside the margin of error the established prompt wins, and B brings unknown behavior with it."],
  why:"60 cases means each one is 1.7 points, so a two-point difference is roughly one item changing hands and the suite cannot tell the two apart. The second option is the subtle trap: re-running a deterministic scoring pass over a fixed set does not generate new information about which prompt is better. The fourth reaches a defensible decision by inventing a tiebreak rule rather than naming the real one, which is that the measurement does not decide it."},

{ id:"hd-p3-02", exam:"CCAR-P", d:"p3", difficulty:"hard", kind:"scenario",
  q:"A model-as-judge scores an eval suite and reports 96%. Human review of a 30-case sample agrees with the judge on 29. A reviewer says this validates the judge. What is the limit of that conclusion?",
  a:3,
  opts:["Thirty cases is far too small a sample to validate a judge, and the agreement rate needs several hundred before it can mean very much.","Agreement at 29 of 30 sits within noise of the 96% the judge reported, so the sample has confirmed the judge's number rather than its judgment.","The sample should have been drawn from the cases the judge marked as failures, since agreement on the passes is by far the easier half.","It validates the judge on the distribution sampled, so a blind spot shared with the generator stays invisible"],
  why:"Calibrating a judge against human labels is the right practice and what it establishes depends entirely on what was sampled. A judge sharing the generator's blind spot is systematically wrong in the same direction, and a sample from the same distribution agrees with it in the same direction. The third option is a good idea and addresses a different weakness. The first names a real concern about sample size that is secondary to what the sample was drawn from."},

/* ---- p4: Governance, Safety & Risk Management (14%) ---- */

{ id:"hd-p4-01", exam:"CCAR-P", d:"p4", difficulty:"hard", kind:"scenario",
  q:"A system recommends which loan applications proceed to manual underwriting. A human approves every recommendation before it takes effect. In practice approval takes a few seconds and is almost never refused. Is the control sound?",
  a:1,
  opts:["Yes: a human approves each decision, which is the requirement, and how long they take is a matter of their judgment.",
        "No: an approver without the information, time or standing to refuse is recording a decision rather than making one.",
        "No, because the recommendation itself shapes the outcome, and any human-in-the-loop over a model recommendation is theatre.",
        "Yes, provided the approval rate is monitored, since a rate that stays near 100% is the signal that the control has stopped working."],
  why:"A gate is a control when refusal is a live possibility, which requires the approver to have the basis, the time and the standing to refuse. Seconds per case and near-total approval says none of those hold. The fourth option is the hardest to separate: monitoring the rate is genuinely good practice, and it detects the failure rather than fixing it — and a near-100% rate can also mean the system is simply right. The third over-corrects into a position that would rule out human oversight everywhere."},

{ id:"hd-p4-02", exam:"CCAR-P", d:"p4", difficulty:"hard", kind:"scenario",
  q:"A model version update is available. The eval suite passes at the same aggregate score on the new version. The system is in a regulated domain. What does the governance process require beyond the score?",
  a:2,
  opts:["A rollback plan, since an aggregate score cannot anticipate every possible behavior change, and the ability to revert is what makes adoption safe.","A period of parallel running, with both of the versions scored against live production traffic before the older one is retired completely.","Re-validating the safety cases specifically, because the controls were tuned against the old version's behavior on exactly the edges an aggregate hides.","Sign-off from the risk function, since a version change inside a regulated domain is a change of record whatever the evaluations happen to show."],
  why:"An aggregate holds while a low-volume, high-consequence category moves — and in a regulated domain those categories are the ones the controls exist for. The safeguards were tuned against the old version's behavior on those edges, so the same score does not mean the same safety. The other three are all things a mature process would also do, and each is a procedural wrapper around the technical question rather than an answer to it."},

/* ---- p5: Stakeholder Communication & Lifecycle (14%) ---- */

{ id:"hd-p5-01", exam:"CCAR-P", d:"p5", difficulty:"hard", kind:"scenario",
  q:"An executive asks for the cost of a rollout. Your pilot ran 400 requests at $0.012 each. Projected volume is 90,000 a month. What do you present?",
  a:3,
  opts:["$1,080 a month, with the caveat that pilot conditions may not hold and the figure should be revisited after the first month at volume.",
        "A refusal to project, since 400 requests is not a basis for a figure that will be quoted back at you once it is wrong.",
        "$1,080 as a floor and roughly double as a ceiling, since cost per request at volume is typically higher than in a pilot.",
        "A range, with the drivers named: context growth per request, cache hit rate, tier mix, retries, and the review time the pilot excluded."],
  why:"Multiplying out gives $1,080 and the figure's weakness is not precision, it is that the pilot's cost per request is not the production one — prompts accrete context, caching behaves differently under real traffic patterns, retries appear, and review time was never counted. A sponsor who knows the number hinges on cache hit rate can ask about cache hit rate. The third option reaches a range by a rule of thumb rather than by naming what moves it, which is the part that makes an estimate defensible."},

{ id:"hd-p5-02", exam:"CCAR-P", d:"p5", difficulty:"hard", kind:"scenario",
  q:"Six months after launch, complaints are rising. Nothing in the system has changed: same prompt, same pinned model version, same code. What is the most likely explanation?",
  a:0,
  opts:["The inputs or the expectations have moved, which is what pinning cannot protect against and what continuous measurement exists to catch.","The pinned version has been silently migrated, since providers retire versions over time and route pinned requests on to a successor model.","The evaluation suite stopped running at some point, and a regression has been quietly accumulating ever since without anyone noticing it.","Usage has grown to the point where latency has degraded, and users are reporting that slowdown to you as a drop in output quality."],
  why:"Pinning holds the system still; it does nothing about the world moving around it. Six months is ample for the input mix to broaden and for expectations to rise as people get used to the thing. The second option describes something that would be announced rather than silent. The third and fourth are worth checking and each would leave a trace — a stopped job, a latency graph — whereas drift leaves nothing but the complaints."},

/* ---- p6: Claude Models, Prompting & Context Engineering (13%) ---- */

{ id:"hd-p6-01", exam:"CCAR-P", d:"p6", difficulty:"hard", kind:"scenario",
  q:"Four teams have written their own prompt for the same underlying task, with varying quality. An architect proposes a central team owning all prompts. What is the better structure?",
  a:1,
  opts:["Central ownership is right: one team writing every prompt, with its own review, is the way to guarantee a consistent standard.","A shared prompt component with the variable parts parameterized, owned centrally, with each team supplying its own context.","A published style guide, a review step, and local ownership, leaving each team to meet an agreed standard its own way.","Leave them separate, compare their eval scores, and promote whichever prompt performs best to a shared default."],
  why:"The problem is that there is no single definition to improve, and composition fixes exactly that: the shared part has one owner and one place to change, while domain knowledge stays with the team that has it. The first option solves the inconsistency and removes the domain knowledge and creates a bottleneck. The third keeps four prompts drifting under supervision. The fourth is reasonable and slow, and the winner is still one team's prompt applied to four contexts."},

{ id:"hd-p6-02", exam:"CCAR-P", d:"p6", difficulty:"hard", kind:"scenario",
  q:"A production prompt carries eighteen months of accumulated exceptions. Current behavior is acceptable. An engineer proposes pruning the stale ones. The team asks what the risk of leaving it is. What do you say?",
  a:2,
  opts:["Token cost, which grows with every exception added and is paid on every request for rules that no longer apply to anything.",
        "Very little, since the behavior is acceptable and a prune risks removing an exception whose purpose nobody currently remembers.",
        "Stale instructions compete with current ones for attention, so behavior drifts and each new change lands in a prompt nobody can reason about.",
        "Evaluation coverage, since a suite written against current behavior cannot tell which of eighteen months of exceptions are still doing work."],
  why:"Accumulated exceptions do not sit inertly: they dilute the directives that still matter, which makes behavior less predictable and every subsequent change harder to reason about. The second option states the real cost of pruning and uses it to argue for never pruning, which is how prompts become unmaintainable. Token cost and eval coverage are both true and both consequences of the same underlying problem rather than the problem itself."},

/* ---- p7: Developer Productivity & Operational Enablement (7%) ---- */

{ id:"hd-p7-01", exam:"CCAR-P", d:"p7", difficulty:"hard", kind:"scenario",
  q:"Leadership wants the ROI of an AI tooling rollout. Adoption is 85%, generated line counts are up sharply, and developer survey sentiment is positive. What is missing from this picture?",
  a:3,
  opts:["A control group, since adoption, line counts and sentiment cannot be attributed to the rollout without comparable teams.","Cost, since adoption, line counts and sentiment are all benefit-side, and ROI needs license and token spend on the other side.","Statistical rigour, since adoption and sentiment are self-reported, and only the line count is measured objectively.","Any measure of whether work is actually getting done faster or better: cycle time, defect rates, review burden."],
  why:"All three figures measure activity and feeling, and none measures outcome — a team can adopt enthusiastically, generate a great deal of code, enjoy it, and ship no faster because review absorbed the gain. Cycle time on comparable work is the figure that would show it. The second option is correct that ROI needs a denominator and treats the numerator as sound when it is the part that is missing. A control group would strengthen any of this and cannot rescue measures of the wrong thing."}

);
