/* Cross out an answer you have ruled out.
 *
 * Right-click an option to strike it through; right-click again to restore
 * it. The real Pearson VUE exam offers this and it is genuinely useful on a
 * four-option judgment question: you eliminate the two that cannot be right,
 * then argue between the two that remain.
 *
 * Deliberate choices:
 *
 * - Striking is a note to yourself, not an answer. A struck option stays
 *   clickable, because ruling something out and then changing your mind is
 *   exactly what the feature is for. It only looks demoted.
 * - State is keyed by question id and option key, so it survives re-renders
 *   (flagging, prev/next, the exam-mode selection repaint) without being
 *   threaded through either quiz's own state. It is deliberately NOT saved to
 *   localStorage: it is scratch working for the question in front of you, and
 *   a stale strike greeting you on a later attempt would be misleading.
 * - Grading clears the marks. Once the answer is on screen they are noise,
 *   and leaving a red strike next to the option marked correct reads as a
 *   contradiction.
 * - Right-click is not available to keyboard or touch users, so it is an
 *   accelerator rather than the only way in: the same toggle is on the
 *   keyboard, and a struck option is marked up for assistive tech.
 *
 * Used by both question types — the recall quiz in app.js and the exam
 * simulation in sim.js — so it lives in its own file rather than in either.
 */
'use strict';

/* qid -> Set of struck option keys. Cleared per question when it is graded,
   and wholly when a session ends. */
const STRIKES = Object.create(null);

function strikeKey(qid, key) {
  if (!STRIKES[qid]) STRIKES[qid] = new Set();
  return STRIKES[qid];
}
function isStruck(qid, key) { return !!STRIKES[qid] && STRIKES[qid].has(key); }
function toggleStrike(qid, key) {
  const set = strikeKey(qid, key);
  if (set.has(key)) set.delete(key); else set.add(key);
  return set.has(key);
}
function clearStrikes(qid) {
  if (qid == null) { Object.keys(STRIKES).forEach(k => delete STRIKES[k]); }
  else delete STRIKES[qid];
}

/** Paint one button to match the stored state. */
function applyStrike(btn, qid, key) {
  const on = isStruck(qid, key);
  btn.classList.toggle('struck', on);
  // Communicate it to assistive tech, which cannot see the line through it.
  if (on) btn.setAttribute('data-struck', 'true');
  else btn.removeAttribute('data-struck');
  const t = btn.querySelector ? btn.querySelector('.opttext') : null;
  if (t) {
    // Keep any existing description rather than clobbering it.
    const base = t.getAttribute ? (t.getAttribute('data-label') || '') : '';
    if (base) t.setAttribute('aria-label', on ? base + ' (ruled out)' : base);
  }
}

/** Re-apply strike styling to every option currently on screen. Called after
 *  a re-render that rebuilt or reset the buttons. */
function repaintStrikes(container, qid, keyOf) {
  if (!container || !container.querySelectorAll) return;
  const btns = container.querySelectorAll('.opt');
  for (let i = 0; i < btns.length; i++) {
    const k = keyOf(btns[i], i);
    if (k != null) applyStrike(btns[i], qid, k);
  }
}

/**
 * Wire one option button.
 *   btn   the <button class="opt">
 *   qid   question id, for scoping the strike
 *   key   stable identity of this option — the option key (A-D) in the
 *         simulation, the original option index in the recall quiz. Must not
 *         be the on-screen position, which changes when options shuffle.
 *   opts  { locked() } — true once the question is graded, when striking
 *         is pointless and the marks are cleared.
 */
function enableStrike(btn, qid, key, opts) {
  const o = opts || {};
  const locked = () => (typeof o.locked === 'function' ? o.locked() : false);

  applyStrike(btn, qid, key);

  btn.addEventListener('contextmenu', e => {
    e.preventDefault();          // no browser menu; this gesture is ours now
    e.stopPropagation();
    if (locked()) return;
    toggleStrike(qid, key);
    applyStrike(btn, qid, key);
  });

  // Keyboard equivalent, so this is not a mouse-only feature. The key is
  // chosen to avoid the number/letter keys the quiz already uses to pick an
  // option, and Backspace reads as "rule this out".
  btn.addEventListener('keydown', e => {
    if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'x' && e.key !== 'X') return;
    if (locked()) return;
    e.preventDefault();
    toggleStrike(qid, key);
    applyStrike(btn, qid, key);
  });
}
