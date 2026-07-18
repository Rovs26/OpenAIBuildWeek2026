import { estimate, levelBand, nextItem } from "../src/lib/cat";
import { itemBank } from "../src/lib/itemBank";

type Response = { itemId: string; correct: boolean };

function runScenario(label: string, correctness: boolean[]): void {
  const responses: Response[] = [];
  console.log(`\n${label}`);
  console.log("Start theta: 0.00");

  for (const correct of correctness) {
    const item = nextItem(itemBank, responses);
    if (!item) break;
    responses.push({ itemId: item.id, correct });
    const ability = estimate(itemBank, responses);
    const next = nextItem(itemBank, responses);
    console.log(
      `${item.id} (b=${item.difficulty.toFixed(2)}) → ${correct ? "correct" : "wrong"}; ` +
        `theta=${ability.theta.toFixed(2)}${next ? `, next b=${next.difficulty.toFixed(2)}` : ""}`,
    );
  }

  const final = estimate(itemBank, responses);
  console.log(
    `Final band: ${levelBand(final.theta)} | standard error: ${final.standardError.toFixed(2)}`,
  );
}

runScenario("Mostly correct path", [true, true, true, true, false, true, true, true]);
runScenario("Mostly incorrect path", [false, false, false, true, false, false, false, false]);
