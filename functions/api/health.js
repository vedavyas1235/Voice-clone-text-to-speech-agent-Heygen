export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Client-Api-Key',
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const clientKey = (request.headers.get('x-client-api-key') || '').trim();
  const envKey = (env?.OPENROUTER_API_KEY || '').trim();

  return new Response(
    JSON.stringify({ ok: true, keyConfigured: !!(clientKey || envKey) }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Client-Api-Key',
      },
    }
  );
}
