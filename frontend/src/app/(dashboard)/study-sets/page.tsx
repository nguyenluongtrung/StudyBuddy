"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import {
  deleteApiStudySet,
  isApiSetId,
  serverSetId,
  studySetPath,
} from "@/lib/api/study-sets";
import { clearLocalStudySetData } from "@/lib/study-data";

export default function StudySetsPage() {
  return (
    <Suspense fallback={<div className="empty-state">Loading study sets…</div>}>
      <StudySetsContent />
    </Suspense>
  );
}

function StudySetsContent() {
  const { sets, updateSets, loading, apiError } = useStudySets();
  const query = useSearchParams().get("q")?.toLowerCase() || "";
  const [subject, setSubject] = useState("All Subjects");
  const [sort, setSort] = useState("Recently Updated");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (pendingDelete && !deleteDialogRef.current?.open)
      deleteDialogRef.current?.showModal();
  }, [pendingDelete]);
  function closeDeleteDialog() {
    if (deletingId) return;
    deleteDialogRef.current?.close();
  }
  async function deleteSet() {
    if (!pendingDelete) return;
    const setId = pendingDelete.id;
    setDeletingId(setId);
    setDeleteError("");
    try {
      if (isApiSetId(setId)) {
        await deleteApiStudySet(serverSetId(setId));
        window.dispatchEvent(new Event("studybuddy:api-sets"));
      } else {
        updateSets(sets.filter((item) => item.id !== setId));
        clearLocalStudySetData(setId);
      }
      deleteDialogRef.current?.close();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete this study set.",
      );
    } finally {
      setDeletingId(null);
    }
  }
  const subjects = [
    "All Subjects",
    ...Array.from(new Set(sets.map((set) => set.subject))),
  ];
  const filtered = useMemo(() => {
    const matching = sets.filter(
      (set) =>
        (subject === "All Subjects" || set.subject === subject) &&
        `${set.title} ${set.subject} ${set.course} ${set.notes}`
          .toLowerCase()
          .includes(query),
    );
    return [...matching].sort((a, b) =>
      sort === "Title"
        ? a.title.localeCompare(b.title)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [sets, subject, sort, query]);

  return (
    <div className="binder-page">
      {apiError && (
        <div className="form-error" role="alert">
          Saved account sets could not be loaded: {apiError}
        </div>
      )}
      <div className="binder-heading">
        <div>
          <p className="crumbs">Classroom / My Study Sets</p>
          <h1>My Study Sets</h1>
          <p>Organize and review the study sets you create.</p>
        </div>
        <div className="binder-controls">
          <select
            aria-label="Sort study sets"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option>Recently Updated</option>
            <option>Title</option>
          </select>
          <Link className="pill-button light" href="/join">Join a study set</Link>
          <Link className="pill-button dark" href="/study-sets/new">
            Create New Set
          </Link>
        </div>
      </div>
      <div className="binder-summary">
        <span>
          <strong>{sets.length}</strong> Study Sets
        </span>
        <span>
          <strong>
            {sets.reduce((total, set) => total + set.cards.length, 0)}
          </strong>{" "}
          Flashcards
        </span>
        <span>
          <strong>
            {sets.reduce((total, set) => total + set.questions.length, 0)}
          </strong>{" "}
          Quiz Questions
        </span>
      </div>
      {sets.length > 0 && (
        <div className="filter-row">
          {subjects.map((item) => (
            <button
              key={item}
              className={`filter-chip ${item === subject ? "selected" : ""}`}
              onClick={() => setSubject(item)}
            >
              {item} (
              {item === "All Subjects"
                ? sets.length
                : sets.filter((set) => set.subject === item).length}
              )
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <div className="empty-state">Loading study sets…</div>
      ) : (
        <>
          <div className="binder-grid">
            {filtered.map((set) => (
              <article className="binder-card outlined-card" key={set.id}>
                <div className="binder-tags">
                  <span className="badge mint">
                    {set.course} · {set.subject}
                  </span>
                  {set.generationStatus && set.generationStatus !== "ready" && (
                    <span className="badge yellow">
                      {set.generationStatus === "failed"
                        ? "Generation failed"
                        : set.generationStatus === "outdated"
                          ? "Update needed"
                          : "Generating"}
                    </span>
                  )}
                  {(set.isOwner !== false) && <button
                    className="binder-delete"
                    type="button"
                    disabled={deletingId !== null}
                    onClick={() => {
                      setDeleteError("");
                      setPendingDelete({ id: set.id, title: set.title });
                    }}
                    aria-label={`Delete ${set.title}`}
                  >
                    {deletingId === set.id ? "Deleting…" : "Delete"}
                  </button>}
                </div>
                <div className="binder-card-title">
                  <div className="cover-thumb" aria-hidden="true">
                    {set.subject.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h2>{set.title}</h2>
                    {set.isOwner === false && <p>Shared by {set.ownerName}</p>}
                    <p>
                      {set.cards.length} Cards <span>·</span>{" "}
                      {set.questions.length} Questions
                    </p>
                  </div>
                </div>
                {set.topic && (
                  <div className="topic-tags">
                    <span>{set.topic}</span>
                  </div>
                )}
                <div className="binder-card-actions">
                  <Link
                    className="pill-button dark"
                    href={studySetPath(set.id)}
                  >
                    View Set
                  </Link>
                  {set.questions.length > 0 && (
                    <Link
                      className="pill-button light"
                      href={`${studySetPath(set.id)}/quiz/setup`}
                    >
                      Practice Quiz
                    </Link>
                  )}
                  {set.cards.length > 0 && (
                    <Link
                      className="pill-button light"
                      href={`${studySetPath(set.id)}/flashcards`}
                    >
                      Flashcards
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="empty-state">
              {sets.length === 0 ? (
                <>
                  You have no study sets yet.{" "}
                  <Link href="/study-sets/new">Create your first set</Link>.
                </>
              ) : (
                <>
                  No study sets match this search.{" "}
                  <Link href="/study-sets">Clear filters</Link>
                </>
              )}
            </div>
          )}
        </>
      )}
      <dialog
        className="delete-set-dialog"
        ref={deleteDialogRef}
        aria-labelledby="delete-set-title"
        aria-describedby="delete-set-description"
        onCancel={(event) => {
          if (deletingId) event.preventDefault();
        }}
        onClose={() => setPendingDelete(null)}
      >
        {pendingDelete && (
          <>
            <h2 id="delete-set-title">Delete this study set?</h2>
            <p id="delete-set-description">
              <strong>{pendingDelete.title}</strong> and its quiz attempts and
              flashcard progress will be permanently removed.
            </p>
            {deleteError && (
              <p className="form-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="delete-set-dialog-actions">
              <button
                className="pill-button light"
                type="button"
                onClick={closeDeleteDialog}
                disabled={deletingId !== null}
                autoFocus
              >
                Keep set
              </button>
              <button
                className="pill-button delete-confirm"
                type="button"
                onClick={deleteSet}
                disabled={deletingId !== null}
              >
                {deletingId ? "Deleting…" : "Delete study set"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
