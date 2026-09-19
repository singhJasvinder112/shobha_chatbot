'use client';

import { useEffect, useState } from 'react';

export type SessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export function HistoryPanel({
  open,
  currentSessionId,
  onClose,
  onSelect,
  onDeleted,
}: {
  open: boolean;
  currentSessionId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/sessions')
      .then(res => res.json())
      .then((data: { sessions: SessionSummary[] }) => {
        setSessions(data.sessions);
        setError(null);
      })
      .catch(() => setError('Could not load chat history.'));
  }, [open]);

  async function handleDelete(session: SessionSummary) {
    if (!window.confirm(`Delete "${session.title}"? This can't be undone.`)) return;
    setDeletingId(session.id);
    try {
      await fetch(`/api/sessions/${session.id}`, { method: 'DELETE' });
      setSessions(prev => prev?.filter(s => s.id !== session.id) ?? prev);
      onDeleted(session.id);
    } catch {
      setError('Could not delete that chat.');
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close history"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative flex h-full w-[85%] max-w-xs flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-sm font-semibold text-foreground">Chat history</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-primary-50 hover:text-primary-600"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-2">
          {error && <p className="px-2 py-4 text-sm text-muted">{error}</p>}
          {!error && sessions === null && <p className="px-2 py-4 text-sm text-muted">Loading…</p>}
          {!error && sessions?.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted">No previous chats yet.</p>
          )}
          {sessions?.map(session => (
            <div
              key={session.id}
              className={`mb-1 flex items-center gap-1 rounded-xl pr-1 transition-colors ${
                session.id === currentSessionId
                  ? 'bg-primary-50 dark:bg-primary-900/40'
                  : 'hover:bg-primary-50/60 dark:hover:bg-primary-900/20'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(session.id)}
                className="min-w-0 flex-1 px-3 py-2.5 text-left"
              >
                <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
                <p className="mt-0.5 text-xs text-muted">{relativeTime(session.updatedAt)}</p>
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(session)}
                disabled={deletingId === session.id}
                aria-label={`Delete "${session.title}"`}
                title="Delete chat"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              >
                {deletingId === session.id ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <TrashIcon />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.867 12.142A2 2 0 0 1 15.138 21H8.862a2 2 0 0 1-1.995-1.858L6 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
