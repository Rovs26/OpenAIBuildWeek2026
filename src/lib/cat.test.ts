import {
  estimate,
  itemInformation,
  itemProbability,
  levelBand,
  nextItem,
} from "./cat";
import type { Item } from "./types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function nearlyEqual(actual: number, expected: number, tolerance = 1e-9): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function makeItem(
  id: string,
  difficulty: number,
  discrimination = 1.2,
): Item {
  return {
    id,
    format: "see-word",
    language: "en",
    prompt: id,
    choices: [
      { id: "a", emoji: "✅" },
      { id: "b", emoji: "❌" },
      { id: "c", emoji: "❓" },
    ],
    correctChoiceId: "a",
    difficulty,
    discrimination,
  };
}

const pool = Array.from({ length: 16 }, (_, index) =>
  makeItem(`item-${String(index).padStart(2, "0")}`, -2.25 + index * 0.3),
);

function responsesThrough(count: number, correct: (index: number) => boolean) {
  return pool.slice(0, count).map((item, index) => ({
    itemId: item.id,
    correct: correct(index),
  }));
}

function testEapEstimation(): void {
  const empty = estimate(pool, []);
  assert(nearlyEqual(empty.theta, 0), "empty history returns the prior mean");
  assert(nearlyEqual(empty.standardError, 1), "empty history returns prior SD");

  const allCorrect = estimate(pool, responsesThrough(10, () => true));
  assert(allCorrect.theta > 1, "ten correct answers raise theta above +1");
  assert(Number.isFinite(allCorrect.standardError) && allCorrect.standardError > 0, "all-correct SE is finite");

  const allWrong = estimate(pool, responsesThrough(10, () => false));
  assert(allWrong.theta < -1, "ten incorrect answers lower theta below -1");
  assert(Number.isFinite(allWrong.standardError) && allWrong.standardError > 0, "all-wrong SE is finite");

  const oneResponse = estimate(pool, [{ itemId: pool[0].id, correct: true }]);
  assert(Number.isFinite(oneResponse.theta) && Number.isFinite(oneResponse.standardError), "one response remains finite");

  const centeredPool = Array.from({ length: 10 }, (_, index) =>
    makeItem(`center-${index}`, 0),
  );
  const alternating = centeredPool.map((item, index) => ({
    itemId: item.id,
    correct: index % 2 === 0,
  }));
  const alternatingEstimate = estimate(centeredPool, alternating);
  assert(Math.abs(alternatingEstimate.theta) < 0.2, "alternating answers remain near the prior");

  let previousStandardError = 1;
  for (let count = 1; count <= alternating.length; count += 1) {
    const current = estimate(centeredPool, alternating.slice(0, count));
    assert(
      current.standardError <= previousStandardError + 1e-9,
      "standard error shrinks monotonically for repeated centered evidence",
    );
    previousStandardError = current.standardError;
  }
}

function testProbabilityAndInformation(): void {
  const centered = makeItem("centered", 0, 1.2);
  const higherDifficulty = makeItem("harder", 1, 1.2);
  const lowerDiscrimination = makeItem("flat", 0, 0.8);
  const higherDiscrimination = makeItem("steep", 0, 1.6);
  const invalid = makeItem("invalid", 0, 0);

  const low = itemProbability(-4, centered);
  const high = itemProbability(4, centered);
  assert(low > 0 && low < 1 && high > 0 && high < 1, "probability stays strictly between zero and one");
  assert(high > low, "probability increases with theta");
  assert(itemProbability(0, higherDifficulty) < itemProbability(0, centered), "probability decreases as difficulty increases");
  assert(itemProbability(0.5, higherDiscrimination) > itemProbability(0.5, lowerDiscrimination), "higher discrimination is steeper above difficulty");
  assert(nearlyEqual(itemProbability(0, centered), 0.5), "probability is 0.5 at item difficulty");

  const atDifficulty = itemInformation(0, centered);
  const farAway = itemInformation(2, centered);
  assert(Number.isFinite(atDifficulty) && atDifficulty >= 0, "information is finite and nonnegative");
  assert(atDifficulty > farAway, "information is highest near item difficulty");
  assert(itemInformation(0, invalid) === 0, "invalid discrimination has zero information");
}

