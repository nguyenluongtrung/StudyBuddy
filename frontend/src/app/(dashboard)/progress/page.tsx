"use client";

import Link from "next/link";
import { useStudySets } from "@/components/classroom/useStudySets";

export default function ProgressPage() { const { sets } = useStudySets(); return <div className="simple-page"><p className="crumbs">Classroom / Progress</p><h1>Your progress ✨</h1><p>Keep the momentum going, one concept at a time.</p><div className="stats-grid"><div className="stat-card outlined-card"><small>STUDY SETS</small><strong>{sets.length}</strong><p>Curated decks</p></div><div className="stat-card outlined-card"><small>FLASHCARDS</small><strong>{sets.reduce((sum, set) => sum + set.cards.length, 0)}</strong><p>Concepts to review</p></div><div className="stat-card outlined-card"><small>AVERAGE MASTERY</small><strong>{sets.length ? Math.round(sets.reduce((sum, set) => sum + set.mastery, 0) / sets.length) : 0}%</strong><p>Across all sets</p></div></div><Link className="pill-button dark" href="/study-sets">Review study sets →</Link></div>; }
