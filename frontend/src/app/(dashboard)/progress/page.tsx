"use client";

import Link from "next/link";
import { useStudySets } from "@/components/classroom/useStudySets";

export default function ProgressPage() {
  const { sets } = useStudySets();
  return (
    <div className="simple-page">
      <p className="crumbs">Classroom / Progress</p>
      <h1>Your study collection</h1>
      <p>Review the material you have saved so far.</p>
      <div className="stats-grid">
        <div className="stat-card outlined-card">
          <small>STUDY SETS</small>
          <strong>{sets.length}</strong>
          <p>Sets created</p>
        </div>
        <div className="stat-card outlined-card">
          <small>FLASHCARDS</small>
          <strong>
            {sets.reduce((sum, set) => sum + set.cards.length, 0)}
          </strong>
          <p>Cards to review</p>
        </div>
        <div className="stat-card outlined-card">
          <small>QUIZ QUESTIONS</small>
          <strong>
            {sets.reduce((sum, set) => sum + set.questions.length, 0)}
          </strong>
          <p>Questions to practice</p>
        </div>
      </div>
      <Link className="pill-button dark" href="/study-sets">
        Review study sets →
      </Link>
    </div>
  );
}
