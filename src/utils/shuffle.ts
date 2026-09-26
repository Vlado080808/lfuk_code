import { Question } from '../types/quiz';

// Fisher-Yates shuffle algoritmus
export function getShuffledQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Funkcia na zamiešanie poradí otázok aj jednotlivých možností
/*export function getShuffledQuestions(rawQuestions: Question[]): Question[] {
  const shuffledQuestions = shuffleArray(rawQuestions);

  return shuffledQuestions.map((q) => {
    const correctAnswerText = q.options[q.correctAnswer];
    const shuffledOptions = shuffleArray(q.options);
    const newCorrectAnswerIndex = shuffledOptions.indexOf(correctAnswerText);

    return {
      ...q,
      options: shuffledOptions,
      correctAnswer: newCorrectAnswerIndex,
    };
  });
}*/
