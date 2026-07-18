export type Item = {
  id: string;
  format: "hear-word" | "hear-sentence" | "see-word";
  language: "en" | "fil";
  prompt: string;
  audioUrl?: string;
  choices: { id: string; emoji?: string; label?: string }[];
  correctChoiceId: string;
  difficulty: number;
  discrimination: number;
};

export type SessionResult = {
  studentName: string;
  theta: number;
  standardError: number;
  responses: {
    itemId: string;
    choiceId: string;
    correct: boolean;
    ms: number;
  }[];
  speaking?: {
    targetText: string;
    transcript: string;
    wordMatchPct: number;
    audioUrl: string;
  };
  levelBand: "Emerging" | "Beginning" | "Developing" | "On Track";
};
