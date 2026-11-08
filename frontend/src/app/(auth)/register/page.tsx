"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="auth-scene"><header className="auth-header"><Link className="classroom-logo" href="/"><span className="logo-mark">✥</span><span><strong>Study Buddy <span className="sparkle">✦</span></strong><small>ANIME CLASSROOM EDITION</small></span></Link><Link className="help-link" href="/login">Back to sign in ↗</Link></header><section className="login-card outlined-card"><div className="login-intro"><span className="badge mint">📚 YOUR CLASSROOM STARTS HERE</span><h1>Join Study Buddy!</h1><p>Build your first study set and turn lecture notes into a focused review.</p></div><form onSubmit={async (event) => { event.preventDefault(); setError(""); setBusy(true); try { await register(form.username, form.email, form.password); router.push("/login"); } catch (err) { setError(err instanceof Error ? err.message : "Unable to register"); } finally { setBusy(false); } }}><div className="field-heading"><label htmlFor="register-username">◎ Username</label></div><div className="input-wrap"><span>♙</span><input id="register-username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Choose a username" autoComplete="username" required /></div><div className="field-heading"><label htmlFor="register-email">✉ University Email</label></div><div className="input-wrap"><span>✉</span><input id="register-email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="maya.lin@university.edu" type="email" autoComplete="email" required /></div><div className="field-heading"><label htmlFor="register-password">⚿ Password</label></div><div className="input-wrap"><span>♙</span><input id="register-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" type="password" minLength={8} autoComplete="new-password" required /></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="login-submit" type="submit" disabled={busy}>{busy ? "Creating account..." : "Create My Classroom Account →"}</button></form><p className="signup-line">Already have an account? <Link href="/login">Sign in ↗</Link></p></section></main>;
}
