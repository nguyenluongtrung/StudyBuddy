"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-scene">
      <div className="auth-deco star-one">★</div>
      <div className="auth-deco star-two">✦</div>
      <div className="auth-deco bolt">ϟ</div>
      <div className="auth-deco book">♧</div>
      <header className="auth-header">
        <Link className="classroom-logo" href="/">
          <span className="logo-mark">✥</span>
          <span>
            <strong>
              Study Buddy <span className="sparkle">✦</span>
            </strong>
            <small>ANIME CLASSROOM EDITION</small>
          </span>
        </Link>
        <Link className="help-link" href="/register">
          Need help? 🚀
        </Link>
      </header>
      <section className="login-card outlined-card">
        <span className="login-level">✨ Level 1 Ready</span>
        <div className="login-intro">
          <span className="badge mint">📚 CLASSROOM STUDY SYSTEM</span>
          <h1>Welcome back!</h1>
          <p>Ready for today’s quick study review and classroom doodles?</p>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setBusy(true);
            try {
              await login(username, password, remember);
              router.push("/dashboard");
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Unable to sign in",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field-heading">
            <label htmlFor="login-username">◎ Username</label>
            <span className="badge mint">☑ Study Buddy Account</span>
          </div>
          <div className="input-wrap">
            <span>✉</span>
            <input
              id="login-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="maya.lin"
              autoComplete="username"
              required
            />
          </div>
          <div className="field-heading">
            <label htmlFor="login-password">⚿ Password</label>
            <span>Secure access</span>
          </div>
          <div className="input-wrap">
            <span>♙</span>
            <input
              id="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              ◉
            </button>
          </div>
          <div className="remember-row">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />{" "}
              Remember me on this laptop
            </label>
            <span className="badge mint">♙ Private session</span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="login-submit" disabled={busy} type="submit">
            {busy ? "Signing in..." : "Sign In to Study Buddy →"}
          </button>
        </form>
        <Link className="preview-link" href="/dashboard">
          Preview the classroom without signing in →
        </Link>
        <p className="signup-line">
          Don’t have an account?{" "}
          <Link href="/register">Sign up free for students ↗</Link>
        </p>
        <div className="login-trust">
          ⭐ &nbsp; A focused space for your next review
        </div>
      </section>
      <footer className="auth-footer">
        Study Buddy Classroom &nbsp;·&nbsp; ✧ Anime Study Sanctuary
      </footer>
    </main>
  );
}
