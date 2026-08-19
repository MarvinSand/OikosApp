// Generischer Proxy zur YouVersion Platform API (api.youversion.com).
//
// Zweck: Der YOUVERSION_APP_KEY darf nie im Frontend-Bundle landen (jede
// VITE_-Variable ist im ausgelieferten JS für alle sichtbar). Diese Function
// hängt den Key serverseitig an und reicht die Anfrage 1:1 durch, damit das
// Frontend gegen die reale YouVersion-API-Struktur entwickeln kann, ohne dass
// wir jeden Endpoint einzeln nachbauen müssen.
//
// Aufruf vom Frontend: GET /bible-api/<beliebiger-youversion-pfad>?query
//   z.B. /bible-api/v1/bibles/de-elb/books/JHN/chapters/3/verses
// -> wird zu https://api.youversion.com/v1/bibles/de-elb/books/JHN/chapters/3/verses
// mit Header X-YVP-App-Key.
//
// WICHTIG: Exakte Pfade (Buch-Codes, Bibel-IDs, Such-Endpoint, "Verse of the
// Day") bitte gegen https://developers.youversion.com/api gegenchecken – die
// Doku war beim Bau dieser Function per Egress-Proxy nicht direkt abrufbar.
//
// Optional: Ist der aufrufende Oikos-User per "Login mit YouVersion"
// verbunden UND wird ?asUser=1 übergeben, wird zusätzlich (bzw. statt App-Key)
// der gespeicherte User-Access-Token mitgeschickt – nötig für persönliche
// Endpoints wie Highlights/Notizen/Lesezeichen. Der Token verlässt die
// Function dabei nie in Richtung Frontend.

import { corsHeaders, json, withCors } from '../_shared/cors.ts'
import { getUserId, serviceClient } from '../_shared/authUser.ts'

const APP_KEY = Deno.env.get('YOUVERSION_APP_KEY')!
const UPSTREAM_BASE = 'https://api.youversion.com'
const TOKEN_URL = 'https://api.youversion.com/auth/token'

async function getFreshUserAccessToken(userId: string): Promise<string | null> {
  const db = serviceClient()
  const { data: row } = await db
    .from('user_youversion_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!row) return null

  if (new Date(row.expires_at).getTime() > Date.now() + 30_000) {
    return row.access_token
  }
  if (!row.refresh_token) return row.access_token

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-YVP-App-Key': APP_KEY },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
      client_id: APP_KEY,
    }),
  })
  if (!res.ok) return row.access_token

  const data = await res.json()
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()
  await db.from('user_youversion_tokens').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? row.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return data.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const userId = await getUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const url = new URL(req.url)
  // Der Funktionsname selbst ist Teil des Pfads (/functions/v1/bible-api/...)
  const path = url.pathname.replace(/^\/(functions\/v1\/)?bible-api/, '') || '/'
  const asUser = url.searchParams.get('asUser') === '1'
  url.searchParams.delete('asUser')

  const upstream = new URL(UPSTREAM_BASE + path)
  upstream.search = url.searchParams.toString()

  const headers: Record<string, string> = { 'X-YVP-App-Key': APP_KEY, Accept: 'application/json' }

  if (asUser) {
    const accessToken = await getFreshUserAccessToken(userId)
    if (!accessToken) return json({ error: 'not_connected_to_youversion' }, 409)
    headers.Authorization = `Bearer ${accessToken}`
  }

  const upstreamRes = await fetch(upstream.toString(), { headers })
  const body = await upstreamRes.text()

  return withCors(new Response(body, {
    status: upstreamRes.status,
    headers: { 'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/json' },
  }))
})
