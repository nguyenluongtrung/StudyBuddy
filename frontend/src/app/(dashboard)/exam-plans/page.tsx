"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useStudySets } from "@/components/classroom/useStudySets";
import { ExamDatePicker } from "@/components/classroom/ExamDatePicker";
import { isApiSetId, serverSetId } from "@/lib/api/study-sets";
import {
  createExamPlan,
  deleteExamPlan,
  getExamPlans,
  updateExamPlan,
  type ExamPlan,
} from "@/lib/api/exam-plans";

export default function ExamPlansPage() {
  const { sets, loading: setsLoading, apiError } = useStudySets();
  const accountSets = sets.filter(
    (set) => isApiSetId(set.id) && set.cards.length > 0,
  );
  const [plans, setPlans] = useState<ExamPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    getExamPlans()
      .then(setPlans)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load exam plans.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setExamDate("");
    setSelectedIds([]);
  }

  function edit(plan: ExamPlan) {
    setEditingId(plan.id);
    setTitle(plan.title);
    setExamDate(plan.exam_date);
    setSelectedIds(plan.study_set_ids);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSet(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!examDate) {
      setError("Choose an exam date from the calendar.");
      return;
    }
    if (!selectedIds.length) {
      setError("Choose at least one study set with flashcards.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = {
        title: title.trim(),
        exam_date: examDate,
        study_set_ids: selectedIds,
      };
      if (editingId === null) await createExamPlan(input);
      else await updateExamPlan(editingId, input);
      setPlans(await getExamPlans());
      resetForm();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save exam plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(plan: ExamPlan) {
    if (!window.confirm(`Delete the plan for ${plan.title}?`)) return;
    setError("");
    try {
      await deleteExamPlan(plan.id);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      if (editingId === plan.id) resetForm();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to delete exam plan.",
      );
    }
  }

  return (
    <div className="exam-plans-page">
      <div className="exam-plans-heading">
        <div>
          <p className="crumbs">Classroom / Exam plans</p>
          <h1>Make room for the next exam</h1>
          <p>
            Pick the sets to cover. Your daily goal adjusts as you learn new
            cards.
          </p>
        </div>
      </div>
      {(error || apiError) && (
        <p className="form-error" role="alert">
          {error || apiError}
        </p>
      )}
      <div className="exam-plans-layout">
        <section
          className="exam-plan-editor outlined-card"
          aria-labelledby="plan-form-title"
        >
          <h2 id="plan-form-title">
            {editingId === null ? "Create an exam plan" : "Edit exam plan"}
          </h2>
          <form onSubmit={save}>
            <label htmlFor="exam-title">Exam name</label>
            <input
              id="exam-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Biology final"
              maxLength={120}
              required
            />
            <label htmlFor="exam-date">Exam date</label>
            <ExamDatePicker value={examDate} onChange={setExamDate} />
            <fieldset>
              <legend>Study sets to cover</legend>
              <p className="exam-plan-set-help">
                Choose sets saved to your account that have flashcards.
              </p>
              {setsLoading ? (
                <p>Loading study sets…</p>
              ) : accountSets.length === 0 ? (
                <p>
                  Add flashcards to an account study set before creating a plan.{" "}
                  <Link href="/study-sets/new">Create a study set</Link>
                </p>
              ) : (
                accountSets.map((set) => {
                  const id = serverSetId(set.id);
                  return (
                    <label className="exam-set-choice" key={set.id}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => toggleSet(id)}
                      />
                      <span>
                        <strong>{set.title}</strong>
                        <small>{set.cards.length} flashcards</small>
                      </span>
                    </label>
                  );
                })
              )}
            </fieldset>
            <div className="exam-plan-form-actions">
              <button
                className="pill-button dark"
                disabled={saving || setsLoading || accountSets.length === 0}
                type="submit"
              >
                {saving
                  ? "Saving…"
                  : editingId === null
                    ? "Create plan"
                    : "Save changes"}
              </button>
              {editingId !== null && (
                <button
                  className="pill-button light"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
        <section className="exam-plan-list" aria-labelledby="your-plans-title">
          <h2 id="your-plans-title">Your plans</h2>
          {loading ? (
            <p>Loading plans…</p>
          ) : plans.length === 0 ? (
            <div className="outlined-card exam-plan-empty">
              Your exam plans will appear here.
            </div>
          ) : (
            plans.map((plan) => {
              const progress = plan.daily_progress;
              const expired = progress.days_left === 0;
              return (
                <article className="outlined-card exam-plan-card" key={plan.id}>
                  <div className="exam-plan-card-top">
                    <div>
                      <h3>{plan.title}</h3>
                      <p>
                        {new Date(
                          `${plan.exam_date}T00:00:00`,
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="exam-plan-days">
                      {expired
                        ? "Exam date passed"
                        : `${progress.days_left} ${progress.days_left === 1 ? "day" : "days"} left`}
                    </span>
                  </div>
                  <p className="exam-plan-sets">
                    {plan.study_set_titles.join(" · ")}
                  </p>
                  {!expired && (
                    <div className="exam-plan-target">
                      <strong>
                        {progress.new_cards_today} / {progress.daily_goal}
                      </strong>
                      <span>new cards studied today</span>
                      <div
                        className="exam-plan-meter"
                        role="progressbar"
                        aria-label={`${plan.title} daily goal`}
                        aria-valuenow={progress.new_cards_today}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(progress.daily_goal, 1)}
                      >
                        <span
                          style={{
                            width: `${progress.daily_goal ? Math.min(100, (100 * progress.new_cards_today) / progress.daily_goal) : 100}%`,
                          }}
                        />
                      </div>
                      <small>
                        {progress.unseen_cards} new cards remaining ·{" "}
                        {progress.due_cards} scheduled reviews due
                      </small>
                    </div>
                  )}
                  <div className="exam-plan-card-actions">
                    {!expired && (
                      <Link className="pill-button dark" href="/review-today">
                        Study cards
                      </Link>
                    )}
                    <button
                      className="pill-button light"
                      type="button"
                      onClick={() => edit(plan)}
                    >
                      Edit
                    </button>
                    <button
                      className="exam-plan-delete"
                      type="button"
                      onClick={() => remove(plan)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
