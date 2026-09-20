'use client';

import { generateId, type UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import { ChatView } from '@/components/ChatView';
import { HistoryPanel } from '@/components/HistoryPanel';

const SESSION_STORAGE_KEY = 'alpha-heights-session-id';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedId) {
        try {
          const res = await fetch(`/api/sessions/${storedId}`);
          if (res.ok) {
            const data: { messages: UIMessage[] } = await res.json();
            if (!cancelled) {
              setSessionId(storedId);
              setInitialMessages(data.messages);
            }
            return;
          }
          // storedId is stale (deleted, or never existed) - fall through and start a fresh one.
        } catch {
          // Network hiccup checking the stored id - fall through the same way.
        }
      }

      // No database call here: a session id is just generated locally. The row is only
      // actually created in Supabase once the user sends their first message (see
      // ensureTitle in chat-store.ts) - so merely opening or reloading the page, or a dev
      // hot-reload remounting this component, can never leave behind an empty "New chat" row.
      if (!cancelled) {
        const id = generateId();
        localStorage.setItem(SESSION_STORAGE_KEY, id);
        setSessionId(id);
        setInitialMessages([]);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function startNewChat() {
    setHistoryOpen(false);
    const id = generateId();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
    setSessionId(id);
    setInitialMessages([]);
  }

  async function selectSession(id: string) {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error('That chat could not be found - it may have been deleted.');
      const data: { messages: UIMessage[] } = await res.json();
      localStorage.setItem(SESSION_STORAGE_KEY, id);
      setSessionId(id);
      setInitialMessages(data.messages);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not open that chat.');
    } finally {
      setHistoryOpen(false);
    }
  }

  function handleSessionDeleted(deletedId: string) {
    if (deletedId === sessionId) {
      startNewChat();
    }
  }

  return (
    <>
      {/* Panel - anchored bottom-right, expands upward from the launcher button. */}
      <div
        role="dialog"
        aria-label="Alpha Heights Site Assistant"
        aria-hidden={!isOpen}
        className={`fixed right-4 bottom-20 z-50 flex h-[min(640px,calc(100dvh-6rem))] w-[min(400px,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-200 ease-out sm:right-6 ${
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30">
            <BuildingIcon />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-foreground">Alpha Heights Assistant</h1>
            <p className="truncate text-[11px] text-muted">POD &middot; installation &middot; MEP tracking</p>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Chat history"
            title="Chat history"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
          >
            <HistoryIcon />
          </button>
          <button
            type="button"
            onClick={startNewChat}
            aria-label="New chat"
            title="New chat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
          >
            <PlusIcon />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            title="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
          >
            <CloseIcon />
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

      {/* Launcher button - always visible, fixed bottom-right. */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Close Alpha Heights Assistant' : 'Open Alpha Heights Assistant'}
        title={isOpen ? 'Close chat' : 'Chat with Alpha Heights Assistant'}
        className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/40 transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
      >
        {isOpen ? <CloseIcon large /> : <ChatBubbleIcon />}
      </button>
    </>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth={2}>
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
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path d="M3 12a9 9 0 1 0 3-6.7M3 12V6m0 6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ large }: { large?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={large ? 'h-6 w-6' : 'h-4 w-4'} stroke="currentColor" strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
