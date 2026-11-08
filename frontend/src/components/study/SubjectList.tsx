"use client";

import { useEffect, useState } from "react";
import { createSubject, getSubjects } from "@/lib/api/subjects";
import type { Subject } from "@/types";

export function SubjectList() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  useEffect(() => { getSubjects().then(setSubjects).catch(() => setSubjects([])); }, []);
  async function addSubject(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const subject = await createSubject(name.trim());
    setSubjects((current) => [...current, subject]);
    setName("");
  }
  return <section className="panel"><div className="section-heading"><div><p className="eyebrow">Your learning map</p><h2>Subjects</h2></div><span className="count">{subjects.length} total</span></div><form className="inline-form" onSubmit={addSubject}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Add a subject…" /><button className="button" type="submit">Add</button></form><div className="subject-list">{subjects.map((subject) => <div className="subject-row" key={subject.id}><span className="dot" style={{ background: subject.color }} /><span>{subject.name}</span><span className="row-arrow">↗</span></div>)}{subjects.length === 0 && <p className="muted">Your first subject is waiting to be added.</p>}</div></section>;
}
