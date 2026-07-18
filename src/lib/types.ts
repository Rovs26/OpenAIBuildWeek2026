// FROZEN CONTRACTS — see RULES.md §1. Only P3 may change this file, after a team ping.

export type Item = {
  id: string;
  format: "hear-word" | "hear-sentence" | "see-word";
  language: "en" | "fil";
  prompt: string; // text shown (see-word) or spoken (hear-*)
  audioUrl?: string; // /audio/<id>.mp3, pre-rendered
  choices: { id: string; emoji?: string; label?: string }[];
  correctChoiceId: string;
  difficulty: number; // b, roughly -3..+3
  discrimination: number; // a, ~1.2
};

export type ItemResponse = {
  itemId: string;
  choiceId: string;
  correct: boolean;
  ms: number;
};

export type SpeakingResult = {
  targetText: string;
  transcript: string;
  wordMatchPct: number;
  audioUrl: string;
};

export type LevelBand = "Emerging" | "Beginning" | "Developing" | "On Track";

export type SessionResult = {
  studentName: string;
  theta: number;
  standardError: number;
  responses: ItemResponse[];
  speaking?: SpeakingResult;
  levelBand: LevelBand;
};
