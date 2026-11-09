"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import { downloadStudyMaterial, generateApiStudySet, isApiSetId, normalizeStudySetId, serverSetId, studySetPath } from "@/lib/api/study-sets";

export default function StudySetDetailsPage() {
  const id = normalizeStudySetId(useParams<{ id: string }>().id);
  const { sets, loading, apiError } = useStudySets();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const set = sets.find((item) => item.id === id);
  if (!set && loading) return <div className="empty-state">Loading study set…</div>;
  if (!set && apiError && isApiSetId(id)) return <div className="empty-state" role="alert">{apiError}</div>;
  if (!set) return <div className="empty-state">Study set not found. <Link href="/study-sets">Back to my study sets</Link></div>;
  const noteLines = set.notes.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  async function regenerate() {
    setBusy(true); setActionError("");
    try { await generateApiStudySet(serverSetId(id)); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Unable to generate activities."); }
    finally { window.dispatchEvent(new Event("studybuddy:api-sets")); setBusy(false); }
  }
  async function download() {
    if (!set?.fileDownloadUrl) return;
    try { await downloadStudyMaterial(set.fileDownloadUrl, set.fileName || "study-material"); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Unable to download this file."); }
  }
  return <div className="detail-page">
    {isApiSetId(id) && set.generationStatus !== "ready" && <section className="generation-banner outlined-card" role="status"><strong>{set.generationStatus === "failed" ? "Generation failed" : set.generationStatus === "outdated" ? "Study activities are outdated" : "Generation pending"}</strong><p>{actionError || set.generationError || "Your source material is saved. Generate activities when you are ready."}</p><button className="pill-button dark" disabled={busy} onClick={regenerate}>{busy ? "Generating…" : "Retry generation"}</button></section>}
    {actionError && set.generationStatus === "ready" && <p className="form-error" role="alert">{actionError}</p>}
    <div className="page-toolbar"><p className="crumbs"><Link href="/study-sets">My Study Sets</Link> / {set.subject} / <strong>Current Set</strong></p><div><Link className="pill-button light" href={`${studySetPath(id)}/edit`}>Edit Set</Link>{set.fileDownloadUrl && <button className="pill-button light" onClick={download}>Download source</button>}</div></div>
    <section className="detail-hero outlined-card"><div><div className="badge-row"><span className="badge mint">{set.course}</span><span className="badge light">Lecture Notes</span></div><h1>{set.title}</h1><p>{set.cards.length} flashcards · {set.questions.length} quiz questions</p></div><div className="recent-progress"><strong>{set.mastery}%</strong><span>RECENT PROGRESS</span></div></section>
    <div className="study-action-grid"><article className="study-action outlined-card"><div className="action-art quiz-art"><span>🎯</span><small>{set.questions.length} QUESTIONS</small></div><h2>Take Practice Quiz</h2><p>Review your notes with multiple choice questions and explanations.</p><Link className="pill-button dark" href={`${studySetPath(id)}/quiz/setup`}>Start Practice Quiz</Link></article><article className="study-action outlined-card"><div className="action-art card-art"><span>💡</span><small>{set.cards.length} CARDS</small></div><h2>Flip Flashcards</h2><p>Practice recall with flashcards made from your source material.</p><Link className="pill-button gold" href={`${studySetPath(id)}/flashcards`}>Review Flashcards</Link></article></div>
    <section className="lecture-card outlined-card"><div className="lecture-heading"><div><h2>Source Notes</h2><p>Text used to generate this study set</p></div></div><div className="note-grid">{noteLines.slice(0, 4).map((line, index) => <div className="note-card" key={index}><span>{index + 1}</span><h3>{line.split(":")[0].slice(0, 44)}</h3><p>{line}</p></div>)}</div><details className="full-notes"><summary>View full notes</summary><pre>{set.notes}</pre></details></section>
  </div>;
}
