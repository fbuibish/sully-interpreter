import { NextApiRequest, NextApiResponse } from 'next';
import { AssemblyAI, RealtimeTranscript } from 'assemblyai';

const ASSEMBLYAI_API_KEY = '66720d6e22a141798bcc7747fcc66011';

const client = new AssemblyAI({
  apiKey: ASSEMBLYAI_API_KEY,
});

let transcriber: any = null;

export default async function streamTranscription(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Handle SSE connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Create new transcriber if none exists
    if (!transcriber) {
      transcriber = client.realtime.transcriber({
        sampleRate: 16000,
        // speaker_labels: true,
      });

      transcriber.on('open', ({ sessionId }) => {
        console.log(`Session opened with ID: ${sessionId}`);
      });

      transcriber.on('error', (error: Error) => {
        console.error('Error:', error);
        res.end();
      });

      transcriber.on('close', (code: number, reason: string) => {
        console.log('Session closed:', code, reason);
        transcriber = null;
        res.end();
      });

      transcriber.on('transcript', (transcript: RealtimeTranscript) => {
        if (!transcript.text) return;

        if (transcript.message_type === 'FinalTranscript') {
          console.log('Final transcript:', transcript.text);
          res.write(`data: ${JSON.stringify({ transcript: transcript.text, final: true })}\n\n`);
        } else {
          // console.log('Interim transcript:', transcript);
          // res.write(`data: ${JSON.stringify({ transcript: transcript.text, final: false })}\n\n`);
        }
      });

      await transcriber.connect();
    }

    // Handle client disconnect
    req.on('close', async () => {
      if (transcriber) {
        await transcriber.close();
        transcriber = null;
      }
    });

  } else if (req.method === 'POST') {
    // Handle audio data
    if (!transcriber) {
      return res.status(400).json({ error: 'No active transcription session' });
    }

    const { audioContent } = req.body;
    if (audioContent) {
      const audioBuffer = Buffer.from(audioContent, 'base64');
      transcriber.sendAudio(audioBuffer);
    }

    res.status(200).json({ status: 'ok' });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
