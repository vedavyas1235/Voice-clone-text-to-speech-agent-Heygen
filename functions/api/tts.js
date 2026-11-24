export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Client-Api-Key',
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Manual key (from frontend settings) takes priority over environment variable
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

  // Always use PCM — HeyGen only reliably returns PCM audio
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
      response_format: responseFormat
    };
  }

  try {
    const url = new URL(request.url);
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
    if (!audioArrayBuffer || audioArrayBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'Received empty audio from API' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseHeaders = new Headers({
      ...corsHeaders,
      'Content-Type': 'audio/pcm',
      'X-Audio-Format': 'pcm',
      'Content-Length': String(audioArrayBuffer.byteLength),
    });

    const genId = upstream.headers.get('x-generation-id');
    if (genId) responseHeaders.set('X-Generation-Id', genId);

    return new Response(audioArrayBuffer, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Upstream request failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
