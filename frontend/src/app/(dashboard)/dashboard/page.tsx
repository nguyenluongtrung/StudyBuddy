"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import { readActiveStudyUser, readLocalReviewQueue } from "@/lib/study-data";
import { getReviewToday, isApiSetId, studySetPath } from "@/lib/api/study-sets";
import { getExamPlans, type ExamPlan } from "@/lib/api/exam-plans";

export default function DashboardPage() {
  const { sets, loading, apiError } = useStudySets();
  const [name, setName] = useState("");
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [examPlans, setExamPlans] = useState<ExamPlan[]>([]);
  const [examPlanError, setExamPlanError] = useState(false);
  useEffect(() => {
    const update = () => setName(readActiveStudyUser());
    update();
    window.addEventListener("studybuddy:sets", update);
    return () => window.removeEventListener("studybuddy:sets", update);
  }, []);
  useEffect(() => {
    let active = true;
    getReviewToday()
      .then((cards) => {
        if (active) setDueCount(cards.length);
      })
      .catch(() => {
        if (active) setReviewError("Review count could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);
  const active = sets.slice(0, 3);
  useEffect(() => {
    getExamPlans().then(setExamPlans).catch(() => setExamPlanError(true));
  }, []);
  const localDueCount = readLocalReviewQueue(
    sets.filter((set) => !isApiSetId(set.id)),
  ).length;
  const totalDueCount = dueCount === null ? null : dueCount + localDueCount;
  const nextExam = examPlans.find((plan) => plan.daily_progress.days_left > 0);

  return (
    <div className="dashboard-page">
      <section className="welcome-card outlined-card">
        <div>
          <div className="badge-row">
            <span className="badge mint">Classroom</span>
          </div>
          <h1>Welcome back{name ? `, ${name}` : ""}!</h1>
          <p>Your study sets are ready when you are.</p>
        </div>
        <Link className="pill-button dark" href="/study-sets/new">
          New Study Set
        </Link>
      </section>
      {apiError && (
        <div className="form-error" role="alert">
          Saved account sets could not be loaded: {apiError}
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-card outlined-card">
          <small>STUDY SETS</small>
          <strong>{sets.length}</strong>
          <p>Sets in your collection</p>
        </div>
        <div className="stat-card outlined-card">
          <small>REVIEW TODAY</small>
          <strong>{totalDueCount === null ? "—" : totalDueCount}</strong>
          <p>
            {reviewError ||
              (totalDueCount === 0
                ? "All caught up for today"
                : "Flashcards due now")}
          </p>
          <Link className="pill-button dark" href="/review-today">
            Review today
          </Link>
        </div>
        <div className="stat-card outlined-card">
          <small>QUIZ QUESTIONS</small>
          <strong>
            {sets.reduce((sum, set) => sum + set.questions.length, 0)}
          </strong>
          <p>Questions to practice</p>
        </div>
      </div>
      <section className="dashboard-exam-plan outlined-card" aria-label="Exam study plan">
        <div>
          <h2>{nextExam ? nextExam.title : examPlanError ? "Exam plans unavailable" : "Have an exam coming up?"}</h2>
          {examPlanError ? <p>Open exam plans to try loading them again.</p> : nextExam ? (
            <p>{nextExam.daily_progress.new_cards_today} of {nextExam.daily_progress.daily_goal} new cards studied today
              {totalDueCount !== null ? ` · ${totalDueCount} cards in today’s review queue` : ""}</p>
          ) : <p>Set an exam date and choose what to study each day.</p>}
        </div>
        <Link className="pill-button dark" href="/exam-plans">{nextExam || examPlanError ? "View plans" : "Create a plan"}</Link>
      </section>
      <section>
        <div className="section-title">
          <h2>Continue Studying</h2>
          <Link href="/study-sets">View all sets →</Link>
        </div>
        {loading ? (
          <div className="empty-state">Loading study sets…</div>
        ) : active.length === 0 ? (
          <div className="empty-state">
            You have no study sets yet.{" "}
            <Link href="/study-sets/new">Create your first set</Link>.
          </div>
        ) : (
          <div className="continue-list">
            {active.map((set) => (
              <article className="continue-card outlined-card" key={set.id}>
                <div className="course-icon" aria-hidden="true">
                  {set.subject.slice(0, 1).toUpperCase()}
                </div>
                <div className="continue-info">
                  <div>
                    <span className="badge mint">{set.course}</span>{" "}
                    <small>
                      {set.cards.length} cards · {set.questions.length}{" "}
                      questions
                    </small>
                  </div>
                  <h3>{set.title}</h3>
                </div>
                <div className="continue-actions">
                  <Link
                    className="pill-button light"
                    href={studySetPath(set.id)}
                  >
                    View Set
                  </Link>
                  {set.cards.length > 0 && (
                    <Link
                      className="pill-button dark"
                      href={`${studySetPath(set.id)}/flashcards`}
                    >
                      Review Cards
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
