import { listSessions } from '@/lib/chat-store';

export async function GET() {
  const sessions = await listSessions();
  return Response.json({ sessions });
}
