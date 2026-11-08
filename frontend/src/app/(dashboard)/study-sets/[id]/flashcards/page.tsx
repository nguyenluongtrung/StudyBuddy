"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";

type Feedback = "learning" | "known" | null;

export default function FlashcardsPage() {
  const id = useParams<{ id: string }>().id;
  const { sets } = useStudySets();
  const set = sets.find((item) => item.id === id);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const transitioning = useRef(false);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (transitioning.current) return;
      const target = event.target;
      const isInteractive = target instanceof HTMLElement && Boolean(target.closest("button, input, textarea, select, a"));
      if (event.code === "Space" && !isInteractive) {
        event.preventDefault();
        setFlipped((current) => !current);
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(current + 1, (set?.cards.length || 1) - 1));
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

  useEffect(() => () => { if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current); }, []);

  if (!set) return <div className="empty-state">Study set not found. <Link href="/study-sets">Back to my study sets</Link></div>;
  if (set.cards.length === 0) return <div className="empty-state">This study set has no flashcards yet. <Link href={`/study-sets/${id}/edit`}>Add notes</Link></div>;

  const card = set.cards[index];
  const cardCount = set.cards.length;

  function goToCard(nextIndex: number) {
    if (transitioning.current) return;
    setIndex((nextIndex + cardCount) % cardCount);
    setFlipped(false);
  }

  function markCard(didKnow: boolean) {
    if (transitioning.current) return;
    transitioning.current = true;
    setFeedback(didKnow ? "known" : "learning");
    setKnown((current) => didKnow ? (current.includes(index) ? current : [...current, index]) : current.filter((cardIndex) => cardIndex !== index));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    advanceTimer.current = window.setTimeout(() => {
      setIndex((current) => (current + 1) % cardCount);
      setFlipped(false);
      setFeedback(null);
      transitioning.current = false;
      advanceTimer.current = null;
    }, reduceMotion ? 180 : 650);
  }

  return <div className="flashcards-page">
    <div className="flashcards-topline">
      <div><p className="crumbs">{set.subject} / <span className="badge mint">{set.course} Practice</span></p><Link className="pill-button light" href={`/study-sets/${id}`}>← Back to Deck</Link><strong> / {set.course} Practice</strong></div>
      <div className="flash-progress"><strong>Card {index + 1} of {cardCount} · {Math.round(((index + 1) / cardCount) * 100)}%</strong><div className="progress-track"><i style={{ width: `${((index + 1) / cardCount) * 100}%` }} /></div></div>
    </div>
    <div className="flashcards-layout">
      <div className="flash-main">
        <button className={`flash-card outlined-card ${flipped ? "flipped" : ""} ${feedback ? `feedback-${feedback}` : ""}`} onClick={() => { if (!transitioning.current) setFlipped((current) => !current); }} aria-label={flipped ? "Show question" : "Show answer"} aria-disabled={feedback !== null}>
          <span className="flash-card-inner">
            <span className="flash-card-face flash-card-front" aria-hidden={flipped}>
              <span className="flash-card-heading"><span className="badge mint">♧ {set.subject} · {set.course}</span><span className="badge yellow">QUESTION</span></span>
              <span className="flash-card-content"><span className="flash-symbol">🎯</span><span className="flash-card-question">{card.front}</span></span>
              <span className="flip-hint">↻ Tap card or press <kbd>Space</kbd> to flip ✦</span>
            </span>
            <span className="flash-card-face flash-card-back" aria-hidden={!flipped}>
              <span className="flash-card-heading"><span className="badge mint">♧ {set.subject} · {set.course}</span><span className="badge yellow">ANSWER</span></span>
              <span className="flash-card-content"><span className="flash-symbol">💡</span><span className="flash-card-question">{card.back}</span></span>
              <span className="flip-hint">↻ Tap card or press <kbd>Space</kbd> to flip ✦</span>
            </span>
          </span>
          {feedback && <span className={`flash-feedback flash-feedback-${feedback}`} aria-hidden="true"><span className="flash-feedback-icon">{feedback === "known" ? "✓" : "↻"}</span><strong>{feedback === "known" ? "Got it!" : "Keep practicing!"}</strong>{feedback === "known" && <span className="flash-sparkles">✦ ✧ ✦</span>}</span>}
        </button>
        <div className="flash-answer-actions"><button className="pill-button gold" disabled={feedback !== null} onClick={() => markCard(false)}>↻ Still Learning</button><button className="pill-button mint-button" disabled={feedback !== null} onClick={() => markCard(true)}>⊙ Got It!</button></div>
        <div className="flash-nav"><button className="pill-button light" disabled={feedback !== null} onClick={() => goToCard(index - 1)}>← Previous</button><span>Card {index + 1} of {cardCount}</span><button className="pill-button light" disabled={feedback !== null} onClick={() => goToCard(index + 1)}>Next →</button></div>
        <p className="flash-status" role="status" aria-live="polite">{feedback === "known" ? "Got it! Moving to the next card." : feedback === "learning" ? "Keep practicing. Moving to the next card." : ""}</p>
      </div>
      <aside className="flash-aside"><div className="session-card outlined-card"><div className="section-title"><h3>Study Session ✦</h3><span className="badge yellow">☀ Active</span></div><div className="donut" style={{ "--pct": `${Math.round(known.length / cardCount * 100)}%` } as React.CSSProperties}><strong>{Math.round(known.length / cardCount * 100)}%</strong></div><div className="session-pills"><span>⚡ 4-day streak 🔥</span><span>+{known.length * 10} XP</span></div></div><div className="tip-card outlined-card"><h3>💡 Anime Study Tip ✦</h3><p>Say your answer out loud before flipping to reinforce the memory, like a classroom quiz!</p></div></aside>
    </div>
  </div>;
}
