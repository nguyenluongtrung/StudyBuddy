"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStudySets } from "./useStudySets";
import { makeCards, makeQuestions, type StudySet } from "@/lib/study-data";
import { createSubject, getSubjects } from "@/lib/api/subjects";
import { apiSetId, createApiStudySet, generateApiStudySet, getApiStudySet, isApiSetId, normalizeStudySetId, serverSetId, studySetPath, toStudySet, updateApiStudySet } from "@/lib/api/study-sets";
import type { Subject } from "@/types";

export function StudySetEditor() {
  const routeId = useParams<{ id?: string }>().id;
  const id = routeId ? normalizeStudySetId(routeId) : undefined;
  const router = useRouter();
  const { sets, updateSets } = useStudySets();
  const localEdit = Boolean(id && !isApiSetId(id));
  const existing = localEdit ? sets.find((set) => set.id === id) : undefined;
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [localSubject, setLocalSubject] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [course, setCourse] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [storedFile, setStoredFile] = useState("");
  const [makeFlashcards, setMakeFlashcards] = useState(true);
  const [makeQuiz, setMakeQuiz] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"saving" | "generating" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSubjects().then((items) => { setSubjects(items); setSubjectId((current) => current || String(items[0]?.id || "")); })
      .catch(() => setError("Unable to load subjects. Refresh the page and try again."));
  }, []);
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title); setLocalSubject(existing.subject); setCourse(existing.course);
    setNotes(existing.notes); setMakeFlashcards(true); setMakeQuiz(true);
  }, [existing?.id]);
  useEffect(() => {
    if (!id || !isApiSetId(id)) return;
    getApiStudySet(serverSetId(id)).then((data) => {
      if (!data.is_owner) { setAccessDenied(true); return; }
      const set = toStudySet(data);
      setTitle(set.title); setSubjectId(String(set.subjectId)); setCourse(data.course_code);
      setTopic(data.topic); setNotes(set.pastedNotes || ""); setOriginalNotes(set.pastedNotes || ""); setStoredFile(set.fileName || "");
      setMakeFlashcards(data.generate_flashcards); setMakeQuiz(data.generate_quiz);
    }).catch((err) => setError(err instanceof Error ? err.message : "Unable to load this study set."));
  }, [id]);

  async function addSubject() {
    if (!newSubject.trim()) return;
    try {
      const item = await createSubject(newSubject.trim());
      setSubjects((current) => [...current, item]); setSubjectId(String(item.id)); setNewSubject(""); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create subject."); }
  }

  async function save() {
    if (accessDenied) return;
    setError("");
    if (!title.trim() || (!notes.trim() && !file && !storedFile)) { setError("Add a title and notes or a file."); return; }
    if (!makeFlashcards && !makeQuiz) { setError("Select flashcards, a quiz, or both."); return; }
    if (localEdit) {
      if (file && !/\.(txt|md)$/i.test(file.name)) { setError("Legacy browser sets can only import .txt or .md files."); return; }
      const localNotes = file ? `${notes.trim()}\n\n${await file.text()}`.trim() : notes.trim();
      if (!localNotes) { setError("Add notes to this set."); return; }
      const cards = makeFlashcards ? makeCards(localNotes) : existing?.cards || [];
      const next: StudySet = { id: id!, title: title.trim(), subject: localSubject.trim() || "General", course: course.trim() || "STUDY", notes: localNotes,
        cards, questions: makeQuiz ? makeQuestions(cards.length ? cards : makeCards(localNotes)) : existing?.questions || [], mastery: existing?.mastery || 0, updatedAt: new Date().toISOString() };
      updateSets(sets.map((set) => set.id === id ? next : set));
      router.push(studySetPath(id!));
      return;
    }
    if (!subjectId) { setError("Choose or create a subject."); return; }
    const data = new FormData();
    data.set("title", title.trim()); data.set("subject_id", subjectId);
    data.set("course_code", course.trim()); data.set("topic", topic.trim());
    if (!id || notes.trim() !== originalNotes.trim()) data.set("notes", notes.trim());
    data.set("generate_flashcards", String(makeFlashcards)); data.set("generate_quiz", String(makeQuiz));
    if (file) data.set("file", file);
    setBusy(true); setPhase("saving");
    try {
      if (id && isApiSetId(id)) {
        await updateApiStudySet(serverSetId(id), data);
        window.dispatchEvent(new Event("studybuddy:api-sets"));
        router.push(studySetPath(id));
      } else {
        const saved = await createApiStudySet(data);
        window.dispatchEvent(new Event("studybuddy:api-sets"));
        setPhase("generating");
        try { await generateApiStudySet(saved.id); } catch { /* Saved notes remain available on the detail page. */ }
        window.dispatchEvent(new Event("studybuddy:api-sets"));
        router.push(studySetPath(apiSetId(saved.id)));
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save study set."); }
    finally { setBusy(false); setPhase(null); }
  }

  if (accessDenied) return <div className="empty-state">Only the owner can edit this study set. <Link href={studySetPath(id!)}>Back to study set</Link></div>;
  return <div className="editor-page">
    <p className="crumbs"><Link href="/study-sets">My Study Sets</Link> / <span className="badge yellow">{id ? "Edit" : "New"} Study Set</span></p>
    <h1>{id ? "Edit Study Set" : "Create New Study Set"} <span>🌱</span></h1>
    <p className="page-intro">Add notes and a document to make flashcards and practice questions from your material.</p>
    <section className="editor-section outlined-card"><span className="section-tab">LESSON OVERVIEW</span>
      <label htmlFor="study-title">Title</label><input id="study-title" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Synaptic Transmission" />
      <label htmlFor="study-subject">Subject</label>
      {localEdit ? <input id="study-subject" value={localSubject} onChange={(event) => setLocalSubject(event.target.value)} /> : <>
        <select id="study-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Choose a subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <div className="editor-inline"><input aria-label="New subject name" value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Or add a new subject" /><button type="button" className="pill-button light" onClick={addSubject}>Add subject</button></div>
      </>}
      <label htmlFor="study-course">Course code</label><input id="study-course" maxLength={40} value={course} onChange={(event) => setCourse(event.target.value)} placeholder="e.g. NEUR 201" />
      {!localEdit && <><label htmlFor="study-topic">Topic (optional)</label><input id="study-topic" maxLength={120} value={topic} onChange={(event) => setTopic(event.target.value)} /></>}
    </section>
    <section className="editor-section notes-section outlined-card"><div className="editor-tabs"><span className="selected">Paste Notes</span><button type="button" className="upload-notes-button" onClick={() => fileInput.current?.click()}>Choose a file</button><span className="ready-badge">.txt · .md · .pdf · .pptx</span></div>
      <div className="notes-body"><input ref={fileInput} className="visually-hidden" type="file" accept={localEdit ? ".txt,.md" : ".txt,.md,.pdf,.pptx"} onChange={(event) => setFile(event.target.files?.[0] || null)} />
        {(file || storedFile) && <p className="selected-file">Source file: {file?.name || storedFile} {file && <button type="button" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }}>Remove</button>}</p>}
        <label htmlFor="study-notes">Notes (combined with your uploaded file)</label><textarea id="study-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Paste your lecture notes here..." rows={13} />
        <small>Review generated activities before using them for important studying.</small></div></section>
    <section className="editor-section outlined-card output-section"><span className="section-tab yellow-tab">OUTPUT MODULES</span><h2>What would you like to create?</h2><p>Select the study activities to generate.</p>
      <div className="output-grid"><label className={makeFlashcards ? "selected" : ""}><input type="checkbox" checked={makeFlashcards} disabled={Boolean(id && isApiSetId(id))} onChange={(event) => setMakeFlashcards(event.target.checked)} /><span><strong>Flashcard Deck</strong><small>Active recall from your notes</small></span></label>
        <label className={makeQuiz ? "selected" : ""}><input type="checkbox" checked={makeQuiz} disabled={Boolean(id && isApiSetId(id))} onChange={(event) => setMakeQuiz(event.target.checked)} /><span><strong>Practice Quiz</strong><small>Multiple choice checks</small></span></label></div></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="editor-footer"><span>{phase === "saving" ? "Saving your set…" : phase === "generating" ? "Generating study activities…" : id && isApiSetId(id) ? "Source changes are regenerated on request." : "Saved to your account"}</span>
      <div><Link className="pill-button light" href={id ? studySetPath(id) : "/study-sets"}>Cancel</Link><button className="pill-button dark" disabled={busy} onClick={save}>{busy ? "Working…" : id ? "Save changes" : "Save & Generate"}</button></div></div>
  </div>;
}
