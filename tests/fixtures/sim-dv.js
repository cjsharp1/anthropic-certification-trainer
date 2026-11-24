/* A synthetic CCDV-F simulation bank, for exercising domain-mode sittings,
 * multiple-response items and exhibits before any real CCDV-F questions are
 * imported.
 *
 * It lives in tests/fixtures/ because tools/run-tests.js runs only the files
 * directly in tests/: a helper there would be run as a suite of its own.
 *
 * The questions are placeholders in the real shape (see
 * docs/ccdv-f-handoff/sim-questions-set1.json): ids FX-<domain>-<n>, every
 * third one multi-select with five options and two correct, every fourth one
 * carrying an exhibit. One exhibit holds a <script> element on purpose, to
 * prove exhibits are rendered as text.
 */

// Each domain gets its 53-item share plus two spare, so a full paper never
// needs topping up unless a test removes questions to force it.
const PER_DOMAIN = { v1: 19, v2: 11, v3: 10, v4: 8, v5: 8, v6: 6, v7: 4, v8: 3 };

/* Sub-skill ids by internal domain id, two per domain, matching the
   DV-<guide domain>.<n> scheme. Enough to test the objective drill. */
const SKILL = {
  v3: ['DV-1.1', 'DV-1.2'], v1: ['DV-2.1', 'DV-2.3'], v7: ['DV-3.1', 'DV-3.1'],
  v8: ['DV-4.1', 'DV-4.1'], v2: ['DV-5.1', 'DV-5.2'], v4: ['DV-6.1', 'DV-6.2'],
  v6: ['DV-7.1', 'DV-7.3'], v5: ['DV-8.1', 'DV-8.2']
};

const SCRIPT_EXHIBIT = '<script>window.__pwned = true</script>\n<b>not bold</b> & "quoted"';

function questions() {
  const out = [];
  Object.keys(PER_DOMAIN).forEach(d => {
    for (let n = 1; n <= PER_DOMAIN[d]; n++) {
      const id = 'FX-' + d + '-' + String(n).padStart(2, '0');
      const multi = n % 3 === 0;
      const keys = multi ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
      out.push({
        id, exam: 'CCDV-F', set: 'fixture',
        format: multi ? 'multi_select' : 'single_select',
        select: multi ? 2 : 1,
        scn: null, domains: [d],
        objectives: [SKILL[d][n % 2]],
        stem: 'Fixture question ' + id + (multi ? '. Which TWO apply?' : '. Which one applies?'),
        exhibit: n % 4 === 0 ? {
          lang: d === 'v1' && n === 4 ? 'text' : 'python',
          title: d === 'v1' && n === 4 ? 'page.html' : 'snippet.py',
          body: d === 'v1' && n === 4 ? SCRIPT_EXHIBIT : 'resp = client.messages.create(model=MODEL)\nprint(resp.stop_reason)'
        } : null,
        options: keys.map(k => ({ key: k, text: 'Option ' + k + ' of ' + id,
                                  explanation: 'Why option ' + k + ' of ' + id }) ),
        correct: multi ? ['A', 'C'] : 'B',
        tiebreaker: 'Root cause',
        rationale: 'Rationale for ' + id,
        sources: [{ title: 'Fixture', url: 'https://example.com/', type: 'docs' }],
        note: null, volatile: false, contentDate: '2026-11-24'
      });
    }
  });
  return out;
}

function objectives() {
  const seen = new Set();
  const out = [];
  Object.keys(SKILL).forEach(d => SKILL[d].forEach(id => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, exam: 'CCDV-F', domain: d, weight: 1, name: 'Fixture skill ' + id,
               text: 'Fixture sub-skill ' + id, questions: [] });
  }));
  return out;
}

module.exports = { questions, objectives, PER_DOMAIN, SCRIPT_EXHIBIT };
