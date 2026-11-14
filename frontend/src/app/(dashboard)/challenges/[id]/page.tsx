"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createQuizChallenge, getQuizChallenges, studySetPath, type QuizChallenge } from "@/lib/api/study-sets";

export default function ChallengeResultPage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const [challenge, setChallenge] = useState<QuizChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getQuizChallenges().then((items) => {
      if (active) setChallenge(items.find((item) => item.id === id) || null);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load this challenge.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function retry() {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const friendId = challenge.is_challenger ? challenge.opponent_id : challenge.challenger_id;
      const next = await createQuizChallenge(challenge.study_set_id, friendId, challenge.question_count);
      router.push(`/challenges/${next.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create another challenge.");
      setBusy(false);
    }
  }

  if (loading) return <div className="empty-state">Loading challenge…</div>;
  if (!challenge) return <div className="empty-state" role="alert">
    {error || "Challenge not found."} <Link href="/challenges">Back to challenges</Link>
  </div>;
  const friend = challenge.is_challenger ? challenge.opponent_name : challenge.challenger_name;
  const complete = challenge.my_status === "completed" && challenge.other_status === "completed";
  const result = complete && challenge.my_score !== null && challenge.other_score !== null
    ? challenge.my_score > challenge.other_score ? "You won this round!"
      : challenge.my_score < challenge.other_score ? `${friend} won this round.` : "It's a tie!"
    : challenge.my_status === "completed" ? `Waiting for ${friend} to finish.` : "Your quiz is ready.";
  return <div className="challenge-result-page">
    <p className="crumbs"><Link href="/challenges">Challenges</Link> / {challenge.study_set_title}</p>
    <section className="challenge-result-hero outlined-card">
      <span className="badge mint">{challenge.question_count} matching questions</span>
      <h1>{result}</h1>
      <p>{challenge.study_set_title}</p>
      <div className="challenge-result-scores">
        <div><span>You</span><strong>{challenge.my_score === null ? "—" : `${challenge.my_score}%`}</strong></div>
        <span aria-hidden="true">vs</span>
        <div><span>{friend}</span><strong>{complete ? `${challenge.other_score}%` : "—"}</strong></div>
      </div>
      <div className="challenge-result-actions">
        {challenge.my_status !== "completed" && <Link className="pill-button dark" href="/challenges">Take challenge</Link>}
        {complete && <button className="pill-button dark" disabled={busy} onClick={retry}>
          {busy ? "Creating…" : "Challenge again"}
        </button>}
        <Link className="pill-button light" href={studySetPath(`api-${challenge.study_set_id}`)}>Study this set</Link>
        <Link href="/challenges">All challenges</Link>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  </div>;
}
