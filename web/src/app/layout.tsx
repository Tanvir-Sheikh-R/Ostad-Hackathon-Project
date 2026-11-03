import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";

const bengali = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Path Somadhan",
  description:
    "Chat with your NCTB textbook, take chapter quizzes and track progress — for students and parents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang starts at "en" (the default UI language); useLanguage updates it on the
    // client when the student switches to Bangla. suppressHydrationWarning covers
    // third-party attributes injected into <html> before hydration (reading/dark-mode
    // extensions), which React would otherwise report as a mismatch.
    <html lang="en" className={bengali.variable} suppressHydrationWarning>
      <body className="font-[family-name:var(--font-bengali)] antialiased">{children}</body>
    </html>
  );
}
