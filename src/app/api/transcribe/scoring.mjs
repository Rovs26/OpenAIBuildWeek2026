// Deterministic scoring kept separate from the OpenAI request so that the
// child-facing behavior can be regression-tested without a network call.

export function normalizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Percentage of target words shared with the transcript in the same order.
// The longest common subsequence means a skipped word does not prevent later
// correctly read words from receiving credit.
export function computeWordMatchPct(targetText, transcript) {
  const target = normalizeWords(targetText);
  const said = normalizeWords(transcript);
  if (target.length === 0) return 0;

  let previous = Array(said.length + 1).fill(0);
  for (const targetWord of target) {
    const current = Array(said.length + 1).fill(0);
    for (let index = 1; index <= said.length; index++) {
      if (targetWord === said[index - 1]) {
        current[index] = previous[index - 1] + 1;
      } else {
        current[index] = Math.max(previous[index], current[index - 1]);
      }
    }
    previous = current;
  }
  return Math.round((previous[said.length] / target.length) * 100);
}
