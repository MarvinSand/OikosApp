// YouVersion "Login mit YouVersion" – OAuth 2.0 mit PKCE.
//
// Verifiziert gegen developers.youversion.com/sign-in-apis (Stand: siehe
// Commit-Historie) – Standard-OAuth-2.0-Authorization-Code-Flow mit PKCE:
//   - Authorize-Endpoint:  https://api.youversion.com/auth/authorize
//   - Token-Endpoint:      https://api.youversion.com/auth/token
//   - App-Key-Header:      X-YVP-App-Key (App-Ebene, z.B. für Bibeltext)
//   - User-Token-Header:   Authorization: Bearer <access_token>
//   - Scopes:              "bibles", "highlights" (mehr per Leerzeichen trennen)
//
// Ablauf:
//   1. Frontend ruft POST .../start auf (mit Supabase-JWT) -> bekommt authorizeUrl
//   2. Browser navigiert zu api.youversion.com/auth/authorize, Nutzer bestätigt Scopes
//   3. YouVersion leitet zurück auf redirect_uri (unsere Frontend-Route
//      /bible/youversion/callback) mit ?code=...&state=...
//   4. Frontend ruft POST .../callback mit {code, state} auf -> Tokens werden
//      serverseitig getauscht und gespeichert, niemals ans Frontend zurückgegeben.

import { json, corsHeaders } from '../_shared/cors.ts'
import { getUserId, serviceClient } from '../_shared/authUser.ts'

const APP_KEY = Deno.env.get('YOUVERSION_APP_KEY')!
const AUTHORIZE_URL = 'https://api.youversion.com/auth/authorize'
const TOKEN_URL = 'https://api.youversion.com/auth/token'
const DATA_EXCHANGE_TOKEN_URL = 'https://api.youversion.com/data-exchange/token'
const DATA_EXCHANGE_URL = 'https://api.youversion.com/data-exchange'
// Der Standard-Login-Scope unterstützt nur Identitäts-Claims. Zugriff auf
// Highlights/Notizen ist ein separater Schritt (POST /data-exchange/token
// mit requested_permissions:["highlights"], erst NACH diesem Login möglich,
// da der Endpoint bereits einen User-Access-Token braucht) - siehe
// completeYouVersionLogin-Aufrufer für den Folge-Schritt.
const SCOPE = 'openid profile email'
const STATE_TTL_MS = 10 * 60 * 1000

