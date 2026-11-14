"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudySets } from "@/components/classroom/useStudySets";
import ClassroomSelect from "@/components/classroom/ClassroomSelect";
import {
  createQuizChallenge, getChallengePlayers, getQuizChallenges, isApiSetId,
  serverSetId, startQuizChallenge, studySetPath,
  type ChallengePlayer, type QuizChallenge,
} from "@/lib/api/study-sets";

export default function ChallengesPage() {
  const router = useRouter();
  const { sets, loading: setsLoading, apiError } = useStudySets();
  const [challenges, setChallenges] = useState<QuizChallenge[]>([]);
  const [players, setPlayers] = useState<ChallengePlayer[]>([]);
  const [setId, setSetId] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [playersError, setPlayersError] = useState("");
  const eligibleSets = sets.filter((set) => isApiSetId(set.id) && set.questions.length > 0);

  useEffect(() => {
    let active = true;
    getQuizChallenges().then((items) => { if (active) setChallenges(items); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load challenges."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!eligibleSets.length || setId) return;
    const requested = new URLSearchParams(window.location.search).get("set");
    setSetId(eligibleSets.find((set) => set.id === requested)?.id || eligibleSets[0].id);
  }, [eligibleSets, setId]);

  useEffect(() => {
    let active = true;
    setPlayers([]);
    setOpponentId("");
    setPlayersError("");
    if (!setId) return;
    getChallengePlayers(serverSetId(setId))
      .then((items) => { if (active) setPlayers(items); })
      .catch((reason) => { if (active) setPlayersError(reason instanceof Error ? reason.message : "Unable to load friends."); });
    return () => { active = false; };
  }, [setId]);

  async function createChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setId || !opponentId) return;
    setBusy(true);
    setError("");
    try {
      const created = await createQuizChallenge(serverSetId(setId), Number(opponentId), count);
      setChallenges((items) => [created, ...items]);
      setOpponentId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the challenge.");
    } finally { setBusy(false); }
  }

  async function begin(challenge: QuizChallenge) {
    setBusy(true);
    setError("");
    try {
      const attempt = await startQuizChallenge(challenge.id);
      if (attempt.status === "completed") {
        router.push(`/challenges/${challenge.id}`);
        return;
      }
      const localId = `api-${challenge.study_set_id}`;
      sessionStorage.setItem(`studybuddy.quizAttempt.${localId}`, String(attempt.id));
      sessionStorage.setItem(`studybuddy.quizChallenge.${localId}`, String(challenge.id));
      router.push(`${studySetPath(localId)}/quiz`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start the challenge.");
      setBusy(false);
    }
  }

  return <div className="challenges-page">
    <header className="challenge-heading">
      <div><p className="crumbs"><Link href="/dashboard">Classroom</Link> / Challenges</p>
        <h1>Challenges</h1>
        <p>Invite someone who joined your study set. You both answer the same questions on your own time.</p>
      </div>
    </header>
    <section className="challenge-create outlined-card" aria-labelledby="challenge-create-title">
      <div><h2 id="challenge-create-title">Start a challenge</h2>
        <p>Choose a shared set and a friend. Scores appear once both quizzes are done.</p></div>
      <form onSubmit={createChallenge}>
        <div className="challenge-field"><label htmlFor="challenge-set">Study set</label>
          <ClassroomSelect id="challenge-set" ariaLabel="Study set" value={setId} onChange={setSetId} disabled={!eligibleSets.length} options={eligibleSets.length
            ? eligibleSets.map((set) => ({ value: set.id, label: set.title }))
            : [{ value: "", label: "No quiz sets yet", disabled: true }]} /></div>
        <div className="challenge-field"><label htmlFor="challenge-friend">Friend</label>
          <ClassroomSelect id="challenge-friend" ariaLabel="Friend" value={opponentId} onChange={setOpponentId} options={[
            { value: "", label: "Choose a friend" },
            ...players.map((player) => ({ value: String(player.id), label: player.username })),
          ]} /></div>
        <div className="challenge-field"><label htmlFor="challenge-count">Questions</label>
          <ClassroomSelect id="challenge-count" ariaLabel="Questions" value={String(count)} onChange={(value) => setCount(Number(value))} options={[
            { value: "5", label: "5 questions" },
            { value: "10", label: "10 questions" },
            { value: "15", label: "15 questions" },
          ]} /></div>
        <button className="pill-button dark" disabled={busy || !opponentId} type="submit">
          {busy ? "Creating…" : "Send challenge"}
        </button>
      </form>
      {playersError && <p className="form-error" role="alert">{playersError}</p>}
      {setId && !playersError && players.length === 0 && <p className="challenge-hint">Share this set and ask a friend to join before challenging them.</p>}
      {!setsLoading && eligibleSets.length === 0 && <p className="challenge-hint">Create a quiz study set to get started.</p>}
      {apiError && <p className="form-error" role="alert">{apiError}</p>}
    </section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="challenge-list" aria-labelledby="challenge-list-title">
      <h2 id="challenge-list-title">Your challenges</h2>
      {loading ? <p>Loading challenges…</p> : challenges.length === 0 ?
        <div className="empty-state">No challenges yet. Send one to a friend above.</div> :
        challenges.map((challenge) => {
          const friend = challenge.is_challenger ? challenge.opponent_name : challenge.challenger_name;
          const complete = challenge.my_status === "completed" && challenge.other_status === "completed";
          return <article className="challenge-card outlined-card" key={challenge.id}>
            <div><span className="badge mint">{challenge.question_count} questions</span>
              <h3>{challenge.study_set_title}</h3><p>With {friend}</p></div>
            <div className="challenge-score">
              <div><span>You</span><strong>{challenge.my_score === null ? "—" : `${challenge.my_score}%`}</strong></div>
              <span aria-hidden="true">:</span>
              <div><span>{friend}</span><strong>{complete ? `${challenge.other_score}%` : "—"}</strong></div>
            </div>
            <div className="challenge-card-actions">
              {challenge.my_status !== "completed" ?
                <button className="pill-button dark" disabled={busy} onClick={() => begin(challenge)}>
                  {challenge.my_status === "in_progress" ? "Continue quiz" : "Take challenge"}
                </button> : complete ?
                  <Link className="pill-button dark" href={`/challenges/${challenge.id}`}>See result</Link> :
                  <span className="challenge-wait">Waiting for {friend}</span>}
            </div>
          </article>;
        })}
    </section>
  </div>;
}
