"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearTokens } from "@/lib/auth/tokens";

export function Nav() {
  const router = useRouter();
  return <nav className="nav"><Link className="brand" href="/dashboard">Study<span>Buddy</span></Link><div className="nav-links"><Link href="/dashboard">Overview</Link><Link href="/subjects">Subjects</Link><button onClick={() => { clearTokens(); router.push("/login"); }}>Log out</button></div></nav>;
}
