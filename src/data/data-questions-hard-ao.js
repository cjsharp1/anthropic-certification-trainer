/* CCAO-F — hard tier.
 *
 * These are written to a deliberately higher bar than the drill bank, after
 * comparing against another study site whose questions were measurably
 * harder. The differences that mattered, measured across 1,462 of theirs:
 *
 *   - stems carry CONCRETE PARTICULARS: a real figure, a quoted prompt, two
 *     competing specifics you have to weigh. 20% of theirs ran past 40
 *     words; none of ours did.
 *   - options are FULL SENTENCES carrying their own reasoning (75% of
 *     theirs, 16% of ours). A distractor states a position and why, so you
 *     cannot pick by shape.
 *   - the trap is usually a PARTIAL SUCCESS: something checked out, or an
 *     instruction was followed, and the candidate has to notice that the
 *     part which succeeded is not the part that mattered.
 *
 * A question belongs here only if it CANNOT be answered from the principle
 * alone — if knowing "verify citations" is enough, it belongs in the drill
 * bank instead.
 *
 * difficulty:"hard" keeps them out of quick quizzes by default; the full
 * practice exam can weight toward them.
 */
QUESTIONS.push(

/* ---- a1: Output Evaluation and Validation ---- */

{ id:"hd-a1-01", exam:"CCAO-F", d:"a1", difficulty:"hard", kind:"scenario",
  q:"A compliance memo Claude drafted cites \"Section 4.2(b) of the Records Act, which allows 30 days to notify affected parties.\" You look it up: Section 4.2(b) exists and does govern notification — but the window it sets is 72 hours. What is the right conclusion?",
  a:2,
  opts:["The citation itself verified, so correct the figure to 72 hours and send the memo on, noting the fix in your covering message.",
        "Put the discrepancy to Claude in the same conversation and go with whichever window it settles on once corrected.",
        "A half-correct citation is still a reliability failure, so fix the figure and treat the memo's other claims as unchecked too.",
        "The notification window is a detail that does not change the memo's substantive guidance, so flag it and move on."],
  why:"The trap is that verification partly succeeded. The section exists and is the right section, which makes the citation feel validated, while the requirement it states is wrong by an order of magnitude. Two things follow. A correct pointer to an incorrect claim is more dangerous than an obvious fabrication, because the checkable part earns trust the content has not. And one confirmed error reclassifies the whole document: everything else in it is now unverified, which on compliance-bound content means it needs checking rather than a covering note."},

{ id:"hd-a1-02", exam:"CCAO-F", d:"a1", difficulty:"hard", kind:"scenario",
  q:"You ask for a summary of a 40-page supplier contract. The summary is accurate on everything it covers, and omits a termination clause that would have changed your recommendation. Reviewing your process, what would have caught it?",
  a:1,
  opts:["Asking Claude, once the summary is written, to list anything material that it considered and chose to leave out.","Reading the contract's clause headings yourself, because an omission leaves no trace in the summary to notice.","Requesting a longer summary, on the basis that the clause was dropped to save length rather than by any judgment.","Running the same prompt a second time and comparing the two summaries for anything present in one and not the other."],
  why:"Every other option tries to detect the omission from the output, and an omission is precisely the error that leaves nothing in the output to detect. The summary reads as complete because nothing in it is wrong. A second run can omit the same clause for the same reason, a longer summary can expand the parts it already chose, and asking the model what it left out requires it to have represented the thing it skipped. Only the source tells you what is missing — and scanning clause headings is a cheap way to do that without re-reading 40 pages."},

{ id:"hd-a1-03", exam:"CCAO-F", d:"a1", difficulty:"hard", kind:"scenario",
  q:"Two analysts check the same generated market summary. One re-runs the prompt three times and gets consistent figures. The other traces two figures back to the published source. Both report the summary as verified. Who is right?",
  a:3,
  opts:["Both: consistency across runs and agreement with the source are two valid routes to the same confidence.",
        "The first analyst, because three consistent runs sample the model's knowledge more broadly than two spot-checks.",
        "Neither, because verification of a summary requires every figure in it to be traced, not a sample.",
        "The second analyst, because repeated runs measure stability and only the source measures truth."],
  why:"Re-running tests whether the model is consistent, and a model can be consistently wrong — the same reasoning over the same material reproduces the same error every time. That is the distinction the first analyst has missed. The third option over-corrects: tracing a sample is normal practice and proportionate for most work, and demanding every figure would make verification unaffordable. What makes the second analyst right is not the count but the direction of the check — against the world, not against the model."},

{ id:"hd-a1-04", exam:"CCAO-F", d:"a1", difficulty:"hard", kind:"scenario",
  q:"A draft board paper states \"customer churn fell 12% year on year.\" The underlying figure is a fall from 8.0% to 7.0% churn. Is the statement correct?",
  a:0,
  opts:["It is ambiguous and needs rewriting: a fall from 8% to 7% is a 12.5% relative fall but a one point absolute fall, and \"fell 12%\" will be read as the larger claim.","It is correct as written: 7.0 is 12.5% below 8.0, so describing the change as a 12% fall understates the improvement rather than overstating it to the board at all.","It is simply wrong: churn fell by exactly one percentage point, and the only claim the underlying figures will support is the statement that churn fell by 1%.","It is correct enough for a board paper, where relative change is the established reporting convention and the absolute figures are available in the appendix."],
  why:"The arithmetic in the second option is right and the conclusion is still wrong, which is what makes this worth checking. Both readings are defensible in isolation — relative change really is 12.5%, absolute change really is one point — and a board reading \"churn fell 12%\" will hear the relative claim about a figure they are picturing in absolute terms. Verification is not only asking whether a number is accurate; it is asking whether the sentence carrying it will be understood as what it means."},

{ id:"hd-a1-05", exam:"CCAO-F", d:"a1", difficulty:"hard", kind:"recall",
  q:"Your team agrees that any output feeding a client deliverable gets checked. Six weeks in, spot checks show the rule is followed on reports and skipped on the short answers people paste into emails. What does this most likely indicate?",
  a:2,
  opts:["Insufficient training, since the team has evidently not internalized that a short reply to a client is also a client deliverable.","An acceptable risk-based adaptation: a short answer carries less content, and therefore carries proportionately less risk of error.","The rule is too uniform to survive contact with the work, and needs to name what is checked rather than what is produced.","A tooling gap, since reports pass through a review step built into the document workflow and emails simply do not."],
  why:"A control skipped consistently in one place is a design signal, not a discipline problem — and it is skipped exactly where the work is fastest, which is where people are least able to absorb a fixed cost. The second option is the tempting one: short does not mean low-risk, and a one-line answer containing a wrong figure reaches the client just as surely. The fix is to make the rule attach to the claim rather than the artefact, so a figure gets checked whether it lands in a report or a reply."},

/* ---- a4: Prompting and Task Execution ---- */

{ id:"hd-a4-01", exam:"CCAO-F", d:"a4", difficulty:"hard", kind:"scenario",
  q:"An associate prompts \"write something about our new product\" and gets a generic paragraph. They rewrite it as \"write a compelling, on-brand paragraph about our new product that really resonates with our audience.\" The output is barely better. Why?",
  a:1,
  opts:["Evaluative adjectives are discounted during generation, so \"compelling\" and \"on-brand\" were effectively ignored.",
        "The rewrite added words describing the quality wanted but no information about the product, the reader or the voice.",
        "The task needs a more capable model, because brand voice is a capability limit rather than a specification problem.",
        "The rewrite is still far too short; prompt length is the strongest single predictor of output quality."],
  why:"Both prompts fail the same way, which is why the rewrite changed nothing: each one names a desired quality instead of supplying what is needed to produce it. \"Compelling\" and \"on-brand\" describe the destination without giving directions. The first option sounds mechanical and is not how it works — the adjectives are read, they simply carry almost no information. The fix is descriptive rather than evaluative: what the product does, who is reading, what voice the brand uses, how long, and an example of that voice if one exists."},

{ id:"hd-a4-02", exam:"CCAO-F", d:"a4", difficulty:"hard", kind:"scenario",
  q:"Two colleagues write prompts for the same job — an apology email to a customer whose order was five days late. One specifies a warm tone, 120 words, acknowledge the delay, offer 15% off, do not be defensive. The other uses that same prompt plus a pasted apology the team was happy with. Which is the better assessment?",
  a:0,
  opts:["The second is better: both specify the requirements, but only the example conveys the team's actual voice, which the adjectives can only gesture at.",
        "They are equivalent: once tone, length, content and the discount are all specified, an approved example has nothing left to contribute.",
        "The first is better: the pasted email will pull the output toward reproducing that previous message rather than addressing this customer's delay.",
        "The second is worse, because the example consumes context better spent describing the delay and the remedy in more detail."],
  why:"Both prompts are well specified, so the difference is narrow and worth being precise about: how style gets communicated. \"Warm\" and \"sincere\" are compressed and ambiguous; an approved example carries the register, the sentence habits, and how the brand handles being at fault — the parts hardest to write as rules. The third option names a real risk, which is what makes it tempting, but it is managed by saying the example is for voice rather than content, not by withholding it."},

{ id:"hd-a4-03", exam:"CCAO-F", d:"a4", difficulty:"hard", kind:"scenario",
  q:"A prompt produces good output for you and poor output for a colleague running it unchanged. You compare: same wording, same model, same Project. What is the most likely remaining difference?",
  a:3,
  opts:["Their inputs are longer than yours, so the instruction carries less weight against the surrounding material.",
        "Prompt quality is partly a matter of how a person follows up, and they are accepting the first response where you iterate.",
        "You have a longer conversation history, which has primed the model toward the output you expect.",
        "You supply from your own knowledge what the prompt leaves unsaid, by recognizing a bad answer and the material you paste in."],
  why:"The usual cause is that the prompt was developed with you in the loop, and quietly depends on you: the documents you choose to paste, the judgment that an answer is off, the context you add without noticing because it is obvious to you. All four options describe real phenomena, which is why this is worth thinking through. But a longer history is as likely to dilute as to prime, iteration is a consequence of recognizing a bad answer rather than a separate cause, and input length matters only if their inputs genuinely differ. The test is to run it cold yourself, on their input, and see which gap you fill in."},

/* ---- a2: Workflow Integration and Solution Design ---- */

{ id:"hd-a2-01", exam:"CCAO-F", d:"a2", difficulty:"hard", kind:"scenario",
  q:"A proposed workflow drafts a weekly report: 90 minutes of writing becomes 10 minutes of generation plus 25 minutes of review. Six weeks in, the reviewer reports that two drafts contained a plausible but wrong figure, both caught. What is the honest assessment?",
  a:2,
  opts:["It is working — 55 minutes saved weekly, and the review step caught both errors exactly as intended.","It is failing — two wrong figures in six runs is too high a rate for a report leadership will act on.","It is working and the catch rate is the thing to watch — review found both, but nothing yet shows it would find the third.","It is too early to judge — six runs says very little about the saving or the underlying error rate."],
  why:"The saving is real and the first option stops one step too early: two caught errors tell you the reviewer caught two errors, not that the review catches errors. That distinction decides whether the workflow is safe to keep as the reviewer gets faster and more confident. The second option treats a caught error as a failure, when catching it is the design working. The fourth is true about the numbers and still ducks the question, because you can reason about the control without more runs."},

{ id:"hd-a2-02", exam:"CCAO-F", d:"a2", difficulty:"hard", kind:"scenario",
  q:"You are choosing a first workflow for a team new to this. Candidate A: a monthly board summary, high visibility, hard to judge quickly. Candidate B: weekly meeting notes, low stakes, obviously right or wrong. Candidate C: the task everyone complains about, which is ambiguous and poorly defined. Which, and why?",
  a:1,
  opts:["C, because solving the most painful task is what earns the team's willingness to adopt anything further.",
        "B, because weekly repetition and checkable output let you learn whether it works before anything depends on it.",
        "A, because high visibility means a success is noticed and the monthly cadence leaves room to review carefully.",
        "B first and then A, treating the board summary as the real target and the meeting notes as a rehearsal."],
  why:"B gives you four data points a month on output anyone can grade in seconds, which is what turns a first attempt into evidence. C is tempting and is the common mistake: the task is painful precisely because it is ambiguous, and ambiguity is what these workflows handle worst, so failing there teaches the team the idea does not work. A is slow to learn from and expensive to get wrong. The fourth option is nearly right but commits to A before B has told you anything."},

/* ---- a3: Governance, Risk, and Responsible Use ---- */

{ id:"hd-a3-01", exam:"CCAO-F", d:"a3", difficulty:"hard", kind:"scenario",
  q:"Policy prohibits regulated personal data in AI tools. An analyst removes names and email addresses from a customer spreadsheet, leaving postcode, date of birth, account opening date and purchase history, and asks whether it is now in scope.",
  a:0,
  opts:["It is very likely still in scope: postcode with date of birth re-identifies individuals in many datasets, so the stripped fields were not the identifying ones.","It is out of scope now, since the direct identifiers have gone and nothing at all remaining in the file ties any individual row back to a named person.","It depends entirely on the record count, since at a few hundred rows re-identification is impractical and a small extract falls outside the policy's intent.","It is out of scope for internal analysis only, but comes straight back into scope the moment any output derived from it is shared outside the immediate team."],
  why:"The intuition behind the second option — remove the name and the person is gone — is the one this question exists to break. Identification does not require an identifier: a postcode narrows to a street, a date of birth narrows to a handful of people, and together they frequently resolve to one. The third option has it backwards, since a small extract from a known customer base is often easier to re-identify, not harder. The practical answer is that this judgment is not the analyst's to make alone, which is why policy rather than instinct governs it."},

{ id:"hd-a3-02", exam:"CCAO-F", d:"a3", difficulty:"hard", kind:"scenario",
  q:"A manager asks Claude to summarize six months of an employee's work notes into a performance review, then edits the draft and submits it as their own assessment. What is the problem?",
  a:2,
  opts:["Disclosure: the review should state that AI assisted in producing it, so that the employee can weigh the assessment accordingly.","Data handling: the work notes are personnel information and arguably should not have been sent to the tool in the first place.","The reviewer's judgment is the thing being asked for, and summarizing the inputs is not the same as forming an assessment.","Nothing, provided the manager has read the underlying notes themselves and genuinely agrees with the draft as they have edited it."],
  why:"The second option is a real concern and depends on the organization's rules, which makes it a good distractor rather than the answer. The core problem is what a performance review is for: the employee is entitled to their manager's assessment, and a summary of inputs edited into agreement is a different thing wearing the same label. The fourth option is the closest to defensible and still inverts the order — reading the notes afterwards to check whether you agree is not the same as having formed a view."},

/* ---- a5: Product and Model Selection ---- */

{ id:"hd-a5-01", exam:"CCAO-F", d:"a5", difficulty:"hard", kind:"scenario",
  q:"A classification job runs on a cheaper tier at 94% accuracy. On the most capable tier it reaches 97%. The job processes 8,000 items a month and every misclassification is caught downstream by a person who spends about four minutes fixing it. What should decide the tier?",
  a:1,
  opts:["The accuracy figures: three points on 8,000 items is 240 fewer errors a month, which is the clearer measure.","The two costs compared directly, weighing the tier's price difference against 240 items at four minutes each","The cheaper tier, since 94% clears the bar for a task whose errors are caught downstream anyway.","The capable tier, because accuracy on a classification feeding other work compounds through everything after it."],
  why:"The figures are all there to be compared, which is what this question is testing: 240 items at four minutes is sixteen hours a month of someone's time, and that is the number to weigh against the tier's price difference. The first option stops at the error count without costing it, the third treats \"caught downstream\" as free when the catching is the cost, and the fourth invokes compounding that does not apply when every error is caught immediately."},

/* ---- a7: Troubleshooting and Optimization ---- */

{ id:"hd-a7-01", exam:"CCAO-F", d:"a7", difficulty:"hard", kind:"scenario",
  q:"A prompt that worked well for months now produces weaker output. Nothing in the prompt changed. The team's first three hypotheses are: the model was updated, the task drifted, the team's standards rose. How do you tell them apart?",
  a:3,
  opts:["Check which model version is in use, since a version change is the only one of the three with a specific date to correlate against.","Ask the prompt's original author to review the current output, because they hold the standard the prompt was originally built to meet.","Re-run the prompt on a current input and judge the result, which is the most direct available evidence of its quality right now.","Re-run it on an input that worked well before: same output means the inputs or standards moved, worse output means something upstream did."],
  why:"The fourth option is the only one that isolates a variable. Holding the input constant separates a change in the system from a change in what is being fed to it, and the result points at the next test rather than the answer. Judging current output on a current input confounds all three hypotheses at once. Checking the version is worth doing and only rules one in or out. Asking the author surfaces a standard but cannot distinguish a rising standard from falling quality — which is the hardest of the three to see from inside."},

{ id:"hd-a7-02", exam:"CCAO-F", d:"a7", difficulty:"hard", kind:"scenario",
  q:"Output in a long working session has become vague. A colleague suggests starting fresh; another says the prompt needs rewriting; a third says to add \"be specific and detailed\" to the instruction. What distinguishes the right answer?",
  a:0,
  opts:["Whether detail you supplied early is still being honoured: if it is being dropped, the session is saturated and a rewrite fixes nothing.","The length of the session, since vagueness after an hour of work is saturation while vagueness from the first reply is a prompt problem.","Whether the prompt has ever produced specific output, because a prompt that never worked in the first place cannot have degraded.","Nothing distinguishes them, since starting fresh with a rewritten and more emphatic prompt happens to address all three causes at once."],
  why:"The diagnostic is behavioral rather than temporal: check whether something you established early is still being applied. If early detail is being ignored, the context is saturated and no prompt wording recovers it. The second option uses elapsed time as a proxy, which fails because saturation depends on how much has accumulated rather than how long you have been there. The third is a reasonable sanity check that does not separate the two live hypotheses. The fourth is the real-world temptation — do everything — and it is how you learn nothing about which fix mattered."},

/* ---- a6: Configuration and Knowledge Management ---- */

{ id:"hd-a6-01", exam:"CCAO-F", d:"a6", difficulty:"hard", kind:"scenario",
  q:"A Project's knowledge holds last year's pricing sheet and this year's, both uploaded, neither dated in the filename. Responses have started quoting a mix of the two. What is the fix, and what does the incident reveal?",
  a:2,
  opts:["Rename both of the files with their effective dates, so that whichever one a response draws on can be identified afterwards.","Add an instruction stating that the newer sheet supersedes the older one wherever the two of them disagree about a price.","Remove the superseded sheet, because supplied knowledge is treated as current and two valid-looking answers cannot be ranked.","Split the Project into two, one for each of the pricing years, so any one conversation only ever sees a single sheet."],
  why:"Nothing about the older sheet announces that it has been superseded, so both are treated as current and a response can draw from either. The second option looks like the careful fix and depends on the model reliably comparing two documents and applying a precedence rule — a probabilistic control where removal is a certain one. Renaming helps a human audit afterwards without changing what gets retrieved. Splitting the Project solves it and costs you the ability to ask a question spanning both years. What the incident reveals is that curation is the control, and uploading is not free."}

);
