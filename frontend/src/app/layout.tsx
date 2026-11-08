import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "StudyBuddy", description: "A calmer way to keep learning." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
