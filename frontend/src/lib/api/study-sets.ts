import { apiFetch } from "./client";
import { API_URL } from "@/lib/env";
import { getAccessToken } from "@/lib/auth/tokens";
import type { StudySet } from "@/lib/study-data";

export type ApiStudySet = {
  id: number;
  title: string;
  subject_id: number;
  subject_name: string;
  is_owner: boolean;
  owner_name: string;
  topic: string;
  course_code: string;
  generate_flashcards: boolean;
  generate_quiz: boolean;
  generation_status: "pending" | "ready" | "failed" | "outdated";
  generation_error: string;
  updated_at: string;
  materials: { id: number; title: string; kind: "text" | "file"; content: string; extracted_text: string; download_url: string | null }[];
  flashcards: { id: number; front: string; back: string }[];
  questions: { id: number; question: string }[];
};

export const apiSetId = (id: number) => `api-${id}`;

export function studySetPath(id: string) {
  return `/study-sets/${isApiSetId(id) ? serverSetId(id) : encodeURIComponent(id)}`;
}

export function normalizeStudySetId(id: string) {
  let decoded = id;
  try { decoded = decodeURIComponent(id); } catch { /* Leave malformed path text unchanged. */ }
  const apiId = /^(?:api[:-])?(\d+)$/.exec(decoded);
  return apiId ? apiSetId(Number(apiId[1])) : id;
}

export const isApiSetId = (id?: string) => Boolean(id && /^api-\d+$/.test(normalizeStudySetId(id)));
export function serverSetId(id: string) {
  const normalized = normalizeStudySetId(id);
  if (!isApiSetId(normalized)) throw new Error("Invalid API study set ID.");
  return Number(normalized.slice(4));
}
export const getApiStudySets = () => apiFetch<ApiStudySet[]>("/study-sets/");
export const getApiStudySet = (id: number) => apiFetch<ApiStudySet>(`/study-sets/${id}/`);
export const createApiStudySet = (data: FormData) => apiFetch<ApiStudySet>("/study-sets/", { method: "POST", body: data });
export const updateApiStudySet = (id: number, data: FormData) => apiFetch<ApiStudySet>(`/study-sets/${id}/`, { method: "PATCH", body: data });
export const deleteApiStudySet = (id: number) => apiFetch<void>(`/study-sets/${id}/`, { method: "DELETE" });
export const generateApiStudySet = (id: number) => apiFetch<ApiStudySet>(`/study-sets/${id}/generate/`, { method: "POST" });
export const getShareCode = (id: number) => apiFetch<{ code: string | null }>(`/study-sets/${id}/share-code/`);
export const createShareCode = (id: number) => apiFetch<{ code: string }>(`/study-sets/${id}/share-code/`, { method: "POST" });
export const revokeShareCode = (id: number) => apiFetch<void>(`/study-sets/${id}/share-code/`, { method: "DELETE" });
export const joinSharedSet = (code: string) => apiFetch<{ id: number }>(`/study-sets/join/`, { method: "POST", body: JSON.stringify({ code }) });
export type ApiQuizAttempt = {
  id: number;
  status: "in_progress" | "completed";
  format: "multiple_choice" | "true_false" | "mixed";
  count: number;
  difficulty: number;
  correct_count: number | null;
  total_count: number | null;
  score_percent: number | null;
  completed_at: string | null;
  questions: {
    id: number; position: number; question: string; answers: string[];
    selected_index: number | null; seconds_spent: number;
    correct_index?: number; explanation?: string; is_correct?: boolean;
  }[];
};
export type QuizSetup = { format: ApiQuizAttempt["format"]; count: number; difficulty: number };
export const createQuizAttempt = (id: number, config: QuizSetup) =>
  apiFetch<ApiQuizAttempt>(`/study-sets/${id}/quiz-attempts/`, { method: "POST", body: JSON.stringify(config) });
export const getLatestQuizAttempt = (id: number) =>
  apiFetch<ApiQuizAttempt | null>(`/study-sets/${id}/quiz-attempts/`);
export const getQuizAttempt = (id: number, attemptId: number) =>
  apiFetch<ApiQuizAttempt>(`/study-sets/${id}/quiz-attempts/${attemptId}/`);
export const saveQuizAnswer = (id: number, attemptId: number, questionId: number, selectedIndex: number, secondsSpent: number) =>
  apiFetch(`/study-sets/${id}/quiz-attempts/${attemptId}/answer/`, { method: "POST", body: JSON.stringify({ question_id: questionId, selected_index: selectedIndex, seconds_spent: secondsSpent }) });
export const finishQuizAttempt = (id: number, attemptId: number) =>
  apiFetch<ApiQuizAttempt>(`/study-sets/${id}/quiz-attempts/${attemptId}/finish/`, { method: "POST" });
export type FlashcardProgress = { known_flashcard_ids: number[] };
export const getFlashcardProgress = (id: number) => apiFetch<FlashcardProgress>(`/study-sets/${id}/flashcard-progress/`);
export const saveFlashcardFeedback = (id: number, flashcardId: number, feedback: "known" | "learning") =>
  apiFetch<FlashcardProgress>(`/study-sets/${id}/flashcard-progress/`, {
    method: "POST", body: JSON.stringify({ flashcard_id: flashcardId, feedback }),
  });

export function toStudySet(value: ApiStudySet): StudySet {
  return {
    id: apiSetId(value.id), title: value.title, subject: value.subject_name,
    isOwner: value.is_owner, ownerName: value.owner_name,
    subjectId: value.subject_id, course: value.course_code || "STUDY", topic: value.topic,
    notes: value.materials.map((material) => material.extracted_text).filter(Boolean).join("\n\n"),
    pastedNotes: value.materials.find((material) => material.kind === "text")?.content || "",
    fileName: value.materials.find((material) => material.kind === "file")?.title,
    fileDownloadUrl: value.materials.find((material) => material.kind === "file")?.download_url || undefined,
    cards: value.flashcards,
    questions: value.questions.map((question) => ({ question: question.question, answers: [], correct: -1, explanation: "" })),
    mastery: 0, updatedAt: value.updated_at,
    generationStatus: value.generation_status, generationError: value.generation_error,
    generateFlashcards: value.generate_flashcards, generateQuiz: value.generate_quiz,
  };
}

export async function downloadStudyMaterial(path: string, filename: string) {
  const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${getAccessToken() || ""}` } });
  if (!response.ok) throw new Error("Unable to download this file.");
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
