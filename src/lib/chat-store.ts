import type { UIMessage } from 'ai';
import { getSupabase } from './supabase';

export type SessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

function deriveTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  const text = firstUserMessage?.parts.find(p => p.type === 'text')?.text ?? 'New chat';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export async function createSession(id: string): Promise<void> {
  const { error } = await getSupabase().from('chat_sessions').insert({ id, title: null });
  if (error) throw error;
}

export async function listSessions(limit = 50): Promise<SessionSummary[]> {
  const { data, error } = await getSupabase()
    .from('chat_sessions')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id,
    title: row.title ?? 'New chat',
    updatedAt: row.updated_at,
  }));
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  // chat_messages has ON DELETE CASCADE on session_id, so this removes its messages too.
  const { error } = await getSupabase().from('chat_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function loadMessages(sessionId: string): Promise<UIMessage[]> {
  const { data, error } = await getSupabase()
    .from('chat_messages')
    .select('id, role, parts')
    .eq('session_id', sessionId)
    // Order by the monotonic `seq` column, not `created_at`: messages saved in the
    // same upsert batch can share an identical `now()` timestamp within one
    // Postgres transaction, which made created_at unreliable for ordering.
    .order('seq', { ascending: true });

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id,
    role: row.role as UIMessage['role'],
    parts: row.parts as UIMessage['parts'],
  }));
}

export async function saveChat({
  sessionId,
  messages,
}: {
  sessionId: string;
  messages: UIMessage[];
}): Promise<void> {
  const supabase = getSupabase();

  const { error: messagesError } = await supabase.from('chat_messages').upsert(
    messages.map(m => ({
      id: m.id,
      session_id: sessionId,
      role: m.role,
      parts: m.parts,
    })),
  );
  if (messagesError) throw messagesError;

  const { error: sessionError } = await supabase
    .from('chat_sessions')
    .update({ title: deriveTitle(messages), updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('title', null);
  if (sessionError) throw sessionError;

  // Keep updated_at fresh even once the title is already set.
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}
