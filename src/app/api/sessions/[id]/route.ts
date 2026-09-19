import { deleteSession, loadMessages, sessionExists } from '@/lib/chat-store';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await sessionExists(id))) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }
  const messages = await loadMessages(id);
  return Response.json({ messages });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteSession(id);
  return Response.json({ ok: true });
}
