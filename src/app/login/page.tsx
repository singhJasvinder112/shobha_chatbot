'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { markAuthed } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@podtracker.local');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Demo environment - there's no real auth backend, so any credentials are accepted. This
    // just sets a local "signed in" flag (see AuthGuard) and takes you through to the dashboard.
    setTimeout(() => {
      markAuthed();
      router.push('/');
    }, 500);
  }

  return (
    <div className="grid min-h-dvh w-full bg-white lg:grid-cols-2">
      {/* Branding panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 px-12 py-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <BuildingIcon />
          </div>
          <span className="text-sm font-semibold tracking-wide">PRODUCTION TRACKER</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl leading-tight font-semibold">
            Real-time visibility, from factory floor to site handover.
          </h1>
          <p className="mt-4 text-base text-white/80">
            Track POD delivery, installation, and MEP progress across every tower — with an
            assistant that can answer your questions instantly.
          </p>
        </div>

        <p className="relative text-xs text-white/60">© 2026 Alpha Heights. Demo environment.</p>
      </div>

      {/* Form panel - deliberately fixed-light (not the theme's dark-mode-aware tokens), same
          reasoning as the dashboard: this page impersonates a real, consistently-styled product
          screen rather than adapting to the visitor's system color scheme. */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-white px-6 py-12">
        <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary-50 blur-3xl" />
        <div className="relative w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30">
              <BuildingIcon />
            </div>
            <span className="text-sm font-semibold tracking-wide text-gray-900">PRODUCTION TRACKER</span>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900">Sign in to your workspace</h2>
          <p className="mt-1.5 text-sm text-gray-500">Enter your details to access the POD dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-gray-400">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-gray-900 outline-none transition-shadow focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <span className="cursor-pointer text-xs font-medium text-primary-600 hover:text-primary-700">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-gray-400">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-gray-900 outline-none transition-shadow focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            This is a demo environment — any credentials will sign you in.
          </p>
        </div>
      </div>
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
      <path
        d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15M4 21h16M14 21v-8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v8M7 8h1M7 11h1M7 14h1M10 8h1M10 11h1M10 14h1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth={2}>
      <path
        d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m3.5 7 8.5 6 8.5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth={2}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
