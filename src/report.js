/* Question references.
 *
 * Every explanation ends with the question's id and a link that opens the
 * repository's wrong-answer issue form already filled in. Without the id, a
 * report could only quote the question's opening words, and a quote can match
 * several questions or none once a stem is edited. The id is stable.
 *
 * Shared by the recall drills (app.js) and the Exam Simulation (sim.js), so
 * it is loaded before both and touches nothing until it is called.
 */
const REPORT_FORM = 'https://github.com/cjsharp1/anthropic-certification-trainer/issues/new';

/* The form's dropdowns prefill only on an exact option label, so these must
   match .github/ISSUE_TEMPLATE/wrong-answer.yml word for word. A code with no
   entry falls back to "Not sure" rather than leaving the field blank. */
const REPORT_EXAMS = {
  'CCAO-F': 'CCAO-F (Associate, Foundations)',
  'CCDV-F': 'CCDV-F (Developer, Foundations)',
  'CCAR-F': 'CCAR-F (Architect, Foundations)',
  'CCAR-P': 'CCAR-P (Architect, Professional)'
};

function reportVersion() {
  /* build.js writes "v1.3.0" into the sidebar slot. An unbuilt copy keeps
     its placeholder wording, which is worth passing on as is. (Don't quote
     that wording here: build-test checks the built file no longer has it.) */
  const slot = typeof document !== 'undefined' && document.querySelector('#appVer');
  const t = slot ? String(slot.textContent || '').trim() : '';
  return t.replace(/^v(?=\d)/, '');
}

/* where is the form's own label for the screen: "Drill", "Practice exam" or
   "Exam Simulation (CCAR-F)". stem may contain markup, so tags are stripped
   and the quote kept short; it is there for a human, the id is for finding. */
function reportUrl(id, stem, exam, where) {
  const plain = String(stem || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const quote = plain.length > 120 ? plain.slice(0, 117) + '...' : plain;
  const fields = {
    template: 'wrong-answer.yml',
    title: 'Wrong answer: ' + id,
    where: where,
    exam: REPORT_EXAMS[exam] || 'Not sure',
    question: id + '\n\n' + quote,
    version: reportVersion()
  };
  return REPORT_FORM + '?' + Object.keys(fields)
    .filter(k => fields[k])
    .map(k => k + '=' + encodeURIComponent(fields[k]))
    .join('&');
}

/* The line shown under an explanation. The id is selectable on its own, so a
   click copies exactly the id and not the label beside it. Built from
   elements only, no text nodes, so the test suites' DOM stubs can render it. */
function questionRef(id, stem, exam, where) {
  const span = (cls, txt) => {
    const s = document.createElement('span');
    if (cls) s.className = cls;
    s.textContent = txt;
    return s;
  };
  const wrap = document.createElement('div');
  wrap.className = 'qref muted small';
  wrap.appendChild(span(null, 'Question '));
  wrap.appendChild(span('qid', id));
  wrap.appendChild(span(null, ' · '));
  const a = document.createElement('a');
  a.href = reportUrl(id, stem, exam, where);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = 'Report a problem with this question';
  wrap.appendChild(a);
  return wrap;
}