function base64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let str = ''
  for (const b of arr) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomToken(len = 64) {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function sha256Base64Url(input: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return base64url(digest)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const userId = await getUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    /* leerer Body ok für manche Actions */
  }

  const db = serviceClient()

  if (body.action === 'start') {
    const redirectUri = body.redirectUri
    if (!redirectUri) return json({ error: 'redirectUri required' }, 400)

    const codeVerifier = randomToken(64)
    const codeChallenge = await sha256Base64Url(codeVerifier)
    const state = randomToken(24)

    // Alte, abgelaufene States aufräumen statt eine Cron-Function zu brauchen.
    await db.from('youversion_oauth_state').delete().lt('created_at', new Date(Date.now() - STATE_TTL_MS).toISOString())

    const { error: insertError } = await db.from('youversion_oauth_state').insert({
      state,
      user_id: userId,
      code_verifier: codeVerifier,
    })
    if (insertError) return json({ error: insertError.message }, 500)

    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', APP_KEY)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', SCOPE)
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')

    console.log(`authorizeUrl: ${url.toString()}`)
    return json({ authorizeUrl: url.toString(), state })
  }

  if (body.action === 'callback') {
    const { code, state, redirectUri } = body
    if (!code || !state || !redirectUri) return json({ error: 'code, state, redirectUri required' }, 400)

    const { data: stateRow, error: stateError } = await db
      .from('youversion_oauth_state')
      .select('user_id, code_verifier, created_at')
      .eq('state', state)
      .maybeSingle()

    if (stateError || !stateRow) return json({ error: 'invalid_state' }, 400)
    if (stateRow.user_id !== userId) return json({ error: 'state_user_mismatch' }, 403)
    if (Date.now() - new Date(stateRow.created_at).getTime() > STATE_TTL_MS) {
      await db.from('youversion_oauth_state').delete().eq('state', state)
      return json({ error: 'state_expired' }, 400)
    }

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-YVP-App-Key': APP_KEY,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: APP_KEY,
        code_verifier: stateRow.code_verifier,
      }),
    })

    await db.from('youversion_oauth_state').delete().eq('state', state)

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '')
      return json({ error: 'token_exchange_failed', detail: text }, 502)
    }

    const tokenData = await tokenRes.json()
    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString()

    // yvp_id kommt aus dem id_token (JWT) oder einem eigenen Feld – je
    // nachdem, was die echte Antwort liefert. Fallback: userinfo-Endpoint.
    let yvpId: string | null = tokenData.yvp_id ?? null
    if (!yvpId && tokenData.id_token) {
      try {
        const payload = JSON.parse(atob(tokenData.id_token.split('.')[1]))
        yvpId = payload.sub ?? payload.yvp_id ?? null
      } catch {
        /* ignore malformed id_token */
      }
    }

    const { error: upsertError } = await db.from('user_youversion_tokens').upsert({
      user_id: userId,
      yvp_id: yvpId ?? 'unknown',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      scope: tokenData.scope ?? SCOPE,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    if (upsertError) return json({ error: upsertError.message }, 500)

    await db.from('profiles').update({
      youversion_connected: true,
      youversion_yvp_id: yvpId,
    }).eq('id', userId)

    // Highlights sind kein Login-Scope, sondern eine separate Berechtigung,
    // die erst nach dem Login per "Data Exchange" angefragt werden kann.
    // Best-effort: schlägt das fehl, ist der Login trotzdem erfolgreich -
    // der Nutzer kann Highlights dann später erneut anfragen (sync-Action).
    let dataExchangeUrl: string | null = null
    try {
      const dxRes = await fetch(DATA_EXCHANGE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-YVP-App-Key': APP_KEY,
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({ requested_permissions: ['highlights'] }),
      })
      if (dxRes.ok) {
        const dx = await dxRes.json()
        const dxUrl = new URL(DATA_EXCHANGE_URL)
        dxUrl.searchParams.set('token', dx.token)
        dxUrl.searchParams.set('x-yvp-app-key', APP_KEY)
        dataExchangeUrl = dxUrl.toString()
      } else {
        console.error(`data-exchange/token failed: ${dxRes.status} ${await dxRes.text().catch(() => '')}`)
      }
    } catch (e) {
      console.error(`data-exchange/token error: ${e}`)
    }

    return json({ connected: true, dataExchangeUrl })
  }

  if (body.action === 'request-highlights') {
    const { data: tokenRow } = await db
      .from('user_youversion_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .maybeSingle()
    if (!tokenRow) return json({ error: 'not_connected_to_youversion' }, 409)

    const dxRes = await fetch(DATA_EXCHANGE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YVP-App-Key': APP_KEY,
        Authorization: `Bearer ${tokenRow.access_token}`,
      },
      body: JSON.stringify({ requested_permissions: ['highlights'] }),
    })
    if (!dxRes.ok) {
      const text = await dxRes.text().catch(() => '')
      return json({ error: 'data_exchange_token_failed', detail: text }, 502)
    }
    const dx = await dxRes.json()
    const dxUrl = new URL(DATA_EXCHANGE_URL)
    dxUrl.searchParams.set('token', dx.token)
    dxUrl.searchParams.set('x-yvp-app-key', APP_KEY)
    return json({ dataExchangeUrl: dxUrl.toString() })
  }

  if (body.action === 'disconnect') {
    await db.from('user_youversion_tokens').delete().eq('user_id', userId)
    await db.from('profiles').update({ youversion_connected: false, youversion_yvp_id: null }).eq('id', userId)
    return json({ connected: false })
  }

  return json({ error: 'unknown_action' }, 400)
})
