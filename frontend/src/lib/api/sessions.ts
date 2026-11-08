import { apiFetch } from "./client";
import type { StudySession } from "@/types";

export function getSessions() { return apiFetch<StudySession[]>("/study-sessions/"); }
