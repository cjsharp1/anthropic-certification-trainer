/* Study notes — the teaching layer, one entry per domain.
 *
 * Written against the published exam blueprints and current Anthropic platform
 * documentation. Deliberately concept-first: the exams are scenario-based, so
 * these explain the reasoning that generalizes rather than listing facts to
 * memorize. Version-specific numbers live in flashcards instead, where they are
 * easy to re-verify when the exams update.
 *
 * Schema:
 *   exam, d      which exam + domain this covers
 *   mins         realistic read time
 *   big          the one idea that unlocks the domain
 *   sections[]   {h, body[]}  body entries are strings (paragraphs) or
 *                {table:[[cols]]} or {list:[items]} or {warn:"..."}
 *   confusions[] {a, b, split} — pairs the exam deliberately conflates
 *   checks[]     self-test prompts to answer before quizzing
 */
const NOTES = [

/* ===================== CCAR-F D1 — Agentic Architecture (27%) ============ */
{ exam:"CCAR-F", d:"d1", mins:14,
  big:"An agent is a loop you control around a model you don't. Everything in this domain follows from deciding which half owns a given responsibility.",
  sections:[
    { h:"The loop itself",
      body:[
        "Every agentic system is the same cycle: send the conversation, read what comes back, act on it, append the result, repeat. The model never executes anything — it emits a request describing what it wants done, your code performs the work, and you hand back the outcome as a new message. That boundary is the foundation of the entire domain, and a surprising number of wrong answers come from blurring it.",
        "Concretely, one iteration looks like this: you POST the full message history, the response comes back with a <code>stop_reason</code> and some content blocks, you inspect those blocks, and if any is a tool request you execute it and append both the model's turn and your result turn before looping. Nothing persists server-side between calls — the conversation exists only in what you send.",
        { key:"The model <strong>requests</strong>; your code <strong>executes</strong>. Every architectural question in this domain resolves faster once you ask which side of that line a responsibility falls on." },
        { fig:{ svg:"<svg viewBox=\"0 0 640 250\" xmlns=\"http://www.w3.org/2000/svg\"> <defs> <marker id=\"ar\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"> <path d=\"M 0 0 L 10 5 L 0 10 z\" fill=\"currentColor\"/> </marker> </defs> <g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"> <rect x=\"18\" y=\"40\" width=\"250\" height=\"170\" rx=\"10\" stroke-dasharray=\"5 4\" opacity=\"0.5\"/> <rect x=\"372\" y=\"40\" width=\"250\" height=\"170\" rx=\"10\" stroke-dasharray=\"5 4\" opacity=\"0.5\"/> <rect x=\"52\" y=\"78\" width=\"182\" height=\"44\" rx=\"7\"/> <rect x=\"406\" y=\"78\" width=\"182\" height=\"44\" rx=\"7\"/> <rect x=\"406\" y=\"148\" width=\"182\" height=\"44\" rx=\"7\"/> </g> <g fill=\"currentColor\" font-family=\"system-ui, sans-serif\"> <text x=\"143\" y=\"26\" font-size=\"12\" font-weight=\"600\" text-anchor=\"middle\" opacity=\"0.65\">THE MODEL</text> <text x=\"497\" y=\"26\" font-size=\"12\" font-weight=\"600\" text-anchor=\"middle\" opacity=\"0.65\">YOUR CODE</text> <text x=\"143\" y=\"105\" font-size=\"13\" text-anchor=\"middle\">emits a tool request</text> <text x=\"497\" y=\"105\" font-size=\"13\" text-anchor=\"middle\">executes the tool</text> <text x=\"497\" y=\"175\" font-size=\"13\" text-anchor=\"middle\">appends the result</text> </g> <g stroke=\"currentColor\" stroke-width=\"1.5\" fill=\"none\" marker-end=\"url(#ar)\"> <line x1=\"238\" y1=\"100\" x2=\"398\" y2=\"100\"/> <polyline points=\"406,170 330,170 330,232 143,232 143,126\"/> </g> <g fill=\"currentColor\" font-family=\"system-ui, sans-serif\" font-size=\"11\" opacity=\"0.8\"> <text x=\"318\" y=\"92\" text-anchor=\"middle\">stop_reason: tool_use</text> <text x=\"265\" y=\"247\" text-anchor=\"middle\">sent back as a new message</text> </g> </svg>", cap:"The loop. The model never executes anything — it emits a request, your code performs the work, and the result goes back as a message. Every design question in this domain resolves faster once you ask which side of that dashed line a responsibility falls on." } },
        "Termination is where implementations most often go wrong. The loop ends when the model produces a closing text turn — not when a tool result arrives. Break as soon as no tool call appears in a response and you cut off the synthesis step, leaving the user with a raw tool result and no answer. The bug is subtle because the work <em>was</em> done; only the explanation is missing.",
        { fig:{ svg:"<svg viewBox=\"0 0 620 170\" xmlns=\"http://www.w3.org/2000/svg\"> <defs> <marker id=\"ar2\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"> <path d=\"M 0 0 L 10 5 L 0 10 z\" fill=\"currentColor\"/> </marker> </defs> <g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"> <rect x=\"14\" y=\"54\" width=\"104\" height=\"40\" rx=\"7\"/> <rect x=\"178\" y=\"54\" width=\"104\" height=\"40\" rx=\"7\"/> <rect x=\"342\" y=\"54\" width=\"104\" height=\"40\" rx=\"7\"/> <rect x=\"506\" y=\"54\" width=\"100\" height=\"40\" rx=\"7\"/> </g> <g fill=\"currentColor\" font-family=\"system-ui, sans-serif\" font-size=\"12\" text-anchor=\"middle\"> <text x=\"66\" y=\"79\">tool_use</text> <text x=\"230\" y=\"79\">tool result</text> <text x=\"394\" y=\"79\">tool_use</text> <text x=\"556\" y=\"79\">end_turn</text> </g> <g stroke=\"currentColor\" stroke-width=\"1.5\" fill=\"none\" marker-end=\"url(#ar2)\"> <line x1=\"122\" y1=\"74\" x2=\"172\" y2=\"74\"/> <line x1=\"286\" y1=\"74\" x2=\"336\" y2=\"74\"/> <line x1=\"450\" y1=\"74\" x2=\"500\" y2=\"74\"/> </g> <g stroke=\"currentColor\" stroke-width=\"1.5\" fill=\"none\"> <line x1=\"314\" y1=\"30\" x2=\"314\" y2=\"120\" stroke-dasharray=\"4 4\" opacity=\"0.55\"/> <line x1=\"478\" y1=\"30\" x2=\"478\" y2=\"120\" stroke-dasharray=\"4 4\" opacity=\"0.55\"/> </g> <g fill=\"currentColor\" font-family=\"system-ui, sans-serif\" font-size=\"11\"> <text x=\"314\" y=\"24\" text-anchor=\"middle\" opacity=\"0.75\">breaking here</text> <text x=\"314\" y=\"138\" text-anchor=\"middle\" opacity=\"0.75\">returns a raw tool result</text> <text x=\"478\" y=\"24\" text-anchor=\"middle\" opacity=\"0.75\">breaking here</text> <text x=\"478\" y=\"138\" text-anchor=\"middle\" opacity=\"0.75\">returns the answer</text> </g> </svg>", cap:"Where you break decides what the user gets. The work is done either way — stopping when a tool result arrives hands back the raw result, and the synthesis step that explains it never runs." } },
        { warn:"Branch on every <code>stop_reason</code> value, including ones you don't expect. Treating an unhandled value as 'finished' silently truncates work — and the symptom looks like a model quality problem rather than a bug in your loop, so teams often spend days tuning prompts to fix a control-flow error." },
        { table:[
          ["stop_reason","Meaning","What your loop does"],
          ["end_turn","Model finished naturally","Return the answer; exit"],
          ["tool_use","One or more tools requested","Execute, append results, continue"],
          ["max_tokens","Output ceiling hit mid-generation","Do NOT trust partial output; raise ceiling or continue"],
          ["stop_sequence","A custom stop sequence was generated","Handle per your own convention"],
          ["pause_turn","Long-running server-side operation paused","Send the turn back to resume"],
          ["refusal","Model declined to continue","Surface appropriately; do not retry blindly"],
          ["model_context_window_exceeded","Output filled the context window","Treat as truncated; compact or start fresh"]
        ]},
        { why:{ q:"Why does max_tokens deserve special care?",
          a:"Because the content <em>looks</em> fine. Generation stops wherever it happened to be — mid-sentence, mid-JSON, mid-tool-argument — so you get syntactically plausible output that is semantically incomplete. Code that parses the response without checking stop_reason will either throw on malformed JSON (the lucky case, because you notice) or silently accept a truncated record (the dangerous one). Always check the reason before trusting the content." } }
      ]},
    { h:"Five orchestration patterns",
      body:[
        "Exam questions describe a novel situation and ask which pattern fits. They deliberately avoid naming the pattern in the scenario, so matching on vocabulary fails — you have to match on structure.",
        { table:[
          ["Pattern","Signature","Tell","Main risk"],
          ["Prompt chaining","Fixed sequence, each step feeds the next","Steps dependent, known in advance","A bad early step poisons everything after"],
          ["Routing","Classify, then dispatch to a specialist","One classification decides everything downstream","Misclassification sends work down a wrong path"],
          ["Parallelization","Independent tasks run concurrently","Nothing in one task depends on another","Results may conflict and need reconciling"],
          ["Orchestrator–worker","Coordinator decomposes at runtime","Subtasks unknown until the problem is seen","Decomposition quality bounds everything"],
          ["Evaluator–optimizer","Generate, critique, loop until it passes","Iteration until acceptance","May never converge without a cap"]
        ]},
        { key:"Identify by <strong>structure</strong>, not keywords: is the work sequence fixed or decided at runtime? Do the pieces depend on each other? Does output ever loop back?" },
        "Two pairs account for most confusion. <strong>Parallelization versus orchestrator–worker</strong> is about who decides the subtasks. If you already know the units of work — summarize these five documents — it's parallelization. If a coordinator examines the problem and works out the breakdown at runtime, it's orchestrator–worker. Both run concurrently, so concurrency is not the distinguishing feature, and questions exploit exactly that.",
        "<strong>Prompt chaining versus evaluator–optimizer</strong> is about loop-back. Chaining only moves forward; each step hands off and is done. If output returns to an earlier step for another attempt, it's evaluator–optimizer. The giveaway phrase is 'until' — until it passes, until it meets the bar, until the reviewer is satisfied.",
        { exam:"A scenario describing 'draft, have a second agent critique it, repeat until the critique passes' is evaluator–optimizer. Chaining can't revisit the draft, parallelization needs independence the critique doesn't have, and orchestrator–worker is single-pass with workers that don't judge each other." },
        { why:{ q:"Why does routing have a single point of failure the others don't?",
          a:"In routing, the classification step runs once and determines the entire downstream path. Every later step may execute flawlessly and still produce a useless result, because it was the wrong specialist for the request. The other patterns degrade more gracefully — a weak parallel worker affects one result, a weak chain step affects what follows but is visible at the handoff. This is why routing designs need a fallback or general-purpose branch for low-confidence classifications rather than forcing every request into a specialist." } }
      ]},
    { h:"Where guarantees come from",
      body:[
        "This is the most-tested idea in the domain, and it recurs almost verbatim in Domain 3. Prompts, memory files, and examples <em>shape</em> behavior: they shift probabilities. Permissions, hooks, and tool design <em>enforce</em> it: they run in code regardless of what the model decides.",
        { key:"Any question containing <strong>'guarantee', 'must never', 'always', or 'even if'</strong> is pointing at the enforcement layer. A prompt-based answer is wrong by construction." },
        "The inverse signal is just as useful. If a scenario says a control works 'most of the time', 'usually', or 'sometimes fails', that is a probabilistic mechanism being asked to do a deterministic job — and the fix is to move the control, not to word it more forcefully.",
        "The corollary matters too, and it's where careful candidates over-correct. Hooks fire per-tool-call, which makes them right for gating an individual call's input or output. Loop-level state like an iteration count doesn't naturally live there — tracking 'how many iterations has this session run' from inside a per-call hook means threading external state in, which is more awkward than simply checking it in the orchestration code where that state already exists.",
        { key:"Before reaching for a hook, ask what <strong>layer the state lives at</strong>: per-tool-call (hook) or across the whole loop (your code). 'Hooks are deterministic' is true but doesn't make them the answer to everything deterministic." },
        { why:{ q:"Why can't a sufficiently strong prompt be a guarantee?",
          a:"Because the model samples from a distribution. A well-written instruction might be followed 999 times in 1000, which feels like certainty in testing and is not certainty at all — and the failing case tends to arrive under unusual conditions, which is exactly when the stakes are highest. Enforcement mechanisms don't have a failure rate in this sense: a permission rule that denies a tool call denies it every time, because the decision happens in code before the model's output is acted on." } }
      ]},
    { h:"Side effects, retries, and forks",
      body:[
        "When an operation changes the world — a payment, an email, a deployment, a deletion — and the architecture involves retries, forks, or parallel branches, the robust answer is almost always idempotency rather than sequencing.",
        "The tempting answer is to reorder: fork after the confirmation, retry only after checking state. It feels like it addresses the problem. But a forked branch inherits a <em>copy</em> of that state and can still misread it, second-guess it, or decide the confirmation was stale. Reordering changes what a branch starts from; it does not remove the branch's ability to act again.",
        { key:"<strong>Side effects + retries, forks, or parallelism → idempotency key.</strong> Reordering changes starting state; idempotency makes repetition safe regardless of order." },
        { why:{ q:"How does an idempotency key actually prevent the double charge?",
          a:"The client generates a unique key for the logical operation and sends it with the request. The server records it alongside the result. If a second request arrives with the same key — whether from a retry after a lost response, a forked branch, or a duplicate execution — the server recognizes it and returns the original outcome instead of performing the work again. The guarantee lives at the resource that owns the side effect, which is the only place that can see all the attempts." } },
        { exam:"This generalizes beyond payments. Any scenario pairing an irreversible action with concurrency or retry is testing the same instinct, and the reordering answer will always be present as a plausible distractor." }
      ]},
    { h:"Failure inside the loop",
      body:[
        "A crashed subagent or a failing tool should come back as a structured result — a success flag, an error category, a human-readable description — not an exception that breaks the loop, and not an empty string that is indistinguishable from a legitimately empty answer.",
        "Two things follow. The model can reason about what happened and recover, choosing a different approach or reporting the problem coherently. And your control flow stays in one place rather than scattering across exception handlers at every call site.",
        { key:"Package failures as <strong>structured tool results</strong>, not exceptions and not empty strings. The loop continues; the model gets something it can act on." },
        "Write error messages for a reader who will act on them. 'Rate limit exceeded, retry after 60 seconds' lets the model wait appropriately. 'Error' does not. The error text is part of your interface with the model, not a log line.",
        { why:{ q:"Why is an empty string worse than an explicit error?",
          a:"Because it's ambiguous in a way that produces confident wrong behavior. A search that returns nothing because the service was down and a search that returns nothing because there were genuinely no matches look identical, and the model will usually treat the second interpretation as true — reporting 'no results found' when the real answer is 'we don't know'. An explicit error flag removes the ambiguity." } }
      ]},
    { h:"Context isolation and subagents",
      body:[
        "Subagents exist primarily for context isolation. A subagent works in its own window and returns only a summary, so verbose search output, file dumps, and log tails never reach the parent conversation. That protects the main thread from the saturation covered in Domain 5.",
        { key:"Subagents buy <strong>context isolation</strong>, not speed or cheapness. A single subagent adds overhead; several fanned out concurrently can help wall-clock time." },
        "Emitting several spawn calls in one response fans them out concurrently; issuing them across separate turns runs them one at a time. When tasks are independent, that difference is the difference between parallel and serial execution.",
        "Scope each subagent's tools to what its job requires. A read-only research agent holding write access is a blast-radius problem waiting for a confused run or a prompt injection — and it's the same least-privilege reasoning that appears in the Developer exam's security domain.",
        { exam:"If a coordinator 'can't spawn subagents at all', check whether its allowed-tools list includes the delegation tool. Spawning is itself a tool call, so omitting it removes the capability entirely." }
      ]},
    { h:"State that outlives a single run",
      body:[
        "Long-running agents need to survive restarts. Anything you cannot reconstruct must be externalized: the conversation state needed to continue, progress markers for completed work, and crucially which side-effecting operations already fired so they aren't repeated.",
        "The model's internal reasoning from earlier turns is <em>not</em> recoverable or re-injectable. That is precisely why decisions that matter should be written into durable state as they're made rather than left implicit in reasoning the next run won't have.",
        { key:"Externalize what you can't rebuild: conversation state, progress markers, and completed side effects. Reasoning is not durable — <strong>write down decisions, not just results</strong>." },
        { warn:"Conversation history is append-only, so a superseded fact stays visible alongside its correction and the model may act on either. Where a value can change mid-run, keep a single current answer in external state rather than relying on the latest mention winning." }
      ]}
  ],
  confusions:[
    { a:"Parallelization", b:"Orchestrator–worker", split:"Who decides the subtasks — you in advance, or a coordinator at runtime." },
    { a:"Prompt chaining", b:"Evaluator–optimizer", split:"Whether output ever loops back for another attempt." },
    { a:"Hook (per-tool-call)", b:"Orchestration code (whole-loop)", split:"What layer the state naturally lives at." },
    { a:"Reordering a fork", b:"Idempotency", split:"Reordering changes starting state; idempotency makes repeats safe." }
  ],
  checks:[
    "Name all seven stop_reason values and what each means for your loop.",
    "Given 'draft, critique, repeat until it passes' — which pattern, and why not the other four?",
    "A control 'usually' prevents something. What does that tell you about where it lives?",
    "Why doesn't forking after a confirmation prevent a double charge?"
  ]
},

/* ===================== CCAR-F D2 — Tool Design & MCP (18%) =============== */
{ exam:"CCAR-F", d:"d2", mins:12,
  big:"The tool description is the routing signal, and MCP is a distribution protocol. Most wrong answers in this domain come from confusing adjacent layers.",
  sections:[
    { h:"Anatomy, and the direction trap",
      body:[
        "A tool definition is what you send; a tool_use block is what comes back. They share a field, which is precisely why they get cross-wired under exam pressure.",
        { table:[
          ["","Direction","Fields"],
          ["Tool definition","You → model","name, description, input_schema"],
          ["tool_use block","Model → you","id, type, name, input"]
        ]},
        { key:"Read the question for <strong>direction</strong>. 'What does a tool definition require' and 'what fields does a tool call have' look alike and have different answers." },
        "The <code>input_schema</code> is ordinary JSON Schema: a type, properties, and a required list. It serves double duty — it tells the model what arguments to produce, and it's the contract your executor can validate against before doing anything.",
        { warn:"If a field is genuinely required by the operation, mark it required in the schema. An optional field will sometimes be omitted, and your tool then has to handle the gap at runtime — usually by returning an error that costs a full round trip to recover from." }
      ]},
    { h:"Descriptions do the routing",
      body:[
        "The model selects a tool by reading descriptions, not names. A tool called <code>search</code> with a vague description loses to a tool called <code>q7_lookup</code> with a precise one. When routing is wrong, rewriting the description is the first fix — every time.",
        { key:"Misrouting → <strong>rewrite the description first</strong>. It is the primary routing signal and the cheapest thing to change." },
        "A strong description covers five things: what the tool does, when to use it, when <em>not</em> to (especially versus a similar tool), what it returns, and its limits. The when-NOT clause does disproportionate work when several tools overlap, because it's the only part that actively pushes the model away.",
        { warn:"Three tempting non-fixes. Raising temperature adds randomness to an already-wrong decision. Adding more tools increases overlap and makes routing harder. Switching to <code>tool_choice: any</code> forces a call without improving which one gets picked." },
        "At scale the problem changes shape. Past roughly a few dozen tools, even good descriptions compete for attention, and three structural techniques help: namespace names so similar tools from different servers are distinguishable, consolidate near-duplicate operations behind a single tool with an action parameter, and defer loading so only relevant descriptions enter the decision for a given query.",
        { key:"At scale: <strong>namespace, consolidate, defer-load</strong>. Note what's absent from that list — temperature and adding tools." },
        { why:{ q:"Why does consolidating beat adding a routing tool?",
          a:"A routing tool adds a decision rather than removing one — the model still has to choose correctly, just one level earlier, and now there's an extra call in the loop. Consolidation removes the choice entirely: two confusable tools become one tool with an explicit mode parameter, and the parameter value is documented in the schema where it can't be misread as something else. If two tools are similar enough to confuse a careful reader, they'll confuse the model." } }
      ]},
    { h:"tool_choice",
      body:[
        { table:[
          ["Value","Behavior","Guarantees","Typical use"],
          ["auto","Model decides; may return text","Nothing","Default conversational agent"],
          ["any","Must call some tool, model picks","A call happens","Every turn must act"],
          ["tool (named)","Must call that specific tool","Which tool, so the schema","Structured extraction"],
          ["none","No tools at all","No call","Temporarily disable tools"]
        ]},
        { key:"<code>any</code> guarantees <strong>presence</strong>; the named form guarantees <strong>shape</strong>. For output pinned to one schema, only the named form will do." },
        "With several tools available, <code>any</code> leaves the output shape open — the model satisfies the constraint by calling anything. That's fine when the requirement is 'act, don't chat' and wrong when the requirement is 'produce this record'.",
        { exam:"Forcing a tool also suppresses the natural-language text that would otherwise precede a call, which matters if your UI expects a sentence of explanation alongside the action." },
        { warn:"In current practice this is narrowing: the newest models reject <code>any</code> and the named form with a 400, and manual extended thinking rejects them too. The documented replacements are <code>auto</code> with <strong>strict tool use</strong> for schema-valid inputs, or <strong>structured outputs</strong> for a fixed JSON response. The exam guide still tests the four values above, so learn the table — but do not write new code against forced tool use without checking the model." }
      ]},
    { h:"MCP's three layers",
      body:[
        "MCP solves a duplication problem: implement tools once in a server, and many clients connect to it. Update the server and every client picks up the change on reconnect, rather than needing a change in each application.",
        { key:"Reach for MCP when the <strong>same tools serve multiple clients</strong>. For tools used by one app, inline definitions are simpler." },
        "The protocol stacks three same-shaped 'pair of two' facts, and swapping them is the classic error:",
        { table:[
          ["Layer","Values","What it answers"],
          ["Transports","stdio, Streamable HTTP","How bytes physically move"],
          ["Message format","JSON-RPC 2.0, UTF-8","How messages are structured on arrival"],
          ["Primitives","Tools, Resources (+ Prompts)","What's exposed to clients"]
        ]},
        { key:"When a question names a layer, <strong>confirm which one</strong> before answering. A correct fact from the adjacent layer is the most common wrong answer here." },
        { warn:"WebSocket is not a standard transport. SSE is folded into Streamable HTTP rather than existing as a separate third option — both appear as distractors." }
      ]},
    { h:"Tools versus Resources, and access control",
      body:[
        "A Tool is model-invoked and may have side effects. A Resource is client-controlled, read-only, and URI-addressed. The distinction is about control and consequence, and it's decided by whoever builds the server.",
        "This produces a favorite trap. Asked how to get read-only access to a server that also exposes a destructive tool, the wrong answer is 'reclassify it as a Resource'. A consuming client cannot retroactively change what a server's operation <em>is</em> — that classification describes the operation, it doesn't constrain it from outside.",
        { key:"Restricting an existing server means <strong>client-side allowlist or denylist</strong> on the connection — never reclassifying its primitives." },
        "The diagnostic question: am I changing what the tool fundamentally is, or choosing which existing tools I'm willing to expose? Reclassification-style answers are a red flag whenever the scenario is really about access control.",
        { warn:"Secrets referenced in shared or committed configuration go by environment-variable name, never as literal values — the same rule that appears in the Developer exam's security domain." }
      ]},
    { h:"Returning results",
      body:[
        "All tool_result blocks for parallel calls go back in ONE user message, results first, each carrying the matching <code>tool_use_id</code>.",
        { key:"Parallel results: <strong>one message, results first, ids matched</strong>. Splitting across messages, inserting a message between, or putting text before the results each produce a 400." },
        "Failures return a tool_result flagged as an error with a structured, instructive body. 'Rate limit exceeded, retry after 60 seconds' lets the model act correctly; 'error' does not.",
        { key:"Signal failure with <code>is_error: true</code> on the <code>tool_result</code> block, with the reason in its content. Do <strong>not</strong> let an exception escape the loop, and do not return an empty string — both leave the model with nothing to act on." },
        "A legitimately empty result is a <em>success</em>, not a failure. A search returning zero matches reached the source and got a real answer — retrying wastes budget and can loop indefinitely, and flagging it as an error teaches the model to distrust correct output.",
        { key:"Distinguish <strong>'the tool failed'</strong> from <strong>'the tool worked and the answer is nothing'</strong>. Only the first is retryable." },
        "Tool output is part of your context budget. A tool dumping 50,000 tokens of raw JSON on every call is a design error — return what the model needs to reason with, not everything the upstream API happened to send. Filter, paginate, or summarize on the server side.",
        { key:"Built-in tool selection is tested: <strong>Grep</strong> searches file <em>contents</em>, <strong>Glob</strong> matches file <em>paths</em>, <strong>Read/Write</strong> handle whole files, <strong>Edit</strong> makes targeted changes via unique text match." },
        { warn:"When Edit fails because the anchor text isn't unique, the fallback is Read then Write. Build codebase understanding incrementally — Grep for entry points, then Read to follow imports — rather than reading everything upfront." },
        { why:{ q:"Why not just let the model ignore the extra data?",
          a:"It can't ignore what it has to read. Every token in that payload consumes context the conversation needs for actual work, costs input charges on the call, and competes for the model's attention with the parts that matter. In a long agentic loop where the tool is called repeatedly, oversized results are usually the single largest contributor to the saturation covered in Domain 5." } }
      ]}
  ],
  confusions:[
    { a:"Tool definition (name/description/input_schema)", b:"tool_use block (id/type/name/input)", split:"Which direction — you sending, or the model returning." },
    { a:"MCP transports", b:"MCP message format", split:"How bytes move versus how messages are structured." },
    { a:"tool_choice 'any'", b:"tool_choice named", split:"Presence of a call versus which call, and therefore the schema." },
    { a:"Reclassifying a Tool as a Resource", b:"Client-side allow/denylist", split:"Server design versus access control." },
    { a:"Tool failed", b:"Tool succeeded with an empty result", split:"Zero matches is a valid answer, not an error to retry." }
  ],
  checks:[
    "Routing is wrong between two similar tools. What do you change first, and what three things do you not do?",
    "You need output matching one specific schema. Which tool_choice, and why isn't 'any' enough?",
    "A server exposes a destructive tool and you want read-only access. What's the lever, and what's the trap?",
    "Three parallel tool calls came back. Describe exactly how the results go back."
  ]
},

/* ===================== CCAR-F D3 — Claude Code Config (20%) ============== */
{ exam:"CCAR-F", d:"d3", mins:18,
  big:"Configuration either shapes behavior or enforces it. Knowing which mechanism does which answers most of this domain.",
  sections:[
    { h:"Shape versus enforce",
      body:[
        { table:[
          ["Shapes (probabilistic)","Enforces (deterministic)"],
          ["CLAUDE.md memory files","Hooks"],
          ["Path-scoped rules","Permission allow/deny rules"],
          ["Skills and system prompts","Tool access scoping"]
        ]},
        "Shaping mechanisms are context the model reads and usually follows. Enforcing mechanisms are code that runs regardless of what it decides. For a hard requirement — 'lint must run every time', 'this file must never be edited' — only the right column qualifies.",
        { key:"'Guarantee', 'must never', 'always', 'even if' → <strong>right column</strong>. A memory-file answer to a guarantee question is wrong by construction." },
        "Escalate in order, though, and this is where careful candidates overshoot. A clear instruction is cheap, readable, and easy to change. Hooks and permission rules are code to maintain, and an overly broad one blocks legitimate work in ways that are annoying to diagnose. Reach for enforcement when the softer approach has demonstrably failed — or immediately when the requirement is a safety guarantee, where probabilistic was never acceptable.",
        { key:"Order of escalation: <strong>clear instruction → acceptance criteria → enforcement</strong>. Simplest sufficient mechanism first." },
        { why:{ q:"Why not just enforce everything from the start?",
          a:"Enforcement has real costs. Every hook is a program that runs on a hot path and can itself fail, hang, or produce confusing output. Permission rules that are too broad block work the team legitimately needs, and the resulting failure usually surfaces as an inscrutable refusal rather than a clear message. Guidance that is followed 95% of the time is often entirely adequate for a stylistic preference, and it costs nothing to change when the preference changes." } }
      ]},
    { h:"Hooks: timing and exit codes",
      body:[
        "Hooks are the deterministic half of this domain. The two that matter most are bracketed around tool execution:",
        { table:[
          ["Event","When it fires","Can it block?"],
          ["PreToolUse","Before the tool runs","Yes — exit 2 or a deny decision"],
          ["PostToolUse","After the tool succeeded","No — the tool already ran"]
        ]},
        { key:"<strong>Only exit code 2 blocks.</strong> Exit 0 is success; every other non-zero code is a non-blocking error and the action proceeds." },
        { warn:"A hook that exits 1 on detection appears to work. It detects correctly, logs correctly, and stops nothing. This is an extremely easy bug to ship, because every part of it looks right in testing except the one behavior you wrote it for." },
        "PostToolUse exiting 2 does not undo anything. The tool already ran — the file is written, the command executed. Exit 2 there only surfaces stderr so the model can see the problem and self-correct on a subsequent turn.",
        { key:"To <strong>prevent</strong> an action, PreToolUse. PostToolUse can only react to one that already happened." },
        { exam:"A scenario describing a PostToolUse hook that 'reverts a bad edit' is testing exactly this. The edit stands." },
        "Those two are the pair that gets tested, but they are not the whole set. <strong>SessionStart</strong> fires when a session begins or resumes, which is where teams inject project context; <strong>UserPromptSubmit</strong> fires before your prompt reaches the model and can block it; <strong>Stop</strong> and <strong>SubagentStop</strong> fire when a response finishes; <strong>Notification</strong> fires when Claude needs attention; <strong>PreCompact</strong> fires before the conversation is compacted.",
        { key: "Only <strong>PreToolUse</strong> and <strong>UserPromptSubmit</strong> can prevent something from happening. The rest observe, inject context, or react after the fact." }
      ]},
    { h:"Memory files combine, they don't override",
      body:[
        "CLAUDE.md files load broad to specific and are <strong>concatenated</strong>. All applicable files end up in context together.",
        { key:"Memory files <strong>merge</strong>. A closer file tends to win a conflict because it's read later — but that's a tendency, not a hard override." },
        "The practical consequence: contradictory guidance doesn't resolve cleanly, it just produces inconsistent behavior. The fix is removing the contradiction, not reasoning about which file should win.",
        "There are also more levels than people expect — managed/enterprise, user, project, project-local, and nested directory. 'There are three levels' and 'the closest one overrides' are both common wrong answers.",
        { key:"When a rule 'isn't working', <strong>check which files actually loaded</strong> before rewriting it. It may be at a scope that never applied." },
        { why:{ q:"Why concatenate instead of override?",
          a:"Because the levels serve different purposes rather than competing versions of the same purpose. Your personal preferences, the team's standards, and a subdirectory's local conventions are all simultaneously true, and an override model would force you to restate inherited context at every level to avoid losing it. Concatenation keeps each file responsible only for what it adds — at the cost of making genuine conflicts your problem to notice." } }
      ]},
    { h:"Settings precedence and permissions",
      body:[
        "Settings files follow a strict precedence, unlike memory files:",
        { key:"Precedence, high → low: <strong>Managed → CLI args → Local → Project → User</strong>." },
        "Permission rules behave differently again: they <strong>merge</strong> across scopes rather than the top scope replacing the rest, and <strong>deny beats allow</strong> in any conflict.",
        { key:"<strong>Deny wins.</strong> A deny at any scope holds even when a lower scope explicitly allows the same pattern." },
        "That combination is what makes organization-wide restrictions enforceable: a deny rule in the managed layer cannot be overridden by a project file, because merging preserves it and deny takes precedence.",
        { key:"Rules developers must not be able to disable go in the <strong>managed layer</strong>. Anything in the repo is editable by anyone with commit access." },
        { warn:"Project-local settings are gitignored by design, so they are the wrong place for anything the team needs to share — and never a place for credentials, which belong in environment variables referenced by name." }
      ]},
    { h:"Scoping instructions to paths",
      body:[
        "Two mechanisms scope instructions, and they scope along different axes.",
        { table:[
          ["Mechanism","Scope","Good for"],
          ["Path-scoped rules (glob)","Repo-wide, matching files only","'Every .tsx file, wherever it lives'"],
          ["Nested directory memory file","One subtree","'Everything the backend team owns'"]
        ]},
        { key:"Glob rules scope by <strong>file type across the repo</strong>; nested memory files scope by <strong>location</strong>. Pick the one matching how the convention actually applies." },
        "For 'these TypeScript naming conventions apply to every .tsx file in the monorepo', a path-scoped rule is right: it loads only when a matching file is in play, and one file covers the whole repo. A root memory file would load always and apply to everything; one file per directory is unmaintainable at scale.",
        { exam:"The rule file's frontmatter field names the paths it matches. A rule that never triggers is usually scoped with the wrong field name or a glob that doesn't match what you think it does — check the loaded-files list first." }
      ]},
    { h:"Plan mode versus direct execution",
      body:[
        "A whole task statement in the official blueprint, and a favorite scenario subject.",
        { table:[
          ["Plan mode","Direct execution"],
          ["Large-scale changes across many files","Simple, well-scoped single-file change"],
          ["Multiple valid approaches exist","The approach is obvious"],
          ["Architectural decisions involved","A bug fix with a clear stack trace"],
          ["Dependencies need mapping first","Adding one validation check"]
        ]},
        { key:"Plan mode is for <strong>complexity that's already stated</strong>: multi-file scope, architectural decisions, several defensible approaches." },
        "The reason is cost of rework. Exploring and designing before committing avoids discovering a blocking dependency after you've written half the change.",
        { exam:"'Start direct and switch to plan mode if it gets complicated' is a tempting distractor. It's wrong when the scenario already describes the complexity — that's not something that might emerge later, it's a known property of the task." },
        { key:"The two combine: <strong>plan the investigation, then execute directly</strong> once the approach is settled." },
        "Pair it with the Explore subagent for the discovery phase, so verbose searching stays out of the main window — the same context-isolation idea from Domain 1."
      ]},
    { h:"Skills, commands, and modular memory",
      body:[
        { table:[
          ["Mechanism","Scope","Notes"],
          [".claude/commands/","Project, version-controlled","Shared with everyone who clones"],
          ["~/.claude/commands/","Personal","Not shared"],
          [".claude/skills/ SKILL.md","Project or personal","Frontmatter options below"],
          ["@import in CLAUDE.md","Wherever imported","Keeps memory files modular"]
        ]},
        { key:"Skill frontmatter worth knowing: <strong>context: fork</strong> (run isolated, don't pollute the main conversation), <strong>allowed-tools</strong> (restrict what it can do), <strong>argument-hint</strong> (prompt for parameters)." },
        "<code>context: fork</code> is the one to recognize in scenarios — a skill producing verbose output, like a codebase analysis, runs in its own sub-agent context and returns only the result.",
        { key:"Choose <strong>skills</strong> for on-demand task workflows and <strong>CLAUDE.md</strong> for always-loaded universal standards." },
        { key:"<code>@import</code> keeps a large memory file modular; <code>/memory</code> shows which files actually loaded." },
        { exam:"A new team member not getting an instruction usually means it sits in user-level config rather than project-level. Diagnose with /memory before rewriting anything." }
      ]},
    { h:"Session state, resumption, and forking",
      body:[
        { key:"<code>--resume &lt;name&gt;</code> continues a named session; <strong>fork_session</strong> branches from a shared baseline to explore divergent approaches." },
        "Forking is the mechanism for comparing two refactoring strategies or testing approaches from the same codebase analysis — both branches inherit the analysis, neither contaminates the other.",
        { key:"Resume when prior context is <strong>mostly still valid</strong>. Start fresh with an injected summary when prior tool results are <strong>stale</strong>." },
        { warn:"After code changes, a resumed session still holds the old file contents. Tell it what changed so it re-reads those specifically, rather than letting it reason from stale results." }
      ]},
    { h:"Headless runs",
      body:[
        "A CI run needs three things together, and omitting any one produces a different failure:",
        { table:[
          ["Requirement","How","Failure if missing"],
          ["Non-interactive mode","<code>-p</code> / <code>--print</code>","Waits for input forever"],
          ["Structured output","<code>--output-format json</code>, plus <code>--json-schema</code> to pin its shape","Scraping prose, or valid JSON with the wrong fields"],
          ["Pre-authorized permissions","Allow rules resolved before the run","Hangs mid-run at a prompt"]
        ]},
        { key:"CI needs <strong>all three</strong>: non-interactive, structured output, and pre-authorized tools." },
        { warn:"The classic hang is a job that <em>already has</em> the non-interactive flag and still waits forever. The cause is a mid-run permission prompt with no human to answer it." },
        { key:"Before answering 'why does X hang' with the most memorable fact, <strong>check whether the scenario already satisfies that fact's precondition</strong>. If the flag is in the command, the missing flag isn't the answer." },
        { why:{ q:"Why does the permission prompt block rather than fail?",
          a:"Because from the harness's perspective it's a legitimate request for a decision, and there's no basis for assuming either answer. Denying by default would break runs that should proceed; allowing by default would defeat the permission system. So it waits — which is correct interactively and fatal in CI, where nothing will ever answer. Pre-authorization resolves it by making the decision in advance." } }
      ]}
  ],
  confusions:[
    { a:"PreToolUse", b:"PostToolUse", split:"Before (can block) versus after (cannot — it already ran)." },
    { a:"Exit 1", b:"Exit 2", split:"Only 2 blocks. Everything else non-zero is a non-blocking error." },
    { a:"Concatenated", b:"Overridden", split:"Memory files merge; closer tends to win but nothing is replaced." },
    { a:"CLAUDE.md instruction", b:"Hook or permission rule", split:"Guidance versus guarantee." }
  ],
  checks:[
    "Lint must run after every edit, guaranteed. Which mechanism and which event?",
    "A hook detects a dangerous command, logs it, and the command still runs. Why?",
    "A CI job with the non-interactive flag hangs forever. What's actually wrong?",
    "Where does a rule go that developers must not be able to disable?"
  ]
},

/* ===================== CCAR-F D4 — Prompt & Structured Output (20%) ====== */
{ exam:"CCAR-F", d:"d4", mins:12,
  big:"When you need a hard guarantee, a prompting technique is never the answer. Enforcement happens at the API level.",
  sections:[
    { h:"The ranking that gets tested",
      body:[
        "Asked how to guarantee schema-valid output, rank the options by what they actually enforce rather than by how reliable they feel:",
        { table:[
          ["Approach","Guarantee","Failure mode"],
          ["Forced tool call / output schema","Enforced at the API level","None for shape"],
          ["Prefill","Probability only","Drifts after the opening"],
          ["Few-shot examples","Probability only","Novel input breaks the pattern"],
          ["Instruction ('reply only in JSON')","Weakest","Prose preamble, code fences"]
        ]},
        { key:"Only the <strong>first row enforces</strong>. The rest raise odds — which is not the same thing when a malformed response breaks a pipeline." },
        "A forced tool call has a second benefit that's easy to miss: the arguments arrive as an already-structured object. There are no code fences to strip, no preamble to cut, no trailing commentary to discard. The brittle cleanup step disappears entirely.",
        { key:"Tool-call input arrives <strong>already parsed</strong>. Text-response JSON arrives as text that may not even be valid." },
        { why:{ q:"Why does prefill feel stronger than it is?",
          a:"Because it works almost all the time in testing. Opening the assistant turn with '{' does reliably produce JSON-shaped output for the first few tokens — the failures happen later, when the model closes the structure early, adds a trailing explanation, or produces a nested shape that differs from the one you expected. The approach constrains the start and nothing else, so it looks solid right up until a response that diverges halfway through." } }
      ]},
    { h:"Schema validates structure, not meaning",
      body:[
        "JSON Schema catches wrong types and missing required fields. It does not catch a negative invoice amount, a future birthdate, an end date before a start date, or a quantity of zero where the business requires at least one. Those are all structurally valid and semantically wrong.",
        { key:"Schema = <strong>structure</strong>. Semantic rules need an application-level validator. A negative amount passes any schema that says 'number'." },
        "Semantic errors are the most exam-relevant category here precisely because the schema gives false assurance — validation passed, so the data looks trustworthy, and the bad value flows downstream.",
        "On a validation failure, append the model's response plus the error text and re-call, capped at about three attempts, then raise.",
        { key:"Retry loop: <strong>append the error, re-call, cap at ~3, then fail loudly</strong>. Never return invalid data with a warning." },
        { warn:"Unbounded retries burn budget on what is usually systematic — a schema mismatch, or source data that genuinely lacks the field. Three failures is evidence of a problem that retrying won't solve." },
        { warn:"Model genuinely-optional fields as nullable. If absence isn't representable in the schema, a required field forces the model to invent something — the schema itself manufactures hallucination." }
      ]},
    { h:"System prompt versus messages",
      body:[
        "<code>system</code> is a top-level parameter, not a role inside <code>messages</code>. The messages array holds only user and assistant turns, and the first must be a user turn.",
        { table:[
          ["Goes in system","Goes in messages"],
          ["Persona, tone, constraints","The task for this request"],
          ["Output format requirements","Per-request data"],
          ["Stable few-shot examples","The user's actual question"]
        ]},
        { key:"The boundary does three jobs at once: makes the system prompt <strong>cacheable</strong>, keeps instructions <strong>separate from untrusted input</strong>, and makes behavior <strong>debuggable</strong>." },
        { exam:"Passing a 'system' role inside the messages array is a common porting error from other providers' APIs, and appears as a distractor." }
      ]},
    { h:"Prompt caching is a prefix match",
      scope:"CCAR-F lists caching implementation details as out of scope — know that caching exists and the prefix-match idea. This section is in scope for CCDV-F (Claude API Mechanics, Cost and Token Management).",
      body:[
        "This single invariant explains every caching question you'll see.",
        { key:"The cached prefix is matched <strong>exactly</strong>. Any change at or before a breakpoint invalidates everything after it." },
        "Three consequences follow directly. Inserting a block <em>before</em> cached content is a full miss, not a partial hit — the prefix differs from byte zero. Volatile content (timestamps, request IDs, the user's question) belongs after the last breakpoint. And a dictionary serialized in non-deterministic key order will silently destroy hit rates while looking identical in your code.",
        "Prefix order is <strong>tools → system → messages</strong>, which means changing tool definitions invalidates the cached system prompt that follows them, even though you didn't touch it.",
        { key:"Put the <strong>most stable content earliest</strong>. Tool definitions sit at the front precisely because they change least." },
        "Writes cost more than base input and reads cost a fraction of it, so caching only pays off when the prefix is reused enough to amortize the write. Caching something you read once is a net loss.",
        { warn:"Below a minimum prefix length, caching is skipped <em>silently</em> — no error, no warning. If hit rates are zero, check length first, then diff two real request payloads byte by byte." },
        { key:"Verify with the <strong>cache-read token counts in the usage data</strong>, never by assumption. Zero reads across identical-looking calls means something in the prefix is changing." },
        "The two counters distinguish the two failures, which is why reading them beats guessing. <code>cache_creation_input_tokens</code> and <code>cache_read_input_tokens</code> both at zero means nothing was cached at all — usually the prefix sits below the minimum cacheable length, which varies by model and is silently enforced. Creation tokens on every call with no reads means caching is working and the prefix is varying.",
        { key:"Entries expire on a <strong>five-minute default lifetime</strong>, measured from the start of the request that writes or reads them rather than from when the response finishes. A slow response spends its own lifetime." }
      ]},
    { h:"Technique selection",
      body:[
        { table:[
          ["Technique","Solves","Don't use when"],
          ["Clear and direct","Vague output","—"],
          ["Few-shot (2–5, in system)","Format inconsistency","Prompt is already long"],
          ["Chain of thought","Multi-step reasoning","Simple lookups or classification"],
          ["XML-style tags","Mixed content in one message","—"],
          ["Prefill","Forcing a start format","You need a real guarantee"]
        ]},
        { key:"Match the technique to the <strong>difficulty of the task</strong>. Reasoning scaffolds on a lookup add latency and cost without accuracy." },
        "XML-style tags earn their place by <strong>delimiting</strong>. Wrapping each part of a mixed prompt in its own tag — <code>&lt;task&gt;</code>, <code>&lt;context&gt;</code>, <code>&lt;example&gt;</code>, <code>&lt;format&gt;</code> — tells the model where the instructions stop and the pasted document starts, so a sentence buried in the data is read as data rather than as a new instruction.",
        { key: "Tags separate <strong>instructions from content</strong>. The names are arbitrary and nothing validates them; the benefit is the boundary, which is why they matter most when one message carries several different kinds of material." },
        "Vague criteria are the single most common prompt defect. 'Be conservative' and 'be careful' aren't decidable — two readers draw different boundaries and so does the model from run to run.",
        { key:"Replace vague criteria with <strong>testable ones</strong>: 'flag only when claimed behavior contradicts the actual code', not 'be conservative'." },
        { why:{ q:"Why do false positives matter more than the raw error rate suggests?",
          a:"Because they're contagious across the whole output. A reviewer who encounters three spurious findings stops reading carefully and starts dismissing everything, including the real finding in position four. The cost isn't proportional to the false-positive count — it's a step change in whether the tool gets trusted at all. That's why disabling the worst-offending categories is a reasonable interim move even though it reduces coverage." } }
      ]},
    { h:"Reasoning budgets",
      body:[
        "Reasoning tokens bill as output and count against the total output ceiling alongside the visible answer.",
        { key:"The output ceiling covers <strong>reasoning + response</strong>. Allocate deep reasoning without raising it and the model can exhaust the budget mid-thought." },
        "The symptom is a truncated or empty answer after an expensive call — you paid for the reasoning and got nothing readable out. Size the ceiling for both parts.",
        { exam:"Also note the economic asymmetry: reasoning tokens bill at the output rate for content the user never sees. Enabling deep reasoning on a high-volume path can multiply costs invisibly." }
      ]}
  ],
  confusions:[
    { a:"Prefill", b:"Forced tool call", split:"Probability versus API-level enforcement." },
    { a:"JSON Schema validation", b:"Semantic validation", split:"Structure versus meaning. A negative amount passes schema." },
    { a:"Cache write cost", b:"Cache read cost", split:"Writes cost more than base; reads a small fraction. Neither is free." },
    { a:"Context window", b:"Output ceiling", split:"Total input budget versus the response limit — reasoning counts against the latter." }
  ],
  checks:[
    "Rank four approaches to guaranteed JSON. Which actually enforces?",
    "Schema validation passes but the amount is negative. What catches it?",
    "You prepend a timestamp block before a cached system prompt. What happens, and why not a partial hit?",
    "Where do few-shot examples go, how many, and why there?"
  ]
},

/* ===================== CCAR-F D5 — Context & Reliability (15%) =========== */
{ exam:"CCAR-F", d:"d5", mins:17,
  big:"Context is a shared budget you manage, and reliability is about knowing which failures are worth retrying.",
  sections:[
    { h:"What shares the budget",
      body:[
        "System prompt, tool definitions, message history, reasoning tokens, and room for the response all come out of one window.",
        { key:"<strong>Tool definitions count.</strong> At roughly a couple of hundred tokens each, thirty tools consume meaningful space before a single message is sent." },
        "That's the component people forget when auditing a context problem, and it's constant overhead on every request — unlike history, it doesn't grow, but it never shrinks either.",
        { key:"Context window and output ceiling are <strong>separate limits</strong>. A request can fit the window comfortably and still produce truncated output." },
        { exam:"If a scenario describes truncated output, check whether it's an input problem (window) or an output problem (ceiling). They have different fixes and the question usually makes one of them plausible-but-wrong." }
      ]},
    { h:"Strategies and what each costs",
      body:[
        "Every context strategy trades something. Choosing well means knowing which loss your use case can absorb.",
        { table:[
          ["Strategy","Loses","Cost","Best when"],
          ["Sliding window","Early messages entirely","Free","Only recency matters"],
          ["Summarization","Verbatim wording","One cheap call","Facts matter, phrasing doesn't"],
          ["Retrieval","Nothing, fetched on demand","Vector store + query","Corpus can never fit"],
          ["External memory","Nothing if used well","Extra tool calls","Facts must cross sessions"],
          ["Server-side clearing","Old tool results from model's view","Low","Tool-heavy loops; client keeps record"]
        ]},
        { key:"Read the scenario for <strong>what must be preserved</strong>, then eliminate strategies that discard exactly that." },
        "A support agent that must remember past tickets cannot use a sliding window — dropping early messages is precisely what loses the ticket history. That constraint is usually stated explicitly in the scenario and is the fastest route to the answer.",
        "Real designs combine strategies: a rolling summary plus the last several turns verbatim for the live conversation, external storage for cross-session facts loaded at session start, and caching on the stable summary block to control cost.",
        { why:{ q:"When is retrieval worse than just including the documents?",
          a:"When the corpus already fits. Retrieval adds a vector store to operate, an embedding step to keep current, and a new failure mode — retrieving the wrong chunks — that simply doesn't exist when the material is all present. For a small stable document set, putting it directly in context is simpler, cacheable as a stable prefix, and strictly more reliable. Retrieval earns its complexity when the corpus can never fit or each query needs a small slice of something large." } }
      ]},
    { h:"Recognizing context failure",
      body:[
        "Hard overflow is an error you can't miss. The interesting failure is silent.",
        { key:"The symptom is <strong>hedging</strong>: 'based on typical patterns' instead of naming the specifics it read earlier. That's saturation — details pushed out of the window." },
        "It reads like a quality problem, which is why teams respond by changing models or tuning prompts. Neither helps, because the information is simply no longer present.",
        { key:"The fix targets <strong>input pressure</strong>: compaction, a scratchpad file the model can re-read, or delegating lookups to a fresh-context subagent." },
        { warn:"Raising the output ceiling does nothing — that governs the response, not the input. And 'be specific' cannot recover information that is no longer in the window." },
        { key:"Context is <strong>per-session</strong>. Nothing survives a restart however large the window — cross-session memory needs durable external storage, loaded at session start." }
      ]},
    { h:"Retry classification",
      scope:"CCAR-F lists rate limiting and quotas as out of scope. Error handling and propagation IS in scope — focus on structured error responses and transient-vs-business error categories rather than memorizing status codes. Fully in scope for CCDV-F.",
      body:[
        { table:[
          ["Retry with backoff","Never retry"],
          ["429 rate limited (honor retry-after)","400 invalid request"],
          ["500 / 502 / 503 internal","401 authentication"],
          ["504 timeout","403 permission"],
          ["529 overloaded (back off longer)","413 request too large"],
          ["Connection errors","—"]
        ]},
        { key:"One rule: <strong>transient and server-side → retry; 4xx client errors → never</strong>. The same malformed request fails identically every time." },
        "Retrying a 4xx burns quota and delays the real fix, which is always a change to what you sent.",
        "The error body names a type alongside the status, and the names are more memorable than the numbers: <code>invalid_request_error</code> for 400, <code>authentication_error</code> for 401, <code>permission_error</code> for 403, <code>request_too_large</code> for 413, <code>rate_limit_error</code> for 429, and <code>overloaded_error</code> for 529. Branching on the type reads better than branching on the integer, and it survives a status being reused.",
        { key:"<strong>429 is your quota; 529 is system-wide overload.</strong> Both retry, but 529 warrants a longer backoff — the whole service is struggling, not just your share." },
        "Jitter is not optional. Without it, every client that failed at the same moment waits the same interval and retries simultaneously, re-overloading the service exactly as it recovers.",
        { key:"Jitter <strong>desynchronizes</strong> clients. Without it you build a thundering herd that prolongs the outage you're recovering from." },
        { warn:"SDKs typically retry transient failures a couple of times by default. Adding your own loop on top silently multiplies the real attempt count against the service — check what your client already does." }
      ]},
    { h:"Position effects and verbose tool output",
      body:[
        { key:"<strong>Lost in the middle</strong>: models process the beginning and end of a long input reliably, and may omit findings from the middle." },
        "Two practical consequences. Put key findings summaries at the <em>start</em> of an aggregated input, and organize the rest under explicit section headers so position matters less.",
        { key:"Tool results consume context <strong>disproportionately to their relevance</strong> — 40+ fields returned when five are useful." },
        "Trim verbose tool output to the relevant fields before it accumulates. In a long agentic loop, repeated oversized results are usually the single largest contributor to saturation.",
        { key:"When a downstream agent has a limited budget, have upstream agents return <strong>structured facts</strong> — key values, citations, relevance scores — not verbose content and reasoning chains." },
        { warn:"Progressive summarization has its own risk: condensing numbers, percentages, dates, and stated expectations into vague prose. Extract transactional facts into a persistent block that sits outside the summarized history." }
      ]},
    { h:"Human review and confidence calibration",
      body:[
        { key:"Aggregate accuracy <strong>hides segment failures</strong>. 97% overall can mean near-perfect on common document types and poor on one that matters." },
        "Before reducing human review, analyze accuracy by document type and by field to confirm performance is consistent across segments — not just high on average.",
        { key:"Use <strong>stratified random sampling</strong> of high-confidence extractions to keep measuring error rates and catch novel failure patterns after launch." },
        { key:"Field-level confidence scores, <strong>calibrated against a labeled validation set</strong>, route limited reviewer attention to what needs it." },
        { warn:"Uncalibrated self-reported confidence is unreliable — a model is often confidently wrong on exactly the hard cases. Calibration against labels is what makes the number mean something." }
      ]},
    { h:"Provenance in multi-source synthesis",
      body:[
        { key:"Source attribution is <strong>lost during summarization</strong> unless claim-source mappings are explicitly preserved and merged." },
        "Require subagents to output structured mappings — the claim, an evidence excerpt, the source URL or document name, and the publication date — that downstream synthesis carries through rather than flattening.",
        { key:"Conflicting figures from credible sources get <strong>annotated with attribution</strong>, never arbitrarily resolved by picking one." },
        { key:"Require <strong>dates</strong> in structured output, or temporal differences get misread as contradictions." },
        "Structure reports to distinguish well-established findings from contested ones, and annotate coverage gaps where sources were unavailable — so the reader can see what the synthesis does and doesn't support."
      ]},
    { h:"Streaming and observability",
      scope:"CCAR-F lists streaming API implementation and SSE as out of scope. Retained because the observability half (stop_reason, request IDs) is useful and CCDV-F covers streaming directly.",
      body:[
        "Tool arguments stream as partial JSON fragments. Accumulate them and parse when the content block closes; parsing mid-stream gives you invalid JSON by definition.",
        { key:"A <strong>200 does not mean success</strong>. An error event can arrive partway through a stream, after the status line." },
        "Code that checks only the initial status treats a failed response as a truncated success — and truncated successes are hard to spot downstream because they look like short answers.",
        { key:"Log three things per call: <strong>request ID</strong> (trace it with support), <strong>stop_reason</strong> (did output complete), <strong>token usage</strong> (cost and cache effectiveness)." },
        "Of those three, <code>stop_reason</code> is the one that changes control flow. <code>end_turn</code> means the model finished; <code>tool_use</code> means it wants a tool and the loop continues; <code>max_tokens</code> means generation hit the output ceiling and stopped wherever it happened to be.",
        { warn:"On <code>max_tokens</code> the body is <strong>truncated, not invalid</strong>. It can stop mid-sentence, mid-JSON or mid-tool-argument, so it often parses as plausible but incomplete. Never trust partial output: raise the ceiling or continue generation." },
        { exam:"Percentiles, not averages, for latency. The average hides the tail, and the tail is what users actually experience as 'slow'." }
      ]}
  ],
  confusions:[
    { a:"429 rate limit", b:"529 overloaded", split:"Your quota versus system-wide. Both retry; 529 needs a longer backoff." },
    { a:"Hard context overflow", b:"Silent saturation", split:"An error versus quality decay. The second is what scenarios describe." },
    { a:"Summarization", b:"Server-side clearing", split:"Client-side rewrite versus clearing the model's view while you keep the record." },
    { a:"Bigger context window", b:"Context management", split:"Capacity delays the problem; management solves it." }
  ],
  checks:[
    "Which status codes do you retry, and what's the one-sentence rule?",
    "An agent starts hedging instead of naming specifics. Diagnose and fix.",
    "Why doesn't raising max_tokens help a saturated conversation?",
    "What's in the context budget besides the conversation?"
  ]
},

/* ===================== CCDV-F v1 — Applications & Integration (33.1%) ==== */
{ exam:"CCDV-F", d:"v1", mins:13,
  big:"The heaviest domain on any of these exams at 33.1%. It's ordinary production engineering applied to a slow, probabilistic, stateless dependency.",
  sections:[
    { h:"The API is stateless",
      body:[
        "Every request carries the entire conversation. There is no server-side session: the model knows exactly what you send and nothing else.",
        { key:"Messages <strong>alternate user and assistant</strong>, must <strong>begin with a user turn</strong>, and every tool_use block must be followed by its matching tool_result." },
        { warn:"A dangling tool_use with no result is a malformed conversation and gets rejected. This bites hardest when a tool throws and the error path appends nothing — always append a result, marked as an error, rather than skipping it." },
        { key:"Sending only the newest message is the classic beginner bug. The model has <strong>no memory of turns you didn't include</strong>." },
        "Conversation history longer than the window is your problem to manage. The API doesn't silently trim — an over-budget request is rejected outright, and the failure arrives abruptly on a long conversation rather than degrading gradually.",
        { key:"Decide what to keep, summarize, or drop <strong>before you need to</strong>. Overflow is a hard error, not a graceful truncation." }
      ]},
    { h:"Model calls are slow",
      body:[
        "A call can take many seconds. That single fact breaks the normal synchronous request pattern: holding an HTTP request open for one ties up a worker, and under concurrency the pool exhausts and everything queues.",
        { table:[
          ["Approach","Fixes","Use when"],
          ["Streaming","Perceived latency; keeps connection active","User watches output appear"],
          ["Background job + handle","Removes the long connection entirely","Work takes minutes, or no one is watching"],
          ["Raising the timeout","Nothing — defers the limit","Not a fix"]
        ]},
        { key:"Streaming and async jobs <strong>remove</strong> the long-lived connection. Raising timeouts and adding workers <strong>scale the problem</strong>." },
        "The failure mode behind this is worth understanding rather than memorizing, because it is intermittent and environment-dependent, which makes it hard to reproduce. A non-streaming request with a large <code>max_tokens</code> holds a connection open with nothing flowing on it while the model generates. Networks differ in how long they tolerate an idle connection, and some drop it — so the request fails with no response at all rather than returning an error.",
        { key:"Set a large <code>max_tokens</code> and you want <strong>streaming or the Batches API</strong>. Streaming keeps data moving so no idle timer fires; Batches removes the need for an uninterrupted connection by letting you poll for results instead." },
        { warn:"The symptom is a failure that correlates with infrastructure rather than with input: the same request succeeds from one network and fails from another, or works locally and fails from a particular region. That pattern points at the connection, not the prompt." },
        { exam:"A long agentic run hitting a load balancer's idle timeout is the same question in different clothing — streaming keeps bytes moving so the idle timer never fires." }
      ]},
    { h:"Resilience",
      body:[
        "Retry logic has one job: tell apart the failures that might succeed if you try again from the ones that cannot. Get that wrong in the generous direction and a malformed request is sent three times to receive the same rejection three times, spending latency and quota to arrive where it started. Get it wrong in the strict direction and a transient blip becomes a user-visible error.",
        "The status code is what carries that distinction, so it is worth knowing which is which rather than branching on 4xx versus 5xx and hoping.",
        { table:[
          ["Status","Type","Retry?"],
          ["400","<code>invalid_request_error</code> — malformed, or a spend limit reached","No. The same request fails identically"],
          ["401","<code>authentication_error</code> — key malformed, revoked or expired","No. Fix the credential"],
          ["403","<code>permission_error</code> — key lacks access to the resource","No. Fix the grant"],
          ["413","<code>request_too_large</code> — over the per-request byte limit","No. Send less"],
          ["429","<code>rate_limit_error</code> — your organization hit a limit","Yes, with backoff. Honor <code>retry-after</code>"],
          ["500","<code>api_error</code> — unexpected internal error","Yes, with exponential backoff"],
          ["504","<code>timeout_error</code> — timed out while processing","Yes; consider streaming for long requests"],
          ["529","<code>overloaded_error</code> — the API is temporarily overloaded","Yes, with backoff"]
        ]},
        { key:"The pair worth separating: <strong>429 is your limit, 529 is their load</strong>. A 429 means your organization hit a rate limit or spend cap; a 529 means the API is busy across all users. Both are retryable and they point at different owners — only one of them is fixed by a tier increase." },
        { warn:"A sharp increase in your own traffic can produce 429s from <strong>acceleration limits</strong> even below your steady-state ceiling. The fix is to ramp gradually and keep usage patterns consistent, not to raise the tier." },
        "The size limits are per request rather than per conversation: 128 MB on the Messages API and Token Counting, 256 MB on Batches, 500 MB on Files. Splitting an oversized payload across several requests genuinely clears a 413 — which is worth knowing, and worth separating from whether four very large prompts is a good design.",
        { list:[
          "Retry transient failures only — 4xx fails fast.",
          "Backoff with jitter to avoid synchronized retries.",
          "Timeouts bounded below the caller's overall budget.",
          "Circuit breaking so a failing dependency doesn't exhaust your resources.",
          "A defined degraded mode: what the product does when the model is unreachable.",
          "Idempotency keys wherever a retry could repeat a side effect."
        ]},
        { key:"Indefinite retry is the anti-pattern. It converts a <strong>degraded dependency into your own outage</strong> by exhausting threads, and prolongs recovery for everyone." },
        { warn:"SDKs typically retry transient failures a couple of times by default with backoff, honoring retry-after. Layering your own loop on top silently multiplies the real attempt count — check what your client already does before adding retries." },
        { why:{ q:"What does a circuit breaker actually buy over a timeout?",
          a:"A timeout bounds one request; a circuit breaker bounds the pattern. If a dependency is down and every request waits the full timeout before failing, you're still spending a worker and the user's patience on each one — at volume, that alone can exhaust your capacity. A breaker notices the failure rate, stops calling for a cooling-off period, and fails immediately instead. It also gives the struggling dependency room to recover rather than being hammered throughout its outage." } },
        { key:"Idempotency keys matter because a <strong>lost response is indistinguishable from a failed request</strong>. The key lets the server recognize the repeat and return the original outcome." }
      ]},
    { h:"Observability",
      body:[
        { table:[
          ["Log","Why"],
          ["Request ID","What support needs to trace a specific call"],
          ["stop_reason","Whether output completed or was truncated"],
          ["Token usage","Cost attribution and cache effectiveness"]
        ]},
        { key:"Those three diagnose most production issues: <strong>which call, did it finish, where is the money going</strong>." },
        { key:"Every response carries a <code>request-id</code> header, and it also appears as <code>request_id</code> in error bodies. That identifier is what support traces a specific call by, so a log without it describes a problem you cannot then ask anyone about." },
        { key:"Token usage comes back on every response as <code>usage</code>: <strong>input_tokens</strong>, <strong>output_tokens</strong>, and — when caching is in play — <strong>cache_creation_input_tokens</strong> and <strong>cache_read_input_tokens</strong>. Those are the quantities pricing is applied to, so log all four rather than a single total. Separating cache reads is what makes the saving visible; wall-clock time is worth tracking for performance but is not a billed quantity." },
        "Track latency at percentiles rather than averages. An average of 1.2s hides a p99 of 14s, and the p99 is what users describe as 'it's broken'.",
        { warn:"Logging full prompt text on every call is expensive and frequently a privacy problem when prompts carry user data. Capture it selectively while investigating, not by default." },
        { key:"Return <strong>stable error codes</strong> to your own callers. Forwarding an upstream provider's error shape leaks implementation detail and gives clients nothing actionable." }
      ]},
    { h:"Multi-tenancy and fairness",
      body:[
        "Your upstream quota is a shared resource. Without per-user limits, one heavy consumer exhausts it and degrades everyone else — a fairness problem no model or transport choice can fix.",
        { key:"Enforce fairness <strong>in your own service</strong>: per-user rate limits, quotas, or queue prioritization." },
        { key:"API keys stay <strong>server-side</strong>. Any key shipped to a client — web bundle, mobile binary, obfuscated or not — can be extracted and spent at your expense." },
        "Clients call your backend; your backend authenticates them, applies its own limits, and calls the model API with a key they never see."
      ]},
    { h:"Reproducibility",
      body:[
        "Pin an explicit model version rather than a floating alias. An alias can resolve to a different underlying model as versions ship, changing behavior with no code change on your side.",
        { key:"Pinning makes the model a <strong>reviewable dependency</strong> you upgrade deliberately — after re-running evals against the new version." },
        { exam:"'Behavior changed and nothing in our system changed' is the scenario this prevents. The answer is always a pinned version plus a regression suite, not an investigation after the fact." }
      ]}
  ],
  confusions:[
    { a:"Raising a timeout", b:"Streaming or async jobs", split:"Deferring the limit versus removing the long-lived connection." },
    { a:"Your retries", b:"The SDK's retries", split:"They compose — check the default before adding your own." },
    { a:"Forwarding upstream errors", b:"Stable error codes", split:"Leaking implementation detail versus an actionable contract." }
  ],
  checks:[
    "A tool throws and your error path appends nothing. What happens on the next call?",
    "Users see timeouts under load on a synchronous endpoint. What's the structural fix?",
    "Which three things do you log on every call, and why each?",
    "Why pin a model version instead of using an alias?"
  ]
},

/* ===================== CCDV-F v2 — Model Selection (16.8%) =============== */
{ exam:"CCDV-F", d:"v2", mins:10,
  big:"Pick the cheapest model that clears your accuracy bar, and prove it with evals rather than assuming.",
  sections:[
    { h:"Match tier to task",
      body:[
        "Capability needs vary enormously across steps. Triage, straightforward classification, and reformatting usually run fine on a small fast model; genuinely hard reasoning earns a capable one.",
        { key:"In a multi-step pipeline, <strong>per-step model routing</strong> is one of the largest cost levers available." },
        "Uniform selection fails in both directions. The most capable model everywhere overpays on every easy step; the cheapest everywhere underperforms exactly where quality matters. Neither is a decision — both are a default.",
        { exam:"A scenario describing an easy triage step and a hard analysis step in the same pipeline is asking for per-step routing, not a single compromise choice." }
      ]},
    { h:"Decide on measurement",
      body:[
        "Before switching tiers, build a representative evaluation set with explicit criteria and run both models against it. Sometimes the cheaper one is indistinguishable; sometimes it degrades on precisely the cases that matter.",
        { key:"Without measurement you're trading <strong>unknown quality for known savings</strong> — and you find out from users." },
        { table:[
          ["Measure","Not"],
          ["Accuracy on your own task","Published benchmark scores"],
          ["Latency at the percentiles you care about","Average latency"],
          ["Cost per completed task","Cost per token"]
        ]},
        { key:"<strong>Cost per completed task</strong>, not per token. A cheaper per-token model needing retries or longer prompts can cost more overall." },
        { why:{ q:"Why aren't published benchmarks sufficient?",
          a:"They measure general capability on standardized tasks, which correlates loosely with performance on yours. Your workload has its own distribution — specific formats, domain vocabulary, particular edge cases, a prompt tuned over months. A model that scores slightly lower overall may handle your exact task better, and a model that scores higher may fail on the one case your business depends on. The benchmark tells you roughly which models are worth testing; your eval set tells you which to ship." } }
      ]},
    { h:"What actually drives cost",
      body:[
        { key:"<strong>Output costs more than input</strong>, because generation is sequential while input processes in parallel." },
        "The practical consequence: trimming verbose output saves more than trimming a comparable amount of input, and verbose output formats are expensive at scale. Asking for concise answers is a real cost lever, not just a style preference.",
        { key:"Reasoning tokens bill as <strong>output</strong> — for content the user never sees. Deep reasoning on a high-volume path multiplies costs invisibly." },
        { key:"Tool definitions are sent and billed on <strong>every request whether called or not</strong>. Trim unused tools; consolidate near-duplicates." },
        { warn:"That last one is the overlooked line item. Thirty tool definitions riding along on every call in a high-volume agent is a constant tax, and nothing in your usage dashboard labels it as such." }
      ]},
    { h:"Caching as a cost lever",
      body:[
        "A large stable prefix re-sent on every call — a long system prompt, tool definitions, a document the conversation is about — is the textbook caching case. Pay the write premium once, read at a fraction thereafter.",
        { key:"Caching pays off only with <strong>enough reuse to amortize the write</strong>. Caching a prefix you read once is a net loss." },
        { exam:"The related failure is caching that's enabled but never hits. Two conditions must both hold: the prefix must exceed the minimum length (below it, caching is silently skipped) and be byte-identical between calls." },
        "Both of those conditions repay a closer look, because a cache that never hits costs more than no cache at all and reports nothing to tell you.",
        "You mark a block with <code>cache_control</code>, and that marks a <strong>breakpoint</strong>. The entry written is a hash of everything up to and including that block — so anything that varies at or before the breakpoint produces a different hash and therefore a different entry. This is the usual cause of a hit rate of zero: a timestamp, a request id, or a user name sitting near the top of a prompt that is otherwise identical.",
        { key:"Put the breakpoint on the <strong>last block that is identical across requests</strong>, and everything per-request after it. Marking a block that contains today's date writes a fresh entry on every call and reads none of them." },
        { fig:{ svg:"<svg viewBox=\"0 0 620 230\" xmlns=\"http://www.w3.org/2000/svg\"> <g font-family=\"system-ui, sans-serif\" fill=\"currentColor\"> <text x=\"10\" y=\"20\" font-size=\"12\" font-weight=\"600\" opacity=\"0.65\">BREAKPOINT AFTER THE TIMESTAMP</text> <text x=\"10\" y=\"128\" font-size=\"12\" font-weight=\"600\" opacity=\"0.65\">BREAKPOINT BEFORE IT</text> </g> <g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"> <rect x=\"10\" y=\"32\" width=\"132\" height=\"34\" rx=\"6\"/> <rect x=\"148\" y=\"32\" width=\"132\" height=\"34\" rx=\"6\"/> <rect x=\"286\" y=\"32\" width=\"104\" height=\"34\" rx=\"6\"/> <rect x=\"10\" y=\"74\" width=\"132\" height=\"34\" rx=\"6\"/> <rect x=\"148\" y=\"74\" width=\"132\" height=\"34\" rx=\"6\"/> <rect x=\"286\" y=\"74\" width=\"104\" height=\"34\" rx=\"6\"/> <rect x=\"10\" y=\"140\" width=\"132\" height=\"34\" rx=\"6\"/> <rect x=\"148\" y=\"140\" width=\"132\" height=\"34\" rx=\"6\"/> <rect x=\"286\" y=\"140\" width=\"104\" height=\"34\" rx=\"6\"/> <rect x=\"10\" y=\"182\" width=\"132\" height=\"34\" rx=\"6\"/> <rect x=\"148\" y=\"182\" width=\"132\" height=\"34\" rx=\"6\"/> <rect x=\"286\" y=\"182\" width=\"104\" height=\"34\" rx=\"6\"/> </g> <g font-family=\"system-ui, sans-serif\" font-size=\"11\" fill=\"currentColor\" text-anchor=\"middle\"> <text x=\"76\" y=\"54\">system prompt</text> <text x=\"214\" y=\"54\">tool definitions</text> <text x=\"338\" y=\"54\">09:14:02</text> <text x=\"76\" y=\"96\">system prompt</text> <text x=\"214\" y=\"96\">tool definitions</text> <text x=\"338\" y=\"96\">09:14:57</text> <text x=\"76\" y=\"162\">system prompt</text> <text x=\"214\" y=\"162\">tool definitions</text> <text x=\"338\" y=\"162\">09:14:02</text> <text x=\"76\" y=\"204\">system prompt</text> <text x=\"214\" y=\"204\">tool definitions</text> <text x=\"338\" y=\"204\">09:14:57</text> </g> <g stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"> <path d=\"M 396 49 L 410 49\" opacity=\"0.8\"/> <path d=\"M 396 91 L 410 91\" opacity=\"0.8\"/> <path d=\"M 282 157 L 296 157\" opacity=\"0.8\"/> <path d=\"M 282 199 L 296 199\" opacity=\"0.8\"/> </g> <g font-family=\"system-ui, sans-serif\" font-size=\"11.5\" fill=\"currentColor\"> <text x=\"418\" y=\"53\">hash A  — write</text> <text x=\"418\" y=\"95\">hash B  — write</text> <text x=\"418\" y=\"161\">hash C  — write</text> <text x=\"418\" y=\"203\">hash C  — read</text> </g> <g font-family=\"system-ui, sans-serif\" font-size=\"11\" fill=\"currentColor\" opacity=\"0.75\"> <text x=\"418\" y=\"115\">two entries, no hits</text> <text x=\"418\" y=\"223\">one entry, reused</text> </g> </svg>", cap:"The entry is a hash of everything up to the breakpoint. Put the breakpoint after a timestamp and every request writes a new entry and reads none; move it before, and the same prefix is reused." } },
        "Minimum cacheable length varies by model, which is why the same prompt can cache on one and not another. On current models it is <strong>512 tokens</strong>; several others require 1,024, 2,048 or 4,096. Below the threshold nothing is cached and no error is raised.",
        { key:"Diagnose with the usage figures. <strong>Both <code>cache_creation_input_tokens</code> and <code>cache_read_input_tokens</code> at zero</strong> means nothing was cached at all — usually too short. Creation tokens on every call with no reads means the prefix is varying." },
        "The default lifetime is five minutes, with a one-hour option at a higher write price. The detail that catches people is where the clock starts: the lifetime runs from the <strong>start of the request</strong> that writes or reads the entry, not from the end of its response. A response that takes four minutes to stream has spent four of its five minutes before the follow-up is even composed.",
        { warn:"That timing rule is why long streaming responses and the five-minute default interact badly. If your responses routinely take minutes, either the one-hour TTL or a tighter follow-up window is the fix — the entry is older than it feels." }
        ,"The other lever people reach for is <code>max_tokens</code>, but it is a ceiling on what the model may generate, not a budget it plans against. Hit it and generation simply stops where it was — mid-sentence, mid-JSON — so the body is truncated rather than invalid, and often parses as plausible but incomplete.",
        { key: "Lowering <code>max_tokens</code> does not make answers more concise; it <strong>cuts them off</strong>. Ask for brevity in the prompt and keep the ceiling clear of the real answer length." }
      ]},
    { h:"When reasoning is worth it",
      body:[
        { table:[
          ["Worth it","Not worth it"],
          ["Multi-step math or logic","Simple lookups"],
          ["Subtle bug review","Straightforward classification"],
          ["Ambiguous requirements","High-volume short-text work"],
          ["Architecture tradeoffs","Reformatting"]
        ]},
        { key:"Reasoning earns its cost where <strong>the hard part is working something out</strong>. On lookups it adds latency and billable tokens for no accuracy gain." },
        "At volume, that overhead dominates — which is why the same feature that's clearly worth enabling for a nightly analysis job is clearly wrong for a per-request classifier.",
        "The approaches being distinguished here are <strong>zero-shot</strong> (instructions only), <strong>few-shot</strong> (a handful of worked examples in the prompt, which pins format and edge-case handling far more reliably than describing them), <strong>chain-of-thought</strong> (asking for the reasoning steps before the answer), and <strong>extended thinking</strong>, where the model is given an explicit token budget to reason internally before responding.",
        { key:"<strong>Few-shot</strong> fixes <em>format and consistency</em>; <strong>chain-of-thought</strong> and <strong>extended thinking</strong> buy <em>accuracy on problems that need working out</em>. Reaching for reasoning when the real problem was an unclear output shape spends tokens on the wrong thing." }
      ]}
  ],
  confusions:[
    { a:"Cost per token", b:"Cost per completed task", split:"Retries and prompt overhead can invert the comparison." },
    { a:"Benchmark scores", b:"Your own eval set", split:"General capability versus performance on the workload you're buying." },
    { a:"Streaming", b:"Batch", split:"Streaming improves perceived latency; batch trades latency for cost." }
  ],
  checks:[
    "A classification task runs on your most capable model. First thing to try, and what must accompany it?",
    "Why is output priced higher than input, and what does that imply?",
    "When does caching lose money?",
    "Name three measurements that should drive model selection."
  ]
},

/* ===================== CCDV-F v3 — Agents and Workflows (14.7%) ========== */
{ exam:"CCDV-F", d:"v3", mins:10,
  big:"Workflows follow paths you define; agents choose their own. Prefer the simplest construct that works, and keep control flow in code.",
  sections:[
    { h:"The distinction",
      body:[
        { table:[
          ["","Workflow","Agent"],
          ["Path","You define it","Model decides"],
          ["Predictability","High","Lower"],
          ["Debuggability","Step-by-step","Requires tracing"],
          ["Cost","Bounded","Varies per run"],
          ["Fits","Known sequences","Open-ended tasks"]
        ]},
        { key:"Use agency <strong>only when a fixed path genuinely cannot express the task</strong>. A fully-known sequence should be a workflow." },
        "Agency isn't free: it buys flexibility and spends predictability, latency, token budget, and your ability to reason about what will happen. On a task you could have expressed as a pipeline, that's a pure loss.",
        "You can build the loop yourself against the Messages API, use the <strong>Claude Agent SDK</strong>, or build on a third-party agentic abstraction framework — <strong>LangGraph</strong>, <strong>LangChain</strong>, <strong>LlamaIndex</strong>, <strong>CrewAI</strong> and <strong>AutoGen</strong> are the ones usually named. These are orchestration layers over the same API, not alternatives to it.",
        { key:"Third-party frameworks are <strong>abstractions over the Messages API</strong>, distinct from the Claude Agent SDK. Every one of them still sends the same stateless requests underneath — a framework hides the loop, it does not replace it." },
        { exam:"'What makes a task a poor fit for an autonomous agent' — every step known in advance (use a workflow), or errors costly and hard to reverse (needs gates, not autonomy). Needing several tools and depending on intermediate findings are what agents are <em>for</em>." }
      ]},
    { h:"What belongs in code",
      body:[
        { table:[
          ["Your code owns","The model owns"],
          ["Iteration and budget limits","Which tool answers the current question"],
          ["Retry policy for transient failures","How to approach the problem"],
          ["Termination conditions","How to interpret results"],
          ["Loop detection on repeated calls","What to ask next"]
        ]},
        { key:"<strong>Control flow in code; judgment in the model.</strong> Mixing them up fails in both directions." },
        "Control flow expressed as a prompt instruction is unreliable — 'be efficient' is a preference the model may or may not act on, and it provides no bound at all on the run where it matters. Hard-coded tool selection throws away the model's main contribution and turns your agent into a brittle pipeline with extra latency.",
        { key:"Retry transient tool failures <strong>inside the tool</strong>, transparent to the model. A network blip isn't a decision worth spending a turn on." }
      ]},
    { h:"Bounding a run",
      body:[
        "Any loop whose exit depends on a model judgment needs a cap, because the judgment may be unsatisfiable — a critic demanding something the generator cannot produce, or applying inconsistent standards run to run.",
        { key:"Bound every run three ways: <strong>iteration cap, budget ceiling, and repeated-call detection</strong>." },
        { key:"Define what happens <strong>at</strong> the cap — return the best attempt, escalate, or fail explicitly. An unbounded loop runs until something else stops it." },
        { warn:"Repeated identical tool calls mean the result isn't advancing the model's state — usually because it's unhelpfully shaped or ambiguously empty. Break out, then fix what the tool returns rather than just capping the symptom." },
        { why:{ q:"Why does the model repeat a call that already returned?",
          a:"Because the result didn't answer the question it was actually asking. A tool that returns an empty object, a bare status code, or a payload missing the field the model needs leaves it in the same state it started in — so the same next action looks correct again. From inside the loop it isn't a retry; it's the model concluding the same thing twice. The cap stops the bleeding, but the fix is making the result informative, including when the answer is 'nothing found'." } }
      ]},
    { h:"Flexibility with bounds",
      body:[
        "When a task can't be fully specified but must stay within strict limits, separate the two concerns rather than trading one against the other.",
        { key:"Give latitude in <strong>reasoning</strong>; constrain <strong>capability</strong> through tool design and permissions." },
        "Trying to enumerate every case in a prompt fails on the case you didn't imagine — which is precisely the one that matters. Constraining capability doesn't depend on anticipating anything: the agent can only do what its tools and permissions allow, whatever it decides.",
        "State that must survive a restart gets externalized: conversation state, progress markers, and which side effects already fired.",
        { key:"Append-only history keeps a <strong>superseded fact visible alongside its correction</strong>. Where a value changes mid-run, keep one current answer in external state." }
      ]}
  ],
  confusions:[
    { a:"Workflow", b:"Agent", split:"Predefined path versus model-directed process." },
    { a:"Prompt instruction to be efficient", b:"An iteration cap in code", split:"Preference versus bound." },
    { a:"Flexibility in reasoning", b:"Flexibility in capability", split:"Give the first, constrain the second." }
  ],
  checks:[
    "What makes a task a poor fit for an autonomous agent?",
    "Which loop responsibilities belong in code rather than the prompt?",
    "An agent calls the same tool with identical arguments repeatedly. What does that mean?",
    "How do you give latitude and strict bounds at the same time?"
  ]
},

/* ===================== CCDV-F v6 — Security and Safety (8.1%) ============ */
{ exam:"CCDV-F", d:"v6", mins:10,
  big:"Defense is architectural. Anything that relies on the model policing itself is a probabilistic control on a security boundary.",
  sections:[
    { h:"Prompt injection",
      body:[
        "Content the agent fetches — a web page, an uploaded document, a third-party API response, a code comment — can contain text written to steer it.",
        { key:"The <strong>indirect channels</strong> are the dangerous ones: nobody watches a fetched page the way they watch the chat box." },
        "The durable defense has two parts, and the second is the one that actually holds.",
        { key:"Treat all external content as <strong>data, never instructions</strong> — and constrain what the agent <strong>can do</strong> so a successful injection cannot cause real harm." },
        { warn:"A system-prompt instruction helps at the margin but is probabilistic. Keyword filtering ('ignore previous instructions') fails against trivial rephrasing. A more capable model is still a model being asked to police itself." },
        { why:{ q:"Why can't the model reliably tell instructions from data?",
          a:"Because at the level it operates, they're the same thing: text in a context window. Delimiters and system-prompt framing shift the odds that it treats a block as inert content, and sometimes substantially — but an attacker writing the injected text can target exactly that framing, and only needs to succeed once. Any defense whose last line is the model's judgment inherits the model's probabilistic nature, which is why the capability constraint has to exist independently." } },
        { key:"Which inputs are untrusted? <strong>All of them</strong> — user messages, fetched pages, uploaded documents, and third-party tool results alike." }
      ]},
    { h:"Least privilege",
      body:[
        "Remove capability rather than asking for restraint. An agent that must never delete should hold credentials without delete permission — then deletion is impossible regardless of what it's convinced to attempt, what an injection tells it, or how a tool is misused.",
        { key:"Make the dangerous action <strong>impossible</strong>, not discouraged. A read-only database role beats any instruction about not deleting." },
        { key:"Reason about capability <strong>combinations</strong>. File read is reasonable; network access is reasonable; together they are a complete exfiltration path." },
        { exam:"That combination question — two individually-sensible permissions forming one dangerous capability — is a favorite, because each permission looks defensible in isolation." }
      ]},
    { h:"Secrets",
      body:[
        "Reference secrets by name from the environment or a secret manager. A literal value in committed configuration is a leaked credential the moment it lands.",
        { key:"A committed secret <strong>stays in git history after you remove it</strong>. Rotation is the only real remedy." },
        { warn:"Never put a credential in a prompt or tool description. It goes to the model on every call and lands in every log that captures request content." }
      ]},
    { h:"Containing failures",
      body:[
        { list:[
          "Least-privilege credentials per tool.",
          "Human approval gates on irreversible actions.",
          "Audit logging of every tool call with arguments, recorded in the execution layer.",
          "Tenant scoping enforced in the data layer, not by instruction."
        ]},
        { key:"An approval gate is only a control if the approver has <strong>information, time, and authority to refuse</strong>. A gate people click through under time pressure adds the appearance of oversight and nothing else." },
        { warn:"Output filtering alone is insufficient. By the time you inspect the output, tool calls made during generation have already executed — the email sent, the record deleted. Actions need controls at the point of execution." },
        { key:"The audit trail must come from the <strong>execution layer</strong>, never the model. A model asked to log its own actions may omit or misdescribe entries — exactly the failure an audit exists to catch." },
        { key:"Multi-tenant isolation belongs in the <strong>data layer</strong>: scoped credentials or queries that make cross-tenant access impossible, not separate conversations and not an instruction." }
      ]}
  ],
  confusions:[
    { a:"System-prompt defense", b:"Capability constraint", split:"Probabilistic versus architectural." },
    { a:"Output filtering", b:"Execution-point controls", split:"Filtering catches content; actions already happened." },
    { a:"Individual permissions", b:"Permission combinations", split:"Read plus network equals exfiltration." }
  ],
  checks:[
    "A fetched page contains instructions. What's the correct defense posture, and why isn't a system prompt enough?",
    "An agent must never delete from a database. Strongest control?",
    "Why is output filtering alone insufficient?",
    "Where must an audit trail be produced, and why not by the model?"
  ]
},

/* ===================== CCDV-F v4 — Prompt & Context Eng. (11%) =========== */
{ exam:"CCDV-F", d:"v4", mins:9,
  big:"Separate instructions from data, put stable content where it can be cached, and remember that a prompt technique never produces a guarantee.",
  sections:[
    { h:"System versus messages",
      body:[
        "<code>system</code> is a top-level parameter, not a role inside <code>messages</code>. The messages array holds only user and assistant turns and must begin with a user turn.",
        { table:[
          ["Goes in system","Goes in messages"],
          ["Persona and tone","The task for this request"],
          ["Output format requirements","Per-request data"],
          ["Constraints and rules","The user's actual question"],
          ["Stable few-shot examples","Anything that changes per call"]
        ]},
        { key:"The boundary does three jobs: makes the system prompt <strong>cacheable</strong>, keeps instructions <strong>separate from untrusted input</strong>, and makes behavior <strong>debuggable</strong>." },
        { exam:"Passing a 'system' role inside messages is a common porting error from other providers and appears as a distractor." }
      ]},
    { h:"Interpolating user input safely",
      body:[
        "Text from a user that lands in your prompt template can contain instructions. Three things help, in increasing order of how much they actually protect you:",
        { list:[
          "Delimit it clearly so it reads as data.",
          "Keep authoritative instructions in the system prompt.",
          "Constrain the model's capabilities so a successful injection can't do damage."
        ]},
        { key:"Only the third is a real boundary. The first two <strong>shift odds</strong>; capability constraints hold regardless." },
        { warn:"Escaping quotes addresses a syntactic problem. Injection is semantic — the text is perfectly well-formed and simply means something you didn't intend." }
      ]},
    { h:"Long inputs",
      body:[
        "A prompt that works on short input often degrades on long input, because instructions at the top now compete with everything after them.",
        { key:"Two fixes: <strong>delimit the sections</strong>, and <strong>restate the critical requirement after the bulk content</strong>, adjacent to where generation begins." },
        { warn:"Adding more examples to an already-long prompt usually makes the crowding worse, not better. More text is rarely the fix for a text-volume problem." }
      ]},
    { h:"Structured output",
      body:[
        "The same ranking as the Architect exam: a forced tool call or a structured-output schema enforces at the API level; prefill, few-shot, and instructions raise probability only.",
        { key:"For anything a pipeline depends on, <strong>use enforcement</strong>. Probability is not a contract." },
        { key:"A tool call's input arrives <strong>already structured</strong>. Text-response JSON may carry a preamble, trailing commentary, or simply not parse." },
        { key:"Schema validates <strong>structure</strong>, not meaning. A negative amount passes any schema that says 'number' — semantic rules need an application-level validator." },
        "On a validation failure, append the error and re-call, capped at about three attempts, then fail loudly rather than returning data you know is wrong."
        ,{ key: "<strong>Prompt caching</strong> is the context-engineering lever here: it stores a <em>prefix</em> of the request, so anything cached must sit at the front and stay byte-identical. Put the stable material — system prompt, tool definitions, the document under discussion — first, and the variable turn last." }
      ]},
    { h:"Technique selection",
      body:[
        { table:[
          ["Technique","Use for","Avoid when"],
          ["Clear and direct","Vague output","—"],
          ["Few-shot (2–5, system)","Format consistency","Prompt already long"],
          ["Chain of thought","Multi-step reasoning","Lookups, simple classification"],
          ["XML-style tags","Mixed content in one message","—"]
        ]},
        "XML-style tags earn their place by <strong>delimiting</strong>. Wrapping each part of a mixed prompt in its own tag — <code>&lt;task&gt;</code>, <code>&lt;context&gt;</code>, <code>&lt;example&gt;</code>, <code>&lt;format&gt;</code> — tells the model where the instructions stop and the pasted document starts, so a sentence buried in the data is read as data rather than as a new instruction.",
        { key: "Tags separate <strong>instructions from content</strong>. The names are arbitrary and nothing validates them; the benefit is the boundary, which is why they matter most when one message carries several kinds of material." },
        { key:"Vague criteria are the most common defect. '<strong>Be conservative</strong>' isn't decidable — replace it with something testable." },
        "Two readers draw different lines from the same vague instruction, and so does the model from run to run. 'Flag only when claimed behavior contradicts the actual code' is a rule you can check; 'be careful' is not."
      ]}
  ],
  confusions:[
    { a:"system parameter", b:"role:'system' in messages", split:"Top-level parameter. The messages array has no system role." },
    { a:"Quote escaping", b:"Injection defense", split:"Syntactic versus semantic — well-formed text can still carry instructions." },
    { a:"Prefill", b:"Forced tool call", split:"Probability versus API-level enforcement." }
  ],
  checks:[
    "Where does the system prompt go, and what belongs in it versus messages?",
    "A prompt works on short inputs and fails on long ones. Two fixes?",
    "Why is escaping quotes an inadequate injection defense?",
    "Rank four approaches to guaranteed JSON."
  ]
},

/* ===================== CCDV-F v5 — Tools and MCPs (10.6%) ================ */
{ exam:"CCDV-F", d:"v5", mins:10,
  big:"Descriptions drive routing, the model never executes anything, and MCP is how you build a tool once and consume it from many clients.",
  sections:[
    { h:"The five-step flow",
      body:[
        { table:[
          ["Step","What happens"],
          ["1. Define","Send tools with name, description, input_schema"],
          ["2. Decide","Model reads descriptions, returns a tool_use stop reason"],
          ["3. Extract","Parse tool_use blocks: id, name, input"],
          ["4. Execute","YOUR code runs the function — never the model"],
          ["5. Return","All tool_result blocks in ONE user message, matching ids"]
        ]},
        { key:"Step 4 is the anchor: the model <strong>requests</strong>, your app or the MCP server <strong>executes</strong>. Everything else in this domain follows from that split." },
        { key:"Step 5 has three constraints that each produce a 400 if broken: <strong>one message, results first, ids matched</strong>." }
      ]},
    { h:"Writing tools the model routes correctly",
      body:[
        "Selection happens on the description, not the name. A tool called <code>search</code> with a vague description loses to one with an awkward name and a precise description.",
        { key:"A good description states five things: <strong>what it does, when to use it, when NOT to, what it returns, its limits</strong>." },
        "The when-NOT clause does the most work when tools overlap, because it is the only part that actively pushes the model away from a near-match.",
        { key:"At scale: <strong>namespace</strong> names across servers, <strong>consolidate</strong> near-duplicates behind an action parameter, <strong>defer-load</strong> so only relevant descriptions surface." },
        { warn:"Note what is absent from that list. Raising temperature randomizes an already-difficult choice, and adding more tools increases the overlap causing the problem." },
        { warn:"An optional schema field will sometimes be omitted. If the operation genuinely requires it, mark it required — otherwise your tool handles the gap at runtime and burns a round trip asking for it." }
      ]},
    { h:"Error and empty-result handling",
      body:[
        "Failures return a tool_result flagged as an error with a structured, actionable body.",
        { key:"The flag is <code>is_error: true</code> on the <code>tool_result</code> block; its content carries the reason. An exception that escapes your handler kills the loop instead of informing the model." },
        { key:"Write errors for a reader who will act: '<strong>File not found at path X</strong>' lets the model correct course; '<strong>error</strong>' does not." },
        { key:"Never raise an exception into the loop, and never return an empty string — it is <strong>indistinguishable from a legitimately empty answer</strong>." },
        "A search returning zero matches is a success: the source was reached and the answer is nothing. Retrying wastes budget and can loop indefinitely; flagging it as an error teaches the model to distrust correct results.",
        { key:"Distinguish <strong>'the tool failed'</strong> from <strong>'the tool worked and found nothing'</strong>. Only the first is retryable." }
        ,"Two mechanics sit alongside this. <code>tool_choice</code> controls whether a tool is called at all: <code>auto</code> lets the model decide, <code>any</code> forces some tool, a named tool forces that one, and <code>none</code> forbids tools for the turn. Only the named form pins the output shape to a known schema.",
        { key: "Every <code>tool_result</code> must carry the <code>tool_use_id</code> of the call it answers. When the model makes <strong>parallel</strong> calls, all results go back in <strong>one</strong> user message, results first — splitting them across messages is a 400." }
      ]},
    { h:"MCP",
      body:[
        "MCP exists to solve duplication: implement tools once in a server and let many clients connect, so an update propagates on reconnect rather than requiring a change in every application.",
        { key:"Reach for MCP when the <strong>same tools serve multiple clients</strong>. For one app, inline tool definitions are simpler." },
        { table:[
          ["Layer","Values"],
          ["Transports","stdio (local), Streamable HTTP (remote)"],
          ["Message format","JSON-RPC 2.0, UTF-8"],
          ["Primitives","Tools, Resources, Prompts"]
        ]},
        { key:"These three layers are the most-swapped facts in the domain. When a question names one, <strong>confirm which</strong> before answering." },
        "Tools are model-invoked and may have side effects; Resources are client-controlled, read-only, URI-addressed. That classification is a server-design decision.",
        { key:"A client <strong>cannot reclassify</strong> an existing tool. Restricting access means a client-side allowlist or denylist on the connection." },
        { warn:"Secrets referenced in shared configuration go by environment-variable name, never as literal values." }
      ]}
  ],
  confusions:[
    { a:"Tool definition fields", b:"tool_use block fields", split:"name/description/input_schema sent, versus id/type/name/input returned." },
    { a:"Tool failed", b:"Zero results", split:"Empty is a valid success — don't retry it." },
    { a:"Reclassify as a Resource", b:"Client-side denylist", split:"Server design versus access control." }
  ],
  checks:[
    "Who executes tool code, and why does that matter for the whole loop?",
    "Three techniques for routing accuracy at ~40 tools — and two that don't help?",
    "A tool returns zero results. What should the agent do?",
    "Name MCP's transports, message format, and primitives without mixing them up."
  ]
},

/* ===================== CCDV-F v7 — Claude Code (3.1%) =================== */
{ exam:"CCDV-F", d:"v7", mins:7,
  big:"Small domain, one idea: configuration either shapes behavior or enforces it, and only enforcement gives guarantees.",
  sections:[
    { h:"Shape versus enforce",
      body:[
        "Everything you can configure falls into one of two categories, and conflating them is the single most reliable source of wrong answers in this domain. Some configuration is read by the model as context: it shifts what the model is likely to do. Other configuration is code that runs before or after the model's decision, and it does what it does regardless.",
        "Memory files, rules, and skills are context the model reads and usually follows. Hooks and permission rules are code that runs regardless of what it decides.",
        "The practical consequence is that a well-written instruction followed 999 times in 1000 feels like a guarantee during testing and is not one — and the thousandth case tends to arrive under unusual conditions, which is exactly when it matters most.",
        { key:"For '<strong>must always</strong>' or '<strong>must never</strong>', only hooks and permission rules qualify. Guidance is not a guarantee." },
        "Within hooks, the timing determines what is possible. A hook that runs after the tool has executed can log, alert and react — it cannot prevent anything, because the thing already happened.",
        { table:[
          ["Event","When","Can block?"],
          ["PreToolUse","Before the tool runs","Yes — exit 2 or a deny decision"],
          ["PostToolUse","After the tool succeeded","No — already ran"]
        ]},
        { key:"<strong>Only exit code 2 blocks.</strong> Exit 1 is a non-blocking error — the hook detects correctly, logs correctly, and stops nothing." },
        { warn:"That bug is easy to ship because every observable part of it works. The hook fires, the condition matches, the message appears in the log, and the action proceeds anyway." },
        { key:"PostToolUse <strong>cannot undo</strong> anything — the tool already ran. To prevent an action, use PreToolUse." }
      ]},
    { h:"Configuration layers",
      body:[
        { key:"Memory files <strong>concatenate</strong>; closer tends to win a conflict, but nothing is hard-overridden." },
        { key:"Settings precedence: <strong>Managed → CLI args → Local → Project → User</strong>. Permission rules merge across scopes, and <strong>deny beats allow</strong>." },
        "That combination is what makes organization-wide restrictions stick: merging preserves a managed deny rule, and deny wins any conflict with a project-level allow.",
        { key:"Rules developers must not be able to disable go in the <strong>managed layer</strong>. Anything in the repo is editable by anyone with commit access." }
        ,"Hooks are how those layers enforce rather than suggest. <strong>PreToolUse</strong> runs before a tool and can block it (exit code 2); <strong>PostToolUse</strong> runs after and can only react. <strong>SessionStart</strong> injects context when a session begins or resumes, and <strong>UserPromptSubmit</strong> can block a prompt before the model sees it.",
        { key: "Only <strong>PreToolUse</strong> and <strong>UserPromptSubmit</strong> can stop something happening. Everything else observes or reacts after the fact." }
      ]},
    { h:"Headless and CI",
      body:[
        { key:"A CI run needs all three: <strong>non-interactive mode</strong>, a <strong>structured output format</strong>, and <strong>pre-authorized tool permissions</strong>." },
        "Each omission fails differently — no non-interactive flag and it waits for input; no structured output and your script scrapes prose; no pre-authorization and it hangs mid-run at a permission prompt.",
        { key:"The classic failure is a job that <strong>already runs non-interactively</strong> and still hangs. It's blocked on a permission prompt with no human to answer." },
        { key:"Before applying a remembered fact, <strong>check whether the scenario already satisfies its precondition</strong>. If the flag is in the command, the missing flag isn't the answer." }
      ]}
  ],
  confusions:[
    { a:"PreToolUse", b:"PostToolUse", split:"Before (blocks) versus after (cannot)." },
    { a:"Exit 1", b:"Exit 2", split:"Only 2 blocks." },
    { a:"CLAUDE.md", b:"Hook / permission rule", split:"Guidance versus guarantee." }
  ],
  checks:[
    "Which exit code blocks, and what happens with the others?",
    "Can PostToolUse undo an edit? Why not?",
    "A non-interactive CI job hangs. Cause and fix?"
  ]
},

/* ===================== CCDV-F v8 — Eval, Testing, Debugging (2.6%) ====== */
{ exam:"CCDV-F", d:"v8", mins:7,
  big:"You cannot improve what you do not measure, and spot-checks measure nothing — they confirm what you already believe.",
  sections:[
    { h:"What an eval set needs",
      body:[
        "Before anything else, be clear on what an eval set is for. It is not there to prove the system works — it is there to tell you whether a change made things better or worse. That purpose shapes everything about how it should be built, and it is why a set of cases the system already handles is close to useless no matter how many of them there are.",
        "A fixed set of cases with grading criteria explicit enough that two people would score a result the same way.",
        "The two-people test is worth taking literally. If your criterion is 'the summary should be good', two reviewers will score the same output differently and you will not be able to tell a real improvement from a difference in mood. 'Mentions all four risks named in the source' is checkable, and so it can detect a regression.",
        { key:"Criteria must be <strong>explicit enough for two people to score identically</strong>. If they can't, the metric is measuring the grader." },
        { key:"Run it <strong>before and after any change</strong> — prompt edit, model swap, schema change, enabling caching. Each can shift behavior while looking locally safe." },
        "What goes in the set matters more than how large it is. These four categories are where regressions actually hide:",
        { list:[
          "Edge cases and boundary conditions.",
          "Previously-observed failures, so regressions get caught.",
          "Adversarial or malformed input.",
          "Cases sampled from real traffic, not only ones you imagined."
        ]},
        { key:"A set containing <strong>only cases you already pass</strong> measures nothing and gives false confidence." },
        { warn:"A suite that passes while users complain is measuring the wrong thing — usually because it was built from imagined cases rather than observed ones. Sample production traffic and fold the divergences in." },
        { why:{ q:"Why are hand-written eval sets systematically narrow?",
          a:"They encode what the team imagined users would do, which is reliably tidier than reality. Real input brings typos, truncation, ambiguous phrasing, mixed languages, adversarial framing, and use cases nobody considered. The remedy isn't a bigger imagined set — it's seeding from production traffic and treating every new production failure as a permanent addition. Representativeness matters more than size." } }
      ]},
    { h:"Model-as-judge",
      body:[
        "Automated grading of open-ended output scales where human review can't, with two caveats worth knowing.",
        { key:"It needs an <strong>explicit rubric</strong> or it drifts, and the <strong>same model family can share blind spots</strong> with the generator." },
        { key:"Calibrate the judge against <strong>human-labeled examples</strong>, and prefer a different model or a fresh instance." },
        "The fresh-instance point generalizes beyond automated grading. A session that just produced an answer is anchored on the reasoning that produced it, so asking it to review its own work tends to confirm rather than challenge.",
        { key:"Separate the <strong>generate</strong> step from the <strong>judge</strong> step whenever the judgment matters." }
      ]},
    { h:"Debugging what you can't reproduce",
      body:[
        { key:"Intermittent failures need traces <strong>from the failing runs</strong>: messages sent, tools called with arguments, results, stop_reason, and request ID." },
        "Without that you're guessing, and the guesses are expensive — each one is a deploy and a wait to see whether the failure recurs.",
        { warn:"Lowering temperature may mask a symptom while leaving the cause in place, and changing models discards the evidence you'd have learned from. Both feel like progress and neither is a diagnosis." }
      ]}
  ],
  confusions:[
    { a:"Spot-checking", b:"A fixed eval set", split:"Confirming your belief versus measuring a change." },
    { a:"Same-session self-review", b:"A fresh instance", split:"Anchored on prior reasoning versus evaluating the artifact." }
  ],
  checks:[
    "You changed a prompt. How do you know whether it improved anything?",
    "Your evals pass but users complain. Most likely explanation?",
    "What do you need to debug an intermittent failure?"
  ]
},

{ exam: "CCAO-F", d: "a1", mins: 10,
  big: "Fluency and accuracy are independent. The heaviest Associate domain is about what you check before you trust output — and a confident tone is not evidence.",
  sections:[
    { h: "What goes wrong, and how it looks",
      body:[
        "Wrong output does not announce itself. It reads exactly as smoothly as correct output, which is precisely why verification has to be a habit rather than a reaction to suspicion.",
        { table:[
          ["Failure", "What it looks like", "Where it bites"],
          ["Hallucination", "A specific, plausible detail that is invented", "Citations, figures, subsection numbers"],
          ["Inconsistency", "Two parts of one answer disagree", "Long outputs, multi-section documents"],
          ["Bias", "One framing presented as the only one", "Summaries, comparisons, recommendations"],
          ["Incompleteness", "Correct as far as it goes, silently partial", "Anything summarizing a long source"]
        ]},
        { key: "The more <strong>specific</strong> a detail looks — a subsection number, a percentage, a named study — the more worth checking it is. Specificity is what makes a fabrication convincing." },
        { exam: "The guide's own sample question: Claude summarizes a regulation and cites a subsection number. The correct action is to verify the citation against the official text before sharing. Self-reported confidence is explicitly called out as not a reliable accuracy signal." }
      ]},
    { h: "Verification that actually works",
      body:[
        "Two checks feel like verification and are not. The first is asking the model whether its answer is right, which draws on the same information and reasoning that produced the answer — an error rooted in either survives the review intact. The second is running the prompt again to see whether you get the same thing.",
        { key: "Check claims against the <strong>source</strong>, not against the model. Re-running the prompt tests stability, not truth — two consistent answers can be consistently wrong." },
        "A citation can fail two separate ways, and the second is both more common and harder to notice: the source may not exist, or it may exist and not say what was attributed to it. Checking that a reference is real is only half the job.",
        "What follows is where verification effort actually pays. The common thread is that each one is a specific, checkable claim about the world rather than a matter of phrasing or judgment:",
        { list:[
          "Specific figures and dates — trace each to the source.",
          "Named sources — confirm they exist AND say what is claimed.",
          "Claims about recent events — highest risk of being outdated or invented.",
          "Anything you will put your name to — the accountability does not transfer."
        ]},
        { key: "Asking the model how confident it is produces <strong>a stated confidence, not a calibrated one</strong>. It is often most confident on exactly the cases it got wrong." }
      ]},
    { h: "Scaling review to the stakes",
      body:[
        "Verifying everything equally is not practical, so match review depth to what a mistake would cost. A slide for an internal stand-up and a figure in a client deliverable deserve different scrutiny.",
        "This is the idea that makes verification sustainable. A blanket rule to check everything thoroughly sounds responsible and collapses on contact with a busy week — at which point people stop checking anything, including the things that mattered. Spending the effort where an error would actually cost something is both cheaper and more reliable.",
        { key: "Review effort should be <strong>proportional to consequence</strong>, not uniform. The question is what happens if this particular claim is wrong." },
        { warn: "Automation whose output takes as long to check as it would to produce yourself is not saving time. That is a legitimate reason to decide a task is a poor fit — and recognizing it is a skill the exam tests." },
        { key: "Human review is <strong>required</strong>, not optional, when output is irreversible, regulated, client-facing, or feeds a decision someone will act on." }
      ]},
    { h: "Shaping output for its audience",
      body:[
        "The domain covers editing and adapting output, not just checking it. The same underlying content needs different treatment for an executive summary, a technical appendix, and a customer email.",
        { key: "State the <strong>audience and purpose</strong> in the prompt. Format alone produces output that is correctly shaped and wrongly pitched." },
        { table:[
          ["Output form", "Fits"],
          ["Inline response", "Short answers, quick iteration"],
          ["Artifact", "Documents and code you will keep, revise, or share"],
          ["Structured data", "Anything feeding a spreadsheet or another system"]
        ]},
        { why:{ q: "Why does the format choice matter for an exam about judgment?", a: "Because picking the wrong container creates rework. A long document produced inline has to be copied out and reformatted, and loses its revision history; a one-line answer wrapped in an artifact adds friction to a quick exchange. The guide lists organizing and curating information, and selecting the output format, as explicit objectives — it is part of using the product well rather than a cosmetic preference." } }
      ]}
  ],
  confusions:[
    { a: "Fluent", b: "Accurate", split: "Independent properties. Polish is not evidence." },
    { a: "Re-running the prompt", b: "Checking the source", split: "Consistency versus truth. Only the source settles it." },
    { a: "Model's stated confidence", b: "Calibrated confidence", split: "Self-reported confidence is unreliable, especially on hard cases." },
    { a: "Source exists", b: "Source says this", split: "Two separate checks. The second fails more often." }
  ],
  checks:[
    "Claude cites a subsection number in a compliance summary. What do you do before sending it?",
    "Why is re-running the prompt not verification?",
    "Which categories of claim always deserve checking?",
    "When is human review required rather than optional?"
  ]
},

{ exam: "CCAO-F", d: "a2", mins: 9,
  big: "Automation pays off when the time saved exceeds the time spent reviewing. Most of this domain is deciding what to automate, not how.",
  sections:[
    { h: "Choosing the right task",
      body:[
        "Choosing badly is the most expensive mistake in this domain, because a first automation that goes wrong does not just waste the effort — it convinces the team the whole idea does not work. So the first candidate should be chosen for what it teaches you, not for how much time it would save if everything went well.",
        { key: "Start where mistakes are <strong>cheap and easy to spot</strong>. A frequent task gives you volume to learn from; verifiable output lets you see quality honestly." },
        "Frequency matters because it gives you repetitions to learn from — a weekly task tells you within a month whether it works, while a quarterly one takes a year to produce the same evidence. Verifiable output matters because without it you cannot tell good from bad, and you end up trusting the automation on faith.",
        { table:[
          ["Good first candidate", "Poor first candidate"],
          ["Done weekly or more", "Done once a quarter"],
          ["Output easy to verify", "Correctness hard to judge"],
          ["Low cost if wrong", "High-stakes or irreversible"],
          ["You understand it well", "Nobody currently understands it"]
        ]},
        { warn: "The instinct to start with the most painful task is usually wrong. Painful tasks are often painful because they are ambiguous, which is exactly what makes them a bad first automation." }
      ]},
    { h: "The value calculation",
      body:[
        "The arithmetic people do in their heads is 'this takes two hours and Claude drafts it in five minutes'. That calculation leaves out the step that decides whether the automation is worth anything, which is the time someone spends checking the result before it can be used.",
        { key: "Net value = time saved − review time − cost of errors that slip through. Leave out the middle term and bad automation looks good." },
        "This is also how you decide to stop. If reviewing the output takes nearly as long as doing the work, the honest conclusion is that the task is a poor fit — and reaching that conclusion with evidence is a real result, not a failure.",
        "The third term is the one that is easiest to ignore and hardest to recover from. An error rate that is acceptable on internal notes is not acceptable on anything a customer sees, and the cost is not just the mistake itself but the review burden it permanently adds to everything that follows.",
        { key: "Define <strong>what good looks like before you automate</strong>. Without a standard you cannot tell whether the output is acceptable, and 'looks fine' drifts week to week." }
      ]},
    { h: "Designing the workflow",
      body:[
        "The objectives name analysing requirements, supporting solution design, and integrating into existing workflows. In practice that means deciding where the human stays in the loop, not just writing a prompt.",
        { list:[
          "Collect two or three examples of the task done well — these are your acceptance criteria and your few-shot examples at once.",
          "Decide which step a human reviews, and what they are checking for.",
          "Store the prompt somewhere shared and versioned, not in your chat history.",
          "Record the edits you make each run; a recurring edit is a missing instruction."
        ]},
        { key: "A prompt saved only in your own chat history is <strong>not a workflow</strong>. Shared, versioned artifacts are what make a practice survive you." }
      ]},
    { h: "Talking to stakeholders",
      body:[
        "Communicating value and limitations is an explicit objective. The failure mode is overselling: promising consistency the tool cannot deliver, then losing trust on the first visible error.",
        { key: "Describe both sides — what it reliably does, and what it gets wrong — <strong>before</strong> anyone depends on it. Discovered limitations cost far more trust than disclosed ones." },
        { exam: "Escalation is part of the Associate role by design. The guide positions Associates as recognizing limits and handing complex or technical work to Architects and Developers — knowing what not to take on is a tested competency." }
      ]}
  ],
  confusions:[
    { a: "Time saved", b: "Net time saved", split: "Review time counts against it. Omitting it is how bad automation looks good." },
    { a: "Most painful task", b: "Best first candidate", split: "Painful often means ambiguous, which makes it a poor starting point." },
    { a: "A good prompt", b: "A workflow", split: "A workflow is shared, versioned, and has a defined review step." }
  ],
  checks:[
    "What makes a task a poor automation candidate even if it is frequent?",
    "Write the net-value calculation including the term people forget.",
    "What should exist before you automate anything?",
    "When should an Associate escalate rather than proceed?"
  ]
},

{ exam: "CCAO-F", d: "a3", mins: 10,
  big: "Governance questions are answered by policy, not by instinct. The tested judgment is knowing which rule applies and when to ask.",
  sections:[
    { h: "Data sensitivity",
      body:[
        "The question people ask themselves before pasting something in is 'does this feel sensitive', and that is the wrong question — not because the instinct is always wrong, but because it is not the standard anyone will be held to. What governs is whether the environment you are using has been approved for this category of data.",
        { key: "The governing question is whether <strong>this deployment is approved for this class of data</strong> under your organization's policy — not whether it feels acceptable." },
        { exam: "The guide's sample question: a spreadsheet of customer names and account numbers, policy restricts regulated personal data. The correct action is to remove or anonymize identifiers before uploading. Note what is explicitly wrong: uploading because the analysis is internal, and instructing the model not to retain the data — an instruction is not a policy control." },
        "That second wrong answer is worth dwelling on, because the reasoning behind it is so natural. Telling the model not to retain something feels like a safeguard. It is a request made to the system you are already sending the data to — the disclosure has happened by the time the instruction is read, and nothing about it is enforceable.",
        { warn: "Stripping names is weaker anonymization than people assume. Records are frequently re-identifiable from the fields that remain, which is why policy rather than personal judgment decides." },
        "The last point catches people who have done the right thing once already. Approval attaches to a specific deployment, not to the model or the brand, so being cleared to use a tool in one environment tells you nothing about a different one — and 'we already use Claude for this' is not the same sentence as 'this deployment is approved for this data'.",
        { key: "Approval is usually <strong>per-deployment, not per-tool</strong>. The same model may be approved in one environment and prohibited in another." }
      ]},
    { h: "Appropriate and inappropriate use",
      body:[
        "The objectives distinguish identifying suitable use cases from applying data rules. Both are tested, and they fail differently — one produces poor results, the other produces incidents.",
        { table:[
          ["Suitable", "Needs care or escalation"],
          ["Drafting, summarizing, reformatting", "Decisions affecting someone's access or entitlement"],
          ["Exploring options and structuring thinking", "Anything regulated or legally binding"],
          ["Analysing data you are cleared to use", "Regulated personal data without redaction"],
          ["First-pass research you will verify", "Work you cannot competently review"]
        ]},
        { key: "Never automate work you could not <strong>competently review</strong>. If you cannot tell whether the output is right, you cannot be accountable for it." }
      ]},
    { h: "Accountability and disclosure",
      body:[
        "There is a persistent intuition that using a tool divides responsibility — that if the model produced the error, the error is partly the model's. It is worth being clear that nothing about accountability moves. You chose to use it, chose what to send, and chose to put your name on what came back.",
        { key: "The tool changes <strong>how work is produced, not who is accountable for it</strong>. Accuracy, appropriateness, compliance, and the decision to act all remain yours." },
        "Disclosure expectations vary by organization, client, and sector, and some contexts have regulatory requirements. There is no universal rule — which is itself the answer to questions phrased as though there were.",
        "What does generalize is the shape of the judgment. Disclosure matters most where the reader's assessment depends on who they think produced the work — a personal recommendation, an expert opinion, a creative submission. It matters least where the tool's involvement is incidental to what is being judged, in the way nobody declares which editor they typed a document in.",
        { key: "The constant is <strong>review before sending</strong>. Blanket concealment and blanket disclaimers both substitute a reflex for the judgment the situation needs." },
        { why:{ q: "Why does the guide treat ethics as a separate objective from policy?", a: "Policy tells you what is permitted; it cannot anticipate everything. Bias in a shortlist, a summary that flattens a dissenting view, output that affects someone who never consented to AI involvement — these may be entirely within policy and still wrong. The objective asks you to notice the cases where compliance and good judgment come apart, which is precisely where a rulebook stops helping." } }
      ]},
    { h: "When the policy is silent",
      body:[
        "Every policy has gaps: anonymized data, third-party material under NDA, content that is public but sensitive in aggregate.",
        { key: "A gap means <strong>ask, don't improvise</strong>. Note the gap, name who could resolve it, and record the answer so the next person doesn't re-litigate it." },
        { warn: "Guidance consulted once at onboarding is not recalled months later under deadline pressure. Put it where the decision happens — in the workspace, the template, the project instructions." }
      ]}
  ],
  confusions:[
    { a: "Removing names", b: "Anonymization", split: "Records often remain re-identifiable from the remaining fields." },
    { a: "Instructing the model not to retain data", b: "A policy control", split: "An instruction is not a control. The data was still sent." },
    { a: "Permitted by policy", b: "Appropriate to do", split: "Compliance and judgment can come apart; ethics is a separate objective." },
    { a: "Per-tool approval", b: "Per-deployment approval", split: "The same model may be approved in one environment and not another." }
  ],
  checks:[
    "A colleague wants to upload customer records. What decides whether that is acceptable?",
    "Why is 'tell Claude not to retain it' not a valid safeguard?",
    "What stays with the human regardless of how the work was produced?",
    "The policy doesn't cover your case. What now?"
  ]
},

{ exam: "CCAO-F", d: "a5", mins: 8,
  big: "Match the product feature and the model tier to the task. Both halves are tested, and the reasoning is the same: capability you don't need is cost you don't need.",
  sections:[
    { h: "Product features",
      body:[
        "The guide names specific features as an objective, so recognizing what each is for matters as much as prompting well.",
        { table:[
          ["Feature", "Use it for"],
          ["Chat", "Quick questions, iteration, exploration"],
          ["Projects", "Recurring work needing the same instructions and knowledge each time"],
          ["Artifacts", "Documents and code you will keep, revise, or share"],
          ["Research mode", "Questions needing multi-source gathering before an answer"],
          ["Connectors", "Pulling in live content from sources such as Drive or Gmail"]
        ]},
        { key: "<strong>Projects</strong> are the answer whenever a scenario describes repeatedly pasting the same background. Instructions and knowledge sources load every time without anyone remembering." }
      ]},
    { h: "Model tiers",
      body:[
        "Tier choice is where cost and capability trade against each other, and the instinct to always pick the most capable option is the expensive one. A task that a faster model handles perfectly well does not get better on a more capable model — it just costs more and takes longer, on every single run.",
        { key: "Choose the <strong>cheapest tier that clears your quality bar</strong>, verified against examples of your actual work rather than assumed." },
        "The 'verified against your actual work' part carries the weight. Benchmarks and general reputation describe other people's tasks; the only evidence that matters is a handful of your own real examples run through the cheaper tier to see whether the output holds up.",
        { table:[
          ["Tier", "Suits"],
          ["Haiku", "High volume, short, straightforward — speed and cost matter most"],
          ["Sonnet", "Everyday balanced work"],
          ["Opus", "Hard reasoning where accuracy outweighs speed and cost"]
        ]},
        "Capacity is the other half of model choice. <strong>Rate limits</strong> cap how much you can send in a window — requests per minute and tokens per minute — and they apply per organization, not per user. A design that works in testing can hit them the moment real traffic arrives.",
        { key: "Picking a model is a <strong>capability and a capacity</strong> decision. The cheaper, faster tier also consumes less of your rate limit per call, which is often what makes high-volume work feasible at all." },
        { exam: "The guide's sample question: high volume of short customer-reply drafts, speed and cost matter more than deep reasoning. The answer is the faster, lower-cost model. Defaulting to the most capable model for everything is explicitly called out as wasting the cost and latency budget." },
        { warn: "Defaulting in either direction is a non-decision. Most capable everywhere overpays on easy work; cheapest everywhere fails on hard work." }
      ]},
    { h: "Context and memory",
      body:[
        "The objective names managing context limits and knowing when to restart, summarize, or persist — the practitioner-level version of the saturation idea.",
        { key: "The symptom of a saturated conversation is <strong>vaguer answers that ignore detail you gave earlier</strong>. The fix is a fresh conversation with the essentials restated, not a plea to try harder." },
        { warn: "Re-pasting the whole history into the new conversation recreates the problem immediately. Restate only what still matters." },
        { key: "Information you need <strong>every time</strong> belongs in a Project's instructions or knowledge, not pasted into each conversation." },
        "The ceiling itself is the <strong>context window</strong>: everything the model can consider at once — the system prompt, the conversation so far, any attached documents, and the answer being written. A larger window doesn't make the model smarter; it lets you put more in front of it at once, so you can analyse a long document whole, or hold a longer conversation, before anything has to be summarized away.",
        { key: "A bigger context window buys <strong>more material per request</strong>, not better reasoning. You pay for what you actually send, so filling a large window on every call is a real cost." }
      ]}
  ],
  confusions:[
    { a: "Chat", b: "Projects", split: "One-off versus recurring work with persistent instructions and knowledge." },
    { a: "Bigger context window", b: "Better answers", split: "Capacity, not quality. It delays saturation rather than preventing it." },
    { a: "Most capable model", b: "Right model", split: "Capability you don't need is cost and latency you don't need." }
  ],
  checks:[
    "You paste the same background into every conversation. What should you use?",
    "High volume of short drafts, speed matters. Which tier, and why not the best one?",
    "Answers have gone vague and are ignoring earlier detail. Diagnose and fix.",
    "What belongs in Project instructions rather than a prompt?"
  ]
},

{ exam: "CCAR-P", d: "p1", mins: 12,
  big: "Integration is the heaviest Professional domain. Its questions are about choosing mechanisms and finding the security and observability gaps in a design someone hands you.",
  sections:[
    { h: "Choosing the connection mechanism",
      body:[
        "Integration questions often look like capability questions and almost never are. All four mechanisms below can call the same tools and get the same work done, so asking which is more powerful leads nowhere. What separates them is who else needs these tools, who operates the thing in the middle, and what happens at the boundary when something fails.",
        { table:[
          ["Mechanism", "Fits", "Watch for"],
          ["MCP", "Reusable tools shared across several applications", "Server becomes a dependency to operate"],
          ["Direct API / SDK", "One application, tools used only there", "Duplication if a second app needs them"],
          ["CLI / subprocess", "Local automation, scripted pipelines", "Weak boundary; inherits ambient permissions"],
          ["Agent-to-agent", "Independently owned systems co-operating", "Error propagation and trust across the boundary"]
        ]},
        "The watch-for column is where the real cost sits. An MCP server shared across four teams is genuinely the right answer for reuse, and it is also a service somebody now has to run, version and keep available — which is a reasonable trade when several applications need the tools, and pure overhead when only one does.",
        { key: "The deciding question is <strong>reuse and ownership</strong>, not capability. Several applications needing the same tools, maintained independently, is the MCP case." },
        { exam: "Capability bloat is named explicitly as something to evaluate. An agent with eighteen tools where five would do is both a selection-accuracy problem and a security surface." },
        "A hard requirement that customer data never leaves the network changes the question from <em>how do we call the API</em> to <em>where does the model run</em>. Running through <strong>Amazon Bedrock</strong> or <strong>Google Vertex AI</strong> inside the organization's own cloud account keeps inference within that boundary and under its existing network controls, which is the usual answer to a residency or VPC requirement.",
        { key: "Where data may travel is an <strong>architectural constraint, decided first</strong> — it selects the deployment channel. Bolting <strong>redaction</strong> or field-level filtering onto a design that already ships raw records offsite is a patch, not a boundary." }
      ]},
    { h: "Least privilege, concretely",
      body:[
        { exam: "The guide's sample question: a support agent can read tickets, draft replies, issue refunds and delete accounts, but staff only need the first two. The answer is to <strong>remove</strong> the refund and delete tools. Logging and confirmation prompts are named as detective and compensating controls — not removal of privilege." },
        { key: "Least privilege means <strong>removing the capability</strong>, not monitoring or guarding it. Logging tells you afterwards; a confirmation prompt gets clicked through." },
        "Authentication and authorization gaps are a separate named objective. The questions worth asking of any design: whose identity is the call made under, what can that identity reach, and does the agent's access exceed the user's?",
        { warn: "An agent acting with its own broad service credentials rather than the end user's scoped identity will happily return data the requester was never entitled to see. The model is not the control." }
      ]},
    { h: "Observability at scale",
      body:[
        "Monitoring a handful of agents is log-reading. Monitoring hundreds of thousands of calls is a design problem, and the objective asks you to select a strategy rather than just enable logging.",
        { key: "Log <strong>request id, stop reason, token usage and latency</strong> on every call, and sample content selectively. Capturing full prompts and responses at scale is expensive and frequently a privacy problem." },
        { key: "Track <strong>percentiles</strong>, not averages. The tail is what users experience as broken, and an average hides it completely." },
        { why:{ q: "Why is sampling content better than logging everything?", a: "Full request and response bodies are the largest, most sensitive thing you could retain, and at scale the storage and the exposure both grow without bound. Structured metadata on every call tells you that something went wrong and lets you find it; a sampled subset of content tells you what it looked like. Keeping everything is how a debugging convenience becomes a data-protection incident." } }
      ]},
    { h: "Retrieval design",
      body:[
        "RAG is called out specifically: chunking, indexing, and matching the retrieval strategy to the shape of the data and the query pattern.",
        { key: "Measure <strong>retrieval quality separately</strong> from answer quality. A bad answer from good context is a different bug from a bad answer from bad context." },
        { exam: "The sample diagnosis: a RAG system starts returning confident but wrong answers after a document refresh, with model version and latency unchanged. That points at retrieval — a broken re-index or mismatched embeddings — not at the model." },
        { key: "Progressive discovery versus monolithic context is a named tradeoff: fetch more when the first retrieval is insufficient, rather than always sending top-k." }
      ]},
    { h: "Resilience",
      body:[
        { list:[
          "Retry transient failures only; 4xx fails fast.",
          "Backoff with jitter so recovering services are not hit by a synchronized herd.",
          "Timeouts bounded below the caller's own budget.",
          "Circuit breaking so one failing dependency does not exhaust your capacity.",
          "A defined degraded mode: what the product does when the model is unreachable."
        ]},
        { key: "Accuracy-latency tradeoffs must be <strong>justified, not assumed</strong>. The objective asks you to defend the configuration, which means knowing what you gave up." }
      ]}
  ],
  confusions:[
    { a: "Logging a risky tool", b: "Removing it", split: "Detective control versus least privilege. Logging is after the fact." },
    { a: "Confirmation prompt", b: "Removing the capability", split: "A compensating control people click through under time pressure." },
    { a: "Retrieval quality", b: "Answer quality", split: "Measure separately, or you debug the wrong layer." },
    { a: "Agent's service identity", b: "End user's scoped identity", split: "If the agent's reach exceeds the user's, authorization is broken." }
  ],
  checks:[
    "An agent has tools its users never need. What is the least-privilege fix, and why not logging?",
    "When does MCP beat a direct integration?",
    "Confident wrong answers after a document refresh, model unchanged. Where do you look?",
    "What do you log on every call at scale, and what do you only sample?"
  ]
},

{ exam: "CCAR-P", d: "p4", mins: 13,
  big: "Governance is the part of the design that decides who is answerable when the system is wrong. The tested judgment is which controls hold under pressure and which only look like controls.",
  sections:[
    { h: "What governance actually has to deliver",
      body:[
        "It is easy to treat governance as paperwork that happens after the architecture is settled. At Professional level it is the opposite: the governance requirements constrain the design, and a system that cannot say who decided something is not a system you can put in front of a regulated client regardless of how well it performs.",
        "Three things have to be true of any consequential decision the system participates in. Someone has to be answerable for it, there has to be a record of what the decision was based on, and the person affected needs some route to challenge it. None of those is satisfied by the model being accurate.",
        { key: "Accountability does not transfer to a model. A consequential decision needs <strong>a named owner, a decision record, and a route to contest the outcome</strong>." },
        { exam: "Questions describing a system that affects someone's access, entitlement or money are asking about this. The expected answer separates recommendation from authorization — the model proposes, a person or a policy rule decides — rather than making the model more capable or adding a disclaimer." }
      ]},
    { h: "Controls that hold, and controls that don't",
      body:[
        "The recurring distinction in this domain is between a control that is enforced and one that is merely requested. A prompt instructing the model to refuse certain requests shifts probabilities; a permission check in code refuses them. Both can be described as 'the system prevents this', and only one survives a determined adversary or an unusual input.",
        { table:[
          ["Control", "Enforced by", "Holds under attack?"],
          ["System-prompt instruction", "The model's cooperation", "No — it is text competing with other text"],
          ["Tool scoping and permissions", "Your code, before the call runs", "Yes"],
          ["Confirmation gate on an action", "The orchestrator, outside the loop", "Yes"],
          ["Output validation against a contract", "Your code, before anything is published", "Yes"],
          ["Instruction to ignore injected directives", "The model's cooperation", "No"]
        ]},
        { key: "Any requirement phrased as <strong>'must never' or 'always'</strong> belongs in code, not in the prompt. A probabilistic mechanism cannot carry a deterministic guarantee." },
        { why:{ q: "Why is 'tell the model to ignore instructions in the content' not a real mitigation?",
          a: "Because it is one more piece of text in a prompt that also contains the attacker's text, and nothing gives yours special authority. If the injected content is more specific, more recent in the context, or simply phrased more compellingly, it can win. The mitigations that actually hold do not depend on the model making the right choice at all: narrow the tools so the damaging action is not available, gate irreversible actions behind a confirmation the model cannot issue, and keep untrusted content clearly separated from the instruction channel. Those work whether or not the model is fooled." } }
      ]},
    { h: "Risk assessment",
      body:[
        "A risk register for an AI system answers three questions for each identified risk, and the second is the one teams most often skip. What does this failure cost and who bears it; how would we find out it had happened; and what is the behavior when the component is unavailable.",
        { table:[
          ["Dimension", "The question it answers"],
          ["Consequence", "What a wrong output costs, and to whom"],
          ["Detectability", "How a failure surfaces, and how quickly"],
          ["Reversibility", "Whether the action can be undone once taken"],
          ["Availability", "What happens when the model or integration is down"]
        ]},
        { key: "Detectability deserves equal weight with consequence. A rare failure you would notice immediately is a smaller risk than a common one that surfaces months later as customer attrition." },
        { warn: "A model's published benchmark results say nothing about the risk your system carries. Risk is a property of what the system does and what depends on it, not of the model's general capability." }
      ]},
    { h: "Safety review and data handling",
      body:[
        "A safety review looks for the failure modes that normal testing does not produce, because normal testing uses inputs that are well-formed and well-intentioned. The cases that matter are the hostile ones, the ambiguous ones, and the ones where the system is asked to do something slightly outside what it was built for.",
        { list:[
          "Untrusted content reaching a model that holds tools — the injection path.",
          "Outputs that are plausible, confident and wrong in a way review would not catch.",
          "Actions that cannot be reversed once taken.",
          "Data appearing somewhere it should not, including in logs and traces."
        ]},
        "That last item catches teams who have handled the main data path carefully. Logging is written for debugging, usually early, and it tends to capture whole requests and responses — which means sensitive content that was handled correctly in the system can sit in plain text in an observability platform with much broader access.",
        { key: "Minimize at the point data enters the system: send only the fields the task needs, and decide separately what the logs retain. Redaction after the fact is a cleanup, not a control." },
        { exam: "When a question says data must be used but must not appear in logs, the answer is structural — redact or tokenize before the call and configure what the integration records — not a policy stating that logs should not be read." }
      ]},
    { h: "Version changes as a governance event",
      body:[
        "A model version change is the one event in this domain that arrives from outside your organization, and it is why pinning matters beyond reproducibility. A new version can behave differently on exactly the edge cases your safeguards were tuned against, so the controls need re-validating and not merely the quality score.",
        { key: "Treat an upgrade as a <strong>change requiring re-validation</strong> of the safety cases, not just the accuracy suite. Pin the version so the upgrade is a decision you make rather than an event that happens to you." },
        { why:{ q: "Why keep the superseded version available after upgrading?",
          a: "Two reasons, and the second is the governance one. Operationally, a pinned previous version turns a bad upgrade into a rollback instead of an incident. For governance, explaining a decision the system made last quarter means reconstructing what it was asked and which version answered — and if that version is no longer reachable, the explanation rests on an assumption rather than a record. This is why the audit trail captures the model id alongside the prompt and the response." } }
      ]}
  ],
  confusions:[
    { a: "Prompt instruction", b: "Enforced control", split: "One shifts probabilities; the other runs in code regardless of what the model decides." },
    { a: "The model decides", b: "The model recommends", split: "Consequential actions need an accountable decision-maker and a route to contest." },
    { a: "Accurate", b: "Governable", split: "Accuracy is not accountability. A correct system still needs an owner and a record." },
    { a: "Benchmark results", b: "Risk assessment", split: "Risk depends on what the system does and what depends on it." }
  ],
  checks:[
    "A system affects someone's entitlement. What three things must the governance design provide?",
    "Why is a system-prompt instruction not a mitigation for prompt injection?",
    "Name the four dimensions a risk assessment should cover.",
    "Sensitive data must be processed but must not reach the logs. What is the right approach?",
    "Why is a model version change a governance event rather than a routine upgrade?"
  ]
},

{ exam: "CCAR-P", d: "p5", mins: 12,
  big: "This domain is about the conversations around the system rather than the system itself: what you promise, how you justify a number, and who keeps it healthy after launch.",
  sections:[
    { h: "Setting expectations you can keep",
      body:[
        "The hardest moment in a Claude project is usually not technical. It is the meeting where someone senior asks whether the system will be right, and the honest answer — mostly, with a measured error rate, and here is what happens when it is wrong — sounds evasive next to a confident yes.",
        "Giving the confident yes is the most expensive thing you can do in that room. It converts every future error from an expected cost into a broken promise, and the trust you lose on the first visible mistake is far harder to rebuild than the trust you would have spent being accurate up front.",
        { key: "Quantify rather than reassure. Give the <strong>measured error rate, what the design does about those cases, and the residual risk</strong> — not a promise of correctness and not a general disclaimer about AI." },
        { exam: "When a stakeholder asks for a single accuracy number to decide on, the expected answer resists the framing: one number hides which segments fail and what a failure costs. Give the number with its distribution and the consequence, rather than refusing to answer or supplying a figure that will be quoted without its caveats." },
        { warn: "Promising that the system will improve on its own is a specific and common overreach. Nothing improves without someone measuring, changing something and re-evaluating — and if nobody is funded to do that, the system gets worse as inputs drift." }
      ]},
    { h: "Defensible estimates",
      body:[
        "Cost and time projections get asked for early, when you have the least evidence, and the temptation is to extrapolate from whatever you have. A pilot's cost per request multiplied by projected volume looks rigorous and is usually wrong, because the things that drive cost at scale are not the things that drove it in the pilot.",
        { table:[
          ["What moves the real number", "Why the pilot understates it"],
          ["Context size per request", "Pilot prompts are short; production accretes history and retrieved material"],
          ["Cache hit rate", "Needs stable prefixes and real traffic patterns to materialize"],
          ["Tier mix", "Pilots often run one tier; production routes by difficulty"],
          ["Retries and failures", "Rare in curated testing, routine on real inputs"],
          ["Review effort", "Frequently excluded entirely from the pilot's cost"]
        ]},
        { key: "A defensible estimate is a <strong>range with its drivers named</strong>, measured on real traffic rather than extrapolated from a pilot. Say which assumption would move it most." },
        "The last part matters more than the range itself. A sponsor who knows that the figure hinges on cache hit rate can ask about cache hit rate; one who receives a single number has no way to interrogate it, and will treat it as a commitment."
      ]},
    { h: "Explaining a design to a non-technical sponsor",
      body:[
        "Architecture decisions have to be defensible to people who will never read the design document, and the translation is not a matter of simplifying the vocabulary. What a sponsor needs is the decision, what it buys, what it costs, and what happens if it turns out to be wrong.",
        { key: "Lead with the <strong>business consequence</strong>, not the mechanism. 'We chose the simpler design because it fails in ways we can explain to your auditor' lands where a description of the orchestration pattern does not." },
        { warn: "Presenting only the recommended option conceals the tradeoff. Naming the alternative you rejected, and why, is what makes the recommendation credible rather than merely confident." }
      ]},
    { h: "What an SLA can and cannot say",
      body:[
        "An SLA for an AI-backed capability differs from a conventional one in a way that catches teams out. You can commit to availability and latency, because those are properties of your infrastructure. You cannot commit to correctness per request, because the component that determines it is probabilistic.",
        { table:[
          ["Can be committed", "Cannot be committed"],
          ["Availability of the endpoint", "Correctness of any individual response"],
          ["Latency percentiles", "That output will never require correction"],
          ["Behavior when the model is unavailable", "A fixed accuracy figure per request"],
          ["Measured accuracy on a defined eval set", "That accuracy transfers to unseen input distributions"]
        ]},
        { key: "Commit to <strong>measured accuracy on a stated set</strong> plus a defined path for the cases that fail — never to per-request correctness." }
      ]},
    { h: "Life after launch",
      body:[
        "The most consequential sentence in this domain is that these systems do not have a finished state. A conventional service that nobody touches keeps behaving as it did; a Claude-backed one drifts, because the inputs change and the model version moves even when your code does not.",
        "This is why 'quality complaints are rising and nothing in our system changed' is such a common scenario. Nothing in the system did change. The traffic changed, or the version did, and without continuous measurement the first signal is a complaint.",
        { list:[
          "Refresh the eval set from production traffic, including new failure cases.",
          "Watch cost per task, validation-failure and retry rates, not just uptime.",
          "Re-validate when the model version moves, and keep the previous one deployable.",
          "Name the team that owns the prompt and the evals — individual ownership does not survive people changing roles."
        ]},
        { key: "Launch moves the system into <strong>steady-state operation</strong>, not completion. Measurement and tuning continue, and somebody has to be funded to do them." },
        { why:{ q: "Why does ownership belong with the service team rather than a central AI function or the original engineer?",
          a: "Prompts and eval sets are operational assets that go stale, and keeping them current needs two things: visibility of the real traffic, and the authority to change the system. The team running the service has both. The original engineer has the context but eventually moves on, taking it with them — and a central function has neither the domain signal to notice that a particular failure matters nor the capacity to watch every service. Centralizing the standards while distributing the ownership is usually the arrangement that holds." } }
      ]}
  ],
  confusions:[
    { a: "A single accuracy number", b: "Accuracy with its distribution", split: "One number hides which segments fail and what each failure costs." },
    { a: "Pilot cost x volume", b: "A range with named drivers", split: "Context growth, cache behavior and review effort all change at scale." },
    { a: "Launched", b: "Finished", split: "Inputs drift and versions move. Steady-state operation is not completion." },
    { a: "Availability SLA", b: "Correctness SLA", split: "Infrastructure can be committed; per-request correctness cannot." }
  ],
  checks:[
    "A stakeholder wants one accuracy number to decide on. What do you give them?",
    "What makes a cost projection defensible rather than optimistic?",
    "What can and cannot go into an SLA for an AI-backed capability?",
    "Quality complaints rise six months after launch and your code has not changed. What happened?",
    "Who should own the prompt and eval suite long term, and why?"
  ]
},

{ exam: "CCAR-P", d: "p6", mins: 11,
  big: "At Professional level, prompts and context are production assets with versions, owners and failure modes — not text someone tunes until it looks right.",
  sections:[
    { h: "Prompts are deployed artefacts",
      body:[
        "The habit that separates a production system from a prototype is treating the prompt the way you treat code. A prompt change alters system behavior just as surely as a code change does, and if it can reach production without review or evaluation then you have a path to changing behavior that bypasses every control you put around deployment.",
        { key: "Version prompts, review changes, and gate each one on the <strong>eval suite</strong>. Where the text is stored matters far less than whether a change can ship unevaluated." },
        "This also answers the question about several teams writing their own prompt for the same underlying task. The problem is not that the prompts differ in quality — it is that there is no single definition to improve. The fix is a shared, parameterized prompt with the variable parts injected, so one improvement reaches everyone and the shared part has an owner.",
        { warn: "A central team writing every prompt is the over-correction. It removes the domain knowledge that makes a prompt good and becomes a bottleneck; shared components with local parameters is the arrangement that holds." }
      ]},
    { h: "Consistency across tiers and versions",
      body:[
        "Systems that route by difficulty end up running the same logical task on more than one tier, and the tiers do not behave identically. The instinct is to write one prompt and hope; what actually works is to decide what must be invariant and enforce that outside the prompt.",
        { key: "Hold the <strong>output contract</strong> constant in code — schema, validation, required fields — and let the prompt vary per tier. Consistency enforced by validation survives a tier change; consistency written into prose does not." },
        { table:[
          ["Change", "Behavior-neutral?", "Needs re-evaluation"],
          ["Enabling prompt caching", "Yes — same content is sent", "No, but verify the hit rate"],
          ["Dropping to a cheaper tier", "No", "Yes, on the fixed set"],
          ["Shortening the system prompt", "No", "Yes"],
          ["Changing an output schema", "No", "Yes, including downstream consumers"],
          ["Moving to a new model version", "No", "Yes, including the safety cases"]
        ]},
        { key: "Pin a dated model id rather than a moving alias. An alias changes production behavior on someone else's schedule, which turns an upgrade into an event instead of a decision." }
      ]},
    { h: "Prompt decay",
      body:[
        "A prompt that has been maintained for a year tends to accumulate exceptions — a clause for the awkward supplier, a rule for the document format that broke it once, an instruction added during an incident. Each addition was reasonable. The aggregate is a prompt where the directives that still matter compete with rules for cases that no longer occur.",
        { key: "Prune deliberately. Stale instructions do not sit harmlessly; they <strong>dilute the ones that matter</strong> and make the behavior harder to predict and to evaluate." },
        { exam: "When a question says a prompt performs well in testing but degrades in production on the same task, the usual cause is that production inputs are longer, messier or differently distributed — not that the prompt is wrong. Compare the real inputs against the test ones before editing anything." },
        { why:{ q: "Why does a heavily tuned prompt often not transfer to a new model version?",
          a: "Because much of the tuning is compensation for one version's specific tendencies — a workaround for a formatting quirk, an emphasis added because the model kept omitting something. On a new version some of those workarounds are unnecessary, and a few are actively harmful: an instruction compensating for a behavior that no longer exists now pushes the output away from what you want. This is why an upgrade means re-running the suite rather than assuming the tuning carries over, and why the realistic expectation is adjustment rather than either clean transfer or a rewrite." } }
      ]},
    { h: "Context engineering",
      body:[
        "Context assembly is a design problem with a counter-intuitive rule: more relevant material is not better. Everything you include competes for attention with everything else, so retrieved documents, conversation history and tool results all need a deliberate decision about what earns its place.",
        { key: "Decide what the task actually needs and <strong>order it for prominence</strong>. Material in the middle of a long prompt carries less weight than content at either end — instructions lead, and the specific ask is worth restating after a long document." },
        "For a long-lived assistant the explicit decisions are what to keep, what to summarize, what to drop, and when. Leaving that implicit means the context grows until something breaks, and the failure arrives as gradually worsening answers rather than as an error anyone can trace.",
        { table:[
          ["Context strategy", "When it fits"],
          ["Keep everything", "Short sessions that end well inside the window"],
          ["Prune superseded items", "Long sessions where old tool results stop mattering"],
          ["Summarize older turns", "Long conversations where the thread must survive"],
          ["Start fresh with carried state", "The task has moved on; restate conclusions and constraints"]
        ]},
        { key: "Caching rewards a <strong>stable prefix</strong>. Anything per-request — a timestamp, a user id, a reordered field — must sit after the breakpoint, or every call misses." }
      ]}
  ],
  confusions:[
    { a: "Prompt stored in config", b: "Prompt under version control with evals", split: "Where it lives matters less than whether a change can ship unevaluated." },
    { a: "One prompt across tiers", b: "One output contract across tiers", split: "Enforce the contract in code; let the prompt vary." },
    { a: "More context", b: "The right context, ordered", split: "Irrelevant material dilutes attention and buries what matters." },
    { a: "Tuning transfers to a new version", b: "Tuning needs re-validation", split: "Workarounds for one version's quirks can hurt on the next." }
  ],
  checks:[
    "Several teams wrote their own prompt for the same task. What do you propose?",
    "Which optimizations are behavior-neutral and which need re-evaluation?",
    "A prompt performs well in testing and degrades in production. What do you examine first?",
    "What must be decided explicitly in a long-lived assistant's context strategy?",
    "Why does adding a user id near the top of a prompt destroy the cache hit rate?"
  ]
},

{ exam: "CCAO-F", d: "a4", mins: 11,
  big: "Prompting at Associate level is about structure and iteration, not clever phrasing. State who it's for, what it's for, and what the output should look like.",
  sections:[
    { h: "What makes an instruction work",
      body:[
        "A lot of prompting advice is about phrasing, and at this level almost none of it matters. What matters is whether the instruction contains the information the model would need to do the job well — and the most commonly missing pieces are who the output is for and what it is actually for.",
        { key: "Three things carry most of the weight: <strong>audience, purpose, and a concrete example</strong> of the output you want." },
        "Audience and purpose let the model handle cases you didn't anticipate. Format alone produces output that is correctly shaped and wrongly pitched — technically compliant and useless. A summary written for a board paper and one written for the engineering team might both be five bullets, and almost nothing else about them should be the same.",
        "The distinction below is worth internalizing, because the right-hand column is where most effort goes when a prompt is not working. Every item there adds words without adding information, which is why they so rarely help.",
        { table:[
          ["Helps", "Doesn't help"],
          ["Stating the audience and why it exists", "Asking more politely"],
          ["One real example of good output", "Making the prompt longer"],
          ["Saying what to exclude as well as include", "Repeating the instruction"],
          ["Naming the format and length", "Emphatic capitals"]
        ]},
        { warn: "Emphasis adds insistence without adding information. If an instruction was unclear, saying it louder does not clarify it." }
      ]},
    { h: "Decomposing complex requests",
      body:[
        "Task decomposition is a named objective. A request bundling research, analysis and drafting into one prompt produces output that is mediocre at all three.",
        "The reason is worth understanding rather than just accepting. Each of those is a different kind of work with different standards — research wants coverage, analysis wants judgment, drafting wants polish — and asking for all three in one pass means none of them gets full attention. You also lose the ability to notice where it went wrong, because by the time you read the draft the research that fed it has disappeared from view.",
        { key: "Break a complex request into steps you can <strong>check between</strong>. Catching a bad research step early is cheaper than discovering it in the final draft." },
        "Splitting the work has a second benefit people underuse: it gives you a place to correct course. If the research step returns something thin, you fix it there for a fraction of the effort of rewriting a finished draft built on top of it.",
        { key: "Give one example of the exact output structure rather than describing it. The model matches a demonstrated shape far more reliably than it reconstructs one from adjectives." }
      ]},
    { h: "Adapting to the task type",
      body:[
        "Different kinds of work need different things said about them, and a prompt that works beautifully for drafting can produce something useless for analysis. The table below is worth reading as four separate recipes rather than a list — what each task type needs is genuinely specific to it.",
        { table:[
          ["Task", "What the prompt needs"],
          ["Analysis", "The criteria to judge against, and what to ignore"],
          ["Research", "Scope, recency bounds, and that sources must be named"],
          ["Drafting", "Audience, tone, length, and a sample of house style"],
          ["Brainstorming", "Explicit permission to be speculative, and how many options"]
        ]},
        "The last row is the one that surprises people. Without explicit permission to speculate, output tends toward the safe and conventional, which is exactly wrong for brainstorming — you end up with four obvious ideas presented carefully. Saying that half-formed suggestions are welcome, and asking for a specific number, changes what comes back considerably.",
        { key: "Brainstorming and analysis want <strong>opposite</strong> things. One wants range, the other wants a single defensible answer — a prompt that doesn't say which gets a muddle of both." }
      ]},
    { h: "Iterating deliberately",
      body:[
        "Almost nobody gets a prompt right first time, and that is fine — what separates quick iteration from slow is whether you can tell which change helped. Changing four things at once and seeing better output teaches you nothing you can reuse, because you do not know which of the four mattered or whether one of them made things worse while the others compensated.",
        { key: "When output is wrong, change <strong>one thing</strong> and observe. Rewriting everything at once tells you the result changed, not what caused it." },
        "It also helps to test against the same handful of inputs each time rather than whatever arrived today. Fixed examples make a comparison possible; moving ones mean an apparent improvement might just be an easier document.",
        "Record the edits you make each run. A recurring edit is a missing instruction — fold it into the prompt rather than fixing it by hand every time.",
        { why:{ q: "Why does a long prompt often work worse than a short one?", a: "Instructions compete for attention. In a long prompt the critical requirement sits among a dozen others of equal apparent weight, and adding another sentence to fix a problem usually dilutes the ones already there. Length is rarely the fix for a clarity problem — a specific example almost always beats another paragraph of description." } }
      ]}
  ],
  confusions:[
    { a: "Longer prompt", b: "Clearer prompt", split: "Length dilutes. One concrete example beats another paragraph." },
    { a: "Describing the format", b: "Showing the format", split: "A demonstrated shape is matched far more reliably than a described one." },
    { a: "Analysis prompt", b: "Brainstorming prompt", split: "One wants a single defensible answer, the other wants range." }
  ],
  checks:[
    "Output keeps coming back in the wrong format. Most effective fix?",
    "Name the three things that carry most of the weight in an instruction.",
    "Why decompose a request rather than asking for everything at once?",
    "You've edited the same thing three runs running. What does that mean?"
  ]
},

{ exam: "CCAO-F", d: "a6", mins: 13,
  big: "Configuration is how a good prompt becomes a team capability. The objectives are about Projects, knowledge sources, and keeping them current.",
  sections:[
    { h: "Projects",
      body:[
        "Most people arrive at Projects by way of an annoyance. You have worked out how to explain your team's context to Claude — the house style, the audience, the three things it always gets wrong unless you say otherwise — and you find yourself pasting that same paragraph into every new conversation. It works, and it depends entirely on you remembering to do it. The day you are busy and skip it, the output is subtly off and you may not notice why.",
        { key: "A Project carries <strong>instructions plus knowledge sources</strong> into every conversation, so nobody has to remember to paste context." },
        "That is the answer to any scenario describing the same background being re-pasted, or team members getting inconsistent results from the same task. It is also what turns one person's hard-won prompt into something the whole team benefits from, because the context no longer lives in anyone's memory.",
        "The practical question is what goes in the Project and what stays in the individual request. The line is simpler than it first appears: anything that is true every time belongs in configuration, and anything specific to today's request does not.",
        { table:[
          ["Goes in Project instructions", "Goes in a single prompt"],
          ["Role, tone, house style", "The specific request"],
          ["Standing constraints and conventions", "This week's data"],
          ["Output format rules", "One-off adjustments"],
          ["How to handle recurring edge cases", "Follow-up questions"]
        ]},
        "Getting this wrong in the second direction causes a problem worth knowing about. If you add a one-off instruction to the Project — something you needed for a single awkward document — it does not stay confined to that case. It now shapes every conversation afterwards, steering work it was never meant for, and because it reads as reasonable nobody thinks to remove it.",
        { key: "The test is whether it is true <strong>every time</strong>. If yes, it belongs in configuration, not in the prompt." }
      ]},
    { h: "Knowledge sources and connectors",
      body:[
        "Managing uploaded knowledge and connectors is an explicit objective, and the Associate-level risk is not technical — it is what you connect.",
        "A connector is a standing grant rather than a one-time action. Connecting a mail account does not share the message you had in mind; it shares what that account can reach, for as long as the connection exists. That is often entirely appropriate, and it is a decision about data sensitivity that deserves a moment's thought rather than a reflexive yes.",
        { warn: "A connector to a mail or drive account exposes whatever that account can reach. Scope matters more than convenience, and it is a data-sensitivity decision before it is a configuration one." },
        "Uploaded documents carry a different risk, and a quieter one. A policy document that was accurate when you uploaded it stays in the Project after it has been superseded, and nothing about it looks out of date. Claude will cite it confidently, because supplied knowledge is treated as current — there is no mechanism by which it could know otherwise.",
        { key: "Uploaded knowledge <strong>goes stale silently</strong>. Nothing announces that last quarter's policy document has been superseded — the output just quietly becomes wrong." },
        "The temptation when setting up a Project is to upload everything that might conceivably be relevant, on the theory that more context cannot hurt. It can. A large pile of documents makes it harder to surface the right one, and every extra document is another thing that can quietly go out of date while nobody is watching.",
        { key: "Curate rather than accumulate. Uploading everything makes retrieval worse and raises the chance of an outdated document being used as current." }
      ]},
    { h: "Writing instructions that hold up",
      body:[
        "There is a useful test for Project instructions, which is to imagine a colleague using the Project next month without being able to ask you anything. Everything you would have wanted to tell them is something the instructions should already say. This sounds obvious and is routinely missed, because the person who wrote the Project supplies the unwritten half from their own head without noticing they are doing it.",
        { key: "Write for a colleague who will use it without asking you. Anything you'd have to explain verbally is a gap in the instructions, not in them." },
        { list:[
          "State what the Project is for, and what it is not for.",
          "Name the audience and output format.",
          "Record known limitations — what it tends to get wrong.",
          "Date it, so anyone can see whether it is current."
        ]},
        "The third item is the one people leave out, usually because it feels like admitting a flaw. It is the opposite. A limitation you have written down is a limitation the next person checks for; a limitation you know about and did not mention is one they discover in front of a client.",
        { key: "Note the <strong>known limitations</strong> in the configuration itself. A documented weakness gets checked; an undocumented one gets shipped." }
      ]},
    { h: "Keeping it current",
      body:[
        "The objective names informing, maintaining and updating configurations. Configuration decays: conventions change, documents are superseded, people leave. None of this announces itself — a Project that has quietly become wrong behaves exactly like one that is still right, which is what makes the decay worth planning for rather than noticing.",
        { key: "Assign an owner and a review trigger. Configuration nobody owns is configuration nobody updates, and it degrades invisibly." },
        "A review trigger is more reliable than a calendar reminder, because it ties the check to something that actually happens: a policy is reissued, a process changes, a quarter closes. The owner matters just as much. Shared responsibility for maintenance reliably produces no maintenance, since everyone assumes someone else is watching.",
        { warn: "Copies fork. Once three people have their own version of a Project, improvements stop propagating and you cannot tell which is authoritative." },
        { why:{ q: "Why do duplicated Projects cause more trouble than they seem to?",
          a: "Because each copy looks correct from the inside. Someone improves their own version and the improvement reaches nobody; someone else fixes a stale document in theirs while the other two keep citing the old one. Nothing surfaces the divergence — the work simply comes out differently depending on which copy a person happened to open, and tracing that back to the configuration is far harder than it sounds. One shared Project that several people can edit is almost always better than three private ones, even when the private copies started identical." } }
      ]}
  ],
  confusions:[
    { a: "Prompt", b: "Project instructions", split: "True every time versus true for this request." },
    { a: "Uploading everything", b: "Curating knowledge", split: "More sources makes retrieval worse and stale documents likelier." },
    { a: "Configured once", b: "Maintained", split: "Conventions change and documents are superseded. Decay is silent." }
  ],
  checks:[
    "Your team gets inconsistent results on the same recurring task. What's the fix?",
    "What test decides whether something belongs in Project instructions?",
    "What's the risk of connecting a mail or drive account?",
    "Why does a Project need an owner?"
  ]
},

{ exam: "CCAO-F", d: "a7", mins: 11,
  big: "Troubleshooting is diagnosis before treatment. Most bad output has a specific cause, and guessing at fixes is slower than finding it.",
  sections:[
    { h: "Diagnose before you rewrite",
      body:[
        "When output comes back wrong, the natural response is to start rewriting the prompt. It feels productive and it is usually the slowest route to a fix. A rewrite changes many things at once, so if the result improves you do not know which edit did it, and if it gets worse you have lost the version that was partly working. Worse, most bad output has a specific and recognizable cause, which means the fix is often a single sentence rather than a new prompt.",
        "The useful habit is to name the symptom first. Each of the common failures points at a different cause, and once you can tell them apart the correct fix is usually obvious.",
        { table:[
          ["Symptom", "Likely cause", "Fix"],
          ["Wrong format", "Underspecified output", "Show one example of the shape"],
          ["Too long or too short", "No length constraint", "State word or bullet count"],
          ["Vague, hedging, generic", "Context saturation, or no criteria", "Fresh conversation; or state the criteria"],
          ["Ignores detail you gave", "Buried in a long prompt or crowded out", "Restate it near the end"],
          ["Confidently wrong", "Insufficient grounding", "Supply the source; verify the claim"],
          ["Worked before, not now", "The inputs changed", "Compare a failing input to one that worked"]
        ]},
        "Two rows on that table deserve a second look because they are easy to confuse. 'Vague and hedging' has two quite different causes: a conversation that has accumulated so much material that early instructions no longer carry weight, or a prompt that never said what a good answer looks like. You tell them apart by starting a fresh conversation with the same prompt — if the output sharpens, it was saturation; if it is just as vague, the criteria were missing all along.",
        { key: "Match the symptom to a cause before changing anything. A full rewrite discards what was working and hides which change helped." }
      ]},
    { h: "When it used to work",
      body:[
        "A particular kind of report comes up often enough to be worth its own section: the prompt has not changed, nobody has touched anything, and the results have got worse. The first hypothesis people reach for is that the model changed underneath them. It is occasionally true and it is almost never where the evidence points, partly because it is the one explanation that requires no further investigation — which is exactly what makes it appealing.",
        { key: "'Similar inputs' often aren't. A new document format, longer content, or a case the prompt never covered will all present as 'it suddenly got worse'." },
        "The inputs are the thing that changes quietly. A team starts receiving documents from a new supplier in a slightly different layout, or the contracts get longer, or a category of request appears that nobody anticipated when the prompt was written. None of that feels like a change to the person reporting the problem, because from where they sit they are doing the same work they always did.",
        "Compare a failing input against one that used to succeed before concluding anything about the model. The difference between them is usually the whole answer.",
        { warn: "Assuming the model changed is the least productive first hypothesis. It is occasionally true and almost never where the evidence points." }
      ]},
    { h: "Optimizing the workflow, not just the prompt",
      body:[
        "The objective includes optimizing for efficiency and effectiveness, which is broader than prompt repair. Some problems that present as prompt problems are not fixable in the prompt at all, because what is wrong is the shape of the work around it.",
        "The signals below are worth learning to recognize, because each one points away from the prompt and toward the workflow:",
        { list:[
          "Recurring manual edits → a missing instruction; fold it in.",
          "Repeated context pasting → move it into a Project.",
          "Review taking as long as the work → reconsider whether to automate at all.",
          "Same question asked repeatedly → the knowledge source is missing or stale."
        ]},
        "The third of those is the one people resist, so it is worth stating plainly. If a workflow saves twenty minutes of drafting and costs twenty minutes of careful review, it has not saved anything — it has moved the work from writing to checking, which some people find harder. That is a legitimate finding, and concluding that a step should stay manual is a real answer rather than a failure to try hard enough.",
        { key: "The best optimization is sometimes <strong>not automating</strong> that step. Reaching that conclusion with evidence is a legitimate outcome." },
        { why:{ q: "Why is 'try a better model' a weak first move?", a: "It can mask a prompt problem rather than fix it. A more capable model may paper over an ambiguous instruction well enough that you stop noticing, right up until a case it can't rescue. You've also spent more per call permanently and learned nothing about why the output was wrong. Diagnose first; a tier change is a legitimate fix once you know the task genuinely needs more capability." } }
      ]}
  ],
  confusions:[
    { a: "Rewriting the prompt", b: "Diagnosing the cause", split: "A rewrite discards what worked and hides which change helped." },
    { a: "The model got worse", b: "The inputs changed", split: "Compare a failing input to one that worked before blaming the model." },
    { a: "Prompt problem", b: "Workflow problem", split: "Repeated manual edits and re-pasted context are workflow issues." }
  ],
  checks:[
    "A prompt that worked last month gives worse results. What do you check first?",
    "Output is vague and hedging. Name two possible causes and how to tell them apart.",
    "You make the same manual edit every run. What does that indicate?",
    "Why isn't 'use a better model' a good first response?"
  ]
},

{ exam: "CCAR-P", d: "p2", mins: 10,
  big: "Solution design starts at the business problem and ends at a defensible architecture. The recurring test is whether you chose the simplest thing that meets the requirement.",
  sections:[
    { h: "From business problem to architecture",
      body:[
        "Most architecture conversations open with a solution rather than a problem. Someone has read about multi-agent systems and arrives asking for one, and the useful first move is to work backwards to what they are actually trying to achieve — not because the request is unreasonable, but because the stated solution is usually the first one they encountered rather than the one their problem calls for.",
        { key: "Translate the <strong>problem</strong>, not the requested solution. Stakeholders usually arrive with the second already chosen." },
        "The questions that actually shape the design: what decision does the output drive, what happens when it is wrong, who reviews it, what data may it touch, and how will we know it is working after launch.",
        "Notice that none of those is about the model. They are about consequence and ownership, and they constrain the architecture far more tightly than any capability question — an output nobody reviews that drives an irreversible decision is a fundamentally different system from one that drafts a suggestion for a human.",
        { key: "Align to a stated business value — efficiency, transformation, productivity, cost, or an SLA. A design that cannot name which one it serves cannot be prioritized against anything else." }
      ]},
    { h: "Choosing the pattern",
      body:[
        "The four patterns below form a ladder of increasing capability and increasing cost, where the cost is paid in predictability rather than money. Each step up buys the ability to handle situations you could not enumerate in advance, and gives up some of your ability to say what the system will do.",
        { table:[
          ["Pattern", "Use when", "Cost"],
          ["Augmented LLM", "A single call with tools or retrieval suffices", "Least; hardest to stretch"],
          ["Workflow", "Steps are known in advance", "Predictable, testable"],
          ["Agentic", "The path depends on intermediate findings", "Flexibility for predictability"],
          ["Multi-agent", "Subtasks need isolation or different privileges", "Coordination and latency overhead"]
        ]},
        "The discipline is to climb only as far as the requirement forces you. A workflow you can read, test and debug is worth a great deal, and teams that reach for agency because the problem feels sophisticated end up with systems whose failures are much harder to explain to the people who depend on them.",
        { key: "Prefer the <strong>simplest construct that meets the requirement</strong>. Agency buys flexibility and spends predictability, cost, and debuggability." },
        { exam: "A client asking for an agentic system where a pipeline would do is a recurring scenario. The expected answer recommends the simpler design and names the tradeoffs — deferring silently withholds the expertise they engaged you for." }
      ]},
    { h: "End-to-end thinking",
      body:[
        "The objective says input → processing → output → feedback loops. The last one is what distinguishes a design from a demo.",
        { key: "A design without a <strong>feedback loop</strong> cannot improve. Where do failures get captured, who looks at them, and how do they reach the eval set?" },
        { warn: "A design review that cannot say what happens when the model returns something unexpected is incomplete. Enumerate truncation, refusal, validation failure, and tool error, each with a defined path." }
      ]},
    { h: "Decomposition",
      body:[
        { key: "Decompose along <strong>boundaries that already exist</strong>: different data sensitivity, different privileges, different failure consequences, different owners." },
        { fig:{ svg:"<svg viewBox=\"0 0 620 220\" xmlns=\"http://www.w3.org/2000/svg\"> <defs> <marker id=\"ar3\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"6\" markerHeight=\"6\" orient=\"auto-start-reverse\"> <path d=\"M 0 0 L 10 5 L 0 10 z\" fill=\"currentColor\"/> </marker> </defs> <g font-family=\"system-ui, sans-serif\" fill=\"currentColor\" font-size=\"12\" font-weight=\"600\" opacity=\"0.65\"> <text x=\"10\" y=\"20\">ONE AGENT</text> <text x=\"330\" y=\"20\">SPLIT BY PRIVILEGE</text> </g> <g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"> <rect x=\"22\" y=\"34\" width=\"118\" height=\"38\" rx=\"7\"/> <rect x=\"10\" y=\"108\" width=\"84\" height=\"32\" rx=\"6\"/> <rect x=\"102\" y=\"108\" width=\"84\" height=\"32\" rx=\"6\"/> <rect x=\"194\" y=\"108\" width=\"84\" height=\"32\" rx=\"6\"/> <rect x=\"330\" y=\"34\" width=\"84\" height=\"38\" rx=\"7\"/> <rect x=\"426\" y=\"34\" width=\"84\" height=\"38\" rx=\"7\"/> <rect x=\"522\" y=\"34\" width=\"84\" height=\"38\" rx=\"7\"/> <rect x=\"330\" y=\"108\" width=\"84\" height=\"32\" rx=\"6\"/> <rect x=\"426\" y=\"108\" width=\"84\" height=\"32\" rx=\"6\"/> <rect x=\"522\" y=\"108\" width=\"84\" height=\"32\" rx=\"6\"/> </g> <g stroke=\"currentColor\" stroke-width=\"1.3\" fill=\"none\" marker-end=\"url(#ar3)\" opacity=\"0.85\"> <line x1=\"70\" y1=\"76\" x2=\"52\" y2=\"102\"/> <line x1=\"81\" y1=\"76\" x2=\"144\" y2=\"102\"/> <line x1=\"92\" y1=\"76\" x2=\"236\" y2=\"102\"/> <line x1=\"372\" y1=\"76\" x2=\"372\" y2=\"102\"/> <line x1=\"468\" y1=\"76\" x2=\"468\" y2=\"102\"/> <line x1=\"564\" y1=\"76\" x2=\"564\" y2=\"102\"/> </g> <g font-family=\"system-ui, sans-serif\" font-size=\"11\" fill=\"currentColor\" text-anchor=\"middle\"> <text x=\"81\" y=\"58\">support agent</text> <text x=\"52\" y=\"128\">read tickets</text> <text x=\"144\" y=\"128\">draft reply</text> <text x=\"236\" y=\"128\">issue refund</text> <text x=\"372\" y=\"58\">research</text> <text x=\"468\" y=\"58\">drafting</text> <text x=\"564\" y=\"58\">billing</text> <text x=\"372\" y=\"128\">read tickets</text> <text x=\"468\" y=\"128\">draft reply</text> <text x=\"564\" y=\"128\">issue refund</text> </g> <g font-family=\"system-ui, sans-serif\" font-size=\"11.5\" fill=\"currentColor\"> <text x=\"10\" y=\"172\" opacity=\"0.8\">One confused run reaches all three.</text> <text x=\"330\" y=\"172\" opacity=\"0.8\">A compromise reaches one.</text> </g> <g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-dasharray=\"4 3\" opacity=\"0.5\"> <rect x=\"2\" y=\"26\" width=\"284\" height=\"124\" rx=\"10\"/> <rect x=\"322\" y=\"26\" width=\"292\" height=\"124\" rx=\"10\"/> </g> </svg>", cap:"Splitting by privilege is a containment decision, not a tidiness one. A single agent holds the union of every tool it might need, so one successful injection during a support interaction reaches billing authority it never required." } },
        "Splitting on those lines gives you components you can reason about and secure separately. Splitting arbitrarily just adds interfaces.",
        { why:{ q: "Why is conflating responsibilities into one agent a security problem, not just a design one?", a: "Because the agent ends up holding the union of every role's privileges. A support interaction then carries billing authority it should never have, and one confused run or successful injection can reach all of it. Separating by privilege boundary means a failure in one role is contained to that role — which is why the split is worth the coordination overhead even when a single agent would technically work." } }
      ]}
  ],
  confusions:[
    { a: "Stated requirement", b: "Underlying problem", split: "Stakeholders arrive with a solution already chosen." },
    { a: "Agentic", b: "Workflow", split: "Path depends on findings, versus steps known in advance." },
    { a: "Arbitrary decomposition", b: "Boundary-driven decomposition", split: "Split on privilege, sensitivity and ownership lines, not for neatness." }
  ],
  checks:[
    "A client wants an agent where a pipeline would do. How do you advise?",
    "Name the four architectural patterns and when each fits.",
    "What's missing from a design that has no feedback loop?",
    "Why separate agents by privilege rather than by convenience?"
  ]
},

{ exam: "CCAR-P", d: "p3", mins: 9,
  big: "This domain is about designing the measurement, not running it: what you measure, on what data, and how you would know you were wrong.",
  sections:[
    { h: "Metrics",
      body:[
        "Evaluation conversations gravitate toward accuracy because it is the easiest thing to talk about, and a system that is accurate while being too slow, too expensive or unsafe under adversarial input is not a system anyone can ship. The blueprint names five dimensions, and the point of naming them is that each one fails differently.",
        { key: "The named set is <strong>accuracy, latency, cost, safety and security</strong>. A design measured only on accuracy is incomplete by the blueprint's own definition." },
        "Each of the five also has a characteristic way of being measured badly, usually by taking an average that conceals what you needed to know. The right-hand column below is the part worth remembering:",
        { table:[
          ["Metric", "The trap"],
          ["Accuracy", "Aggregate hides per-segment failure"],
          ["Latency", "Average hides the tail — use percentiles"],
          ["Cost", "Per token misleads — measure per completed task"],
          ["Safety", "Needs adversarial cases, not typical ones"],
          ["Security", "Tested by attempting misuse, not by reading config"]
        ]},
        "The cost row is the one that most often inverts a decision. Price per token makes a cheaper tier look obviously better, and then that tier needs a longer prompt to get the same result, or fails often enough that retries double the real call volume. Measured per completed task, the cheap option is sometimes the expensive one.",
        { key: "Cost per <strong>completed task</strong>. A cheaper model needing retries or longer prompts can cost more overall." }
      ]},
    { h: "Datasets and mixed methodology",
      body:[
        "No single evaluation method is sufficient on its own, which is why mature setups run several. Each of the four below is strong exactly where another is weak, and the weakness column is what tells you which to combine.",
        { table:[
          ["Method", "Good for", "Weakness"],
          ["Human labeling", "Ground truth", "Slow; inconsistent without a rubric"],
          ["Model-as-judge", "Scale on open-ended output", "Drifts without a rubric; shares blind spots"],
          ["Golden set", "Regression detection", "Only covers what you thought to include"],
          ["Production sampling", "The real distribution", "Lags; needs labeling after the fact"]
        ]},
        "The usual combination is a golden set for fast regression checking, a model judge to scale scoring on open-ended output, and a human-labeled sample to keep the judge honest. Without that last piece the judge's own error rate is unknown, and a judge sharing the generator's blind spots will score a systematic mistake as correct every time.",
        { key: "A set built from <strong>imagined</strong> cases is reliably narrower than reality. Seed from production traffic and add every new failure permanently." },
        { warn: "A suite that passes while users complain is measuring the wrong thing. That mismatch is a signal to rebuild the set, not to doubt the complaints." },
        "Calibrating the judge deserves more care than it usually gets, because the obvious procedure proves less than it appears to. You score a sample by hand, compare, and report the agreement rate — and what that establishes depends entirely on which cases you sampled.",
        { key: "A judge <strong>calibrated on the same distribution it scores</strong> cannot reveal a blind spot it shares with the generator. Both are wrong in the same direction, so they agree, and the agreement reads as accuracy." },
        "Two habits make calibration mean something. Sample deliberately across the cases the judge marked as failures as well as passes, because agreement on easy passes is the cheap half. And re-calibrate when either model version moves, since the agreement rate was measured against behavior that has since changed.",
        { why:{ q: "If human labels are the ground truth, why not score everything by hand?",
          a: "Cost and consistency, in that order. Hand-scoring a suite large enough to catch regressions is expensive enough that it stops happening, and a suite that stops running detects nothing. Humans are also less consistent than a judge with a rubric — the same reviewer scores differently on a Friday, and two reviewers disagree on the ambiguous cases that matter most. The practical arrangement uses the judge for coverage and human labels for a sample, which buys scale from one and a known error rate from the other." } }
      ]},
    { h: "A/B testing and optimization",
      body:[
        { key: "Change <strong>one thing</strong> and measure on the same fixed set. Changing prompt and model together tells you something moved, not what." },
        "Each of these can shift behavior while looking locally safe, so each needs re-validation: a cheaper tier, a shortened prompt, enabling caching, a schema change.",
        { key: "Pin the model version and run the regression suite <strong>before</strong> promoting a new one. That pairing makes an upgrade a decision rather than an event." },
        "Note which optimizations are behavior-neutral and which are not. Enabling <strong>prompt caching</strong> changes cost and latency but not what the model is asked, so it is the one lever that does not by itself need re-scoring; dropping to a cheaper tier, shortening the system prompt, or changing an output schema all change what comes back and must be re-validated on the fixed set.",
        { key: "Keep the previous version deployable. A pinned version, a stored eval baseline and a <strong>rollback</strong> path turn a bad upgrade into a reversal instead of an incident." }
      ]},
    { h: "Diagnosing system issues",
      body:[
        { table:[
          ["Symptom", "Cause", "Fix"],
          ["Inconsistent format, vague output", "Prompt failure", "Explicit criteria, examples, schema"],
          ["Confident invented detail", "Hallucination", "Ground in retrieved context; validate"],
          ["Fine on easy, fails on hard", "Model mismatch", "Right-size the tier"],
          ["Wrong after a data change", "Upstream pipeline", "Check retrieval and indexing, not the model"]
        ]},
        { key: "Isolate the layer first: <strong>integration or model output</strong>? Misdiagnosing that costs the most time." }
      ]}
  ],
  confusions:[
    { a: "Accuracy alone", b: "The full metric set", split: "Latency, cost, safety and security are named alongside it." },
    { a: "Cost per token", b: "Cost per completed task", split: "Retries and prompt overhead can invert the comparison." },
    { a: "Prompt failure", b: "Model mismatch", split: "Vague output versus capable-on-easy-fails-on-hard." }
  ],
  checks:[
    "Name the five metric categories the blueprint lists.",
    "Evals pass and users complain. What's wrong, and what do you do?",
    "What must happen before promoting a new model version?",
    "Distinguish prompt failure, hallucination and model mismatch by symptom."
  ]
},

{ exam: "CCAR-P", d: "p7", mins: 12,
  big: "The smallest Professional domain, and it is about consistency at organisational scale rather than individual configuration.",
  sections:[
    { h: "Configuring for teams",
      body:[
        "Imagine two teams in the same company, both using Claude Code, getting noticeably different results from similar work. The instinct is to look at the people — who has had training, who writes better prompts. That instinct is almost always wrong. What differs is what each team's environment actually loads: one repository has a committed configuration file and the other does not, or they have drifted apart since someone edited one of them.",
        "This is why the domain is about configuration rather than instruction. You cannot make an organization consistent by telling people to be consistent. You make it consistent by shipping the thing that produces the behavior, so that it applies whether or not anyone remembers it.",
        { key: "Consistency has to be <strong>structural</strong>. Shared committed configuration, not a document describing what people should do." },
        "There are four places that configuration can live, and they differ in one way that matters more than any other: whether a developer can switch them off. Reading the table below, pay attention to the last column rather than the first — that is the column that decides where a given rule belongs.",
        { table:[
          ["Mechanism", "Scope", "Can a developer disable it?"],
          ["Committed project config", "The repository", "Yes, with commit access"],
          ["Path-scoped rules", "Matching files repo-wide", "Yes"],
          ["Hooks", "Tool lifecycle events", "Yes, if in the repo"],
          ["Managed settings", "Organization-wide", "No"]
        ]},
        "The first three all live in the repository, which makes them easy to ship, easy to review and easy to change — and editable by anyone who can commit. That is usually exactly what you want. A team should be able to adjust its own conventions without filing a ticket. But it means none of them can carry a rule that must hold even when someone is in a hurry and under pressure, because the fastest way past a hook that is slowing you down is to delete the hook.",
        { key: "If a rule must survive a determined developer in a hurry, it belongs in the <strong>managed layer</strong>. Anything in the repo is editable by anyone with commit access." },
        "In practice most rules do not need the managed layer, and putting everything there is its own failure — it makes the configuration rigid, centralizes decisions that teams should own, and generates pressure to work around the whole system. Reserve it for the genuine non-negotiables, usually the ones with a security or compliance reason behind them, and let the repository carry the rest.",
        { exam: "Inconsistent behavior across teams almost always traces to inconsistent configuration. Compare what each team actually loads before investigating people or process." },
        { key: "Rolling <strong>Claude Code</strong> out across an engineering organization is a configuration problem before it is a training problem: committed project settings, path-scoped rules, hooks for the non-negotiables, and managed policy for anything that must not be editable locally." },
        { why:{ q: "Why is a shared document not enough on its own?",
          a: "Because a document only works through memory and goodwill, and both fail under deadline pressure — which is precisely when you most want the convention to hold. A document also has no way of knowing whether it is being followed: compliance is invisible until something breaks. Committed configuration inverts both problems. It applies on a fresh clone with nobody thinking about it, and if someone changes it the change is a diff that shows up in review. The document is still worth writing, but as an explanation of why the configuration is the way it is, not as the mechanism." } }
      ]},
    { h: "Improving workflows",
      body:[
        "There is a simple test for whether a team's configuration is complete, and it costs nothing to run: clone the repository fresh, as a new joiner would, and see whether Claude behaves correctly without anyone explaining anything. Every correction you find yourself making verbally is a gap — a piece of knowledge that currently lives in your head and reaches the tool only when you happen to be present.",
        "A fresh clone should produce correct behavior with no manual setup. Anything a new joiner must be told verbally is a gap in the configuration.",
        "This reframes rollout work usefully. Instead of asking 'have we trained everyone', you ask 'what does someone still have to be told'. The second question has a finite answer you can work through, and each item you close stays closed for everyone who arrives afterwards.",
        { key: "Ship configuration that <strong>applies</strong> the convention, rather than documentation describing it. Documents describe practice; committed config produces it." },
        { warn: "Mandating conventions without shipping the configuration is the most common rollout failure — it produces compliance theatre and quiet drift." }
      ]},
    { h: "Measuring whether it helped",
      body:[
        "Once a rollout is underway someone will ask whether it worked, and the measure you reach for shapes the answer you get. The tempting metrics are the ones that are easy to collect — how many developers are using it, how much code it generated, how many times it was invoked. These are all activity, not benefit, and a rollout can score well on every one of them while delivering nothing.",
        { warn: "Volume metrics (lines generated, invocations) reward activity rather than results, and optimizing for them actively misleads." },
        "What you want instead is whether the work got better or faster: cycle time on comparable tasks, defect rates, how long review takes. These are harder to attribute and worth the trouble, because they are the things the rollout was supposed to improve. Pair them with what developers actually say about the experience, which is the only way to catch the failure where the numbers improve and people are quietly unhappy.",
        { key: "Track <strong>outcomes</strong> — cycle time, defect rates — alongside developer-reported experience. Both halves, because numbers miss friction and surveys miss regressions." },
        { why:{ q: "Why pair quantitative outcomes with qualitative feedback?", a: "Cycle time can improve while developers quietly hate the workflow and route around it, which shows up months later as abandonment rather than as a metric. Conversely, people can report enjoying a tool that measurably slows them down. Each measure catches the other's blind spot, and a rollout decision made on only one of them is usually revisited." } }
      ]}
  ],
  confusions:[
    { a: "Documented convention", b: "Enforced convention", split: "A document describes practice; committed config and hooks produce it." },
    { a: "Repo configuration", b: "Managed layer", split: "Repo config is editable by anyone with commit access." },
    { a: "Lines generated", b: "Cycle time and defects", split: "Volume rewards activity; outcomes measure results." }
  ],
  checks:[
    "Teams report inconsistent behavior. What's the first diagnostic?",
    "Where does a rule go that developers must not be able to disable?",
    "What should a fresh clone produce?",
    "How do you measure whether the rollout helped?"
  ]
}
];

