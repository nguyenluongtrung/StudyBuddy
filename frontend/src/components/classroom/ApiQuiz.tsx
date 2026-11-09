"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  finishQuizAttempt,
  getLatestQuizAttempt,
  getQuizAttempt,
  saveQuizAnswer,
  serverSetId,
  studySetPath,
  type ApiQuizAttempt,
} from "@/lib/api/study-sets";
import type { StudySet } from "@/lib/study-data";

export default function ApiQuiz({
  id,
  set,
  loading,
  apiError,
}: {
  id: string;
  set?: StudySet;
  loading: boolean;
  apiError: string;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<ApiQuizAttempt | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let active = true;
    const stored = Number(
      sessionStorage.getItem(`studybuddy.quizAttempt.${id}`),
    );
    const request = stored
      ? getQuizAttempt(serverSetId(id), stored)
      : getLatestQuizAttempt(serverSetId(id));
    request
      .then((value) => {
        if (!active) return;
        if (value?.status !== "in_progress") {
          setError("No active quiz. Choose your settings to start a new one.");
          return;
        }
        setAttempt(value);
        sessionStorage.setItem(
          `studybuddy.quizAttempt.${id}`,
          String(value.id),
        );
        const firstOpen = value.questions.findIndex(
          (item) => item.selected_index === null,
        );
        const next = firstOpen < 0 ? 0 : firstOpen;
        setIndex(next);
        setSelected(value.questions[next]?.selected_index ?? null);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load this quiz.",
          );
      })
      .finally(() => {
        if (active) setLoadingAttempt(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setSeconds((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  if (!set)
    return (
      <div className="empty-state">
        {loading ? "Loading study set…" : apiError || "Study set not found."}
      </div>
    );
  if (loadingAttempt)
    return <div className="empty-state">Loading practice quiz…</div>;
  if (!attempt)
    return (
      <div className="empty-state" role="alert">
        {error} <Link href={`${studySetPath(id)}/quiz/setup`}>Quiz setup</Link>
      </div>
    );
  const questions = attempt.questions;
  const question = questions[index];
  if (!question)
    return (
      <div className="empty-state">
        This quiz has no questions.{" "}
        <Link href={`${studySetPath(id)}/quiz/setup`}>Quiz setup</Link>
      </div>
    );

  async function goTo(next: number) {
    if (selected === null || busy || !attempt) return;
    setBusy(true);
    setError("");
    try {
      await saveQuizAnswer(
        serverSetId(id),
        attempt.id,
        attempt.questions[index].id,
        selected,
        seconds,
      );
      const updated = attempt.questions.map((item, position) =>
        position === index
          ? { ...item, selected_index: selected, seconds_spent: seconds }
          : item,
      );
      setAttempt({ ...attempt, questions: updated });
      if (next >= updated.length) {
        if (updated.some((item) => item.selected_index === null)) {
          setError("Answer every question before finishing.");
          return;
        }
        await finishQuizAttempt(serverSetId(id), attempt.id);
        sessionStorage.removeItem(`studybuddy.quizAttempt.${id}`);
        router.push(`${studySetPath(id)}/results`);
      } else {
        setIndex(next);
        setSelected(updated[next].selected_index);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save your answer. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="quiz-page">
      <p className="crumbs">
        {set.subject} /{" "}
        <span className="badge mint">{set.course} Practice</span>
      </p>
      <div className="quiz-container">
        <div className="quiz-progress outlined-card">
          <div>
            <span className="badge mint">
              {index + 1}/{questions.length}
            </span>
            <strong>
              Question {index + 1} of {questions.length}{" "}
              <small>
                · {Math.round((index / questions.length) * 100)}% completed
              </small>
            </strong>
            <span className="badge yellow">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")} ⏱
            </span>
            <Link href={studySetPath(id)}>× Exit Quiz</Link>
          </div>
          <div className="progress-track">
            <i style={{ width: `${(index / questions.length) * 100}%` }} />
          </div>
        </div>
        <section className="question-card outlined-card">
          <div className="question-tags">
            <span className="badge peach">✦ {set.subject} Practice</span>
            <span className="badge light">{set.course}</span>
          </div>
          <h1>{question.question}</h1>
          <div className="answer-list">
            {question.answers.map((answer, answerIndex) => (
              <button
                className={selected === answerIndex ? "selected" : ""}
                key={answerIndex}
                onClick={() => setSelected(answerIndex)}
                disabled={busy}
                aria-pressed={selected === answerIndex}
              >
                <span>{String.fromCharCode(65 + answerIndex)}</span>
                <p>{answer}</p>
                {selected === answerIndex && <b>✓</b>}
              </button>
            ))}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="quiz-bottom">
            <button
              className="pill-button light"
              disabled={index === 0 || busy}
              onClick={() => goTo(index - 1)}
            >
              ← Previous Question
            </button>
            <button
              className="pill-button dark"
              disabled={selected === null || busy}
              onClick={() => goTo(index + 1)}
            >
              {busy
                ? "Saving…"
                : index === questions.length - 1
                  ? "Finish Quiz →"
                  : "Next Question →"}
            </button>
          </div>
        </section>
        <div className="question-dots">
          {questions.map((item, dotIndex) => (
            <button
              aria-label={`Question ${dotIndex + 1}`}
              disabled={
                busy || (dotIndex > index && item.selected_index === null)
              }
              key={dotIndex}
              className={
                dotIndex === index
                  ? "current"
                  : item.selected_index !== null
                    ? "answered"
                    : ""
              }
              onClick={() => goTo(dotIndex)}
            >
              {dotIndex + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
