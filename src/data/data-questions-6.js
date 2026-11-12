/* CCAO-F — Claude Certified Associate.
 * Written against the official exam guide task statements and the notes in
 * data-notes.js, so every answer is derivable from the study material.
 * Domain ids: a1 Output Evaluation · a2 Workflow Integration · a3 Governance
 *             a4 Prompting · a5 Product & Model Selection
 *             a6 Configuration & Knowledge · a7 Troubleshooting
 */

QUESTIONS.push(

/* ---- a1: Output Evaluation and Validation (21%) ---- */

{ id:"as-a1-06", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"Claude summarizes a 40-page contract and the summary reads cleanly. What is the most reliable way to check it?",
  a:2,
  opts:["Ask Claude whether its own summary is accurate and also complete","Re-run the prompt and compare the two summaries for their agreement","Spot-check the claims that would change a decision against the source","Check that the summary covers every single section of the contract"],
  why:"Verification has to touch the source. Asking the model to grade itself returns the same confidence that produced the summary, and two runs agreeing only shows the error is stable, not that it is absent. Completeness is worth checking, but a decision made on a wrong clause costs more than one made on a missing paragraph — so start where being wrong matters."},

{ id:"as-a1-07", exam:"CCAO-F", d:"a1", kind:"recall",
  q:"What does it mean that Claude can be confidently wrong?",
  a:1,
  opts:["It refuses whatever it cannot do — so a confident answer means that it could do the thing asked","Fluency and correctness are independent — polished writing is not evidence of accuracy","It warns you whenever it is uncertain — so an answer offered without qualification is a reliable one","Errors turn up as obvious nonsense — so they are easy enough to spot on a quick review of the output"],
  why:"The tone of a response is produced the same way whether the content is right or wrong, so confidence carries no information about accuracy. This is what makes review necessary: errors arrive looking exactly like correct answers, not as visible nonsense, and the model does not reliably flag its own uncertainty."},

{ id:"as-a1-08", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"You are deciding how much review a Claude-drafted output needs. What should determine the depth?",
  a:3,
  opts:["How long the output is","How confident the response sounds","How complex the prompt was","The cost of the output being wrong"],
  why:"Review effort should track the consequences, not the artefact. An internal brainstorm list and a figure in a board paper need very different scrutiny even at the same length. Length, tone and prompt complexity say nothing about what an error would cost."},

{ id:"as-a1-09", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"Claude's draft includes a quotation attributed to a named executive. What should you do before publishing?",
  a:0,
  opts:["Verify the quotation exists in a real source","Ask Claude for the source URL","Rephrase it as a paraphrase","Add a disclaimer that content is AI-assisted"],
  why:"Attributed quotations are among the highest-risk outputs: fabricating words a real, named person never said is both the most likely error type and the most damaging. The model can produce a plausible-looking URL just as readily as the quote, so asking for one adds no verification. Paraphrasing hides the problem without fixing it."},

{ id:"as-a1-10", exam:"CCAO-F", d:"a1", kind:"recall",
  q:"Which checks are worth building into a routine review of Claude output?",
  multi:true, a:[0,1,3],
  opts:["Do the numbers reconcile with the source","Are specific claims verifiable","Is the tone appropriate for the audience","Does the output answer the question actually asked"],
  why:"Numbers, specific claims and whether the response addresses the real question are all places output goes wrong in ways that matter. Tone is worth a glance but rarely causes damage — and polishing tone on an answer to the wrong question is the classic way a review feels thorough while missing the point."},

{ id:"as-a1-11", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"A long response contains one paragraph you know is wrong. What does that tell you about the rest?",
  a:2,
  opts:["The rest is probably fine since you found the error","The whole response should be discarded","Nothing, because each claim still needs its own check","Errors usually cluster, so check nearby text"],
  why:"Errors are not distributed in a way you can reason about from one sample. Finding one neither clears the remainder nor condemns it, and there is no reliable tendency for mistakes to cluster. The only safe reading is that the rest carries the same unknown risk it did before."},

{ id:"as-a1-12", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"You ask Claude to extract figures from a report into a table and the totals do not match the source. What is the most useful next step?",
  a:1,
  opts:["Ask Claude to recalculate the totals from the figures that it has extracted","Check whether the individual extracted figures are right before trusting any total","Reformat the table and then try again, since the layout may have confused it","Accept the extracted figures and correct the total by hand afterwards"],
  why:"A wrong total is a symptom, and the question is whether the inputs or the arithmetic failed. Fixing the total by hand or asking for a recalculation both assume the extracted figures are correct, which is exactly what the mismatch calls into question."},

{ id:"as-a1-13", exam:"CCAO-F", d:"a1", kind:"recall",
  q:"What is the appropriate way to use Claude output in work you are accountable for?",
  a:2,
  opts:["Publish it as produced if it reads well","Mark it as AI-generated and publish unchanged","Treat it as a draft you review and stand behind","Have a colleague who did not write the prompt review it"],
  why:"Accountability does not transfer to the tool. Reviewing and taking ownership is the standard regardless of how the draft was produced. Labeling output as AI-generated is sometimes appropriate for disclosure, but a label is not a substitute for the review, and a second reader helps without replacing the author's responsibility."},

{ id:"as-a1-14", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"Claude gives a direct, specific answer to a question where you expected genuine uncertainty. How should you read that?",
  a:0,
  opts:["Specificity is not evidence — verify it as you would any claim","A definitive source settles it — the specificity reflects what it found","The question was clearer than you thought — ambiguity was never there","Ask it again — see whether the same answer holds a second time"],
  why:"The model produces a confident register whether or not the underlying question has a settled answer, so an unexpectedly crisp response is a prompt to verify rather than a signal of certainty. Re-asking tends to produce a consistent answer, which feels like confirmation but only shows the output is stable."},

{ id:"as-a1-15", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"You are reviewing a Claude-written summary of a meeting you attended. What are you uniquely positioned to catch?",
  a:1,
  opts:["Spelling and grammatical errors that any careful reader would have noticed anyway","Things that were said but omitted, and emphasis that misrepresents the discussion","Formatting inconsistencies between the different sections of the written summary","Whether the summary runs rather longer than its readers are likely to want it to"],
  why:"Omissions and misplaced emphasis are invisible to anyone reading only the output, because nothing in the text signals what is missing. Your knowledge of the actual meeting is the only check on that. Spelling, formatting and length are all verifiable without having been there."},

{ id:"as-a1-16", exam:"CCAO-F", d:"a1", kind:"recall",
  q:"Why is asking Claude to double-check its own output a weak form of verification?",
  a:3,
  opts:["It takes far too long to be worth doing on every single piece of output","It uses up extra tokens on a check that rarely changes the answer at all","It always agrees with itself, so the review can never find anything wrong","It reviews using the same information and reasoning that produced the answer"],
  why:"Self-review draws on exactly the material and approach that generated the original response, so a mistake rooted in that material tends to survive the check. It is not that the model always agrees — it will sometimes revise — but an independent source is what actually tests the claim."},

{ id:"as-a1-17", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"Output for an external audience needs to be adapted from an internal draft. What matters most?",
  a:2,
  opts:["Making it considerably shorter, since an external reader has less time to give it than a colleague would","Removing the technical terms that an external audience is unlikely to recognize or interpret correctly","Removing internal detail that should not leave the organization, and framing for the reader","Adding a more formal tone that is appropriate to an audience sitting outside the immediate team"],
  why:"Repurposing internal material carries a disclosure risk first and a readability concern second: internal reasoning, names and caveats can travel into an external document unnoticed. Length, jargon and tone are adjustments, but none of them is the thing that causes harm if missed."},

{ id:"as-a1-18", exam:"CCAO-F", d:"a1", kind:"scenario",
  q:"Two colleagues run the same prompt on the same document and get noticeably different summaries. What is the right conclusion?",
  a:1,
  opts:["One of the two has made a mistake in the way that they entered the prompt","Variation is expected, so neither can be trusted without checking against the source","The longer of the two summaries is the more complete, and should be preferred","The model is malfunctioning badly, and both of the results ought to be discarded"],
  why:"Responses vary between runs by design, so divergence is not evidence of a mistake or a fault. What it does show is that neither output can be treated as the authoritative reading of the document — the source settles it. Length is not a proxy for completeness."},

{ id:"as-a1-19", exam:"CCAO-F", d:"a1", kind:"recall",
  q:"Which output types warrant the closest verification?",
  multi:true, a:[0,2,3],
  opts:["Figures that feed a financial decision","A first-draft outline for your own use","Claims about current regulations","Statements attributed to a named source"],
  why:"Financial figures, regulatory claims and attributed statements combine high error likelihood with real consequences. A private working outline carries almost none — you are the only reader and you will revise it anyway, so spending review effort there takes it from somewhere it matters."},

/* ---- a2: Workflow Integration and Solution Design (16%) ---- */

{ id:"as-a2-06", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"You want to introduce Claude into a process that currently takes a colleague two hours a week. What should you establish first?",
  a:1,
  opts:["Which model tier to use, since that sets both the quality and the running cost","What the current process actually produces and how you would know the output is acceptable","How to write the prompt, since just about everything else depends on getting it right","Whether colleagues are willing to adopt the thing once it has actually been built"],
  why:"Without a definition of an acceptable result you cannot tell whether the automated version works, and every later decision — model, prompt, review step — is guesswork. Adoption and tooling matter, but they come after you can judge the output."},

{ id:"as-a2-07", exam:"CCAO-F", d:"a2", kind:"recall",
  q:"What makes a task a good candidate for a Claude-assisted workflow?",
  multi:true, a:[0,1,3],
  opts:["It recurs often enough to repay the setup","A knowledgeable person can tell good output from bad","It involves language, summarization or drafting","It must be completed with no human review"],
  why:"Frequency justifies the investment, a judge makes quality checkable, and language work is what the tool is suited to. Requiring zero review is a reason for caution rather than a qualification: it removes the step that catches the errors."},

{ id:"as-a2-08", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"A proposed workflow saves 20 minutes per run but needs a 10-minute review each time. How should you judge it?",
  a:2,
  opts:["Reject it, since the review step consumes most of the time that is saved","Accept it, since any net saving of time at all is worth having here","Compare the net saving against the setup cost and how often it runs","Automate the review as well, so that the full 20 minutes ends up saved"],
  why:"Ten net minutes is real, but whether it is worth building depends on run frequency and what the setup costs: weekly makes it marginal, daily makes it compelling. Automating the review removes the quality check that justified including it."},

{ id:"as-a2-09", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"Where should the human review step sit in a drafting workflow?",
  a:1,
  opts:["At the very end, once the whole of the output has been assembled together","Before the output is used or sent, at the point where an error would escape","At the start, reviewing the prompt itself rather than what it goes on to produce","Sampled across runs rather than performed on every single one that is made"],
  why:"The review belongs at the last point where catching a mistake still prevents harm. Placing it after assembly can be too late if an earlier step already sent something, and sampling is appropriate only once the error rate is known and the stakes are low."},

{ id:"as-a2-10", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"Your team is new to Claude and wants a first workflow. Which characteristics should guide the choice?",
  multi:true, a:[0,1,2],
  opts:["The output is easy to check","A mistake is cheap and recoverable","It runs often enough to show value quickly","It is the most time-consuming task the team has"],
  why:"Checkable output, low blast radius and enough frequency to demonstrate value make a first attempt safe and informative. The biggest time sink is usually the worst starting point — it is typically the most complex and least tolerant of errors, so a failure there discredits the whole idea."},

{ id:"as-a2-11", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"A stakeholder asks how much time a proposed Claude workflow will save. What makes your answer credible?",
  a:0,
  opts:["A measured baseline of the current process and a trial on real examples","An estimate derived from how quickly the model returns a response","A comparison with published case studies from similar organizations","The figures the vendor publishes for productivity improvement"],
  why:"A defensible number comes from your own before-and-after measurement on real inputs, including the review time. Model latency measures the wrong thing, and external case studies and vendor figures describe someone else's process rather than yours."},

{ id:"as-a2-12", exam:"CCAO-F", d:"a2", kind:"recall",
  q:"What should be documented when a Claude workflow is handed to colleagues?",
  multi:true, a:[0,1,2],
  opts:["What the workflow is for and when not to use it","The prompt itself, in a location that stays current","What review the output needs before use","The exact wording of every response it has produced"],
  why:"Scope, the current prompt and the required review are what another person needs to run it safely and know its limits. Keeping a log of past outputs has occasional audit value but is not what makes a handover usable."},

{ id:"as-a2-13", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"A workflow produces good output most of the time but fails unpredictably on unusual inputs. What is the right response?",
  a:2,
  opts:["Abandon the workflow","Add more detail to the prompt until it handles everything","Define which inputs it is for, and route the rest to a human","Accept the failures as a cost of automation"],
  why:"Scoping to the cases it handles well is what makes an imperfect tool safe to use, and the exceptions still get handled — by a person. Chasing complete coverage through prompt length tends to degrade the common case, and simply accepting failures leaves the unusual inputs unhandled."},

{ id:"as-a2-14", exam:"CCAO-F", d:"a2", kind:"scenario",
  q:"You are mapping a multi-step process for Claude. What usually works better than one long prompt?",
  a:1,
  opts:["A more detailed single prompt that covers every part of the whole process in order","Breaking it into steps you can check between, so a failure is visible where it happens","Running the same prompt several times over and then comparing the results you get","Using a more capable model tier, one that can hold the whole process at once"],
  why:"Separate steps give you a checkpoint between each one, so you can see which stage went wrong instead of inspecting a final answer and guessing. A longer prompt and a stronger model both leave the whole chain opaque, and repeated runs tell you about variance rather than correctness."},

/* ---- a3: Governance, Risk, and Responsible Use (15%) ---- */

{ id:"as-a3-05", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"Your organization has no written policy on pasting customer data into AI tools. What should guide you?",
  a:2,
  opts:["Anything not explicitly forbidden is permitted, at least until a written policy says otherwise","Ask Claude whether the data you are about to paste would count as sensitive in this context","Apply the same standard you would to any other external service, and get the question answered","Use the data but strip the names out first, which addresses the main concern in practice"],
  why:"Silence in a policy is not permission. The existing rules for sending data to any third party already apply, and the gap should be raised rather than resolved privately. Removing names often fails to de-identify records, and the model is not a source of truth about your obligations."},

{ id:"as-a3-06", exam:"CCAO-F", d:"a3", kind:"recall",
  q:"Which responsibilities remain with the person using Claude?",
  multi:true, a:[0,1,2],
  opts:["Accuracy of what is published","Appropriateness of the data provided to it","Whether the output is suitable for its audience","The internal workings of the model"],
  why:"Accuracy, input choices and fitness for the audience are all decisions the user makes and remains answerable for. How the model works internally is not something the user controls or can be accountable for."},

{ id:"as-a3-07", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"When is disclosing that content was AI-assisted most clearly warranted?",
  a:1,
  opts:["Whenever an AI tool was involved at any stage at all of producing the content","When the reader's judgment of the content depends on believing a human produced it","Only when a law or a regulation specifically requires that disclosure be made","Never, since the output becomes your own work once you have reviewed it fully"],
  why:"Disclosure matters where the audience's trust rests on authorship — a personal recommendation, an expert assessment, a creative submission. A blanket rule for every spell-check-level use becomes noise, while waiting for a legal requirement ignores the cases where the expectation is social rather than statutory."},

{ id:"as-a3-08", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"A colleague used Claude to produce an analysis that informed a decision, and it contained an error. Who is accountable?",
  a:3,
  opts:["The provider of the tool that produced the work","Nobody at all, since it was an honest mistake","The reviewer who read the work and approved it","The colleague who produced and submitted the work"],
  why:"Accountability sits with the person who used the tool and submitted the result; that does not change because a model was involved. A reviewer who approved it may share responsibility, but the author does not shed theirs by having had one."},

{ id:"as-a3-09", exam:"CCAO-F", d:"a3", kind:"recall",
  q:"Which data types normally require explicit authorization before being used with an AI tool?",
  multi:true, a:[0,1,3],
  opts:["Customer personal information","Unreleased financial results","Published marketing copy","Employee records"],
  why:"Personal data, material non-public information and employee records all carry legal or contractual restrictions on where they may be sent. Already-published material carries none, since it is public by definition."},

{ id:"as-a3-10", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"You want to use Claude to screen job applications. What is the central concern?",
  a:0,
  opts:["Decisions about people need human judgment, auditability and a route to challenge","Whether the model is fast enough to handle the application volume in season","Whether applicants would object to their application being screened this way","The cost per application, which multiplies across a large hiring round"],
  why:"Consequential decisions about individuals bring requirements that throughput and cost do not address: a person accountable for the outcome, a record of why each decision was made, and a way for the affected person to contest it."},

{ id:"as-a3-11", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"A workflow sends customer support tickets to Claude for summarization. What should be checked first?",
  a:2,
  opts:["Whether the summaries are accurate enough for the support team to rely on them day to day","Whether the chosen model tier is cost-effective at the volume of tickets actually received","Whether customer data may be sent to the service under your agreements and privacy notices","Whether the team finds the summaries useful enough to change the way that they work"],
  why:"Permission to send the data is a precondition — if the answer is no, accuracy, cost and usefulness never come into play. Those are the right questions, in that order, once the data question is settled."},

{ id:"as-a3-12", exam:"CCAO-F", d:"a3", kind:"recall",
  q:"What is the risk of treating Claude output as authoritative without review?",
  multi:true, a:[0,1,2],
  opts:["Errors propagate into decisions with no checkpoint","Accountability becomes unclear after the fact","Confident phrasing discourages the scrutiny the content needs","The model will refuse to answer"],
  why:"Unreviewed output moves errors straight into decisions, muddies who answers for them, and arrives in a register that actively suppresses scepticism. Refusing to answer is not the failure mode — the model answering fluently is."},

{ id:"as-a3-13", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"Someone asks you to use Claude to generate content attributed to a real colleague without telling them. How should you respond?",
  a:1,
  opts:["Do it — but keep a record of what was generated and who asked","Decline — it misrepresents a real person without their knowledge","Do it — if the content reflects what they would have said anyway","Ask Claude — whether attributed content is acceptable practice"],
  why:"Attributing generated content to a real person without their knowledge misrepresents them regardless of whether the content is accurate or a record exists. Accuracy does not make the attribution honest, and this is a judgment for you, not the model."},

{ id:"as-a3-14", exam:"CCAO-F", d:"a3", kind:"scenario",
  q:"Your team wants a shared rule for what may be pasted into Claude. What makes such a rule effective?",
  a:2,
  opts:["Listing every single prohibited data type, so that nothing at all is left ambiguous","Requiring approval for every use, so that each case gets judged on its own merits","Stating the principle plus clear examples, and naming who to ask when it is unclear","Leaving it to individual judgment, since those closest to it understand the context"],
  why:"A rule has to be applicable to cases nobody anticipated, which means a principle, worked examples and a named person for the edge cases. Exhaustive lists go stale and imply anything unlisted is fine; approving every use stops the work; pure individual judgment is what the rule exists to replace."},

/* ---- a4: Prompting and Task Execution (14%) ---- */

{ id:"as-a4-04", exam:"CCAO-F", d:"a4", kind:"recall",
  q:"What distinguishes an effective instruction from a vague one?",
  a:2,
  opts:["It is longer and more detailed, leaving less room for interpretation","It uses precise technical vocabulary the model is likely to recognize","It states what the output should contain and how you will judge it","It is phrased politely, which tends to produce more cooperative responses"],
  why:"An instruction works when a second person reading it would produce the same thing you wanted — which means naming the content and the standard. 'Be thorough' fails that test; 'cover these four points, one paragraph each' passes. Length, jargon and politeness are unrelated."},

{ id:"as-a4-05", exam:"CCAO-F", d:"a4", kind:"scenario",
  q:"You need output in a specific structure for a downstream process. What is most reliable?",
  a:1,
  opts:["Describing the required structure carefully in words","Showing a worked example of exactly the format you want","Asking for output that is 'clean and structured'","Requesting the output twice over and comparing them"],
  why:"An example pins down the details a description leaves ambiguous — field order, separators, how empty values appear. Prose descriptions leave each of those open to interpretation, and a vague request for structure invites a different shape each run."},

{ id:"as-a4-06", exam:"CCAO-F", d:"a4", kind:"scenario",
  q:"A complex request keeps producing partial answers. What usually helps most?",
  a:3,
  opts:["Asking the model to be a good deal more thorough with it","Using a more capable model tier for making that request","Repeating the key requirement once more right at the end","Breaking the request into parts and doing them in sequence"],
  why:"Partial answers usually mean too much was asked at once, and decomposition addresses that directly: each part gets full attention and you can see which one fell short. Exhortations to thoroughness, a stronger model and repeated instructions all leave the overloaded request intact."},

{ id:"as-a4-07", exam:"CCAO-F", d:"a4", kind:"recall",
  q:"What is the purpose of giving Claude a role or perspective in a prompt?",
  a:2,
  opts:["It makes the model more accurate on questions within that specialism","It unlocks specialized capability the model does not otherwise apply","It sets the vocabulary, depth and assumptions appropriate to that audience","It reduces token usage by narrowing what the model considers relevant"],
  why:"A role shapes register and assumed background — what to explain and what to take as read. It does not add capability or accuracy; asking for a doctor's perspective does not make clinical claims more reliable."},

{ id:"as-a4-08", exam:"CCAO-F", d:"a4", kind:"scenario",
  q:"Your prompt produces good content in the wrong tone. What is the most efficient fix?",
  a:0,
  opts:["Describe the tone concretely, ideally with an example of the register you want","Start a new conversation, since the current one has settled on a tone","Switch to a different model, which may have a more suitable default voice","Shorten the prompt so the tone instruction is not lost among other detail"],
  why:"Only the tone is failing, so that is what the prompt should address — and tone words like 'professional' mean different things to different readers, which is why a sample of the target register works better than an adjective. Changing conversation, model or length discards what is already working."},

{ id:"as-a4-09", exam:"CCAO-F", d:"a4", kind:"recall",
  q:"Which practices tend to improve a prompt that is producing inconsistent results?",
  multi:true, a:[0,1,3],
  opts:["Replacing subjective criteria with checkable ones","Providing an example of acceptable output","Adding a request to be careful","Stating what to do with edge cases"],
  why:"Checkable criteria, a worked example and explicit edge-case handling all remove room for interpretation, which is where inconsistency comes from. Asking the model to be careful adds words without changing what the instruction actually specifies."},

{ id:"as-a4-10", exam:"CCAO-F", d:"a4", kind:"scenario",
  q:"You are iterating on a prompt. What makes the process efficient?",
  a:1,
  opts:["Rewriting the whole prompt completely on each pass through","Changing one thing at a time and testing on the same inputs","Making several of the improvements at once, to save time","Asking Claude itself to improve the prompt on your behalf"],
  why:"Isolating one change against a fixed set of inputs is what tells you which edit helped. Rewriting or bundling changes gives you a different result with no way to attribute it, so improvements cannot be kept deliberately."},

{ id:"as-a4-11", exam:"CCAO-F", d:"a4", kind:"scenario",
  q:"Claude keeps including a caveat paragraph you do not want. What is the most direct fix?",
  a:2,
  opts:["Ignore the caveat and delete that paragraph by hand on every single run","Ask a good deal more forcefully, making the instruction harder to overlook","State explicitly that the output should not include caveats or disclaimers","Shorten the prompt, so that the caveat has rather less to attach itself to"],
  why:"Naming the unwanted element directly is what removes it. Deleting by hand every run is the cost you are trying to avoid, repetition and emphasis do not add information, and shortening the prompt does not say anything about caveats."},

{ id:"as-a4-12", exam:"CCAO-F", d:"a4", kind:"recall",
  q:"When does providing examples in a prompt help most?",
  a:3,
  opts:["When the task is factually difficult and the model needs grounding","When the response should be longer than the model produces by default","When you want faster responses, since examples shorten the reasoning","When format, style or edge-case handling is hard to describe precisely"],
  why:"Examples communicate shape far more precisely than description, which is why they are most valuable where the requirement is about form rather than fact. They do not make a factually hard question easier, and they add to the prompt rather than speeding it up."},

{ id:"as-a4-13", exam:"CCAO-F", d:"a4", kind:"scenario",
  q:"A prompt works well for you but produces poor results when a colleague uses it. What is the likely cause?",
  a:1,
  opts:["They are using a different model — it reads the identical prompt differently","The prompt relies on context you supply without realizing — background or prior conversation","They have typed the prompt in wrongly — small differences change the result","Prompts do not transfer between people — their histories differ far too much"],
  why:"A prompt developed in a working conversation often leans on background that was established earlier or lives in your head, and only shows its dependency when someone runs it cold. Prompts do transfer — but only once those assumptions are written into them."},

/* ---- a5: Product and Model Selection (12%) ---- */

{ id:"as-a5-05", exam:"CCAO-F", d:"a5", kind:"scenario",
  q:"You need to classify several thousand short items by topic. Which consideration should lead?",
  a:0,
  opts:["Throughput and cost, since the task is simple and high-volume","Maximum reasoning capability, since every classification should be accurate","Context window size, since many items can then be classified per call","Output formatting control, since the categories must come back consistently"],
  why:"Short, well-defined classification is where a faster, cheaper tier performs comparably at a fraction of the cost, and at thousands of items that difference dominates. Deep reasoning and a large context window do not help a task whose inputs are individually small and simple."},

{ id:"as-a5-06", exam:"CCAO-F", d:"a5", kind:"scenario",
  q:"A task involves careful reasoning over an ambiguous document where being wrong is expensive. What should drive the choice?",
  a:2,
  opts:["The cheapest tier that produces usable output for the document","Response speed, since an ambiguous document takes longer to work through","Capability, because the cost of an error outweighs the per-call difference","Context window size, so the whole ambiguous document fits at once"],
  why:"Where errors are expensive, the gap between tiers in cost is small relative to the cost of getting it wrong. Optimizing for price or latency here saves the wrong resource, and window size addresses how much you can send rather than how well it is reasoned about."},

{ id:"as-a5-07", exam:"CCAO-F", d:"a5", kind:"recall",
  q:"How should a model tier be chosen for a new task?",
  a:1,
  opts:["Start with the most capable tier available and downgrade once quality is established","Try the cheapest tier that might work and move up if quality falls short on real examples","Match the tier to whatever the team's budget comfortably allows it to spend per month","Use the newest model available, on the basis that it supersedes the earlier ones"],
  why:"Testing upward on your own examples establishes what the task actually needs, rather than paying for capability you cannot show is required. Defaulting to the top tier is explicitly called out as wasting cost and latency, and budget or recency are not measures of fit."},

{ id:"as-a5-08", exam:"CCAO-F", d:"a5", kind:"scenario",
  q:"Your team repeatedly pastes the same reference material into separate conversations. What product feature addresses this?",
  a:2,
  opts:["A longer context window, so the material fits alongside the work","A more capable model tier that retains the reference more reliably","A Project with instructions and knowledge that load automatically","Saving the material in a shared document people paste from"],
  why:"Projects exist for exactly this: shared instructions and knowledge that are present in every conversation without anyone re-pasting them. A bigger window still requires sending the material each time, and a shared document relies on people remembering to use it."},

{ id:"as-a5-09", exam:"CCAO-F", d:"a5", kind:"recall",
  q:"Which statements about the context window are accurate?",
  multi:true, a:[0,2],
  opts:["It covers the whole conversation plus any attachments and the response","A larger window improves reasoning quality","Filling a large window on every call has a real cost","The window resets after each response"],
  why:"The window spans everything the model considers at once and you pay for what you send, so routinely filling a large one is expensive. It does not make the model reason better, and it does not reset between turns — the conversation accumulates within it, which is what eventually saturates it."},

{ id:"as-a5-10", exam:"CCAO-F", d:"a5", kind:"scenario",
  q:"A task needs multi-source gathering before an answer can be given. Which capability fits?",
  a:1,
  opts:["A larger context window, so all the sources fit in one conversation","Research mode, which gathers across sources before answering","A faster model tier, so several sources can be consulted quickly","A Project, with the relevant sources added to its knowledge"],
  why:"Research mode is the feature for questions that require collecting from several sources before responding. A bigger window holds more material you have already found, Projects carry standing context, and speed does not help a gathering problem."},

{ id:"as-a5-11", exam:"CCAO-F", d:"a5", kind:"scenario",
  q:"You need a document you will revise over several sessions. Which feature is designed for that?",
  a:0,
  opts:["Artifacts, which keep a document you can revise and share","A longer conversation, so the document stays in the history","Research mode, which gathers the material the document needs","A more capable model, which revises more reliably over time"],
  why:"Artifacts exist for content you keep and iterate on rather than read once in the flow of a conversation. Extending the conversation keeps the document buried in chat history, and the other options address gathering and reasoning rather than persistence."},

/* ---- a6: Configuration and Knowledge Management (12%) ---- */

{ id:"as-a6-04", exam:"CCAO-F", d:"a6", kind:"scenario",
  q:"Your organization has rules about which data may be used with AI tools. Where do they belong?",
  a:1,
  opts:["In a team chat channel, so that everybody sees them as they are posted up","In Project instructions, where they load into every conversation automatically","In each person's own private notes, so they have them where they work","Repeated at the start of every conversation that touches that kind of data"],
  why:"Standing rules belong where they apply without anyone remembering them. Chat messages scroll away, personal notes fragment, and manual repetition fails exactly when someone is rushing — which is when the rule matters most."},

{ id:"as-a6-05", exam:"CCAO-F", d:"a6", kind:"recall",
  q:"What makes Project instructions hold up over time?",
  multi:true, a:[0,1,3],
  opts:["They state standing context rather than one-off requests","They are specific enough to act on","They include every detail anyone might need","Someone owns keeping them current"],
  why:"Durable instructions capture what is always true, say it concretely, and have an owner who updates them as things change. Exhaustive detail works against this: long instructions dilute the important parts and go stale faster than anyone maintains them."},

{ id:"as-a6-06", exam:"CCAO-F", d:"a6", kind:"scenario",
  q:"A Project's instructions have grown long and results are getting less consistent. What is the likely issue?",
  a:2,
  opts:["The model tier is too low to follow a long set of instructions reliably","The context window is full, so the later instructions are being dropped","Important instructions are competing with detail that no longer matters","Projects do not scale to this many instructions and should be split up"],
  why:"As instructions accumulate, the directives that matter sit among accumulated detail and exceptions, and consistency degrades. The fix is pruning to what is still true and important rather than changing tier — and this is well short of filling the window."},

{ id:"as-a6-07", exam:"CCAO-F", d:"a6", kind:"scenario",
  q:"Team members get noticeably different results from what should be the same task. What should you check first?",
  a:3,
  opts:["Whether they are on different model tiers — Haiku, Sonnet or Opus — for the same work","Whether some of them are simply more practised at writing prompts than the others","Whether the task is too loosely defined to produce the same answer for anybody","Whether they are working from the same configuration — Project, instructions and knowledge"],
  why:"Inconsistency across people almost always traces to inconsistent configuration, so comparing what each person actually loads comes before investigating skill or task difficulty. Tier differences are worth ruling out but are a narrower cause."},

{ id:"as-a6-08", exam:"CCAO-F", d:"a6", kind:"recall",
  q:"What belongs in a Project's knowledge rather than in its instructions?",
  a:1,
  opts:["Rules about the tone and the format that every single response should follow","Reference material the model should draw on, such as documentation or style guides","The name of the person who owns the Project and maintains the contents of it","Which model tier the conversations inside the Project should use by default"],
  why:"Instructions say how to behave; knowledge supplies the material to work from. Reference documents belong in knowledge, while behavioral rules stay in instructions where they are read as directives."},

{ id:"as-a6-09", exam:"CCAO-F", d:"a6", kind:"scenario",
  q:"A Project's knowledge contains a policy document that has since been superseded. What is the risk?",
  a:0,
  opts:["Answers will confidently reflect the outdated policy","The Project will stop working entirely","The model will notice the document is out of date","Only newly started conversations are affected by it"],
  why:"The model treats supplied knowledge as current and will cite it without hesitation, so stale material produces confidently wrong answers — which is why someone has to own keeping it current. Nothing in the document signals its age to the model."},

{ id:"as-a6-10", exam:"CCAO-F", d:"a6", kind:"scenario",
  q:"You are writing Project instructions for a team. What phrasing works best?",
  a:2,
  opts:["Broad principles that leave the reader room for judgment","Detailed rules written to cover every possible scenario","Concrete, checkable statements about what is always expected","A copy of the team's full style guide, pasted in whole"],
  why:"Instructions are acted on literally, so they work when they are specific and verifiable. Broad principles leave the interpretation open, exhaustive rules become unmaintainable, and a full style guide is reference material that belongs in knowledge."},

{ id:"as-a6-11", exam:"CCAO-F", d:"a6", kind:"recall",
  q:"Why does standing context belong in configuration rather than in each conversation?",
  multi:true, a:[0,1,2],
  opts:["It cannot be forgotten on a busy day","Everyone on the team gets the same behavior","It can be improved in one place","It makes the model more capable"],
  why:"Configuration removes reliance on memory, gives the team one consistent baseline, and creates a single place to improve. It does not change what the model can do — it changes what it reliably knows about your situation."},

/* ---- a7: Troubleshooting and Optimization (10%) ---- */

{ id:"as-a7-05", exam:"CCAO-F", d:"a7", kind:"scenario",
  q:"Responses in a long conversation have become vague and ignore details you gave earlier. What is happening?",
  a:1,
  opts:["The model has lost the thread — a long topic drifts out of focus over time","The conversation has saturated — earlier detail competes with all that followed","The model is not capable enough — quality falls off in any long exchange","The prompt has drifted — repeated edits have blunted what it once said"],
  why:"This is the signature of a saturated conversation: the symptom is vaguer answers that drop detail you supplied early on. The fix is a fresh conversation with the essentials restated, not a stronger model or a rewritten prompt."},

{ id:"as-a7-06", exam:"CCAO-F", d:"a7", kind:"scenario",
  q:"You start a new conversation to escape saturation. What should you carry over?",
  a:2,
  opts:["The entire previous conversation, so nothing is lost in the move","Nothing at all — the point of starting fresh is to start clean","Only the conclusions and constraints that still matter","The last few exchanges, which carry the most recent context"],
  why:"Re-pasting the history recreates the problem immediately, and starting with nothing throws away decisions you already made. Restating just the live conclusions and constraints is what makes the new conversation work."},

{ id:"as-a7-08", exam:"CCAO-F", d:"a7", kind:"recall",
  q:"What should you do before rewriting a prompt that is underperforming?",
  a:3,
  opts:["Switch to a more capable model and see whether that resolves it","Add more detail to the prompt so less is left to interpretation","Start a new conversation in case the current one has saturated","Work out which part of the output is actually wrong"],
  why:"Diagnosing which aspect fails — format, scope, accuracy, tone — tells you what to change, and often the fix is one sentence rather than a rewrite. Changing model, adding detail or restarting are all actions taken before knowing what the problem is."},

{ id:"as-a7-09", exam:"CCAO-F", d:"a7", kind:"scenario",
  q:"The output is correct but far too long. What is the most direct fix?",
  a:1,
  opts:["Ask for a summary of the output that you got","State the length or format you need, concretely","Use a faster model tier for making the request","Break the task down into several smaller pieces"],
  why:"Length is a specification you can simply state — 'three bullets, one sentence each' — and it is the one thing failing here. Summarizing afterwards adds a step, and model or task changes address problems you do not have."}

);
