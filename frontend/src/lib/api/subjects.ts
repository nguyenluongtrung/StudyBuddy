import { apiFetch } from "./client";
import type { Subject } from "@/types";

export function getSubjects() { return apiFetch<Subject[]>("/subjects/"); }

export function createSubject(name: string, color = "#ef8354") {
  return apiFetch<Subject>("/subjects/", { method: "POST", body: JSON.stringify({ name, color }) });
}
