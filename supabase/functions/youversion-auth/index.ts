// YouVersion "Login mit YouVersion" – OAuth 2.0 mit PKCE + OpenID Connect.
//
// Verifiziert gegen developers.youversion.com/sign-in-apis – Standard-OAuth-
// 2.0-Authorization-Code-Flow mit PKCE:
//   - Authorize-Endpoint:  https://api.youversion.com/auth/authorize
//   - Token-Endpoint:      https://api.youversion.com/auth/token
//   - App-Key-Header:      X-YVP-App-Key (App-Ebene, z.B. für Bibeltext)
//   - User-Token-Header:   Authorization: Bearer <access_token>
//   - Scopes:              "openid profile email" (OIDC-Identität)
//   - requested_permissions[]: eigener Parameter am /authorize-Aufruf,
//     getrennt vom OAuth-"scope" - aktuell nur "highlights" unterstützt
//   - nonce ist Pflicht, sobald scope "openid" enthält
//
// Zwei Modi, je nachdem ob der Aufrufer beim Start bereits eine Oikos-
// Session hat (Authorization-Header mit gültigem Supabase-JWT):
//
//   "link"   – Nutzer ist schon bei Oikos eingeloggt (Bibel/Einstellungen)
//              und verknüpft sein bestehendes Konto mit YouVersion.
//   "signin" – Nutzer ist NICHT eingeloggt (Login-Bildschirm) und meldet
//              sich direkt über YouVersion an. Wird kein Oikos-Konto mit
//              dieser YouVersion-Identität (yvp_id) oder E-Mail gefunden,
//              wird eins angelegt (auth.admin.createUser, das bestehende
//              on_auth_user_created-Trigger legt automatisch die
//              profiles-Zeile an). Login selbst passiert über einen per
//              auth.admin.generateLink erzeugten Magic-Link-Token, den das
//              Frontend per supabase.auth.verifyOtp einlöst – ohne dass
//              eine echte E-Mail verschickt wird.
//
// Der Modus wird beim "start" aus der Anwesenheit eines gültigen Oikos-JWTs
// abgeleitet und zusammen mit dem State gespeichert; beim "callback" ist
// ausschließlich dieser gespeicherte Modus maßgeblich.

import { json, corsHeaders } from '../_shared/cors.ts'
import { getUserId, serviceClient } from '../_shared/authUser.ts'

const APP_KEY = Deno.env.get('YOUVERSION_APP_KEY')!
const AUTHORIZE_URL = 'https://api.youversion.com/auth/authorize'
const TOKEN_URL = 'https://api.youversion.com/auth/token'
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

function decodeIdToken(idToken: string): Record<string, any> | null {
  try {
    return JSON.parse(atob(idToken.split('.')[1]))
  } catch {
    return null
  }
}

async function exchangeCode(code: string, redirectUri: string, codeVerifier: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-YVP-App-Key': APP_KEY },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: APP_KEY,
      code_verifier: codeVerifier,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`token_exchange_failed: ${res.status} ${text}`)
  }
  return res.json()
}

