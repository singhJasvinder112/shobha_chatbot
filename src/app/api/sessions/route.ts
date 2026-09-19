import { generateId } from 'ai';
import { createSession, listSessions } from '@/lib/chat-store';

export async function GET() {
  const sessions = await listSessions();
  return Response.json({ sessions });
}

export async function POST() {
  const id = generateId();
  await createSession(id);
  return Response.json({ id });
}
