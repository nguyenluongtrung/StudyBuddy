"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStudySets } from "./useStudySets";
import { makeCards, makeQuestions, type StudySet } from "@/lib/study-data";

export function StudySetEditor() {
  const id = useParams<{ id?: string }>().id;
  const router = useRouter();
  const { sets, updateSets } = useStudySets();
  const existing = id ? sets.find((set) => set.id === id) : undefined;
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Neuroscience");
  const [course, setCourse] = useState("NEUR 201");
  const [notes, setNotes] = useState("");
  const [makeFlashcards, setMakeFlashcards] = useState(true);
  const [makeQuiz, setMakeQuiz] = useState(true);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (existing) { setTitle(existing.title); setSubject(existing.subject); setCourse(existing.course); setNotes(existing.notes); } }, [existing?.id]);
  function save() {
    if (!title.trim() || !notes.trim()) { setError("Add a title and notes to save your study set."); return; }
    const newId = id || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
    const cards = makeFlashcards ? makeCards(notes) : existing?.cards || [];
    const next: StudySet = { id: newId, title: title.trim(), subject: subject.trim() || "General", course: course.trim() || "STUDY", notes: notes.trim(), cards, questions: makeQuiz ? makeQuestions(cards.length ? cards : makeCards(notes)) : existing?.questions || [], mastery: existing?.mastery || 0, updatedAt: new Date().toISOString() };
    updateSets(id ? sets.map((set) => set.id === id ? next : set) : [next, ...sets]);
    router.push(`/study-sets/${newId}`);
  }
  async function uploadFile(file?: File) {
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) { setError("PDF and slide import needs a document parser. Paste the text from your file, or upload a .txt or .md note."); return; }
    setNotes(await file.text());
    setError("");
  }
  return <div className="editor-page"><p className="crumbs"><Link href="/study-sets">⌂ My Study Sets</Link> / <span className="badge yellow">✦ {course} · Active Editor</span></p><h1>{id ? "Edit Study Set" : "Create New Study Set"} <span>🌱</span></h1><p className="page-intro">Paste your course notes. Study Buddy will turn each note into active recall flashcards and diagnostic quiz questions.</p><section className="editor-section outlined-card"><span className="section-tab">LESSON OVERVIEW</span><label htmlFor="study-title">Title</label><input id="study-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Synaptic Transmission & Action Potentials" /><label htmlFor="study-subject">Course / Subject</label><div className="editor-inline"><input id="study-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" /><input aria-label="Course code" value={course} onChange={(event) => setCourse(event.target.value)} placeholder="Course code" /></div></section><section className="editor-section notes-section outlined-card"><div className="editor-tabs"><span className="selected">☰ Paste Notes</span><button type="button" className="upload-notes-button" onClick={() => fileInput.current?.click()}>Upload PDF / Slides</button><span className="ready-badge">Ready to parse ✨</span></div><div className="notes-body"><input ref={fileInput} className="visually-hidden" type="file" accept=".txt,.md,.pdf,.pptx" onChange={(event) => uploadFile(event.target.files?.[0])} /><label htmlFor="study-notes">Paste your notes, lecture transcript, or study summary below:</label><textarea id="study-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Paste your lecture notes here. Separate each key idea with a new line or paragraph..." rows={13} /><small>Each paragraph becomes a flashcard. Review generated content before using it for high-stakes studying.</small></div></section><section className="editor-section outlined-card output-section"><span className="section-tab yellow-tab">OUTPUT MODULES</span><h2>What would you like to create? 🎯</h2><p>Select the study activities to generate from these notes.</p><div className="output-grid"><label className={makeFlashcards ? "selected" : ""}><input type="checkbox" checked={makeFlashcards} onChange={(event) => setMakeFlashcards(event.target.checked)} /><span><strong>Flashcard Deck <span className="badge mint">Spaced Rep</span></strong><small>Spaced repetition of terms, concept definitions & mechanisms</small></span></label><label className={makeQuiz ? "selected" : ""}><input type="checkbox" checked={makeQuiz} onChange={(event) => setMakeQuiz(event.target.checked)} /><span><strong>Practice Quiz <span className="badge yellow">Diagnostic</span></strong><small>Multiple choice checks from your notes</small></span></label></div></section>{error && <p className="form-error" role="alert">{error}</p>}<div className="editor-footer"><span>◉ Saved in this browser<br/><small>All modifications saved locally in your browser</small></span><div><Link className="pill-button light" href={id ? `/study-sets/${id}` : "/study-sets"}>Cancel</Link><button className="pill-button dark" onClick={save}>✦ Save & Generate Study Pack</button></div></div></div>;
}
