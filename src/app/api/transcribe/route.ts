import { deepgram } from '@ai-sdk/deepgram';
import { transcribe } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const formData = await req.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof Blob)) {
    return Response.json({ error: 'No audio file provided.' }, { status: 400 });
  }

  const buffer = new Uint8Array(await audio.arrayBuffer());

  try {
    const { text } = await transcribe({
      model: deepgram.transcription('nova-3'),
      audio: buffer,
    });

    return Response.json({ text });
  } catch (error) {
    console.error('Transcription failed', error);
    return Response.json({ error: 'Transcription failed. Please try again.' }, { status: 500 });
  }
}
