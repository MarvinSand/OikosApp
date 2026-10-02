// Stellt eine Zeile aus `notifications` als native Push-Nachricht an APNs zu.
//
// Aufgerufen wird die Function ausschließlich vom DB-Trigger
// `on_notification_push_dispatch` (siehe phase68_push_dispatch.sql) mit
// { notification_id } im Body und dem gemeinsamen Webhook-Secret im Header –
// dieselbe Mechanik wie bei send-notification-email.
//
// Auth gegenüber Apple läuft über einen APNs Auth Key (.p8, ES256-JWT). Der
// Key gilt teamweit und läuft nicht ab; das daraus erzeugte JWT schon – Apple
// akzeptiert es maximal 1 Stunde, verlangt aber gleichzeitig, dass man nicht
// öfter als ~alle 20 Minuten ein neues erzeugt. Deshalb wird es im
// Modul-Scope für 30 Minuten zwischengespeichert.

const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID') ?? ''
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID') ?? ''
const APNS_PRIVATE_KEY = Deno.env.get('APNS_PRIVATE_KEY') ?? ''
const APNS_BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID') ?? 'app.oikos.mobile'
// TestFlight- und App-Store-Builds sprechen beide den Produktions-Host an;
// nur ein per Xcode aufs Gerät geladener Debug-Build braucht die Sandbox.
const APNS_HOST = Deno.env.get('APNS_HOST') ?? 'api.push.apple.com'
// .trim(): beim Einfügen ins Dashboard rutscht leicht ein Zeilenumbruch oder
// Leerzeichen mit – der Vergleich würde dann stillschweigend immer scheitern.
const WEBHOOK_SECRET = (Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '').trim()

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Wandelt den PEM-Inhalt der .p8-Datei in einen signierfähigen CryptoKey.
async function importApnsKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), c => c.charCodeAt(0))
  return await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
}

let cachedToken: { jwt: string; createdAt: number } | null = null

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && now - cachedToken.createdAt < 30 * 60) return cachedToken.jwt

  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })),
  )
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ iss: APNS_TEAM_ID, iat: now })),
  )
  const signingInput = `${header}.${payload}`

  const key = await importApnsKey(APNS_PRIVATE_KEY)
  // WebCrypto liefert ECDSA bereits als rohes r||s – genau das Format, das
  // JWS für ES256 erwartet (kein DER-Unwrapping nötig).
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  )

  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`
  cachedToken = { jwt, createdAt: now }
  return jwt
}

async function db(path: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`DB ${path} -> ${res.status}`)
  return await res.json()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  if (!WEBHOOK_SECRET) {
    // Deutlich vom Secret-Mismatch unterscheidbar – sonst sucht man beim
    // Einrichten ewig nach einem Tippfehler, der gar nicht existiert.
    return new Response('Webhook secret not configured', { status: 503 })
  }
  if ((req.headers.get('X-Webhook-Secret') ?? '').trim() !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY) {
    // Ohne hinterlegten Apple-Key gibt es nichts zu senden. Das ist kein
    // Fehlerfall für den Trigger – die In-App-Benachrichtigung steht ja schon.
    return Response.json({ skipped: 'apns_not_configured' })
  }

  const { notification_id } = await req.json().catch(() => ({}))
  if (!notification_id) return new Response('Missing notification_id', { status: 400 })

  const [notification] = await db(
    `notifications?id=eq.${notification_id}&select=id,user_id,type,title,body,data`,
  )
  if (!notification) return Response.json({ skipped: 'notification_not_found' })

  const tokens: Array<{ token: string }> = await db(
    `device_tokens?user_id=eq.${notification.user_id}&select=token`,
  )
  if (tokens.length === 0) return Response.json({ skipped: 'no_devices' })

  // Ungelesene Benachrichtigungen als Badge-Zahl aufs App-Icon.
  const unread: Array<{ id: string }> = await db(
    `notifications?user_id=eq.${notification.user_id}&is_read=eq.false&select=id`,
  )

  const jwt = await getApnsJwt()
  const payload = JSON.stringify({
    aps: {
      alert: { title: notification.title, body: notification.body ?? '' },
      sound: 'default',
      badge: unread.length,
    },
    // Wird beim Tap an die App durchgereicht (siehe src/lib/nativePush.js).
    url: notification.data?.url ?? '/notifications',
    notification_id: notification.id,
    type: notification.type,
  })

  const results = await Promise.all(tokens.map(async ({ token }) => {
    const res = await fetch(`https://${APNS_HOST}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': APNS_BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: payload,
    })

    // 410 Gone = das Gerät hat die App deinstalliert; Apple verlangt, solche
    // Tokens nicht weiter zu bespielen.
    if (res.status === 410 || res.status === 400) {
      await fetch(`${SUPABASE_URL}/rest/v1/device_tokens?token=eq.${token}`, {
        method: 'DELETE',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      })
    }

    return { status: res.status, body: res.ok ? null : await res.text() }
  }))

  return Response.json({ sent: results.filter(r => r.status === 200).length, results })
})
