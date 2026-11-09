"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import {
  isApiSetId,
  normalizeStudySetId,
  studySetPath,
} from "@/lib/api/study-sets";
import {
  saveResult,
  type QuizAnswer,
  type QuizQuestion,
} from "@/lib/study-data";
import ApiQuiz from "@/components/classroom/ApiQuiz";

export default function QuizPage() {
  const id = normalizeStudySetId(useParams<{ id: string }>().id);
  const router = useRouter();
  const { sets, loading, apiError } = useStudySets();
  const set = sets.find((item) => item.id === id);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [count, setCount] = useState(10);
  const [format, setFormat] = useState(2);
  const [level, setLevel] = useState(1);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    try {
      const config = JSON.parse(
        sessionStorage.getItem(`studybuddy.quizConfig.${id}`) || "{}",
      );
      if (config.count) setCount(config.count);
      if (typeof config.format === "number") setFormat(config.format);
      if (typeof config.level === "number") setLevel(config.level);
    } catch {
      /* use default */
    }
  }, [id]);
  useEffect(() => {
    const timer = window.setInterval(
      () => setSeconds((current) => current + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const questions = useMemo<QuizQuestion[]>(() => {
    if (!set?.questions.length) return [];
    const ordered =
      level === 2
        ? [...set.questions].reverse()
        : level === 0
          ? [...set.questions].sort(
              (a, b) => a.question.length - b.question.length,
            )
          : set.questions;
    return ordered.slice(0, count).map((question, questionIndex) => {
      if (format === 0 || (format === 2 && questionIndex % 2 === 0))
        return question;
      const falseAnswer = question.answers.find(
        (_, answerIndex) => answerIndex !== question.correct,
      );
      const useTrueStatement = questionIndex % 2 === 0;
      return {
        question: `True or false: ${question.question} — ${useTrueStatement ? question.answers[question.correct] : falseAnswer || "None of these"}`,
        answers: ["True", "False"],
        correct: useTrueStatement ? 0 : 1,
        explanation: question.explanation,
      };
    });
  }, [set, count, format, level]);
  if (isApiSetId(id))
    return <ApiQuiz id={id} set={set} loading={loading} apiError={apiError} />;
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
  if (!questions.length)
    return (
      <div className="empty-state">
        This study set has no quiz questions yet.{" "}
        <Link href={`${studySetPath(id)}/edit`}>Add notes</Link>
      </div>
    );
  const question = questions[index];
  function goTo(next: number) {
    const updated =
      selected === null
        ? answers
        : [
            ...answers.filter((answer) => answer.questionIndex !== index),
            { questionIndex: index, selected, seconds },
          ];
    setAnswers(updated);
    if (next >= questions.length) {
      saveResult({
        setId: id,
        answers: updated,
        questions,
        completedAt: new Date().toISOString(),
      });
      router.push(`${studySetPath(id)}/results`);
    } else {
      setIndex(next);
      setSelected(
        updated.find((answer) => answer.questionIndex === next)?.selected ??
          null,
      );
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
            <Link href={`${studySetPath(id)}`}>× Exit Quiz</Link>
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
              >
                <span>{String.fromCharCode(65 + answerIndex)}</span>
                <p>{answer}</p>
                {selected === answerIndex && <b>✓</b>}
              </button>
            ))}
          </div>
          <div className="quiz-bottom">
            <button
              className="pill-button light"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
            >
              ← Previous Question
            </button>
            <button
              className="pill-button dark"
              disabled={selected === null}
              onClick={() => goTo(index + 1)}
            >
              {index === questions.length - 1
                ? "Finish Quiz →"
                : "Next Question →"}
            </button>
          </div>
        </section>
        <div className="question-dots">
          {questions.map((_, dotIndex) => (
            <button
              aria-label={`Question ${dotIndex + 1}`}
              disabled={
                dotIndex > index &&
                !answers.some((answer) => answer.questionIndex === dotIndex)
              }
              key={dotIndex}
              className={
                dotIndex === index
                  ? "current"
                  : answers.some((answer) => answer.questionIndex === dotIndex)
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
