/* CCAO-F sub-skills, used as simulation objectives.
 *
 * Exam guide v1.1 weights only its seven domains, so these 27 sub-skills,
 * drawn from the skills each domain's description lists, carry no `weight`.
 * The results screen shows them beneath the domain breakdown, and the drill
 * picker offers them. `domain` is the internal domain id (see
 * data-exams.js), `questions` the bank ids that test it (tests/sim-test.js
 * checks none dangle).
 *
 * Loaded after data-sim-objectives-dv.js.
 */
SIM_OBJECTIVES.push(
{"id":"AO-1.1","exam":"CCAO-F","domain":"a4","name":"Effective prompts","text":"Write effective prompts for business and technical tasks: audience, purpose, constraints and the facts to include.","questions":["AO-001","AO-005"]},
{"id":"AO-1.2","exam":"CCAO-F","domain":"a4","name":"Decomposing requests","text":"Break complex requests into steps whose outputs can be checked before the next builds on them.","questions":["AO-002","AO-006"]},
{"id":"AO-1.3","exam":"CCAO-F","domain":"a4","name":"Iterating on prompts","text":"Improve prompts through targeted changes tested on representative examples.","questions":["AO-003","AO-007"]},
{"id":"AO-1.4","exam":"CCAO-F","domain":"a4","name":"Strategy by task type","text":"Adapt the prompting approach to analysis, research, drafting or brainstorming.","questions":["AO-004","AO-008"]},
{"id":"AO-2.1","exam":"CCAO-F","domain":"a1","name":"Accuracy and completeness","text":"Check outputs for factual accuracy and for missing information.","questions":["AO-011","AO-016","AO-021"]},
{"id":"AO-2.2","exam":"CCAO-F","domain":"a1","name":"Hallucination, inconsistency and bias","text":"Spot fabricated details, internal contradictions and biased language.","questions":["AO-010","AO-012","AO-015","AO-019"]},
{"id":"AO-2.3","exam":"CCAO-F","domain":"a1","name":"Fact-checking and human review","text":"Verify claims against sources and decide when a person must review.","questions":["AO-009","AO-014","AO-018"]},
{"id":"AO-2.4","exam":"CCAO-F","domain":"a1","name":"Audience, comparison and format","text":"Edit and compare outputs for the target audience and choose the output format.","questions":["AO-013","AO-017","AO-020"]},
{"id":"AO-3.1","exam":"CCAO-F","domain":"a5","name":"Choosing features","text":"Choose among chat, Projects, Research and artifacts for a task.","questions":["AO-024","AO-025","AO-027"]},
{"id":"AO-3.2","exam":"CCAO-F","domain":"a5","name":"Choosing models","text":"Distinguish Haiku, Sonnet and Opus and match them to cost, speed and quality needs.","questions":["AO-022","AO-023"]},
{"id":"AO-3.3","exam":"CCAO-F","domain":"a5","name":"Context and memory limits","text":"Manage context limits: when to restart, summarize or persist information.","questions":["AO-026","AO-028"]},
{"id":"AO-4.1","exam":"CCAO-F","domain":"a2","name":"Analyzing requirements","text":"Analyze requirements and use cases before designing a solution.","questions":["AO-029","AO-035"]},
{"id":"AO-4.2","exam":"CCAO-F","domain":"a2","name":"Research, planning and process improvement","text":"Use Claude for research, planning and process optimization.","questions":["AO-032","AO-037"]},
{"id":"AO-4.3","exam":"CCAO-F","domain":"a2","name":"Integrating into workflows","text":"Design and iterate workflows that integrate Claude with appropriate review.","questions":["AO-031","AO-034"]},
{"id":"AO-4.4","exam":"CCAO-F","domain":"a2","name":"Communicating value and limits","text":"Explain Claude's value and limitations to stakeholders honestly.","questions":["AO-030","AO-036"]},
{"id":"AO-4.5","exam":"CCAO-F","domain":"a2","name":"Organizing information","text":"Organize information and pick output formats for how it will be used.","questions":["AO-033","AO-038"]},
{"id":"AO-5.1","exam":"CCAO-F","domain":"a6","name":"Projects: instructions and knowledge","text":"Set up Projects with instructions and knowledge sources.","questions":["AO-039","AO-044"]},
{"id":"AO-5.2","exam":"CCAO-F","domain":"a6","name":"Uploads and connectors","text":"Manage uploads and connectors such as Google Drive and Gmail.","questions":["AO-040","AO-043"]},
{"id":"AO-5.3","exam":"CCAO-F","domain":"a6","name":"System-level instructions","text":"Write system-level instructions and know what Skills and similar configuration provide.","questions":["AO-042"]},
{"id":"AO-5.4","exam":"CCAO-F","domain":"a6","name":"Keeping configurations current","text":"Maintain Project instructions and knowledge as processes change.","questions":["AO-041","AO-045"]},
{"id":"AO-6.1","exam":"CCAO-F","domain":"a3","name":"Appropriate use","text":"Identify appropriate and inappropriate use cases and where oversight is required.","questions":["AO-047","AO-052"]},
{"id":"AO-6.2","exam":"CCAO-F","domain":"a3","name":"Data sensitivity and privacy","text":"Apply data-sensitivity, privacy and regulatory requirements.","questions":["AO-046","AO-049","AO-051","AO-054"]},
{"id":"AO-6.3","exam":"CCAO-F","domain":"a3","name":"Organizational AI policy","text":"Follow organizational AI policies, including approved tools and review rules.","questions":["AO-048","AO-053"]},
{"id":"AO-6.4","exam":"CCAO-F","domain":"a3","name":"Ethics","text":"Consider the ethical implications of AI use, such as deception.","questions":["AO-050"]},
{"id":"AO-7.1","exam":"CCAO-F","domain":"a7","name":"Diagnosing problems","text":"Diagnose underperforming prompts, outputs and features from what changed.","questions":["AO-055","AO-058","AO-059"]},
{"id":"AO-7.2","exam":"CCAO-F","domain":"a7","name":"Adjusting from feedback","text":"Adjust based on feedback, one change at a time.","questions":["AO-056"]},
{"id":"AO-7.3","exam":"CCAO-F","domain":"a7","name":"Optimizing workflows","text":"Improve efficiency without adding unnecessary complexity or removing oversight.","questions":["AO-057","AO-060"]}
);
