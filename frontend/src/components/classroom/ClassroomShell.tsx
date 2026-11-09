"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearTokens, getAccessToken, getRefreshToken } from "@/lib/auth/tokens";
import { getCurrentUser } from "@/lib/api/auth";
import { clearActiveStudyUser, setActiveStudyUser } from "@/lib/study-data";

const navigationLinks = [
  { href: "/dashboard", icon: "▦", label: "Dashboard" },
  { href: "/study-sets", icon: "▣", label: "My Study Sets" },
  { href: "/progress", icon: "↗", label: "Progress" },
  { href: "/profile", icon: "♙", label: "Profile" },
];

function SidebarContent({ pathname, onNavigate, onSignOut }: { pathname: string; onNavigate?: () => void; onSignOut: () => void }) {
  return <>
    <Link className="classroom-logo" href="/dashboard" onClick={onNavigate}><span className="logo-mark">✥</span><span><strong>Study Buddy<span className="sparkle">✦</span></strong><small>ANIME CLASSROOM EDITION</small></span></Link>
    <Link className="sidebar-create" href="/study-sets/new" onClick={onNavigate}>⊕ <span>New Study Set</span></Link>
    <nav aria-label="Main navigation" className="sidebar-links">{navigationLinks.map((link) => <Link className={pathname === link.href || (link.href === "/study-sets" && pathname.startsWith("/study-sets")) ? "active" : ""} href={link.href} key={link.href} onClick={onNavigate}><span aria-hidden="true">{link.icon}</span>{link.label}</Link>)}</nav>
    <div className="sidebar-tip"><span>✦ Study tip of the day</span><p>Break large chapters into bite-sized 10-minute reviews for easier recall.</p><small>● Ready to learn</small></div>
    <button className="sidebar-signout" onClick={onSignOut}>Sign out</button>
  </>;
}

export function ClassroomShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("Maya Lin");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authAttempt, setAuthAttempt] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    setAuthenticated(false);
    setAuthError("");
    if (!getAccessToken() && !getRefreshToken()) {
      clearActiveStudyUser();
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    getCurrentUser().then((user) => {
      if (!active) return;
      setName(user.username);
      setActiveStudyUser(user.username);
      setAuthenticated(true);
      const canonicalPath = window.location.pathname.replace(/^\/study-sets\/api(?:[:-]|%3a)(\d+)(?=\/|$)/i, "/study-sets/$1");
      if (canonicalPath !== window.location.pathname) router.replace(canonicalPath + window.location.search);
    }).catch((error) => {
      if (!active) return;
      if (!(error instanceof Error) || error.message !== "Session expired. Sign in again.") {
        setAuthError("Unable to check your session. Check your connection and try again.");
        return;
      }
      clearTokens();
      clearActiveStudyUser();
      setAuthenticated(false);
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    });
    return () => { active = false; };
  }, [pathname, router, authAttempt]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const mobileViewport = window.matchMedia("(max-width: 760px)");
    const onViewportChange = () => { if (!mobileViewport.matches) setMenuOpen(false); };
    const onMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key !== "Tab") return;
      const drawer = document.getElementById("mobile-navigation");
      const focusable = drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    mobileViewport.addEventListener("change", onViewportChange);
    document.addEventListener("keydown", onMenuKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      mobileViewport.removeEventListener("change", onViewportChange);
      document.removeEventListener("keydown", onMenuKeyDown);
    };
  }, [menuOpen]);

  function signOut() {
    setMenuOpen(false);
    clearTokens();
    clearActiveStudyUser();
    setAuthenticated(false);
    router.push("/login");
  }

  if (!authenticated) return <div className="empty-state" role="status">{authError || "Checking your session…"}{authError && <button className="pill-button dark" onClick={() => setAuthAttempt((attempt) => attempt + 1)}>Retry</button>}</div>;

  return <div className="classroom-frame">
    <aside className="classroom-sidebar desktop-sidebar"><SidebarContent pathname={pathname} onSignOut={signOut} /></aside>
    <div className="classroom-main">
      <header className="classroom-topbar">
        <button className="mobile-menu-button" type="button" aria-label="Open navigation menu" aria-controls="mobile-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><span /><span /><span /></button>
        <div className="topbar-crumb">Classroom <span>✦</span> / <strong>{pathname === "/dashboard" ? "Daily Overview" : pathname === "/study-sets" ? "My Binder Collection" : "Study Studio"}</strong></div>
        <div className="topbar-search"><span>⌕</span><input aria-label="Search study sets" placeholder="Search cards, topics, or notes..." value={search} onChange={(event) => { setSearch(event.target.value); setShowSearch(true); }} onFocus={() => setShowSearch(true)} onKeyDown={(event) => { if (event.key === "Enter" && search.trim()) router.push(`/study-sets?q=${encodeURIComponent(search.trim())}`); if (event.key === "Escape") setShowSearch(false); }} />{showSearch && search.trim() && <Link className="search-popover" href={`/study-sets?q=${encodeURIComponent(search.trim())}`} onClick={() => setShowSearch(false)}>Search study sets for “{search}” →</Link>}</div>
        <div className="topbar-actions"><span className="notification" aria-label="Notifications">♧</span><div className="profile-chip"><span className="avatar">👩🏻‍🎓</span><span><strong>{name}</strong><small>Biochemist in training</small></span></div></div>
      </header>
      <div className="classroom-content">{children}</div>
    </div>
    {menuOpen && <div className="mobile-nav-overlay"><button className="mobile-nav-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} /><aside id="mobile-navigation" className="classroom-sidebar mobile-drawer-panel" role="dialog" aria-modal="true" aria-label="Navigation menu"><button ref={closeButtonRef} className="mobile-menu-close" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)}>×</button><SidebarContent pathname={pathname} onNavigate={() => setMenuOpen(false)} onSignOut={signOut} /></aside></div>}
  </div>;
}
