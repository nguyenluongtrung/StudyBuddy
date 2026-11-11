"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import {
  downloadStudyMaterial,
  createShareCode,
  generateApiStudySet,
  getShareCode,
  isApiSetId,
  normalizeStudySetId,
  revokeShareCode,
  serverSetId,
  studySetPath,
} from "@/lib/api/study-sets";

export default function StudySetDetailsPage() {
  const id = normalizeStudySetId(useParams<{ id: string }>().id);
  const { sets, loading, apiError } = useStudySets();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const set = sets.find((item) => item.id === id);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!isApiSetId(id) || set?.isOwner !== true) return;
    let active = true;
    getShareCode(serverSetId(id)).then(({ code }) => {
      if (active) setShareCode(code);
    }).catch((error) => {
      if (active) setShareError(error instanceof Error ? error.message : "Unable to load sharing details.");
    });
    return () => { active = false; };
  }, [id, set?.isOwner]);
  const displayCode = shareCode?.replace(/(.{4})(?=.)/g, "$1-") || "";
  async function createCode() {
    setShareBusy(true);
    setShareError("");
    try {
      const { code } = await createShareCode(serverSetId(id));
      setShareCode(code);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Unable to create a sharing code.");
    } finally { setShareBusy(false); }
  }
  async function revokeCode() {
    setShareBusy(true);
    setShareError("");
    try {
      await revokeShareCode(serverSetId(id));
      setShareCode(null);
      setCopied(false);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Unable to disable this sharing code.");
    } finally { setShareBusy(false); }
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
    } catch { setShareError("Copy failed. Select the code and copy it manually."); }
  }
  if (!set && loading)
    return <div className="empty-state">Loading study set…</div>;
  if (!set && apiError && isApiSetId(id))
    return (
      <div className="empty-state" role="alert">
        {apiError}
      </div>
    );
  if (!set)
    return (
      <div className="empty-state">
        Study set not found.{" "}
        <Link href="/study-sets">Back to my study sets</Link>
      </div>
    );
  const noteLines = set.notes
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  async function regenerate() {
    setBusy(true);
    setActionError("");
    try {
      await generateApiStudySet(serverSetId(id));
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to generate activities.",
      );
    } finally {
      window.dispatchEvent(new Event("studybuddy:api-sets"));
      setBusy(false);
    }
  }
  async function download() {
    if (!set?.fileDownloadUrl) return;
    try {
      await downloadStudyMaterial(
        set.fileDownloadUrl,
        set.fileName || "study-material",
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to download this file.",
      );
    }
  }
  return (
    <div className="detail-page">
      {isApiSetId(id) && set.isOwner !== false && set.generationStatus !== "ready" && (
        <section className="generation-banner outlined-card" role="status">
          <strong>
            {set.generationStatus === "failed"
              ? "Generation failed"
              : set.generationStatus === "outdated"
                ? "Study activities are outdated"
                : "Generation pending"}
          </strong>
          <p>
            {actionError ||
              set.generationError ||
              "Your source material is saved. Generate activities when you are ready."}
          </p>
          <button
            className="pill-button dark"
            disabled={busy}
            onClick={regenerate}
          >
            {busy ? "Generating…" : "Retry generation"}
          </button>
        </section>
      )}
      {actionError && set.generationStatus === "ready" && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      <div className="page-toolbar">
        <p className="crumbs">
          <Link href="/study-sets">My Study Sets</Link> / {set.subject} /{" "}
          <strong>Current Set</strong>
        </p>
        <div>
          {set.isOwner !== false && <Link className="pill-button light" href={`${studySetPath(id)}/edit`}>
            Edit Set
          </Link>}
          {set.fileDownloadUrl && (
            <button className="pill-button light" onClick={download}>
              Download source
            </button>
          )}
        </div>
      </div>
      <section className="detail-hero outlined-card">
        <div>
          <div className="badge-row">
            <span className="badge mint">{set.course}</span>
            <span className="badge light">Lecture Notes</span>
          </div>
          <h1>{set.title}</h1>
          {set.isOwner === false && <p>Shared by {set.ownerName}</p>}
          <p>
            {set.cards.length} flashcards · {set.questions.length} quiz
            questions
          </p>
        </div>
      </section>
      {isApiSetId(id) && set.isOwner === true && <section className="share-panel outlined-card">
        <div>
          <h2>Study with friends</h2>
          <p>Give this code to a friend. They can enter it under Join a study set and practice with their own progress. Only you can edit it.</p>
        </div>
        {shareCode ? <div className="share-code-row">
          <input aria-label="Sharing code" readOnly value={displayCode} onFocus={(event) => event.currentTarget.select()} />
          <button className="pill-button dark" type="button" onClick={copyCode}>{copied ? "Copied" : "Copy code"}</button>
          <button className="pill-button light" type="button" disabled={shareBusy} onClick={revokeCode}>Disable code</button>
        </div> : <button className="pill-button dark" type="button" disabled={shareBusy} onClick={createCode}>
          {shareBusy ? "Creating…" : "Create sharing code"}
        </button>}
        {shareError && <p className="form-error" role="alert">{shareError}</p>}
        {shareCode && <p className="share-note">Disabling the code stops new joins. Friends who already joined keep access.</p>}
      </section>}
      <div className="study-action-grid">
        <article className="study-action outlined-card">
          <div className="action-art quiz-art">
            <span>🎯</span>
            <small>{set.questions.length} QUESTIONS</small>
          </div>
          <h2>Take Practice Quiz</h2>
          <p>
            Review your notes with multiple choice questions and explanations.
          </p>
          <Link
            className="pill-button dark"
            href={`${studySetPath(id)}/quiz/setup`}
          >
            Start Practice Quiz
          </Link>
        </article>
        <article className="study-action outlined-card">
          <div className="action-art card-art">
            <span>💡</span>
            <small>{set.cards.length} CARDS</small>
          </div>
          <h2>Flip Flashcards</h2>
          <p>Practice recall with flashcards made from your source material.</p>
          <Link
            className="pill-button gold"
            href={`${studySetPath(id)}/flashcards`}
          >
            Review Flashcards
          </Link>
        </article>
      </div>
    </div>
  );
}
