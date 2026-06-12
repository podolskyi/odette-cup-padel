// Supabase Edge Function: fetch-americano
//
// A thin CORS-bypassing proxy. The static app can't fetch americano-padel.com
// directly from the browser (cross-origin), so it asks this function to fetch
// the round page server-side and hand back the raw HTML. All parsing stays in
// the client (src/parser/americanoPadelHtml.ts), where it's unit-tested.
//
// Deploy:  supabase functions deploy fetch-americano --no-verify-jwt
//
// It only ever fetches https://americano-padel.com/r/<uuid> — nothing else —
// so it can't be used as an open proxy.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const ALLOWED = /^https:\/\/americano-padel\.com\/r\/[0-9a-f-]{8,}(\?.*)?$/i

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  let url = ''
  try {
    url = (await req.json())?.url ?? ''
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!ALLOWED.test(url.trim())) {
    return json({ error: 'Only americano-padel.com/r/<id> links are allowed' }, 400)
  }

  try {
    const res = await fetch(url.trim(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OdetteCup/1.0)' },
    })
    if (!res.ok) return json({ error: `Source returned ${res.status}` }, 502)
    const html = await res.text()
    return json({ html })
  } catch (e) {
    return json({ error: `Fetch failed: ${e instanceof Error ? e.message : String(e)}` }, 502)
  }
})
