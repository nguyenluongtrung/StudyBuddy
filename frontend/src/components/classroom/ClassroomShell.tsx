"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearTokens } from "@/lib/auth/tokens";
import { getCurrentUser } from "@/lib/api/auth";
import { clearActiveStudyUser, setActiveStudyUser } from "@/lib/study-data";

export function ClassroomShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("Maya Lin");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => { setName(user.username); setActiveStudyUser(user.username); }).catch(() => undefined);
  }, []);

  const links = [
    { href: "/dashboard", icon: "▦", label: "Dashboard" },
    { href: "/study-sets", icon: "▣", label: "My Study Sets" },
    { href: "/progress", icon: "↗", label: "Progress" },
    { href: "/profile", icon: "♙", label: "Profile" },
  ];

  return <div className="classroom-frame">
    <aside className="classroom-sidebar">
      <Link className="classroom-logo" href="/dashboard"><span className="logo-mark">✥</span><span><strong>Study Buddy<span className="sparkle">✦</span></strong><small>ANIME CLASSROOM EDITION</small></span></Link>
      <Link className="sidebar-create" href="/study-sets/new">⊕ <span>New Study Set</span></Link>
      <nav aria-label="Main navigation" className="sidebar-links">{links.map((link) => <Link className={pathname === link.href || (link.href === "/study-sets" && pathname.startsWith("/study-sets")) ? "active" : ""} href={link.href} key={link.href}><span aria-hidden="true">{link.icon}</span>{link.label}</Link>)}</nav>
      <div className="sidebar-tip"><span>✦ Study tip of the day</span><p>Break large chapters into bite-sized 10-minute reviews for easier recall.</p><small>● Ready to learn</small></div>
      <button className="sidebar-signout" onClick={() => { clearTokens(); clearActiveStudyUser(); router.push("/login"); }}>Sign out</button>
    </aside>
    <div className="classroom-main">
      <header className="classroom-topbar"><div className="topbar-crumb">Classroom <span>✦</span> / <strong>{pathname === "/dashboard" ? "Daily Overview" : pathname === "/study-sets" ? "My Binder Collection" : "Study Studio"}</strong></div><div className="topbar-search"><span>⌕</span><input aria-label="Search study sets" placeholder="Search cards, topics, or notes..." value={search} onChange={(event) => { setSearch(event.target.value); setShowSearch(true); }} onFocus={() => setShowSearch(true)} onKeyDown={(event) => { if (event.key === "Enter" && search.trim()) router.push(`/study-sets?q=${encodeURIComponent(search.trim())}`); if (event.key === "Escape") setShowSearch(false); }} />{showSearch && search.trim() && <Link className="search-popover" href={`/study-sets?q=${encodeURIComponent(search.trim())}`} onClick={() => setShowSearch(false)}>Search study sets for “{search}” →</Link>}</div><div className="topbar-actions"><span className="notification" aria-label="Notifications">♧</span><div className="profile-chip"><span className="avatar">👩🏻‍🎓</span><span><strong>{name}</strong><small>Biochemist in training</small></span></div></div></header>
      <div className="classroom-content">{children}</div>
    </div>
  </div>;
}
