# Contributing

Thanks for helping. This is a study aid, so the contribution that matters most
is the simplest one: telling us when an answer is wrong. A wrong answer teaches
the wrong thing to everyone who studies with it.

By taking part you agree to the [code of conduct](CODE_OF_CONDUCT.md).

## Never share real exam content

Every question here is original work written against the public exam guides.
Don't paste, paraphrase or describe questions you saw in a real sitting, in an
issue, a pull request or anywhere else in this repository. Doing so likely
breaks the exam's candidate agreement, and it would compromise the project.
Reporting that a *topic* came up is fine; reproducing a question is not.

## Reporting a wrong answer

[Open a "Wrong or unclear answer" issue](https://github.com/cjsharp1/anthropic-certification-trainer/issues/new?template=wrong-answer.yml).
The quickest way is the **Report a problem with this question** link under
any explanation: it opens the form with the question's id, the certification
and your trainer version already filled in. For a flashcard or note, which have
no id, paste its heading and say where you found it. Above all, include a source: a link to the Anthropic documentation or
exam guide that shows the right answer. A report with a source can be fixed
straight away; one without has to be researched first.

Claude Code and the API change quickly, so an answer that was right when it was
written can drift. Those reports are especially welcome.

## Reporting a bug or suggesting something

Use the [bug report](https://github.com/cjsharp1/anthropic-certification-trainer/issues/new?template=bug-report.yml) or
[suggestion](https://github.com/cjsharp1/anthropic-certification-trainer/issues/new?template=suggestion.yml) form. For a bug, say
which browser you used and which version of the trainer you have; it's at the
foot of the sidebar.

## Changing the code or content

The app is plain HTML and JavaScript with no dependencies, so there's nothing
to install. You need Node 18 or later for the build and tests.

```bash
npm run validate    # data integrity — run after any edit to src/data/
npm run check       # everything: validate, UI audit, HTML check, all test suites
```

`npm run check` must pass before a pull request is merged. Where things live:

- `app/index.html` is the app: markup, all CSS and the list of scripts.
- `src/app.js` and `src/sim.js` are the app logic.
- `src/data/` holds the question banks, notes, labs and flashcards.
- `docs/VERIFICATION.md` records how answers were checked against sources.

The README's [Adding questions](README.md#adding-questions) section gives the
question format. [CLAUDE.md](CLAUDE.md) is written for AI coding assistants,
but it's also the most compact summary of the project's conventions. A few
that reviews will check:

- **Answers rest on sources.** When a question involves the Claude API or
  Claude Code (model ids, flags, parameters, limits), check it against the
  current documentation rather than memory, and cite the page.
- **Questions name their subject.** A reader should understand the question
  without guessing at a missing diagram or context.
- **Distractors are parallel.** If the correct option is the longest and most
  precise, its length gives it away. Avoid "both" and "neither" options.
- **Comments explain why.** Code comments record the reason for a decision,
  often a bug that was already fixed. Read them before changing the code
  beneath them.
- **Tests explain the trap they pin.** If a test blocks an intended change,
  update the test and its explanation deliberately.

Keep a pull request to one change, and say in its description what changed for
the person studying.

## Releases

The maintainer cuts releases. Each one is a file colleagues are told to
download, so fixes are batched rather than released one at a time. You don't
need to bump the version in your pull request.
