"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api/auth";

export default function RegisterPage() { const router = useRouter(); const [form, setForm] = useState({ username: "", email: "", password: "" }); const [error, setError] = useState(""); return <main className="shell auth-wrap"><section className="auth-card"><p className="eyebrow">Start small</p><h1>Make a space for learning.</h1><p className="muted">Create your StudyBuddy account.</p><form onSubmit={async (event) => { event.preventDefault(); try { await register(form.username, form.email, form.password); router.push("/login"); } catch (err) { setError(err instanceof Error ? err.message : "Unable to register"); } }}><input placeholder="Username" required onChange={(e) => setForm({ ...form, username: e.target.value })} /><input placeholder="Email" type="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} /><input placeholder="Password (8+ characters)" type="password" required onChange={(e) => setForm({ ...form, password: e.target.value })} /><button className="button" type="submit">Create account</button></form>{error && <p className="muted">{error}</p>}<p className="muted">Already registered? <Link className="auth-link" href="/login">Sign in</Link></p></section></main>; }
