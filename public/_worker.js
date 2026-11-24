export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      const clientKey = (request.headers.get('x-client-api-key') || '').trim();
      const envKey = (env?.OPENROUTER_API_KEY || '').trim();
      return new Response(
        JSON.stringify({ ok: true, keyConfigured: !!(clientKey || envKey) }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, X-Client-Api-Key',
          },
        }
      );
    }

    if (url.pathname === '/api/tts') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Client-Api-Key',
          },
        });
      }
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      const clientKey = request.headers.get('x-client-api-key') || '';
      const envKey = env?.OPENROUTER_API_KEY || '';
      const apiKey = (clientKey || envKey).trim();

      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Client-Api-Key',
      };

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'No API key configured. Set one in Settings or add it to environment variables' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let reqData;
      try {
        reqData = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { text, voice, cloneAudio } = reqData || {};
      if (!text?.trim()) {
        return new Response(JSON.stringify({ error: 'text is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let body;
      if (cloneAudio) {
        body = {
          model: 'heygen/heygen-voice-1-turbo:free',
          input: text.trim(),
          response_format: 'pcm',
          input_references: [{
            type: 'input_audio',
            input_audio: { data: cloneAudio }
          }]
        };
      } else {
        if (!voice?.trim()) {
          return new Response(JSON.stringify({ error: 'voice is required for preset mode' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        body = {
          model: 'heygen/heygen-voice-1-turbo:free',
          input: text.trim(),
          voice: voice.trim(),
          response_format: 'pcm'
        };
      }

      try {
        const upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': `${url.origin}`,
            'X-Title': 'HeyGen Voice Studio'
          },
          body: JSON.stringify(body)
        });

        if (!upstream.ok) {
          const ct = upstream.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const err = await upstream.json();
            const msg = err?.error?.message || err?.message || `API error ${upstream.status}`;
            return new Response(JSON.stringify({ error: msg }), {
              status: upstream.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: `API error ${upstream.status}` }), {
            status: upstream.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const audioArrayBuffer = await upstream.arrayBuffer();
        return new Response(audioArrayBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/pcm',
            'X-Audio-Format': 'pcm',
            'Content-Length': String(audioArrayBuffer.byteLength),
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message || 'Upstream request failed' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
