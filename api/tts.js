export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Api-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = (req.headers['x-client-api-key'] || process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'No API key configured. Set one in Settings or add it to environment variables' });
  }

  const { text, voice, cloneAudio } = req.body || {};

  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  const responseFormat = 'pcm';
  let body;
  if (cloneAudio) {
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
    if (!voice?.trim()) return res.status(400).json({ error: 'voice is required for preset mode' });
    body = {
      model: 'heygen/heygen-voice-1-turbo:free',
      input: text.trim(),
      voice: voice.trim(),
      response_format: responseFormat
    };
  }

  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `${proto}://${host}`,
        'X-Title': 'HeyGen Voice Studio'
      },
      body: JSON.stringify(body)
    });

    if (!upstream.ok) {
      const ct = upstream.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const err = await upstream.json();
        const msg = err?.error?.message || err?.message || `API error ${upstream.status}`;
        return res.status(upstream.status).json({ error: msg });
      }
      return res.status(upstream.status).json({ error: `API error ${upstream.status}` });
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    if (!audio.length) return res.status(502).json({ error: 'Received empty audio from API' });

    const genId = upstream.headers.get('x-generation-id');
    if (genId) res.setHeader('X-Generation-Id', genId);

    res.setHeader('X-Audio-Format', 'pcm');
    res.setHeader('Content-Type', 'audio/pcm');
    res.setHeader('Content-Length', audio.length);
    res.send(audio);

  } catch (err) {
    res.status(502).json({ error: err.message || 'Upstream request failed' });
  }
}
