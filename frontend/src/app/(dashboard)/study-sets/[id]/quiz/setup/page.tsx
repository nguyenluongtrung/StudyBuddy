"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import {
  createQuizAttempt,
  isApiSetId,
  normalizeStudySetId,
  serverSetId,
  studySetPath,
} from "@/lib/api/study-sets";

const formats = [
  {
    name: "Multiple Choice",
    icon: "▣",
    description: "Four answer choices for each question.",
  },
  {
    name: "True / False",
    icon: "⇄",
    description: "Quick questions for checking key facts.",
  },
  {
    name: "Mix of Both",
    icon: "▤",
    description: "Balanced practice for stronger retention.",
  },
];
const lengths = [
  { name: "5 Questions", detail: "~3 mins active study" },
  { name: "10 Balanced", detail: "~7 mins · Pace Focus" },
  { name: "15 Deep Dive", detail: "~12 mins comprehensive" },
];
const levels = [
  { name: "Level 1", detail: "Fundamental" },
  { name: "Level 2 · Balanced", detail: "Standard Exam" },
  { name: "Level 3 · Honors", detail: "Challenging" },
];

export default function QuizSetupPage() {
  const id = normalizeStudySetId(useParams<{ id: string }>().id);
  const router = useRouter();
  const { sets, loading, apiError } = useStudySets();
  const set = sets.find((item) => item.id === id);
  const [format, setFormat] = useState(2);
  const [length, setLength] = useState(1);
  const [level, setLevel] = useState(1);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  async function startQuiz() {
    setStarting(true);
    setStartError("");
    try {
      const config = { format, count: [5, 10, 15][length], level };
      sessionStorage.setItem(`studybuddy.quizConfig.${id}`, JSON.stringify(config));
      sessionStorage.removeItem(`studybuddy.quizAttempt.${id}`);
      if (isApiSetId(id)) {
        const attempt = await createQuizAttempt(serverSetId(id), {
          format: (["multiple_choice", "true_false", "mixed"] as const)[format],
          count: config.count,
          difficulty: level + 1,
        });
        sessionStorage.setItem(`studybuddy.quizAttempt.${id}`, String(attempt.id));
      }
      router.push(`${studySetPath(id)}/quiz`);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "Unable to start this quiz.");
      setStarting(false);
    }
  }
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
  return (
    <div className="quiz-setup-page">
      <div className="setup-heading">
        <div>
          <p className="crumbs">
            ◌ {set.subject} / <span className="badge mint">{set.course}</span> /
            Quiz Setup
          </p>
          <div className="setup-chips">
            <span>✦ SESSION BUILDER</span>
            <span>▣ PRACTICE YOUR STUDY SET</span>
          </div>
          <div className="setup-intro">
            <span className="badge mint">
              ✧ ANIME CLASSROOM STUDY ENGINE · CALIBRATION MODE
            </span>
            <h1>Customize Your Practice Quiz ✨</h1>
            <p>Tailor your session to focus on what you need most today.</p>
          </div>
        </div>
        <aside className="active-set-card outlined-card">
          <span>● ACTIVE STUDY SET</span>
          <h3>{set.title}</h3>
          <p>{set.cards.length} concepts ready to review ✨</p>
          <div>◷ Choose your quiz settings</div>
        </aside>
      </div>
      <SetupGroup
        number="1"
        title="Question Format"
        subtitle="Choose the format that matches your upcoming testing scenario."
        badge="Config: Format Select"
        items={formats}
        selected={format}
        onSelect={setFormat}
      />
      <SetupGroup
        number="2"
        title="Quiz Length & Pacing"
        subtitle="Calibrate for a quick dash or immersive review."
        badge="Config: Duration"
        items={lengths}
        selected={length}
        onSelect={setLength}
      />
      <SetupGroup
        number="3"
        title="Target Challenge Level"
        subtitle="Choose the cognitive depth of generated questions."
        badge="Config: Difficulty Tier"
        items={levels}
        selected={level}
        onSelect={setLevel}
      />
      <div className="setup-status">
        ◎ &nbsp; Built from your lecture notes &nbsp; ◉ Review each answer{" "}
        <span>✦ Ready to study</span>
      </div>
      <div className="setup-footer">
        <Link className="pill-button light" href={`${studySetPath(id)}`}>
          ← Back to Study Set
        </Link>
        <button
          className="pill-button dark"
          disabled={starting || set.questions.length === 0}
          onClick={startQuiz}
        >
          {starting ? "Starting quiz…" : "Start practice quiz →"}
        </button>
      </div>
      {startError && <p className="form-error" role="alert">{startError}</p>}
      {set.questions.length === 0 && <p className="form-error">Generate quiz questions for this study set before starting.</p>}
    </div>
  );
}

function SetupGroup({
  number,
  title,
  subtitle,
  badge,
  items,
  selected,
  onSelect,
}: {
  number: string;
  title: string;
  subtitle: string;
  badge: string;
  items: {
    name: string;
    detail?: string;
    description?: string;
    icon?: string;
  }[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="setup-group outlined-card">
      <div className="setup-group-head">
        <div>
          <span className="step-number">{number}</span>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        <span className="badge mint">{badge}</span>
      </div>
      <div className="setup-options">
        {items.map((item, index) => (
          <button
            className={`setup-option ${index === selected ? "selected" : ""}`}
            key={item.name}
            onClick={() => onSelect(index)}
          >
            <span className="option-check">
              {index === selected ? "●" : "○"}
            </span>
            {item.icon && <span className="option-icon">{item.icon}</span>}
            <strong>{item.name}</strong>
            <small>{item.detail || item.description}</small>
            <span className="option-footer">
              {index === selected ? "✦ Selected" : "◷ Choose this option"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
