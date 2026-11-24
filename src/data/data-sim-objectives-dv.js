/* CCDV-F sub-skills, used as simulation objectives.
 *
 * The exam guide v1.0 weights 25 sub-skills across its eight domains. The
 * real CCDV-F score report breaks results down by domain; these are the
 * finer grain the results screen shows beneath it, and what the objective
 * drill offers. `domain` is the internal domain id (see data-exams.js),
 * `weight` the guide's percentage, `questions` the bank ids that test it
 * (tests/sim-test.js checks none dangle).
 *
 * Loaded after data-sim-objectives.js, which declares SIM_OBJECTIVES.
 */
SIM_OBJECTIVES.push(
{"id":"DV-1.1","exam":"CCDV-F","domain":"v3","weight":4.5,"name":"Agent Architecture","text":"Principles, patterns and tradeoffs of agent and workflow architecture: when to use a workflow versus an agent, manager/supervisor hierarchies, and the role of subagents.","questions":["DV-001","DV-002","DV-003"]},
{"id":"DV-1.2","exam":"CCDV-F","domain":"v3","weight":5.3,"name":"Agent Construction with Claude","text":"Building Claude agents with the Agent SDK, custom agent loops and harnesses, self-hosted versus Anthropic-hosted deployment, and hooks for deterministic actions.","questions":["DV-004","DV-005","DV-006"]},
{"id":"DV-1.3","exam":"CCDV-F","domain":"v3","weight":4.9,"name":"Agent Patterns and Frameworks","text":"Tool-use loops, subagents, memory and context-window management, and agentic frameworks such as Strands, LangGraph and PydanticAI.","questions":["DV-007","DV-008","DV-009"]},
{"id":"DV-2.1","exam":"CCDV-F","domain":"v1","weight":3.4,"name":"Understanding Requirements","text":"Functional and infrastructure requirements derived from business requirements and solution architecture.","questions":["DV-010","DV-011"]},
{"id":"DV-2.2","exam":"CCDV-F","domain":"v1","weight":2.8,"name":"Systems Life Cycle","text":"Life-cycle management concepts used to develop, implement, operate and maintain systems.","questions":["DV-012","DV-013"]},
{"id":"DV-2.3","exam":"CCDV-F","domain":"v1","weight":6.8,"name":"Claude API Mechanics","text":"Messages, tools, streaming, vision, thinking, caching, third-party platforms, data access patterns, and realtime versus batch.","questions":["DV-014","DV-015","DV-016","DV-017"]},
{"id":"DV-2.4","exam":"CCDV-F","domain":"v1","weight":7.4,"name":"Software Engineering Foundations","text":"REST, JSON, async programming, version control, SDLC integration, code review and refactoring.","questions":["DV-018","DV-019","DV-020","DV-021"]},
{"id":"DV-2.5","exam":"CCDV-F","domain":"v1","weight":8.6,"name":"Claude Application Design","text":"How instructions are interpreted across interfaces, content boundaries, schema design, session hygiene and plugin management.","questions":["DV-022","DV-023","DV-024","DV-025","DV-026"]},
{"id":"DV-2.6","exam":"CCDV-F","domain":"v1","weight":4.1,"name":"Configuration Management","text":"CLAUDE.md, settings.json, model version pinning, prompt versioning and plugin dependencies.","questions":["DV-027","DV-028","DV-029"]},
{"id":"DV-3.1","exam":"CCDV-F","domain":"v7","weight":3.1,"name":"Claude Code Operation","text":"Rules, Skills, Commands, Agents, memory; sessions, slash commands, headless, streaming and auto modes; the CLAUDE.md hierarchy and settings.json.","questions":["DV-030","DV-031"]},
{"id":"DV-4.1","exam":"CCDV-F","domain":"v8","weight":2.6,"name":"Debugging and Error Handling","text":"Error types, recovery strategies, trace analysis, and isolating integration-layer from model-output problems.","questions":["DV-032","DV-033"]},
{"id":"DV-5.1","exam":"CCDV-F","domain":"v2","weight":5.2,"name":"LLM Fundamentals","text":"Tokens, context windows, sampling, non-determinism; fast mode, extended and adaptive thinking, effort; zero-, single- and multi-shot prompting.","questions":["DV-034","DV-035","DV-036"]},
{"id":"DV-5.2","exam":"CCDV-F","domain":"v2","weight":6.1,"name":"Technical Fundamentals","text":"Engineering practices such as SDKs that wrap REST APIs and websockets.","questions":["DV-037","DV-038","DV-039","DV-040"]},
{"id":"DV-5.3","exam":"CCDV-F","domain":"v2","weight":2.7,"name":"Model Selection and Tradeoffs","text":"Opus versus Sonnet versus Haiku, quality/latency/cost tradeoffs, and breaking changes across releases.","questions":["DV-041","DV-042"]},
{"id":"DV-5.4","exam":"CCDV-F","domain":"v2","weight":2.8,"name":"Cost and Token Management","text":"Token usage tracking, cost modeling, prompt caching and cache checkpointing.","questions":["DV-043","DV-044"]},
{"id":"DV-6.1","exam":"CCDV-F","domain":"v4","weight":3.8,"name":"Context Engineering","text":"Context window management, preventing drift and bloat (tool output pruning, compaction), and isolation through subagents.","questions":["DV-045","DV-046"]},
{"id":"DV-6.2","exam":"CCDV-F","domain":"v4","weight":4.6,"name":"Prompt Engineering","text":"Instruction clarity, few-shot examples, system versus user placement, output constraints, iterative refinement and input sanitization.","questions":["DV-047","DV-048","DV-049"]},
{"id":"DV-6.3","exam":"CCDV-F","domain":"v4","weight":2.6,"name":"Output Handling","text":"Structured output, response validation, defensive parsing and skepticism toward confident output.","questions":["DV-050","DV-051"]},
{"id":"DV-7.1","exam":"CCDV-F","domain":"v6","weight":3.2,"name":"AI Application Security","text":"Prompt injection, jailbreaks, untrusted input, data leakage, PII, and authentication and authorization.","questions":["DV-052","DV-053"]},
{"id":"DV-7.2","exam":"CCDV-F","domain":"v6","weight":2.3,"name":"Guardrails and Safe Deployment","text":"Content policy, guardrail layering and secure-by-design principles such as least privilege.","questions":["DV-054"]},
{"id":"DV-7.3","exam":"CCDV-F","domain":"v6","weight":1,"name":"Claude Hooks","text":"Hooks as guardrails that prevent destructive actions.","questions":["DV-055"]},
{"id":"DV-7.4","exam":"CCDV-F","domain":"v6","weight":1.6,"name":"Identity, Secrets, and Key Management","text":"Managing secrets, credentials and API keys across environments, and authorized access monitoring.","questions":["DV-056"]},
{"id":"DV-8.1","exam":"CCDV-F","domain":"v5","weight":4.4,"name":"Tool Implementation","text":"Function calling, tool descriptions, error handling, harness dispatch, client- versus server-side tools and approval patterns.","questions":["DV-057","DV-058","DV-059"]},
{"id":"DV-8.2","exam":"CCDV-F","domain":"v5","weight":2.1,"name":"MCP Server Development","text":"Authoring and deploying MCP servers; resources, tools and prompts; stdio and other transports.","questions":["DV-060"]},
{"id":"DV-8.3","exam":"CCDV-F","domain":"v5","weight":4.1,"name":"Agentic Customization","text":"Tradeoffs among built-in tools, custom tools, Skills and MCP servers.","questions":["DV-061","DV-062"]}
);
