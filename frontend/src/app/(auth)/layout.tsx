"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken } from "@/lib/auth/tokens";
import { clearActiveStudyUser } from "@/lib/study-data";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "guest" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("checking");
    if (!getAccessToken() && !getRefreshToken()) {
      setStatus("guest");
      return;
    }

    getCurrentUser().then(() => {
      if (active) router.replace("/dashboard");
    }).catch((error) => {
      if (!active) return;
      if (error instanceof Error && error.message === "Session expired. Sign in again.") {
        clearActiveStudyUser();
        setStatus("guest");
      } else {
        setStatus("error");
      }
    });
    return () => { active = false; };
  }, [pathname, router, attempt]);

  if (status === "guest") return children;
  if (status === "error") return <main className="empty-state" role="alert">Unable to check your session. Check your connection and try again. <button className="pill-button dark" onClick={() => setAttempt((current) => current + 1)}>Retry</button></main>;
  return <main className="empty-state" role="status">Checking your session…</main>;
}
