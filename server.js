import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// 50 MB limit — needed when voice-clone audio is sent as base64
app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public')));

// ── POST /api/tts ──────────────────────────────────────────────────────
// Body (JSON):
//   text             string  – text to synthesise (required)
//   voice            string  – preset voice name (required for preset mode)
//   cloneAudio       string  – base64 audio data URI for voice cloning (required for clone mode)
//   cloneTranscript  string  – optional transcript of the clone clip
app.post('/api/tts', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set in .env' });
  }

  const { text, voice, cloneAudio, cloneTranscript } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  // Always use PCM — HeyGen only reliably returns PCM audio
  const responseFormat = 'pcm';

  // Build request body based on mode:
  //   Clone mode  → input_references array with audio data URI; voice field omitted
  //   Preset mode → voice string (required)
  let body;
  if (cloneAudio) {
    // Voice cloning: use input_references — voice field must NOT be sent (it must be a string)
    // cloneAudio is sent as a full data URI (e.g. "data:audio/wav;base64,...")
    const inputRef = {
      type: 'input_audio',
      input_audio: { data: cloneAudio }
    };
    body = {
      model: 'heygen/heygen-voice-1-turbo:free',
      input: text.trim(),
      response_format: responseFormat,
      input_references: [inputRef]
    };
  } else {
    // Preset mode: named voice string is required
    if (!voice?.trim()) return res.status(400).json({ error: 'voice is required for preset mode' });
    body = {
      model: 'heygen/heygen-voice-1-turbo:free',
      input: text.trim(),
      voice: voice.trim(),
      response_format: responseFormat
    };
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `http://localhost:${process.env.PORT || 3000}`,
        'X-Title': 'HeyGen Voice Studio'
      },
      body: JSON.stringify(body)
    });

    if (!upstream.ok) {
      const ct = upstream.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const err = await upstream.json();
        const msg = err?.error?.message || err?.message || `API error ${upstream.status}`;
        console.error(`[/api/tts] OpenRouter ${upstream.status}:`, msg);
        return res.status(upstream.status).json({ error: msg });
      }
      return res.status(upstream.status).json({ error: `API error ${upstream.status}` });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    if (!audio.length) return res.status(502).json({ error: 'Received empty audio from API' });

    const genId = upstream.headers.get('x-generation-id');
    if (genId) res.setHeader('X-Generation-Id', genId);

    // Always PCM — client wraps it in a WAV header
    res.setHeader('X-Audio-Format', 'pcm');
    res.setHeader('Content-Type', 'audio/pcm');
    res.setHeader('Content-Length', audio.length);
    res.send(audio);

  } catch (err) {
    console.error('[/api/tts]', err);
    res.status(502).json({ error: err.message || 'Upstream request failed' });
  }
});

// ── GET /api/health ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, keyConfigured: !!process.env.OPENROUTER_API_KEY?.trim() });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`\n  HeyGen Voice Studio`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Key:    ${process.env.OPENROUTER_API_KEY ? '✓ configured' : '✗ missing — add to .env'}\n`);
});
