"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import { readActiveStudyUser, readResult, type QuizResult } from "@/lib/study-data";

export default function ResultsPage() {
  const id = useParams<{ id: string }>().id;
  const { sets } = useStudySets();
  const set = sets.find((item) => item.id === id);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("Maya");
  useEffect(() => { const update = () => { setResult(readResult(id)); setName(readActiveStudyUser() || "Maya"); setLoaded(true); }; update(); window.addEventListener("studybuddy:sets", update); return () => window.removeEventListener("studybuddy:sets", update); }, [id]);
  const [filter, setFilter] = useState("All");
  if (!set) return <div className="empty-state">Study set not found. <Link href="/study-sets">Back to my study sets</Link></div>;
  if (!loaded) return <div className="empty-state">Loading quiz results…</div>;
  if (!result) return <div className="empty-state">No quiz result yet. <Link href={`/study-sets/${id}/quiz/setup`}>Take a practice quiz</Link></div>;
  const reviews = result.answers.map((answer) => ({ ...answer, question: (result.questions || set.questions)[answer.questionIndex] })).filter((review) => review.question);
  const correct = reviews.filter((review) => review.selected === review.question.correct).length;
  const percentage = reviews.length ? Math.round(correct / reviews.length * 100) : 0;
  const visible = reviews.filter((review) => filter === "All" || (filter === "Missed" ? review.selected !== review.question.correct : review.selected === review.question.correct));
  return <div className="results-page"><p className="crumbs">{set.subject} / {set.title} / <span className="badge mint">Quiz Results</span></p><section className="results-hero outlined-card"><div><span className="badge peach">🚀 QUIZ COMPLETED · {set.course}</span><h1>Great job, {name}! You scored<br/><mark>{correct} out of {reviews.length}</mark></h1><p>{correct === reviews.length ? "You got every question right. Keep your recall sharp with a quick flashcard review." : "Review the missed questions below, then try another round when you’re ready."}</p></div><div className="score-card"><strong>{percentage}%</strong><span>{percentage >= 80 ? "PROFICIENT" : "KEEP PRACTICING"}<br/><small>{correct}/{reviews.length} correct</small></span></div></section><div className="results-actions"><Link className="pill-button dark" href={`/study-sets/${id}/quiz/setup`}>↻ Practice Again ({reviews.length - correct} missed)</Link><Link className="pill-button light" href={`/study-sets/${id}/flashcards`}>♧ Review Flashcards ({set.cards.length})</Link><Link href={`/study-sets/${id}`}>← Back to Study Set</Link></div><div className="review-header"><div><h2>Question Review <span className="badge light">{reviews.length} items</span></h2><p>Review what went well and refresh tricky concepts with explanations.</p></div><div className="review-filters">{["All", "Missed", "Correct"].map((item) => <button className={filter === item ? "selected" : ""} key={item} onClick={() => setFilter(item)}>{item} ({item === "All" ? reviews.length : item === "Missed" ? reviews.length - correct : correct})</button>)}</div></div><div className="review-list">{visible.map((review) => <article className="review-card outlined-card" key={review.questionIndex}><div className="review-meta"><span className={`badge ${review.selected === review.question.correct ? "mint" : "coral"}`}>{review.selected === review.question.correct ? "✓ Correct" : "⚑ Missed"} · Question {review.questionIndex + 1}</span><small>Answered in {review.seconds}s</small></div><h3>{review.question.question}</h3><div className="review-answers"><div className={review.selected === review.question.correct ? "correct" : "incorrect"}><small>YOUR ANSWER {review.selected === review.question.correct ? "(CORRECT)" : ""}</small><p>{review.question.answers[review.selected] || "No answer selected"}</p></div>{review.selected !== review.question.correct && <div className="correct"><small>✓ CORRECT ANSWER</small><p>{review.question.answers[review.question.correct]}</p></div>}</div><div className="explanation"><strong>💡 A QUICK EXPLANATION</strong><p>{review.question.explanation}</p></div></article>)}</div>{visible.length === 0 && <div className="empty-state">No {filter.toLowerCase()} questions in this quiz.</div>}<div className="momentum-card outlined-card"><div>🌟 <strong>Keep the momentum going! ✦</strong><p>Reviewing flashcards takes less than 2 minutes.</p></div><Link className="pill-button dark" href={`/study-sets/${id}/flashcards`}>Start Flashcard Review →</Link></div></div>;
}
