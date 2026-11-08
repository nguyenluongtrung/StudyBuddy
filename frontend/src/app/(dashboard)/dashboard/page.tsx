import { SubjectList } from "@/components/study/SubjectList";

export default function DashboardPage() { return <><section className="hero"><div><p className="eyebrow">Your study space</p><h1>Keep the <em>thread.</em></h1></div><p className="hero-copy">A simple view of what you’re learning and the time you’ve made for it.</p></section><div className="grid"><SubjectList /><section className="panel stat"><strong>0m</strong><p>Study time logged this week. Your next session can change that.</p></section></div></>; }
