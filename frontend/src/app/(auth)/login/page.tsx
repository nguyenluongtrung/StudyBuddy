"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/auth";

export default function LoginPage() { const router = useRouter(); const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); return <main className="shell auth-wrap"><section className="auth-card"><p className="eyebrow">Welcome back</p><h1>Pick up where you left off.</h1><p className="muted">Sign in to your study space.</p><form onSubmit={async (event) => { event.preventDefault(); setError(""); try { await login(username, password); router.push("/dashboard"); } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in"); } }}><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required /><button className="button" type="submit">Sign in</button></form>{error && <p className="muted">{error}</p>}<p className="muted">New here? <Link className="auth-link" href="/register">Create an account</Link></p></section></main>; }
