"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinSharedSet } from "@/lib/api/study-sets";

export default function JoinStudySetPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await joinSharedSet(code.trim());
      window.dispatchEvent(new Event("studybuddy:api-sets"));
      router.push(`/study-sets/${result.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to join this study set.");
      setBusy(false);
    }
  }

  return <div className="simple-page">
    <p className="crumbs"><Link href="/study-sets">My Study Sets</Link> / Join a study set</p>
    <section className="join-set-panel outlined-card">
      <h1>Join a study set</h1>
      <p>Enter the sharing code your friend gave you. Their set will appear in your collection, with your own practice progress.</p>
      <form onSubmit={join}>
        <label htmlFor="share-code">Sharing code</label>
        <input id="share-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABCD-EFGH-JKLM" autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="pill-button dark" type="submit" disabled={busy}>{busy ? "Checking code…" : "Join study set"}</button>
      </form>
    </section>
  </div>;
}
