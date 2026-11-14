import { apiFetch } from "./client";

export type ExamPlan = {
  id: number;
  title: string;
  exam_date: string;
  study_set_ids: number[];
  study_set_titles: string[];
  daily_progress: {
    daily_goal: number;
    new_cards_today: number;
    unseen_cards: number;
    due_cards: number;
    days_left: number;
  };
};

export type ExamPlanInput = Pick<ExamPlan, "title" | "exam_date" | "study_set_ids">;

export const getExamPlans = () => apiFetch<ExamPlan[]>("/exam-plans/");
export const createExamPlan = (data: ExamPlanInput) =>
  apiFetch<ExamPlan>("/exam-plans/", { method: "POST", body: JSON.stringify(data) });
export const updateExamPlan = (id: number, data: ExamPlanInput) =>
  apiFetch<ExamPlan>(`/exam-plans/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteExamPlan = (id: number) =>
  apiFetch<void>(`/exam-plans/${id}/`, { method: "DELETE" });
