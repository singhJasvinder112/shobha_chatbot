'use client';

import { generateId, type UIMessage } from 'ai';
import { useEffect, useState } from 'react';
import { ChatView } from '@/components/ChatView';
import { HistoryPanel } from '@/components/HistoryPanel';

const SESSION_STORAGE_KEY = 'alpha-heights-session-id';

type IntroPhase = 'pending' | 'entering' | 'greeting' | 'greeting-out' | 'done';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Starts invisible on every render (server and first client paint alike, so there's no
  // hydration mismatch) - the effect below plays the pop-in + greeting sequence on every
  // load (by design: this is a marketing-style entrance meant to catch the eye every time,
  // not a one-time onboarding hint), unless the user has reduced motion enabled.
  const [introPhase, setIntroPhase] = useState<IntroPhase>('pending');

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scheduling every transition (even the immediate skip-case) through a timer, rather than
    // calling setState synchronously in the effect body, keeps this a single consistent pattern.
    const timers = reduceMotion
      ? [setTimeout(() => setIntroPhase('done'), 0)]
      : [
          setTimeout(() => setIntroPhase('entering'), 150),
          setTimeout(() => setIntroPhase('greeting'), 750),
          setTimeout(() => setIntroPhase('greeting-out'), 1900),
          setTimeout(() => setIntroPhase('done'), 2250),
        ];
    return () => timers.forEach(clearTimeout);
  }, []);

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
        className={`fixed right-8 bottom-30 z-50 flex h-[min(640px,calc(100dvh-7rem))] w-[min(420px,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-200 ease-out sm:right-16 sm:bottom-32 ${
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

      {/* Greeting bubble, shown briefly during the entrance intro on every load. */}
      {(introPhase === 'greeting' || introPhase === 'greeting-out') && (
        <div
          className={`fixed right-8 bottom-31 z-50 max-w-64 rounded-2xl border border-border bg-surface px-5 py-3.5 text-base font-medium text-foreground shadow-2xl sm:right-16 sm:bottom-33 ${
            introPhase === 'greeting' ? 'animate-greeting-in' : 'animate-greeting-out'
          }`}
        >
          Hey, Maya this side <span className="animate-widget-wave">👋</span>
          {/* Speech-bubble tail, pointing down toward the launcher button. */}
          <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-r border-b border-border bg-surface" />
        </div>
      )}

      {/* Launcher button - always visible, fixed bottom-right. */}
      <div className="fixed right-8 bottom-8 z-50 sm:right-16 sm:bottom-10">
        {/* Attention-pulse rings, looping continuously behind the button until it's opened. */}
        {!isOpen && introPhase !== 'pending' && (
          <>
            <span className="pointer-events-none absolute inset-0 animate-widget-ring rounded-full bg-primary-500" />
            <span className="pointer-events-none absolute inset-0 animate-widget-ring rounded-full bg-primary-500 [animation-delay:1s]" />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setIsOpen(prev => !prev);
            setIntroPhase('done');
          }}
          aria-label={isOpen ? 'Close Alpha Heights Assistant' : 'Open Alpha Heights Assistant'}
          title={isOpen ? 'Close chat' : 'Chat with Alpha Heights Assistant'}
          className={`relative flex h-20 w-20 origin-bottom-right items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xl shadow-primary-500/50 transition-transform hover:scale-105 ${
            introPhase === 'pending' ? 'pointer-events-none scale-50 opacity-0' : ''
          } ${introPhase === 'entering' ? 'animate-widget-pop' : ''}`}
        >
          {isOpen ? <CloseIcon large /> : <ChatBubbleIcon />}
        </button>
      </div>
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
    <svg viewBox="0 0 24 24" fill="none" className={large ? 'h-8 w-8' : 'h-4 w-4'} stroke="currentColor" strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth={2}>
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
