'use client';

import type { UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import { ChatView } from '@/components/ChatView';
import { HistoryPanel } from '@/components/HistoryPanel';

const SESSION_STORAGE_KEY = 'alpha-heights-session-id';

export default function Page() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

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
        }
        const res = await fetch('/api/sessions', { method: 'POST' });
        const data: { id: string } = await res.json();
        if (!cancelled) {
          localStorage.setItem(SESSION_STORAGE_KEY, data.id);
          setSessionId(data.id);
          setInitialMessages([]);
        }
      } catch {
        if (!cancelled) {
          setSessionId(crypto.randomUUID());
          setInitialMessages([]);
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
      const res = await fetch('/api/sessions', { method: 'POST' });
      const data: { id: string } = await res.json();
      localStorage.setItem(SESSION_STORAGE_KEY, data.id);
      setSessionId(data.id);
      setInitialMessages([]);
    } catch {
      setSessionId(crypto.randomUUID());
      setInitialMessages([]);
    }
  }

  async function selectSession(id: string) {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      const data: { messages: UIMessage[] } = await res.json();
      localStorage.setItem(SESSION_STORAGE_KEY, id);
      setSessionId(id);
      setInitialMessages(data.messages);
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
