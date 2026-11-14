"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DueFlashcard,
  getReviewToday,
  saveFlashcardFeedback,
  studySetPath,
  apiSetId,
} from "@/lib/api/study-sets";
import {
  LocalDueFlashcard,
  readLocalReviewQueue,
  readSets,
  saveLocalFlashcardFeedback,
} from "@/lib/study-data";

type ReviewCard = DueFlashcard | LocalDueFlashcard;
const isLocalCard = (card: ReviewCard): card is LocalDueFlashcard =>
  "setId" in card;

export default function ReviewTodayPage() {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    let active = true;
    const localCards = readLocalReviewQueue(readSets());
    setCards(localCards);
    getReviewToday()
      .then((due) => {
        if (active) setCards([...due, ...localCards]);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load today's reviews.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function answer(feedback: "known" | "learning") {
    const card = cards[0];
    if (!card || saving) return;
    setSaving(true);
    setError("");
    try {
      if (isLocalCard(card)) {
        const set = readSets().find((item) => item.id === card.setId);
        if (!set) throw new Error("This study set is no longer available.");
        saveLocalFlashcardFeedback(set, card.index, feedback);
      } else {
        await saveFlashcardFeedback(card.study_set_id, card.id, feedback);
      }
      setCards((current) => current.filter((item) => item !== card));
      setReviewed((count) => count + 1);
      setFlipped(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save this answer.",
      );
    } finally {
      setSaving(false);
    }
  }

  const card = cards[0];
  return (
    <div className="review-today-page">
      <div className="review-today-heading">
        <div>
          <h1>Review today</h1>
          <p>Bring back what you&apos;ve learned, one card at a time.</p>
        </div>
        <Link className="pill-button light" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="empty-state">Loading today&apos;s cards…</div>
      ) : card ? (
        <section
          className="review-today-session"
          aria-label="Today's flashcard review"
        >
          <p className="review-today-count">
            {cards.length} {cards.length === 1 ? "card" : "cards"} left today
            {reviewed > 0 ? ` · ${reviewed} reviewed` : ""}
          </p>
          <div className="review-today-card outlined-card">
            <div className="review-today-card-top">
              <Link
                href={`${studySetPath(isLocalCard(card) ? card.setId : apiSetId(card.study_set_id))}/flashcards`}
              >
                {isLocalCard(card) ? card.setTitle : card.study_set_title}
              </Link>
              <span className="badge mint">
                {flipped ? "Answer" : "Question"}
              </span>
            </div>
            <p>{flipped ? card.back : card.front}</p>
            <button
              className="pill-button light"
              onClick={() => setFlipped((value) => !value)}
              disabled={saving}
            >
              {flipped ? "Show question" : "Show answer"}
            </button>
          </div>
          {flipped && (
            <div className="review-today-actions">
              <button
                className="pill-button gold"
                onClick={() => answer("learning")}
                disabled={saving}
              >
                Still learning
              </button>
              <button
                className="pill-button mint-button"
                onClick={() => answer("known")}
                disabled={saving}
              >
                Got it
              </button>
            </div>
          )}
          <p className="review-today-help">
            Still learning returns tomorrow. Got it gives this card a longer
            break.
          </p>
        </section>
      ) : (
        !error && (
          <div className="empty-state">
            <h2>You&apos;re caught up for today.</h2>
            <p>
              {reviewed > 0
                ? `You reviewed ${reviewed} ${reviewed === 1 ? "card" : "cards"}.`
                : "New cards and due cards will appear here."}
            </p>
            <Link href="/study-sets">Browse study sets</Link>
          </div>
        )
      )}
    </div>
  );
}
