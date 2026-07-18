import type { Item, LevelBand } from "./types";

/**
 * Deterministic 2PL CAT utilities.
 *
 * The logistic scaling constant is D = 1 throughout this module:
 * P(correct) = 1 / (1 + exp(-a * (theta - b))).
 *
 * Seed item parameters support the hackathon demo only; they are not
 * production-calibrated educational measurements.
 */

export const LEVEL_BAND_THRESHOLDS = {
  emergingUpper: -1.5,
  beginningUpper: -0.5,
  developingUpper: 0.5,
} as const;

const MIN_THETA = -4;
const MAX_THETA = 4;
const THETA_STEP = 0.1;
const PROBABILITY_FLOOR = 1e-12;
const MIN_STANDARD_ERROR = 1e-6;
const TIE_EPSILON = 1e-12;

export type CatResponse = {
  itemId: string;
  correct: boolean;
};

type ResponseWithItem = {
  item: Item;
  correct: boolean;
};

function isUsableItem(item: Item | undefined): item is Item {
  return Boolean(
    item &&
      Number.isFinite(item.difficulty) &&
      Number.isFinite(item.discrimination) &&
      item.discrimination > 0,
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/** Returns a bounded 2PL probability using the module-wide D = 1 convention. */
export function itemProbability(theta: number, item: Item): number {
  if (!isUsableItem(item) || !Number.isFinite(theta)) {
    return 0.5;
  }

  // Bounding the exponent prevents overflow without changing the meaningful
  // portion of the logistic curve used by the EAP grid.
  const exponent = clamp(item.discrimination * (theta - item.difficulty), -50, 50);
  const value = 1 / (1 + Math.exp(-exponent));

  return clamp(value, PROBABILITY_FLOOR, 1 - PROBABILITY_FLOOR);
}

/** Returns finite, non-negative 2PL Fisher information. */
export function itemInformation(theta: number, item: Item): number {
  if (!isUsableItem(item)) {
    return 0;
  }

  const p = itemProbability(theta, item);
  const value = item.discrimination ** 2 * p * (1 - p);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function responseItems(pool: Item[], responses: CatResponse[]): ResponseWithItem[] {
  const itemsById = new Map(pool.map((item) => [item.id, item]));
  const seenItemIds = new Set<string>();

  return responses.flatMap((response) => {
    // A UI retry must not accidentally count the same administered item twice.
    if (seenItemIds.has(response.itemId)) return [];
    seenItemIds.add(response.itemId);
    const item = itemsById.get(response.itemId);
    return isUsableItem(item) && typeof response.correct === "boolean"
      ? [{ item, correct: response.correct }]
      : [];
  });
}

function thetaGrid(): number[] {
  const count = Math.round((MAX_THETA - MIN_THETA) / THETA_STEP);
  return Array.from({ length: count + 1 }, (_, index) =>
    Number((MIN_THETA + index * THETA_STEP).toFixed(10)),
  );
}

/**
 * Estimates ability with EAP on a fixed [-4, 4] quadrature grid and an N(0, 1)
 * prior. Empty or unusable response histories deliberately return that prior.
 */
export function estimate(
  pool: Item[],
  responses: CatResponse[],
): { theta: number; standardError: number } {
  const usableResponses = responseItems(pool, responses);

  if (usableResponses.length === 0) {
    return { theta: 0, standardError: 1 };
  }

  const weightedGrid = thetaGrid().map((theta) => {
    // The omitted Normal(0, 1) constant cancels during posterior normalization.
    let logWeight = -0.5 * theta * theta;

    for (const response of usableResponses) {
      const p = itemProbability(theta, response.item);
      logWeight += response.correct ? Math.log(p) : Math.log(1 - p);
    }

    return { theta, logWeight };
  });

  const maximumLogWeight = Math.max(...weightedGrid.map(({ logWeight }) => logWeight));
  const normalizedWeights = weightedGrid.map(({ logWeight }) =>
    Math.exp(logWeight - maximumLogWeight),
  );
  const totalWeight = normalizedWeights.reduce((total, weight) => total + weight, 0);

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return { theta: 0, standardError: 1 };
  }

  const theta = weightedGrid.reduce(
    (total, point, index) => total + point.theta * normalizedWeights[index],
    0,
  ) / totalWeight;
  const variance = weightedGrid.reduce(
    (total, point, index) =>
      total + (point.theta - theta) ** 2 * normalizedWeights[index],
    0,
  ) / totalWeight;

  return {
    theta: Number.isFinite(theta) ? clamp(theta, MIN_THETA, MAX_THETA) : 0,
    standardError: Number.isFinite(variance)
      ? Math.max(Math.sqrt(Math.max(variance, 0)), MIN_STANDARD_ERROR)
      : 1,
  };
}

/**
 * Picks the remaining item with maximum 2PL Fisher information at the current
 * EAP estimate. Ties are stable: closest difficulty, then lexical item id.
 */
export function nextItem(pool: Item[], responses: CatResponse[]): Item | null {
  const administeredIds = new Set(responses.map((response) => response.itemId));
  const candidates = pool.filter(
    (item) => !administeredIds.has(item.id) && isUsableItem(item),
  );

  if (candidates.length === 0) {
    return null;
  }

  const { theta } = estimate(pool, responses);
  let selected = candidates[0];
  let selectedInformation = itemInformation(theta, selected);

  for (const candidate of candidates.slice(1)) {
    const candidateInformation = itemInformation(theta, candidate);
    const isMoreInformative = candidateInformation > selectedInformation + TIE_EPSILON;
    const informationIsTied =
      Math.abs(candidateInformation - selectedInformation) <= TIE_EPSILON;
    const candidateDistance = Math.abs(candidate.difficulty - theta);
    const selectedDistance = Math.abs(selected.difficulty - theta);
    const isCloserDifficulty = candidateDistance < selectedDistance - TIE_EPSILON;
    const distanceIsTied = Math.abs(candidateDistance - selectedDistance) <= TIE_EPSILON;

    if (
      isMoreInformative ||
      (informationIsTied &&
          (isCloserDifficulty ||
          (distanceIsTied && candidate.id < selected.id)))
    ) {
      selected = candidate;
      selectedInformation = candidateInformation;
    }
  }

  return selected;
}

/**
 * Provisional hackathon demonstration bands, not official educational cut scores.
 */
export function levelBand(theta: number): LevelBand {
  const safeTheta = Number.isFinite(theta) ? theta : 0;

  if (safeTheta < LEVEL_BAND_THRESHOLDS.emergingUpper) return "Emerging";
  if (safeTheta < LEVEL_BAND_THRESHOLDS.beginningUpper) return "Beginning";
  if (safeTheta < LEVEL_BAND_THRESHOLDS.developingUpper) return "Developing";
  return "On Track";
}
