export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Api-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const clientKey = (req.headers['x-client-api-key'] || '').trim();
  const envKey = (process.env.OPENROUTER_API_KEY || '').trim();
  res.status(200).json({ ok: true, keyConfigured: !!(clientKey || envKey) });
}
