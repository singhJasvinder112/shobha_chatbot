'use client';

import { useRef, useState } from 'react';

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'error';

export function MicButton({
  onTranscribed,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<RecordingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording() {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        void transcribeAndSend(blob);
      };

      mediaRecorder.start();
      setState('recording');
    } catch {
      setState('error');
      setErrorMessage('Microphone access denied or unavailable.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setState('transcribing');
  }

  async function transcribeAndSend(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data: { text?: string; error?: string } = await res.json();

      if (!res.ok || !data.text) {
        throw new Error(data.error ?? 'Transcription failed.');
      }

      onTranscribed(data.text);
      setState('idle');
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Transcription failed.');
    }
  }

  function handleClick() {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle' || state === 'error') {
      void startRecording();
    }
  }

  const isBusy = state === 'transcribing';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isBusy}
        aria-label={state === 'recording' ? 'Stop recording' : 'Start voice input'}
        title={state === 'recording' ? 'Stop recording' : 'Start voice input'}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
          state === 'recording'
            ? 'animate-pulse border-red-500 bg-red-500 text-white'
            : 'border-border bg-background text-muted hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isBusy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <MicIcon />
        )}
      </button>
      {state === 'recording' && (
        <span className="text-xs text-red-500">Recording… tap to stop</span>
      )}
      {state === 'transcribing' && (
        <span className="text-xs text-muted">Transcribing…</span>
      )}
      {state === 'error' && errorMessage && (
        <span className="text-xs text-red-500">{errorMessage}</span>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
      <path
        d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
