// Shared mock item pool — FROZEN after minute 10 (RULES.md §2).
// No audioUrl: consumers must handle missing audio gracefully.
// Replaced at runtime by src/lib/itemBank.ts when P2 lands (// SWAP: points).

import type { Item } from "./types";

export const mockItems: Item[] = [
  {
    id: "m01", format: "hear-word", language: "en", prompt: "dog",
    choices: [
      { id: "a", emoji: "🐶" }, { id: "b", emoji: "🐱" },
      { id: "c", emoji: "🐟" }, { id: "d", emoji: "🐦" },
    ],
    correctChoiceId: "a", difficulty: -2.0, discrimination: 1.2,
  },
  {
    id: "m02", format: "hear-word", language: "fil", prompt: "mansanas",
    choices: [
      { id: "a", emoji: "🍌" }, { id: "b", emoji: "🍎" },
      { id: "c", emoji: "🍇" }, { id: "d", emoji: "🍊" },
    ],
    correctChoiceId: "b", difficulty: -1.5, discrimination: 1.2,
  },
  {
    id: "m03", format: "see-word", language: "en", prompt: "sun",
    choices: [
      { id: "a", emoji: "🌙" }, { id: "b", emoji: "⭐" },
      { id: "c", emoji: "☀️" }, { id: "d", emoji: "☁️" },
    ],
    correctChoiceId: "c", difficulty: -1.0, discrimination: 1.2,
  },
  {
    id: "m04", format: "hear-sentence", language: "en", prompt: "The boy is running.",
    choices: [
      { id: "a", emoji: "🏃" }, { id: "b", emoji: "🛌" },
      { id: "c", emoji: "🍽️" }, { id: "d", emoji: "📖" },
    ],
    correctChoiceId: "a", difficulty: -0.5, discrimination: 1.2,
  },
  {
    id: "m05", format: "hear-word", language: "fil", prompt: "bahay",
    choices: [
      { id: "a", emoji: "🚗" }, { id: "b", emoji: "🌳" },
      { id: "c", emoji: "🏠" }, { id: "d", emoji: "⛰️" },
    ],
    correctChoiceId: "c", difficulty: -0.5, discrimination: 1.2,
  },
  {
    id: "m06", format: "see-word", language: "fil", prompt: "isda",
    choices: [
      { id: "a", emoji: "🐟" }, { id: "b", emoji: "🦀" },
      { id: "c", emoji: "🐙" }, { id: "d", emoji: "🐚" },
    ],
    correctChoiceId: "a", difficulty: 0.0, discrimination: 1.2,
  },
  {
    id: "m07", format: "hear-sentence", language: "fil", prompt: "Kumakain ang bata ng saging.",
    choices: [
      { id: "a", emoji: "🧒🍌" }, { id: "b", emoji: "🧒⚽" },
      { id: "c", emoji: "🧒📚" }, { id: "d", emoji: "🧒🛁" },
    ],
    correctChoiceId: "a", difficulty: 0.5, discrimination: 1.2,
  },
  {
    id: "m08", format: "see-word", language: "en", prompt: "elephant",
    choices: [
      { id: "a", emoji: "🐘" }, { id: "b", emoji: "🦒" },
      { id: "c", emoji: "🦏" }, { id: "d", emoji: "🦛" },
    ],
    correctChoiceId: "a", difficulty: 1.0, discrimination: 1.2,
  },
  {
    id: "m09", format: "hear-sentence", language: "en", prompt: "The girl put on her raincoat because it was raining.",
    choices: [
      { id: "a", emoji: "🧥🌧️" }, { id: "b", emoji: "👗☀️" },
      { id: "c", emoji: "🩳🏖️" }, { id: "d", emoji: "🧤❄️" },
    ],
    correctChoiceId: "a", difficulty: 1.5, discrimination: 1.2,
  },
  {
    id: "m10", format: "see-word", language: "fil", prompt: "paruparo",
    choices: [
      { id: "a", emoji: "🐝" }, { id: "b", emoji: "🦋" },
      { id: "c", emoji: "🐞" }, { id: "d", emoji: "🐜" },
    ],
    correctChoiceId: "b", difficulty: 2.0, discrimination: 1.2,
  },
];
