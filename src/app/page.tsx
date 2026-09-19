'use client';

import type { UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import { ChatView } from '@/components/ChatView';
import { HistoryPanel } from '@/components/HistoryPanel';

const SESSION_STORAGE_KEY = 'alpha-heights-session-id';

async function createSessionOrThrow(): Promise<string> {
  const res = await fetch('/api/sessions', { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to create a chat session (${res.status})`);
  const data: { id: string } = await res.json();
  if (!data.id) throw new Error('Server did not return a session id');
  return data.id;
}

export default function Page() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
      try {
        if (storedId) {
          const res = await fetch(`/api/sessions/${storedId}`);
          if (res.ok) {
            const data: { messages: UIMessage[] } = await res.json();
            if (!cancelled) {
              setSessionId(storedId);
              setInitialMessages(data.messages);
            }
            return;
          }
          // storedId is stale (deleted, or never existed) - fall through and create a fresh one.
        }
        const id = await createSessionOrThrow();
        if (!cancelled) {
          localStorage.setItem(SESSION_STORAGE_KEY, id);
          setSessionId(id);
          setInitialMessages([]);
        }
      } catch (err) {
        // Never fall back to a client-only id: it was never inserted server-side, so the
        // chat would silently fail to save with no indication to the user. Surface the
        // failure instead so a refresh (or the retry button) is the obvious next step.
        if (!cancelled) {
          setSessionError(err instanceof Error ? err.message : 'Could not start a chat session.');
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startNewChat() {
    setHistoryOpen(false);
    try {
      const id = await createSessionOrThrow();
      localStorage.setItem(SESSION_STORAGE_KEY, id);
      setSessionId(id);
      setInitialMessages([]);
      setSessionError(null);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Could not start a new chat.');
    }
  }

  async function selectSession(id: string) {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error('That chat could not be found - it may have been deleted.');
      const data: { messages: UIMessage[] } = await res.json();
      localStorage.setItem(SESSION_STORAGE_KEY, id);
      setSessionId(id);
      setInitialMessages(data.messages);
      setSessionError(null);
    } catch (err) {
      // sessionId may still point at a valid, currently-open chat, so don't blow away the
      // whole view for a failed switch - just tell the user directly.
      window.alert(err instanceof Error ? err.message : 'Could not open that chat.');
    } finally {
      setHistoryOpen(false);
    }
  }

  function handleSessionDeleted(deletedId: string) {
    if (deletedId === sessionId) {
      void startNewChat();
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-5 py-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30">
          <BuildingIcon />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-foreground">Alpha Heights Site Assistant</h1>
          <p className="truncate text-xs text-muted">POD delivery &middot; installation &middot; MEP tracking</p>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label="Chat history"
          title="Chat history"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
        >
          <HistoryIcon />
        </button>
        <button
          type="button"
          onClick={() => void startNewChat()}
          aria-label="New chat"
          title="New chat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
        >
          <PlusIcon />
        </button>
      </header>

      {sessionId ? (
        <ChatView key={sessionId} sessionId={sessionId} initialMessages={initialMessages} />
      ) : sessionError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-muted">{sessionError}</p>
          <button
            type="button"
            onClick={() => void startNewChat()}
            className="rounded-full bg-gradient-to-br from-primary-500 to-primary-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary-500/30"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">Loading…</div>
      )}

      <HistoryPanel
        open={historyOpen}
        currentSessionId={sessionId}
        onClose={() => setHistoryOpen(false)}
        onSelect={id => void selectSession(id)}
        onDeleted={handleSessionDeleted}
      />
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

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
      <path d="M3 12a9 9 0 1 0 3-6.7M3 12V6m0 6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