/* Flashcards — atomic facts worth drilling to automaticity.
 * Separate from notes because recall benefits from repetition, not re-reading.
 * Version-sensitive values carry volatile:true. */
const CARDS = [
  // CCAR-F D1
  { exam:"CCAR-F", d:"d1", f:"The seven stop_reason values", b:"end_turn · tool_use · max_tokens · stop_sequence · pause_turn · refusal · model_context_window_exceeded" },
  { exam:"CCAR-F", d:"d1", f:"Loop terminates when…", b:"The model produces a closing text turn — not when a tool result arrives." },
  { exam:"CCAR-F", d:"d1", f:"Side effect + retries/forks → ?", b:"Idempotency key at the tool layer. Reordering doesn't prevent a repeat." },
  { exam:"CCAR-F", d:"d1", f:"Iteration cap belongs where?", b:"The orchestration loop's own code — it's loop-level state, not per-tool-call." },
  { exam:"CCAR-F", d:"d1", f:"Subagent crashes — orchestrator does what?", b:"Catches it and returns a structured tool_result with success:false and an error description." },
  { exam:"CCAR-F", d:"d1", f:"Escalate to a human when…", b:"Explicit request · out of scope · tools exhausted. Not 'user seems frustrated'." },
  { exam:"CCAR-F", d:"d1", f:"Parallel subagent spawns: one response or several turns?", b:"One response fans out concurrently. Separate turns run sequentially." },
  { exam:"CCAR-F", d:"d1", f:"Evaluator–optimizer signature", b:"Generate → critique → loop back until it passes. Needs an iteration cap." },
  { exam:"CCAR-F", d:"d1", f:"Orchestrator–worker vs parallelization", b:"Who decides subtasks: coordinator at runtime vs known in advance." },

  // CCAR-F D2
  { exam:"CCAR-F", d:"d2", f:"Three required tool definition fields", b:"name · description · input_schema" },
  { exam:"CCAR-F", d:"d2", f:"Fields of a tool_use block", b:"id · type · name · input (what comes back, not what you send)" },
  { exam:"CCAR-F", d:"d2", f:"Misrouting — first fix?", b:"Rewrite the description with when-to-use and when-NOT. Not temperature, not more tools." },
  { exam:"CCAR-F", d:"d2", f:"Four tool_choice values", b:"auto (may skip) · any (some tool) · tool (named) · none" },
  { exam:"CCAR-F", d:"d2", f:"Guaranteed schema shape → which tool_choice?", b:"The named form. 'any' guarantees presence, not shape." },
  { exam:"CCAR-F", d:"d2", f:"Two standard MCP transports", b:"stdio (local) and Streamable HTTP (remote). Not WebSocket; SSE folded into HTTP." },
  { exam:"CCAR-F", d:"d2", f:"MCP message format", b:"JSON-RPC 2.0 over UTF-8" },
  { exam:"CCAR-F", d:"d2", f:"MCP primitives", b:"Tools (model-invoked, side effects) · Resources (client-controlled, read-only, URI) · Prompts" },
  { exam:"CCAR-F", d:"d2", f:"Restrict an existing destructive MCP tool", b:"Client-side allowlist/denylist. You cannot reclassify a Tool as a Resource." },
  { exam:"CCAR-F", d:"d2", f:"Returning N parallel tool results", b:"All in ONE user message, results first, each with matching tool_use_id." },
  { exam:"CCAR-F", d:"d2", f:"Tool returns zero matches — error?", b:"No. Source reached, zero results = valid success. Do not retry." },
  { exam:"CCAR-F", d:"d2", f:"How a tool signals failure", b:"tool_result with is_error and a structured, instructive body. Never an exception." },

  // CCAR-F D3
  { exam:"CCAR-F", d:"d3", f:"Which hook exit code blocks?", b:"Only 2. Exit 0 = success; any other non-zero = non-blocking error, action proceeds." },
  { exam:"CCAR-F", d:"d3", f:"Can PostToolUse block?", b:"No — the tool already ran. Exit 2 only surfaces stderr for self-correction." },
  { exam:"CCAR-F", d:"d3", f:"Settings precedence, high → low", b:"Managed → CLI args → Local → Project → User. Permission rules merge." },
  { exam:"CCAR-F", d:"d3", f:"allow vs deny conflict", b:"Deny wins." },
  { exam:"CCAR-F", d:"d3", f:"How do CLAUDE.md files combine?", b:"Concatenated broad → specific. Closer tends to win; no hard override." },
  { exam:"CCAR-F", d:"d3", f:"Guarantee lint runs after every edit", b:"PostToolUse hook matching the edit/write tools. Not CLAUDE.md." },
  { exam:"CCAR-F", d:"d3", f:"Rule developers can't disable → where?", b:"The managed/enterprise layer. Repo files are editable by anyone with commit access." },
  { exam:"CCAR-F", d:"d3", f:"CI job with -p hangs forever", b:"Waiting on a permission prompt. Pre-authorize tools / permission mode / allow rules." },
  { exam:"CCAR-F", d:"d3", f:"Conventions for every .tsx repo-wide", b:"A path-scoped rules file with a glob — loads only on matching files." },
  { exam:"CCAR-F", d:"d3", f:"Headless CI needs which three?", b:"Non-interactive mode + structured output format + pre-authorized permissions." },

  // CCAR-F D4
  { exam:"CCAR-F", d:"d4", f:"Only way to guarantee schema-valid output", b:"Forced tool call or a structured output schema. Prefill/few-shot are probability only." },
  { exam:"CCAR-F", d:"d4", f:"Where does the system prompt go?", b:"Top-level system parameter — never a role inside messages." },
  { exam:"CCAR-F", d:"d4", f:"JSON Schema catches…", b:"Structure (types, required fields). NOT semantics like a negative amount." },
  { exam:"CCAR-F", d:"d4", f:"Validation retry cap", b:"~3 attempts, appending the error each time, then raise. Never return bad data." },
  { exam:"CCAR-F", d:"d4", f:"Caching prefix order", b:"tools → system → messages" },
  { exam:"CCAR-F", d:"d4", f:"Why did inserting a block before cached content miss?", b:"Caching is an exact prefix match — a change at/before the breakpoint invalidates all after." },
  { exam:"CCAR-F", d:"d4", f:"Cache write vs read cost", b:"Write costs MORE than base input (more for longer TTL); read is a small fraction. Neither is free.", volatile:true },
  { exam:"CCAR-F", d:"d4", f:"Prefix below the minimum length", b:"Caching is silently skipped — no error. Check length before debugging further.", volatile:true },
  { exam:"CCAR-F", d:"d4", f:"Few-shot: how many and where?", b:"2–5, in the system prompt (stable and cacheable). Diminishing returns after ~5." },
  { exam:"CCAR-F", d:"d4", f:"Reasoning tokens bill as…", b:"Output — and count against the total output ceiling alongside the visible answer." },

  // CCAR-F D5
  { exam:"CCAR-F", d:"d5", f:"Retryable status codes", b:"429 · 500 · 502/503 · 504 · 529 · connection errors" },
  { exam:"CCAR-F", d:"d5", f:"Never-retry status codes", b:"400 · 401 · 403 · 413. Same request fails identically." },
  { exam:"CCAR-F", d:"d5", f:"429 vs 529", b:"429 = your org's quota. 529 = system-wide overload; back off longer." },
  { exam:"CCAR-F", d:"d5", f:"Why jitter?", b:"Desynchronizes clients so they don't all retry at once — prevents a thundering herd." },
  { exam:"CCAR-F", d:"d5", f:"'Based on typical patterns' hedging means…", b:"Context saturation. Reduce input: compaction, scratchpad, fresh-context subagent." },
  { exam:"CCAR-F", d:"d5", f:"What shares the context budget?", b:"System + tool definitions + history + reasoning + room for the response." },
  { exam:"CCAR-F", d:"d5", f:"Tool call arguments over a stream", b:"Partial JSON fragments — accumulate, parse at content_block_stop." },
  { exam:"CCAR-F", d:"d5", f:"Does a 200 mean the stream succeeded?", b:"No — an error event can arrive mid-stream after a 200." },
  { exam:"CCAR-F", d:"d5", f:"Cross-session memory requires…", b:"Durable external storage loaded at session start. Context is per-session." },

  // CCDV-F
  { exam:"CCDV-F", d:"v1", f:"Dangling tool_use with no result", b:"Request rejected. Always append a result — marked as an error if the tool threw." },
  { exam:"CCDV-F", d:"v1", f:"Conversation exceeds the window — who trims?", b:"You do. The API rejects an over-budget request rather than trimming." },
  { exam:"CCDV-F", d:"v1", f:"Synchronous endpoint timing out under load", b:"Stream, or move to a background job returning a handle. Don't just raise the timeout." },
  { exam:"CCDV-F", d:"v1", f:"Log these three per call", b:"Request ID · stop_reason · token usage" },
  { exam:"CCDV-F", d:"v1", f:"SDK retry default", b:"Transient failures retried a couple of times with backoff. Don't stack your own on top blindly." },
  { exam:"CCDV-F", d:"v1", f:"Latency metric to track", b:"Percentiles, not averages — the tail is what users feel." },
  { exam:"CCDV-F", d:"v1", f:"Model version: alias or pinned?", b:"Pinned. An alias can shift behavior with no code change." },
  { exam:"CCDV-F", d:"v2", f:"Which costs more, input or output?", b:"Output — generation is sequential; input processes in parallel." },
  { exam:"CCDV-F", d:"v2", f:"Cost metric that matters", b:"Cost per completed task, not per token — retries and overhead can invert it." },
  { exam:"CCDV-F", d:"v2", f:"Are unused tool definitions free?", b:"No — sent and billed as input on every request whether called or not." },
  { exam:"CCDV-F", d:"v3", f:"Workflow vs agent", b:"Workflow = predefined path. Agent = model directs its own process and tool use." },
  { exam:"CCDV-F", d:"v3", f:"Repeated identical tool calls indicate…", b:"The result isn't advancing state. Break out, then fix what the tool returns." },
  { exam:"CCDV-F", d:"v6", f:"Durable prompt-injection defense", b:"External content is data, never instructions + constrain capability so injection can't do harm." },
  { exam:"CCDV-F", d:"v6", f:"Dangerous capability combination", b:"File read + network access = exfiltration path." },
  { exam:"CCDV-F", d:"v6", f:"Why isn't output filtering enough?", b:"Tool calls already executed during generation. Actions need execution-point controls." },
  { exam:"CCDV-F", d:"v6", f:"Who produces the audit trail?", b:"The execution layer. A model logging its own actions may omit or misdescribe them." },
  { exam:"CCDV-F", d:"v6", f:"Secrets in shared config", b:"Reference by environment variable name. A literal stays in git history after removal — rotate it." },
  { exam:"CCDV-F", d:"v6", f:"Multi-tenant isolation enforced where?", b:"The data layer — scoped credentials/queries. Never by instruction." },

  // CCDV-F v4 — Prompt & Context Engineering
  { exam:"CCDV-F", d:"v4", f:"Where does the system prompt go?", b:"Top-level system parameter. The messages array has no system role." },
  { exam:"CCDV-F", d:"v4", f:"First message in the array must be…", b:"A user turn. Turns alternate user/assistant." },
  { exam:"CCDV-F", d:"v4", f:"Stable vs per-request content", b:"Stable (persona, format, examples) → system, cacheable. Per-request data → messages." },
  { exam:"CCDV-F", d:"v4", f:"Prompt works short, fails long — fix?", b:"Delimit sections; restate the critical requirement after the bulk content." },
  { exam:"CCDV-F", d:"v4", f:"Is escaping quotes an injection defense?", b:"No — injection is semantic. Well-formed text can still carry instructions." },
  { exam:"CCDV-F", d:"v4", f:"Chain of thought — when not to?", b:"Simple lookups and classification. Adds latency and cost without accuracy." },

  // CCDV-F v5 — Tools and MCPs
  { exam:"CCDV-F", d:"v5", f:"Five-step tool flow", b:"Define → model decides → extract tool_use → YOUR code executes → return tool_result" },
  { exam:"CCDV-F", d:"v5", f:"Who executes tool code?", b:"Your app or the MCP server. The model only requests." },
  { exam:"CCDV-F", d:"v5", f:"Routing accuracy at ~40 tools", b:"Namespace names · consolidate behind an action param · defer loading descriptions." },
  { exam:"CCDV-F", d:"v5", f:"Optional schema field the op requires", b:"Mark it required. Optional means it will sometimes be omitted." },
  { exam:"CCDV-F", d:"v5", f:"Why MCP over inline tools?", b:"Build once in a server, many clients consume it; updates propagate on reconnect." },
  { exam:"CCDV-F", d:"v5", f:"MCP transports / format / primitives", b:"stdio + Streamable HTTP · JSON-RPC 2.0 + UTF-8 · Tools, Resources, Prompts" },

  // CCDV-F v7 — Claude Code
  { exam:"CCDV-F", d:"v7", f:"Which hook exit code blocks?", b:"Only 2. Exit 1 detects and logs but stops nothing." },
  { exam:"CCDV-F", d:"v7", f:"Can PostToolUse block?", b:"No — the tool already ran. Use PreToolUse to prevent." },
  { exam:"CCDV-F", d:"v7", f:"Settings precedence", b:"Managed → CLI args → Local → Project → User. Rules merge; deny beats allow." },
  { exam:"CCDV-F", d:"v7", f:"Non-interactive CI job hangs", b:"Blocked on a permission prompt. Pre-authorize tools / permission mode." },

  // CCDV-F v8 — Eval, Testing, Debugging
  { exam:"CCDV-F", d:"v8", f:"How do you know a prompt change helped?", b:"A fixed eval set with explicit criteria, run before and after. Spot-checks confirm bias." },
  { exam:"CCDV-F", d:"v8", f:"Evals pass but users complain — why?", b:"The set doesn't represent real usage. Sample production traffic." },
  { exam:"CCDV-F", d:"v8", f:"An eval set must include…", b:"Edge cases · past failures · adversarial input · real traffic samples." },
  { exam:"CCDV-F", d:"v8", f:"Model-as-judge caveats", b:"Needs an explicit rubric; same model family shares blind spots. Calibrate to human labels." },
  { exam:"CCDV-F", d:"v8", f:"Debugging an intermittent failure needs…", b:"Traces from failing runs: messages, tool calls+args, results, stop_reason, request ID." },
  { exam:"CCDV-F", d:"v8", f:"Why review in a fresh instance?", b:"Same session anchors on the reasoning that produced the answer." },

  // CCAR-F — added after verifying against the official exam guide (2026-10-27)
  { exam:"CCAR-F", d:"d3", f:"Plan mode is for…", b:"Large-scale multi-file changes · multiple valid approaches · architectural decisions. Direct execution for simple scoped changes." },
  { exam:"CCAR-F", d:"d3", f:"Skill frontmatter: the three options", b:"context: fork (isolated sub-agent) · allowed-tools (restrict access) · argument-hint (prompt for params)" },
  { exam:"CCAR-F", d:"d3", f:"What does context: fork do?", b:"Runs the skill in an isolated sub-agent context so its verbose output never enters the main conversation." },
  { exam:"CCAR-F", d:"d3", f:"Project vs personal slash commands", b:".claude/commands/ is version-controlled and shared; ~/.claude/commands/ is personal." },
  { exam:"CCAR-F", d:"d3", f:"@import in CLAUDE.md", b:"Inlines an external file, keeping memory modular instead of one monolith." },
  { exam:"CCAR-F", d:"d3", f:"/memory command", b:"Shows which memory/rule files actually loaded — first diagnostic when a rule 'isn't working'." },
  { exam:"CCAR-F", d:"d3", f:"CI structured output flags", b:"--output-format json for machine-parseable output; --json-schema to pin its shape." },
  { exam:"CCAR-F", d:"d1", f:"--resume vs fork_session", b:"--resume <name> continues a named session; fork_session branches from a shared baseline for divergent approaches." },
  { exam:"CCAR-F", d:"d1", f:"Resume or start fresh?", b:"Resume when prior context is mostly valid. Start fresh with an injected summary when tool results are stale." },
  { exam:"CCAR-F", d:"d1", f:"Hub-and-spoke coordination", b:"All subagent communication routes through the coordinator — for observability, consistent error handling, controlled information flow." },
  { exam:"CCAR-F", d:"d2", f:"Grep vs Glob", b:"Grep searches file CONTENTS; Glob matches file PATHS/names." },
  { exam:"CCAR-F", d:"d2", f:"Edit fails on non-unique text — fallback?", b:"Read the full file, then Write it back." },
  { exam:"CCAR-F", d:"d2", f:"Too many tools degrades what?", b:"Tool selection reliability — 18 tools instead of 4-5 increases decision complexity. Scope tools per agent role." },
  { exam:"CCAR-F", d:"d2", f:"MCP resources are useful for…", b:"Exposing content catalogs (issue summaries, doc hierarchies, schemas) so the agent doesn't need exploratory tool calls." },
  { exam:"CCAR-F", d:"d5", f:"Lost in the middle", b:"Models process the start and end of long inputs reliably and may omit the middle. Put key summaries first; use section headers." },
  { exam:"CCAR-F", d:"d5", f:"Aggregate accuracy risk", b:"97% overall can hide poor performance on one document type or field. Segment before reducing human review." },
  { exam:"CCAR-F", d:"d5", f:"Stratified random sampling is for…", b:"Ongoing error-rate measurement in high-confidence extractions, and catching novel failure patterns." },
  { exam:"CCAR-F", d:"d5", f:"Conflicting figures from credible sources", b:"Annotate both with attribution. Never arbitrarily pick one." },
  { exam:"CCAR-F", d:"d5", f:"Why require dates in structured subagent output?", b:"So temporal differences aren't misread as contradictions." },
  { exam:"CCAR-F", d:"d5", f:"Progressive summarization risk", b:"Condensing numbers, dates, and stated expectations into vague prose. Keep a persistent facts block outside the summary." },

  // CCAO-F and CCAR-P — added after reading their official exam guides
  { exam:"CCAO-F", d:"a1", f:"Fluent vs accurate", b:"Independent. Confident, polished output is exactly as likely to be wrong — polish is not evidence." },
  { exam:"CCAO-F", d:"a1", f:"Claude cites a subsection number", b:"Verify it against the official source before sharing. Citations fail two ways: source missing, or source real but doesn't say that." },
  { exam:"CCAO-F", d:"a1", f:"Is re-running the prompt verification?", b:"No — that tests stability. Two consistent answers can be consistently wrong. Check the source." },
  { exam:"CCAO-F", d:"a1", f:"Model's self-reported confidence", b:"Unreliable, and often highest on the cases it got wrong. Not an accuracy signal." },
  { exam:"CCAO-F", d:"a1", f:"Which claims always get checked?", b:"Specific figures and dates · named sources · recent events · anything you put your name to." },
  { exam:"CCAO-F", d:"a1", f:"How much review?", b:"Proportional to consequence. Ask what happens if this particular claim is wrong." },
  { exam:"CCAO-F", d:"a2", f:"Net value of automation", b:"Time saved − review time − cost of errors that slip through. Omitting review time is how bad automation looks good." },
  { exam:"CCAO-F", d:"a2", f:"Best first task to automate", b:"Frequent, easy to verify, cheap if wrong, well understood. NOT the most painful one — painful usually means ambiguous." },
  { exam:"CCAO-F", d:"a2", f:"Before automating anything", b:"Define what good output looks like, using two or three real past examples." },
  { exam:"CCAO-F", d:"a2", f:"A prompt in your chat history is…", b:"Not a workflow. Shared, versioned, with a defined review step is what makes it one." },
  { exam:"CCAO-F", d:"a3", f:"Can I upload customer records?", b:"Policy decides, not judgment. Redact or anonymize regulated identifiers first." },
  { exam:"CCAO-F", d:"a3", f:"\"Tell Claude not to retain it\"", b:"Not a control. The data was still sent. An instruction never satisfies a policy requirement." },
  { exam:"CCAO-F", d:"a3", f:"Does removing names anonymize data?", b:"Usually not — records are often re-identifiable from the remaining fields." },
  { exam:"CCAO-F", d:"a3", f:"What stays with the human?", b:"Accuracy, appropriateness, compliance, and the decision to act. The tool changes how work is made, not who owns it." },
  { exam:"CCAO-F", d:"a3", f:"Policy doesn't cover your case", b:"Ask, don't improvise. Record the gap, who can resolve it, and the answer." },
  { exam:"CCAO-F", d:"a5", f:"Pasting the same background every time", b:"Use a Project — instructions and knowledge sources load every session." },
  { exam:"CCAO-F", d:"a5", f:"High volume of short drafts, speed matters", b:"Faster, lower-cost tier. Defaulting to the most capable model wastes cost and latency budget." },
  { exam:"CCAO-F", d:"a5", f:"Answers gone vague, ignoring earlier detail", b:"Context saturation. Fresh conversation with the essentials restated — don't re-paste everything." },
  { exam:"CCAO-F", d:"a5", f:"Artifact vs inline", b:"Artifact for documents/code you'll keep, revise or share. Inline for short answers and iteration." },
  { exam:"CCAO-F", d:"a5", f:"Bigger context window means…", b:"More capacity, not better answers. It delays saturation rather than preventing it." },
  { exam:"CCAR-P", d:"p1", f:"Least privilege, concretely", b:"REMOVE the capability. Logging is detective; a confirmation prompt is compensating. Neither is least privilege." },
  { exam:"CCAR-P", d:"p1", f:"When does MCP beat a direct integration?", b:"Several applications need the same tools, maintained independently of any one app." },
  { exam:"CCAR-P", d:"p1", f:"Capability bloat", b:"Too many tools degrades selection accuracy AND widens the security surface. Scope per role." },
  { exam:"CCAR-P", d:"p1", f:"Confident wrong answers after a doc refresh", b:"Retrieval — stale index or mismatched embeddings. Model version and latency unchanged rules out the model." },
  { exam:"CCAR-P", d:"p1", f:"Measure retrieval or answers first?", b:"Retrieval, separately. A bad answer from good context is a different bug." },
  { exam:"CCAR-P", d:"p1", f:"Observability at scale", b:"Request id, stop reason, tokens, latency on every call; sample content. Percentiles, never averages." },
  { exam:"CCAR-P", d:"p1", f:"Agent credentials vs user identity", b:"If the agent's reach exceeds the requester's entitlement, authorization is broken regardless of prompts." },
  { exam:"CCAR-P", d:"p4", f:"Consequential decision needs three things", b:"A named owner · a decision record · a route for the affected person to contest it." },
  { exam:"CCAR-P", d:"p4", f:"'Must never' / 'always' in a requirement", b:"Belongs in code, not the prompt. A probabilistic mechanism can't carry a deterministic guarantee." },
  { exam:"CCAR-P", d:"p4", f:"Injection mitigations that actually hold", b:"Narrow tools · gate irreversible actions outside the loop · separate untrusted content from the instruction channel. NOT 'tell it to ignore instructions'." },
  { exam:"CCAR-P", d:"p4", f:"Four risk dimensions", b:"Consequence · detectability · reversibility · availability." },
  { exam:"CCAR-P", d:"p4", f:"Sensitive data must not reach logs", b:"Redact or tokenize BEFORE the call and configure what the integration records. Policy alone isn't a control." },
  { exam:"CCAR-P", d:"p4", f:"Why a version change is a governance event", b:"Behavior can shift on the edge cases your safeguards were tuned against — re-validate the safety cases, not just accuracy." },
  { exam:"CCAR-P", d:"p3", f:"Model-as-judge caveats", b:"Needs an explicit rubric or it drifts; same model family shares blind spots. Calibrate to human labels." },
  { exam:"CCAR-P", d:"p3", f:"Before promoting a new model version", b:"Pin versions and run the regression suite first. Otherwise an upgrade is an event, not a decision." },
  { exam:"CCAR-P", d:"p3", f:"Prompt failure vs model mismatch", b:"Vague/inconsistent output = prompt. Fine on easy, fails on hard = tier mismatch." },
  { exam:"CCAR-P", d:"p4", f:"Strongest governance answer", b:"Layered controls — input validation, constrained capability, output filtering, human review, audit logging." },
  { exam:"CCAR-P", d:"p4", f:"Who produces the audit trail?", b:"The execution layer. A model logging its own actions may omit or misdescribe — the exact failure audits exist to catch." },
  { exam:"CCAR-P", d:"p4", f:"When is an approval gate a real control?", b:"When the approver has information, time and authority to refuse. Otherwise it's decoration." },
  { exam:"CCAR-P", d:"p4", f:"Reproducibility — what can you promise?", b:"Reconstructability: logged inputs, version, output, approver. Not bit-identical regeneration." },
  { exam:"CCAR-P", d:"p4", f:"Compliant vs fair", b:"Separate objectives. A system can be fully compliant and still biased or unfair." },
  { exam:"CCAR-P", d:"p5", f:"Stakeholder wants one accuracy number", b:"Give it WITH its distribution and the cost of a failure. One number hides which segments fail." },
  { exam:"CCAR-P", d:"p5", f:"Defensible cost projection", b:"A range with its drivers named — context growth, cache hit rate, tier mix, retries, review effort. Not pilot cost × volume." },
  { exam:"CCAR-P", d:"p5", f:"SLA: what you can't commit to", b:"Per-request correctness. You CAN commit to availability, latency percentiles, and measured accuracy on a stated eval set." },
  { exam:"CCAR-P", d:"p5", f:"Complaints rise, nothing changed", b:"Nothing in YOUR system changed. Inputs drifted or the model version moved. That's why measurement is continuous." },
  { exam:"CCAR-P", d:"p5", f:"Does it improve on its own?", b:"No. Nothing improves without someone measuring, changing and re-evaluating. Promising self-improvement is a common overreach." },
  { exam:"CCAR-P", d:"p5", f:"Who owns the prompt long term?", b:"The team that owns the service — they see the traffic and can change the system. Not the original engineer, not a central function." },
  { exam:"CCAR-P", d:"p5", f:"What makes an ADR useful later?", b:"Rejected options with their genuine advantages, the negative consequences, and what would reverse the decision." },
  { exam:"CCAR-P", d:"p5", f:"Pilot succeeded — ready to scale?", b:"Pilot conditions (motivated users, curated cases, team nearby) rarely hold. Re-validate under realistic conditions." },
  { exam:"CCAR-P", d:"p5", f:"Non-technical stakeholder version", b:"A different document, not a simplified one: cost, risk, timeline, and what you need from them." },
  { exam:"CCAR-P", d:"p6", f:"Several teams, several prompts, one task", b:"A shared parameterized prompt with the variable parts injected. NOT a central team writing them all — that loses domain knowledge and bottlenecks." },
  { exam:"CCAR-P", d:"p6", f:"Consistency across tiers — enforced how?", b:"Hold the OUTPUT CONTRACT constant in code (schema, validation). Let the prompt vary per tier." },
  { exam:"CCAR-P", d:"p6", f:"The one behavior-neutral optimization", b:"Enabling prompt caching — same content is sent. Cheaper tier, shorter prompt, new schema and new version all need re-evaluation." },
  { exam:"CCAR-P", d:"p6", f:"Why heavy tuning doesn't transfer", b:"Much of it compensates for one version's quirks. On a new version some workarounds are unnecessary and a few actively hurt." },
  { exam:"CCAR-P", d:"p6", f:"Prompt decay", b:"Accumulated exceptions dilute the directives that still matter. Prune deliberately — stale instructions don't sit harmlessly." },
  { exam:"CCAR-P", d:"p6", f:"What breaks a cache hit rate", b:"Anything per-request before the breakpoint — timestamp, user id, reordered field. Matching is on an exact prefix." },
  { exam:"CCAO-F", d:"a4", f:"Three things that carry an instruction", b:"Audience · purpose · a concrete example of the output." },
  { exam:"CCAO-F", d:"a4", f:"Wrong output format — best fix", b:"Show one example of the exact shape. Beats any amount of describing it." },
  { exam:"CCAO-F", d:"a4", f:"Does emphasis help?", b:"No. Capitals and repetition add insistence without information." },
  { exam:"CCAO-F", d:"a4", f:"Why decompose a request?", b:"So you can check between steps. A bad early step otherwise poisons the final output." },
  { exam:"CCAO-F", d:"a4", f:"Analysis vs brainstorming prompts", b:"Opposite needs: one wants a single defensible answer, the other wants range. Say which." },
  { exam:"CCAO-F", d:"a6", f:"What does a Project give you?", b:"Instructions plus knowledge sources loaded into every conversation — no re-pasting, consistent across the team." },
  { exam:"CCAO-F", d:"a6", f:"Prompt or Project instructions?", b:"Is it true EVERY time? Then it's configuration, not a prompt." },
  { exam:"CCAO-F", d:"a6", f:"Risk of uploading everything", b:"Worse retrieval and a higher chance a stale document gets used as current. Curate." },
  { exam:"CCAO-F", d:"a6", f:"Connector risk", b:"It exposes whatever that account can reach. A data-sensitivity decision before a configuration one." },
  { exam:"CCAO-F", d:"a6", f:"Why does a Project need an owner?", b:"Configuration decays silently — conventions change, documents are superseded, copies fork." },
  { exam:"CCAO-F", d:"a7", f:"Prompt worked last month, not now", b:"Check whether the INPUTS changed. 'Similar' inputs often aren't." },
  { exam:"CCAO-F", d:"a7", f:"Vague, hedging output", b:"Either context saturation (start fresh) or no stated criteria (state them). Tell them apart before fixing." },
  { exam:"CCAO-F", d:"a7", f:"Same manual edit every run", b:"A missing instruction. Fold it in rather than fixing it by hand forever." },
  { exam:"CCAO-F", d:"a7", f:"Why not 'try a better model' first?", b:"It masks prompt problems, costs more permanently, and teaches you nothing about the cause." },
  { exam:"CCAO-F", d:"a7", f:"Review takes as long as the work", b:"Reconsider automating that step at all. A legitimate conclusion, not a failure." },
  { exam:"CCAR-P", d:"p2", f:"Four architectural patterns", b:"Augmented LLM · workflow · agentic · multi-agent. Prefer the simplest that meets the requirement." },
  { exam:"CCAR-P", d:"p2", f:"Client wants an agent, a pipeline would do", b:"Recommend the simpler design and name the tradeoffs: cost, predictability, debuggability." },
  { exam:"CCAR-P", d:"p2", f:"End-to-end means", b:"input → processing → output → FEEDBACK LOOP. The last one separates a design from a demo." },
  { exam:"CCAR-P", d:"p2", f:"Decompose along which lines?", b:"Existing boundaries: data sensitivity, privilege, failure consequence, ownership." },
  { exam:"CCAR-P", d:"p2", f:"Why not one agent for several roles?", b:"It holds the union of all their privileges. One confused run reaches everything." },
  { exam:"CCAR-P", d:"p3", f:"Five metric categories", b:"Accuracy · latency · cost · safety · security." },
  { exam:"CCAR-P", d:"p3", f:"A/B testing rule", b:"Change ONE thing, measure on the same fixed set." },
  { exam:"CCAR-P", d:"p3", f:"Four eval methods and their weaknesses", b:"Human (slow) · model-judge (drifts, shared blind spots) · golden set (only what you imagined) · production sampling (lags)." },
  { exam:"CCAR-P", d:"p3", f:"Wrong after a data change", b:"Upstream pipeline — retrieval or indexing. Not the model." },
  { exam:"CCAR-P", d:"p7", f:"Rule developers can't disable", b:"Managed layer. Repo config is editable by anyone with commit access." },
  { exam:"CCAR-P", d:"p7", f:"Inconsistent behavior across teams", b:"Compare what configuration each team actually loads, before investigating people or process." },
  { exam:"CCAR-P", d:"p7", f:"Measuring a rollout", b:"Cycle time and defect rates PLUS developer-reported experience. Never lines generated or invocation counts." },
  { exam:"CCAR-P", d:"p7", f:"A fresh clone should…", b:"Produce correct behavior with no manual setup. Anything explained verbally is a config gap." }
];
