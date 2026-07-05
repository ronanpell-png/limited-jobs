import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Limited — every application counts",
  description:
    "The job platform where applicants get a limited budget, so every application is intentional. Built for startups who want candidates who actually want them.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen flex flex-col">
          <header className="border-b border-stone-200 bg-white">
            <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/" className="font-bold text-lg tracking-tight">
                  Limited<span className="text-indigo-600">.</span>
                </Link>
                <Link
                  href="/jobs"
                  className="text-sm text-stone-600 hover:text-stone-900"
                >
                  Browse jobs
                </Link>
                <Link
                  href="/how-it-works"
                  className="text-sm text-stone-600 hover:text-stone-900"
                >
                  How it works
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="text-sm text-stone-600 hover:text-stone-900"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="text-sm rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
                  >
                    Get started
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="text-sm text-stone-600 hover:text-stone-900"
                  >
                    Dashboard
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-stone-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between text-xs text-stone-500">
              <span>© {new Date().getFullYear()} Limited</span>
              <div className="flex gap-4">
                <Link href="/privacy" className="hover:text-stone-800">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-stone-800">
                  Terms
                </Link>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
