"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import { studySetPath } from "@/lib/api/study-sets";

export default function StudySetsPage() {
  return (
    <Suspense fallback={<div className="empty-state">Loading study sets…</div>}>
      <StudySetsContent />
    </Suspense>
  );
}

function StudySetsContent() {
  const { sets, loading, apiError } = useStudySets();
  const query = useSearchParams().get("q")?.toLowerCase() || "";
  const [subject, setSubject] = useState("All Subjects");
  const [sort, setSort] = useState("Recently Updated");
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
                </div>
                <div className="binder-card-title">
                  <div className="cover-thumb" aria-hidden="true">
                    {set.subject.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h2>{set.title}</h2>
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
    </div>
  );
}
