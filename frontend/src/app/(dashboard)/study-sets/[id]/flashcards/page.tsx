"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";

export default function FlashcardsPage() {
  const id = useParams<{ id: string }>().id;
  const { sets } = useStudySets();
  const set = sets.find((item) => item.id === id);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.code === "Space" && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); setFlipped((current) => !current); } if (event.key === "ArrowRight") { setIndex((current) => Math.min(current + 1, (set?.cards.length || 1) - 1)); setFlipped(false); } if (event.key === "ArrowLeft") { setIndex((current) => Math.max(0, current - 1)); setFlipped(false); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [set?.cards.length]);
  if (!set) return <div className="empty-state">Study set not found. <Link href="/study-sets">Back to my study sets</Link></div>;
  if (set.cards.length === 0) return <div className="empty-state">This study set has no flashcards yet. <Link href={`/study-sets/${id}/edit`}>Add notes</Link></div>;
  const card = set.cards[index];
  const cardCount = set.cards.length;
  function next(didKnow: boolean) { if (didKnow) setKnown((current) => current.includes(index) ? current : [...current, index]); setFlipped(false); setIndex((current) => (current + 1) % cardCount); }
  return <div className="flashcards-page"><div className="flashcards-topline"><div><p className="crumbs">{set.subject} / <span className="badge mint">{set.course} Practice</span></p><Link className="pill-button light" href={`/study-sets/${id}`}>← Back to Deck</Link><strong> / {set.course} Practice</strong></div><div className="flash-progress"><strong>Card {index + 1} of {set.cards.length} · {Math.round(((index + 1) / set.cards.length) * 100)}%</strong><div className="progress-track"><i style={{ width: `${((index + 1) / set.cards.length) * 100}%` }} /></div></div></div><div className="flashcards-layout"><div className="flash-main"><button className={`flash-card outlined-card ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((current) => !current)} aria-label={flipped ? "Show question" : "Show answer"}><span className="flash-card-heading"><span className="badge mint">♧ {set.subject} · {set.course}</span><span className="badge yellow">{flipped ? "ANSWER" : "QUESTION"}</span></span><div className="flash-card-content"><span className="flash-symbol">{flipped ? "💡" : "🎯"}</span><p>{flipped ? card.back : card.front}</p></div><span className="flip-hint">↻ Tap card or press <kbd>Space</kbd> to flip ✦</span></button><div className="flash-answer-actions"><button className="pill-button gold" onClick={() => next(false)}>↻ Still Learning</button><button className="pill-button mint-button" onClick={() => next(true)}>⊙ Got It!</button></div><div className="flash-nav"><button className="pill-button light" onClick={() => { setIndex((index - 1 + set.cards.length) % set.cards.length); setFlipped(false); }}>← Previous</button><span>Card {index + 1} of {set.cards.length}</span><button className="pill-button light" onClick={() => { setIndex((index + 1) % set.cards.length); setFlipped(false); }}>Next →</button></div></div><aside className="flash-aside"><div className="session-card outlined-card"><div className="section-title"><h3>Study Session ✦</h3><span className="badge yellow">☀ Active</span></div><div className="donut" style={{ "--pct": `${Math.round(known.length / set.cards.length * 100)}%` } as React.CSSProperties}><strong>{Math.round(known.length / set.cards.length * 100)}%</strong></div><div className="session-pills"><span>⚡ 4-day streak 🔥</span><span>+{known.length * 10} XP</span></div></div><div className="tip-card outlined-card"><h3>💡 Anime Study Tip ✦</h3><p>Say your answer out loud before flipping to reinforce the memory, like a classroom quiz!</p></div></aside></div></div>;
}
