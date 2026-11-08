"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/auth";

export default function ProfilePage() { const [name, setName] = useState("Maya Lin"); const [email, setEmail] = useState(""); useEffect(() => { getCurrentUser().then((user) => { setName(user.username); setEmail(user.email); }).catch(() => undefined); }, []); return <div className="simple-page"><p className="crumbs">Classroom / Profile</p><h1>Your classroom profile</h1><div className="profile-card outlined-card"><span className="big-avatar">👩🏻‍🎓</span><div><h2>{name}</h2><p>{email || "Study Buddy learner"}</p><span className="badge mint">✦ Classroom learner</span></div></div><Link className="pill-button light" href="/study-sets">Go to my study sets →</Link></div>; }
