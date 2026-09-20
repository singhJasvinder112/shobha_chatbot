'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAuthed } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    // Deferred through a timer rather than called synchronously in the effect body, to keep
    // a single consistent "schedule every transition through a timer" pattern (see ChatWidget).
    if (isAuthed()) {
      const t = setTimeout(() => setAuthed(true), 0);
      return () => clearTimeout(t);
    }
    router.replace('/login');
  }, [router]);

  // Nothing is rendered until we've confirmed the visitor is authed, so there's no flash of
  // dashboard content before an unauthenticated visitor gets redirected to /login.
  if (!authed) {
    return <div className="h-dvh w-full bg-background" />;
  }

  return <>{children}</>;
}