// Sucht einen bestehenden auth.users-Eintrag per E-Mail. Es gibt in
// supabase-js keine direkte "getUserByEmail" Admin-API, deshalb wird die
// (paginierte) Nutzerliste durchsucht - für die aktuelle Nutzerzahl der App
// ausreichend, skaliert aber nicht unbegrenzt.
async function findAuthUserByEmail(db: ReturnType<typeof serviceClient>, email: string) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) break
    const match = data.users.find(u => u.email?.toLowerCase() === target)
    if (match) return match
    if (data.users.length < 1000) break
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const userId = await getUserId(req)

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

    const mode = userId ? 'link' : 'signin'
    const requestHighlights = mode === 'link' && body.requestHighlights !== false
    const codeVerifier = randomToken(64)
    const codeChallenge = await sha256Base64Url(codeVerifier)
    const state = randomToken(24)
    const nonce = randomToken(24)

    // Alte, abgelaufene States aufräumen statt eine Cron-Function zu brauchen.
    await db.from('youversion_oauth_state').delete().lt('created_at', new Date(Date.now() - STATE_TTL_MS).toISOString())

    const { error: insertError } = await db.from('youversion_oauth_state').insert({
      state,
      user_id: userId,
      code_verifier: codeVerifier,
      nonce,
      mode,
    })
    if (insertError) return json({ error: insertError.message }, 500)

    const url = new URL(AUTHORIZE_URL)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', APP_KEY)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', SCOPE)
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)
    url.searchParams.set('code_challenge', codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')
    // Ohne diesen Parameter kann der In-Browser-Flow (v.a. auf Mobilgeräten)
    // abbrechen und nur mit "state" (ohne "code"/"error") zurückleiten, statt
    // den Nutzer einen Bestätigungs-Button klicken zu lassen.
    url.searchParams.set('require_user_interaction', 'true')
    // requested_permissions[] ist ein eigener Parameter direkt am
    // /authorize-Aufruf (getrennt vom OAuth-"scope") - NICHT über die
    // separate "Data Exchange"-Seite anfragen, das ist ein anderer,
    // unnötiger Mechanismus für diesen Fall.
    if (requestHighlights) url.searchParams.set('requested_permissions[]', 'highlights')

    return json({ authorizeUrl: url.toString(), state, mode })
  }

  if (body.action === 'callback') {
    const { code, state, redirectUri } = body
    if (!code || !state || !redirectUri) return json({ error: 'code, state, redirectUri required' }, 400)

    const { data: stateRow, error: stateError } = await db
      .from('youversion_oauth_state')
      .select('user_id, code_verifier, nonce, mode, created_at')
      .eq('state', state)
      .maybeSingle()

    if (stateError || !stateRow) return json({ error: 'invalid_state' }, 400)
    if (Date.now() - new Date(stateRow.created_at).getTime() > STATE_TTL_MS) {
      await db.from('youversion_oauth_state').delete().eq('state', state)
      return json({ error: 'state_expired' }, 400)
    }
    if (stateRow.mode === 'link' && stateRow.user_id !== userId) {
      return json({ error: 'state_user_mismatch' }, 403)
    }

    let tokenData: any
    try {
      tokenData = await exchangeCode(code, redirectUri, stateRow.code_verifier)
    } catch (e) {
      return json({ error: 'token_exchange_failed', detail: String(e) }, 502)
    }
    await db.from('youversion_oauth_state').delete().eq('state', state)

    const idPayload = tokenData.id_token ? decodeIdToken(tokenData.id_token) : null
    if (idPayload?.nonce && idPayload.nonce !== stateRow.nonce) {
      return json({ error: 'nonce_mismatch' }, 400)
    }
    const yvpId: string = tokenData.yvp_id ?? idPayload?.sub ?? 'unknown'
    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString()

    async function saveTokensAndLinkProfile(targetUserId: string) {
      await db.from('user_youversion_tokens').upsert({
        user_id: targetUserId,
        yvp_id: yvpId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        scope: tokenData.scope ?? SCOPE,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      await db.from('profiles').update({
        youversion_connected: true,
        youversion_yvp_id: yvpId,
        youversion_email: idPayload?.email ?? null,
      }).eq('id', targetUserId)
    }

    if (stateRow.mode === 'link') {
      if (!userId) return json({ error: 'unauthorized' }, 401)
      await saveTokensAndLinkProfile(userId)
      // granted_permissions kommt (falls requested_permissions[] gesetzt war)
      // als Query-Param auf dem redirect_uri der zweiten Runde (Auth Call 2)
      // mit an - das Frontend liest es dort direkt aus der URL, nicht hier.
      return json({ connected: true })
    }

    // mode === 'signin': neues oder bestehendes Oikos-Konto per YouVersion-
    // Identität finden/anlegen und den Nutzer einloggen.
    const email: string | undefined = idPayload?.email
    const name: string = idPayload?.name || idPayload?.given_name || ''
    if (!email) return json({ error: 'no_email_from_youversion' }, 400)

    let targetUserId: string | null = null

    const { data: existingProfile } = await db
      .from('profiles')
      .select('id')
      .eq('youversion_yvp_id', yvpId)
      .maybeSingle()
    if (existingProfile) targetUserId = existingProfile.id

    if (!targetUserId) {
      const existingAuthUser = await findAuthUserByEmail(db, email)
      if (existingAuthUser) targetUserId = existingAuthUser.id
    }

    if (!targetUserId) {
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name },
      })
      if (createError || !created?.user) {
        return json({ error: 'account_creation_failed', detail: createError?.message }, 500)
      }
      targetUserId = created.user.id
    }

    await saveTokensAndLinkProfile(targetUserId)

    const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      return json({ error: 'signin_link_failed', detail: linkError?.message }, 500)
    }

    return json({ email, tokenHash: linkData.properties.hashed_token })
  }

  if (body.action === 'disconnect') {
    if (!userId) return json({ error: 'unauthorized' }, 401)
    await db.from('user_youversion_tokens').delete().eq('user_id', userId)
    await db.from('profiles').update({ youversion_connected: false, youversion_yvp_id: null, youversion_email: null }).eq('id', userId)
    return json({ connected: false })
  }

  return json({ error: 'unknown_action' }, 400)
})
