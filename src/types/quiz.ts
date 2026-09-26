export interface Question {
  id: number;
  question: string;
  options: Record<string, string>; // napr. { a: "text", b: "text" }
  correct_answers: string[];      // napr. ["a", "c", "e"]
  explanation?: string;
}

export type QuizState = 'start' | 'quiz' | 'result';
