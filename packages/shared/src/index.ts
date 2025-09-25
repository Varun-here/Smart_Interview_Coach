export type SentimentLabel = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";

export interface AnalysisResult {
  answerId: string;
  sentiment: SentimentLabel;
  keyPhrases: string[];
  clarityScore: number;
}

export const FILLER_WORDS = ["um", "uh", "like", "you know", "so"];
