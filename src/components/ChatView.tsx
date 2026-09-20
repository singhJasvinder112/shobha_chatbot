'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { MicButton } from '@/components/MicButton';
import { Markdown } from '@/components/Markdown';

const SUGGESTIONS = [
  'How many pods have been delivered in total?',
  'Which pods in Tower A are delivered but not installed?',
  'How many MEP modules are yet to install?',
  'Why does Tower A floor 3 finish on that date?',
];

export function ChatView({ sessionId, initialMessages }: { sessionId: string; initialMessages: UIMessage[] }) {
  const { messages, sendMessage, status, regenerate, clearError } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const isBusy = status === 'submitted' || status === 'streaming';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isBusy]);

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage({ text: trimmed });
    setInput('');
  }

  return (
    <>
      <div ref={scrollRef} className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <BuildingIcon large />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Ask about pods, installation, or MEP status</p>
              <p className="mt-1 text-xs text-muted">Type a question or tap the mic to speak</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 px-4">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submitText(s)}
                  className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/70"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(message => (
          <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                message.role === 'user'
                  ? 'rounded-br-sm bg-gradient-to-br from-primary-500 to-primary-600 text-white'
                  : 'rounded-bl-sm border border-border bg-surface text-foreground'
              }`}
            >
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  return <Markdown key={index} text={part.text} tone={message.role === 'user' ? 'user' : 'assistant'} />;
                }
                if (isToolUIPart(part)) {
                  return (
                    <div
                      key={index}
                      className="mt-1 flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                    >
                      <SearchIcon />
                      {part.state === 'output-available'
                        ? `Looked up ${humanizeToolName(getToolName(part))}`
                        : `Looking up ${humanizeToolName(getToolName(part))}…`}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {isBusy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 shadow-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              <p className="font-medium">Something went wrong answering that.</p>
              <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">
                The assistant might be temporarily unavailable. Please try again in a moment.
              </p>
              <button
                type="button"
                onClick={() => {
                  clearError();
                  regenerate();
                }}
                className="mt-2 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          submitText(input);
        }}
        className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6"
      >
        <MicButton disabled={isBusy} onTranscribed={text => submitText(text)} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isBusy}
          placeholder="Ask about pods, installation, or MEP status…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <SendIcon />
        </button>
      </form>
    </>
  );
}

function humanizeToolName(name: string): string {
  return name
    .replace(/^get|^query/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase();
}

function BuildingIcon({ large }: { large?: boolean }) {
  const size = large ? 'h-7 w-7' : 'h-5 w-5';
  return (
    <svg viewBox="0 0 24 24" fill="none" className={size} stroke="currentColor" strokeWidth={2}>
      <path
        d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15M4 21h16M14 21v-8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v8M7 8h1M7 11h1M7 14h1M10 8h1M10 11h1M10 14h1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={2.5}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
      <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
