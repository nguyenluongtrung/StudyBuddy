import { Nav } from "@/components/layout/Nav";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <main className="shell"><Nav />{children}</main>; }
