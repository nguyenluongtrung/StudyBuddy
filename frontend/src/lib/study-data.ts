export type Flashcard = { id?: number; front: string; back: string };
export type QuizQuestion = { question: string; answers: string[]; correct: number; explanation: string };
export type StudySet = {
  id: string;
  title: string;
  subject: string;
  course: string;
  notes: string;
  cards: Flashcard[];
  questions: QuizQuestion[];
  mastery: number;
  updatedAt: string;
  subjectId?: number;
  topic?: string;
  pastedNotes?: string;
  fileName?: string;
  fileDownloadUrl?: string;
  generationStatus?: "pending" | "ready" | "failed" | "outdated";
  generationError?: string;
  generateFlashcards?: boolean;
  generateQuiz?: boolean;
};
export type QuizAnswer = { questionIndex: number; selected: number; seconds: number };
export type QuizResult = { setId: string; answers: QuizAnswer[]; questions: QuizQuestion[]; completedAt: string };

const setsKey = "studybuddy.studySets.v1";
const resultKey = "studybuddy.quizResults.v1";
const flashcardProgressKey = "studybuddy.flashcardProgress.v1";
const activeUserKey = "studybuddy.activeUser";
export function readActiveStudyUser() { return typeof window === "undefined" ? "" : localStorage.getItem(activeUserKey) || ""; }
export function setActiveStudyUser(username: string) { if (typeof window === "undefined") return; localStorage.setItem(activeUserKey, username); window.dispatchEvent(new Event("studybuddy:sets")); }
export function clearActiveStudyUser() { if (typeof window === "undefined") return; localStorage.removeItem(activeUserKey); window.dispatchEvent(new Event("studybuddy:sets")); }
function userKey(key: string) { return `${key}.${encodeURIComponent(readActiveStudyUser() || "guest")}`; }

export function readSets(): StudySet[] {
  if (typeof window === "undefined") return [];
  try { const saved = localStorage.getItem(userKey(setsKey)); return saved ? JSON.parse(saved) as StudySet[] : []; } catch { return []; }
}
export function saveSets(sets: StudySet[]) { localStorage.setItem(userKey(setsKey), JSON.stringify(sets)); window.dispatchEvent(new Event("studybuddy:sets")); }
export function clearLocalStudySetData(setId: string) {
  localStorage.removeItem(`${userKey(resultKey)}.${setId}`);
  localStorage.removeItem(`${userKey(flashcardProgressKey)}.${setId}`);
  sessionStorage.removeItem(`studybuddy.quizConfig.${setId}`);
}
export function saveResult(result: QuizResult) { localStorage.setItem(`${userKey(resultKey)}.${result.setId}`, JSON.stringify(result)); }
export function readResult(setId: string): QuizResult | null {
  if (typeof window === "undefined") return null;
  try { const saved = localStorage.getItem(`${userKey(resultKey)}.${setId}`); return saved ? JSON.parse(saved) as QuizResult : null; } catch { return null; }
}
export function readLocalFlashcardProgress(set: StudySet): number[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(`${userKey(flashcardProgressKey)}.${set.id}`) || "null");
    if (saved?.cards !== JSON.stringify(set.cards) || !Array.isArray(saved.known)) return [];
    return saved.known.filter((index: unknown) => Number.isInteger(index) && (index as number) >= 0 && (index as number) < set.cards.length);
  } catch { return []; }
}
export function saveLocalFlashcardProgress(set: StudySet, known: number[]) {
  localStorage.setItem(`${userKey(flashcardProgressKey)}.${set.id}`, JSON.stringify({ cards: JSON.stringify(set.cards), known }));
}
export function makeCards(notes: string): Flashcard[] {
  const lines = notes.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(0, 24).map((line, index) => {
    const separator = line.indexOf(":");
    const heading = separator > 2 && separator < 70 ? line.slice(0, separator).replace(/^\d+[.)]\s*/, "") : line.split(/[.!?]/)[0].slice(0, 65);
    return { front: `Explain ${heading || `concept ${index + 1}`}.`, back: separator > 2 && separator < 70 ? line.slice(separator + 1).trim() : line };
  });
}
export function makeQuestions(cards: Flashcard[]): QuizQuestion[] {
  return cards.slice(0, 10).map((card, index) => {
    const distractors = cards.filter((_, i) => i !== index).slice(0, 3).map((item) => item.back);
    const correct = index % Math.min(4, distractors.length + 1);
    const answers = [...distractors];
    answers.splice(correct, 0, card.back);
    return { question: card.front, answers, correct, explanation: card.back };
  });
}
