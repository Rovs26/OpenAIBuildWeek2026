import assert from "node:assert/strict";
import test from "node:test";

import { computeWordMatchPct, normalizeWords } from "./scoring.mjs";

test("normalizes punctuation, casing, and Filipino characters", () => {
  assert.deepEqual(normalizeWords("Tumakbo ang aso!"), [
    "tumakbo",
    "ang",
    "aso",
  ]);
  assert.deepEqual(normalizeWords("HELLO, dog."), ["hello", "dog"]);
});

test("counts target words in order while allowing extra transcript words", () => {
  assert.equal(
    computeWordMatchPct("The dog runs.", "Well, the small dog runs fast!"),
    100
  );
});

test("credits only the target words that retain their relative order", () => {
  assert.equal(computeWordMatchPct("The dog runs.", "dog the runs"), 67);
});

test("returns partial and empty-target scores predictably", () => {
  assert.equal(computeWordMatchPct("Tumakbo ang aso.", "Tumakbo aso"), 67);
  assert.equal(computeWordMatchPct("", "anything spoken"), 0);
});

test("credits later target words when only a middle word is skipped", () => {
  assert.equal(computeWordMatchPct("The dog runs.", "The runs."), 67);
});