function testSelection(): void {
  const originalPool = JSON.stringify(pool);
  const first = nextItem(pool, []);
  assert(first !== null, "a non-empty pool selects an item");

  const responses = [{ itemId: first.id, correct: true }];
  const second = nextItem(pool, responses);
  assert(second !== null && second.id !== first.id, "nextItem never repeats an administered item");
  assert(JSON.stringify(pool) === originalPool, "nextItem does not mutate the item pool");

  const tied = [makeItem("z-item", -1), makeItem("a-item", 1)];
  const deterministic = nextItem(tied, []);
  assert(deterministic?.id === "a-item", "selection tie-breaks lexically by item id");

  const informationPool = [
    makeItem("far", 2, 1.2),
    makeItem("near", 0, 1.2),
    makeItem("high-discrimination", 0, 1.5),
  ];
  assert(
    nextItem(informationPool, [])?.id === "high-discrimination",
    "selection favors the remaining item with maximum Fisher information",
  );

  const exhausted = nextItem(pool, pool.map((item) => ({ itemId: item.id, correct: true })));
  assert(exhausted === null, "an exhausted pool returns null");

  const once = estimate(pool, [{ itemId: pool[0].id, correct: true }]);
  const duplicated = estimate(pool, [
    { itemId: pool[0].id, correct: true },
    { itemId: pool[0].id, correct: false },
  ]);
  assert(nearlyEqual(once.theta, duplicated.theta), "duplicate answers are ignored explicitly");
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function testDeterministicSimulation(): void {
  for (const [trueTheta, seed] of [[-1.5, 12], [0, 34], [1.5, 56]] as const) {
    const random = seededRandom(seed);
    const responses: { itemId: string; correct: boolean }[] = [];
    let priorError = 1;
    for (let count = 0; count < 15; count += 1) {
      const item = nextItem(pool, responses);
      assert(item !== null, "simulation has an unused item");
      assert(!responses.some((response) => response.itemId === item.id), "simulation never repeats items");
      responses.push({ itemId: item.id, correct: random() < itemProbability(trueTheta, item) });
      const ability = estimate(pool, responses);
      assert(Number.isFinite(ability.theta) && Number.isFinite(ability.standardError), "simulation remains finite");
      assert(ability.standardError <= priorError + 0.12, "simulation standard error is stable");
      priorError = ability.standardError;
    }
    const estimateAfterFifteen = estimate(pool, responses);
    if (trueTheta < 0) assert(estimateAfterFifteen.theta < 0.35, "low simulation trends low");
    if (trueTheta > 0) assert(estimateAfterFifteen.theta > -0.35, "high simulation trends high");
  }
}

function testPerformance(): void {
  const responses = responsesThrough(15, (index) => index % 2 === 0);
  const started = performance.now();
  for (let index = 0; index < 200; index += 1) {
    estimate(pool, responses);
    nextItem(pool, responses);
  }
  const averageMs = (performance.now() - started) / 200;
  assert(averageMs < 100, `CAT update stays below 100ms (measured ${averageMs.toFixed(3)}ms)`);
  console.log(`cat performance: ${averageMs.toFixed(3)}ms/update`);
}

function testBands(): void {
  assert(levelBand(-1.5001) === "Emerging", "below -1.5 is Emerging");
  assert(levelBand(-1.5) === "Beginning", "-1.5 is Beginning");
  assert(levelBand(-0.5001) === "Beginning", "below -0.5 is Beginning");
  assert(levelBand(-0.5) === "Developing", "-0.5 is Developing");
  assert(levelBand(0.4999) === "Developing", "below 0.5 is Developing");
  assert(levelBand(0.5) === "On Track", "0.5 is On Track");
}

function run(): void {
  testProbabilityAndInformation();
  testEapEstimation();
  testSelection();
  testDeterministicSimulation();
  testBands();
  testPerformance();
  console.log("cat.test.ts: all assertions passed");
}

run();
