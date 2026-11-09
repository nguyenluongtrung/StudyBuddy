"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import {
  isApiSetId,
  getFlashcardProgress,
  normalizeStudySetId,
  saveFlashcardFeedback,
  serverSetId,
  studySetPath,
} from "@/lib/api/study-sets";
import { readLocalFlashcardProgress, saveLocalFlashcardProgress } from "@/lib/study-data";

type Feedback = "learning" | "known" | null;

export default function FlashcardsPage() {
  const id = normalizeStudySetId(useParams<{ id: string }>().id);
  const { sets, loading, apiError } = useStudySets();
  const set = sets.find((item) => item.id === id);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const [progressReady, setProgressReady] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const transitioning = useRef(false);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!set) return;
    let active = true;
    setProgressReady(false);
    setProgressError("");
    setKnown([]);
    if (isApiSetId(id)) {
      getFlashcardProgress(serverSetId(id)).then((progress) => {
        if (active) setKnown(set.cards.flatMap((card, cardIndex) =>
          card.id !== undefined && progress.known_flashcard_ids.includes(card.id) ? [cardIndex] : []));
      }).catch((error) => {
        if (active) setProgressError(error instanceof Error ? error.message : "Unable to load flashcard progress.");
      }).finally(() => { if (active) setProgressReady(true); });
    } else {
      setKnown(readLocalFlashcardProgress(set));
      setProgressReady(true);
    }
    return () => { active = false; };
  }, [id, set]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (transitioning.current) return;
      const target = event.target;
      const isInteractive =
        target instanceof HTMLElement &&
        Boolean(target.closest("button, input, textarea, select, a"));
      if (event.code === "Space" && !isInteractive) {
        event.preventDefault();
        setFlipped((current) => !current);
      }
      if (event.key === "ArrowRight") {
        setIndex((current) =>
          Math.min(current + 1, (set?.cards.length || 1) - 1),
        );
        setFlipped(false);
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(0, current - 1));
        setFlipped(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [set?.cards.length]);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null)
        window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  if (!set && !loading && apiError && isApiSetId(id))
    return (
      <div className="empty-state" role="alert">
        {apiError}
      </div>
    );
  if (!set)
    return (
      <div className="empty-state">
        {loading ? (
          "Loading study set…"
        ) : (
          <>
            Study set not found.{" "}
            <Link href="/study-sets">Back to my study sets</Link>
          </>
        )}
      </div>
    );
  if (set.cards.length === 0)
    return (
      <div className="empty-state">
        This study set has no flashcards yet.{" "}
        <Link href={`${studySetPath(id)}/edit`}>Add notes</Link>
      </div>
    );

  const card = set.cards[index];
  const cardCount = set.cards.length;

  function goToCard(nextIndex: number) {
    if (transitioning.current) return;
    setIndex((nextIndex + cardCount) % cardCount);
    setFlipped(false);
  }

  async function markCard(didKnow: boolean) {
    if (transitioning.current || !progressReady || !set) return;
    transitioning.current = true;
    setProgressError("");
    try {
      let nextKnown: number[];
      if (isApiSetId(id)) {
        if (card.id === undefined) throw new Error("This flashcard has no saved ID.");
        const progress = await saveFlashcardFeedback(serverSetId(id), card.id, didKnow ? "known" : "learning");
        nextKnown = set.cards.flatMap((item, cardIndex) =>
          item.id !== undefined && progress.known_flashcard_ids.includes(item.id) ? [cardIndex] : []);
      } else {
        nextKnown = didKnow
          ? known.includes(index) ? known : [...known, index]
          : known.filter((cardIndex) => cardIndex !== index);
        saveLocalFlashcardProgress(set, nextKnown);
      }
      setKnown(nextKnown);
      setFeedback(didKnow ? "known" : "learning");
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : "Unable to save flashcard progress.");
      transitioning.current = false;
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    advanceTimer.current = window.setTimeout(
      () => {
        setIndex((current) => (current + 1) % cardCount);
        setFlipped(false);
        setFeedback(null);
        transitioning.current = false;
        advanceTimer.current = null;
      },
      reduceMotion ? 180 : 650,
    );
  }

  return (
    <div className="flashcards-page">
      <div className="flashcards-topline">
        <div>
          <p className="crumbs">
            {set.subject} /{" "}
            <span className="badge mint">{set.course} Practice</span>
          </p>
          <Link className="pill-button light" href={`${studySetPath(id)}`}>
            ← Back to Deck
          </Link>
          <strong> / {set.course} Practice</strong>
        </div>
        <div className="flash-progress">
          <strong>
            {known.length} of {cardCount} learned ·{" "}
            {Math.round((known.length / cardCount) * 100)}%
          </strong>
          <div className="progress-track">
            <i style={{ width: `${(known.length / cardCount) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="flashcards-layout">
        <div className="flash-main">
          <button
            className={`flash-card outlined-card ${flipped ? "flipped" : ""} ${feedback ? `feedback-${feedback}` : ""}`}
            onClick={() => {
              if (!transitioning.current) setFlipped((current) => !current);
            }}
            aria-label={flipped ? "Show question" : "Show answer"}
            aria-disabled={feedback !== null}
          >
            <span className="flash-card-inner">
              <span
                className="flash-card-face flash-card-front"
                aria-hidden={flipped}
              >
                <span className="flash-card-heading">
                  <span className="badge mint">
                    ♧ {set.subject} · {set.course}
                  </span>
                  <span className="badge yellow">QUESTION</span>
                </span>
                <span className="flash-card-content">
                  <span className="flash-symbol">🎯</span>
                  <span className="flash-card-question">{card.front}</span>
                </span>
                <span className="flip-hint">
                  ↻ Tap card or press <kbd>Space</kbd> to flip ✦
                </span>
              </span>
              <span
                className="flash-card-face flash-card-back"
                aria-hidden={!flipped}
              >
                <span className="flash-card-heading">
                  <span className="badge mint">
                    ♧ {set.subject} · {set.course}
                  </span>
                  <span className="badge yellow">ANSWER</span>
                </span>
                <span className="flash-card-content">
                  <span className="flash-symbol">💡</span>
                  <span className="flash-card-question">{card.back}</span>
                </span>
                <span className="flip-hint">
                  ↻ Tap card or press <kbd>Space</kbd> to flip ✦
                </span>
              </span>
            </span>
            {feedback && (
              <span
                className={`flash-feedback flash-feedback-${feedback}`}
                aria-hidden="true"
              >
                <span className="flash-feedback-icon">
                  {feedback === "known" ? "✓" : "↻"}
                </span>
                <strong>
                  {feedback === "known" ? "Got it!" : "Keep practicing!"}
                </strong>
                {feedback === "known" && (
                  <span className="flash-sparkles">✦ ✧ ✦</span>
                )}
              </span>
            )}
          </button>
          <div className="flash-answer-actions">
            <button
              className="pill-button gold"
              disabled={feedback !== null || !progressReady}
              onClick={() => markCard(false)}
            >
              ↻ Still Learning
            </button>
            <button
              className="pill-button mint-button"
              disabled={feedback !== null || !progressReady}
              onClick={() => markCard(true)}
            >
              ⊙ Got It!
            </button>
          </div>
          <div className="flash-nav">
            <button
              className="pill-button light"
              disabled={feedback !== null}
              onClick={() => goToCard(index - 1)}
            >
              ← Previous
            </button>
            <span>
              Card {index + 1} of {cardCount}
            </span>
            <button
              className="pill-button light"
              disabled={feedback !== null}
              onClick={() => goToCard(index + 1)}
            >
              Next →
            </button>
          </div>
          <p className="flash-status" role="status" aria-live="polite">
            {progressError || (!progressReady ? "Loading saved progress…" : feedback === "known"
              ? "Got it! Moving to the next card."
              : feedback === "learning"
                ? "Keep practicing. Moving to the next card."
                : "Progress saves when you rate a card.")}
          </p>
        </div>
        <aside className="flash-aside">
          <div className="session-card outlined-card">
            <div className="section-title">
              <h3>Study Session ✦</h3>
              <span className="badge yellow">☀ Active</span>
            </div>
            <div
              className="donut"
              style={
                {
                  "--pct": `${Math.round((known.length / cardCount) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <strong>{Math.round((known.length / cardCount) * 100)}%</strong>
            </div>
            <div className="session-pills">
              <span>
                {known.length} of {cardCount} cards learned
              </span>
            </div>
          </div>
          <div className="tip-card outlined-card">
            <h3>💡 Study Tip ✦</h3>
            <p>
              Say your answer out loud before flipping to reinforce your memory.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
