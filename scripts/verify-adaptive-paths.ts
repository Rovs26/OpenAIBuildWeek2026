import { estimate, levelBand, nextItem } from "../src/lib/cat";
import { itemBank } from "../src/lib/itemBank";

type Response = { itemId: string; correct: boolean };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function runScenario(name: string, answers: boolean[]): void {
  const responses: Response[] = [];
  const difficulties: number[] = [];
  const trace: string[] = [];

  for (const correct of answers) {
    const item = nextItem(itemBank, responses);
    assert(item, `${name}: expected an unused item`);
    assert(!responses.some((response) => response.itemId === item.id), `${name}: repeated ${item.id}`);
    responses.push({ itemId: item.id, correct });
    difficulties.push(item.difficulty);
    const ability = estimate(itemBank, responses);
    assert(Number.isFinite(ability.theta) && Number.isFinite(ability.standardError), `${name}: finite ability`);
    trace.push(`${item.id} b=${item.difficulty.toFixed(1)} ${correct ? "✓" : "✗"} θ=${ability.theta.toFixed(2)}`);
  }

  const result = estimate(itemBank, responses);
  console.log(`\n${name}: ${trace.join(" | ")}`);
  console.log(`${name} final: theta=${result.theta.toFixed(2)}, se=${result.standardError.toFixed(2)}, band=${levelBand(result.theta)}`);
  assert(new Set(responses.map((response) => response.itemId)).size === answers.length, `${name}: no repeats`);

  if (name === "mostly-correct") {
    assert(result.theta > 0, "mostly-correct: theta rises above prior");
    assert(difficulties[difficulties.length - 1] > difficulties[0], "mostly-correct: final selection is harder than first");
  }
  if (name === "all-wrong") {
    assert(result.theta < 0, "all-wrong: theta falls below prior");
    assert(difficulties[difficulties.length - 1] < difficulties[0], "all-wrong: final selection is easier than first");
  }
}

runScenario("mostly-correct", [true, true, true, true, false, true, true, true, true, true, false, true, true, true, true]);
runScenario("all-wrong", Array.from({ length: 15 }, () => false));
runScenario("mixed", Array.from({ length: 15 }, (_, index) => index % 2 === 0));
console.log("adaptive path verification: passed");
