// Zieht Highlights/Notizen/Lesezeichen des verbundenen YouVersion-Accounts
// und spiegelt sie in die lokalen bible_highlights / bible_notes /
// bible_bookmarks Tabellen (source='youversion', dedupe über youversion_id).
//
// WICHTIG: Die genauen Endpoint-Pfade/Response-Felder für Highlights/Notizen/
// Lesezeichen der YouVersion Platform API waren zum Bau dieser Function nicht
// direkt einsehbar (Egress zu developers.youversion.com blockiert). Die Pfade
// unten sind die naheliegendste Annahme (REST-Ressourcen unter /v1/... mit
// User-Bearer-Token) und MÜSSEN gegen https://developers.youversion.com/api
// verifiziert und ggf. angepasst werden, bevor echte Syncs laufen. Schlägt
// ein Endpoint fehl, wird die jeweilige Kategorie übersprungen statt den
// ganzen Sync abzubrechen (siehe `trySync`).

import { json, corsHeaders } from '../_shared/cors.ts'
import { getUserId, serviceClient } from '../_shared/authUser.ts'

const APP_KEY = Deno.env.get('YOUVERSION_APP_KEY')!
const TOKEN_URL = 'https://api.youversion.com/auth/token'
const UPSTREAM_BASE = 'https://api.youversion.com'

async function getFreshUserAccessToken(userId: string) {
  const db = serviceClient()
  const { data: row } = await db
    .from('user_youversion_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!row) return null
  if (new Date(row.expires_at).getTime() > Date.now() + 30_000) return row.access_token
  if (!row.refresh_token) return row.access_token

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-YVP-App-Key': APP_KEY },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token, client_id: APP_KEY }),
  })
  if (!res.ok) return row.access_token
  const data = await res.json()
  await db.from('user_youversion_tokens').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? row.refresh_token,
    expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
  return data.access_token
}

async function fetchAllPages(path: string, accessToken: string) {
  const items: any[] = []
  let next: string | null = UPSTREAM_BASE + path
  let guard = 0
  while (next && guard < 20) {
    guard++
    const res = await fetch(next, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-YVP-App-Key': APP_KEY, Accept: 'application/json' },
    })
    if (!res.ok) {
      if (items.length === 0) throw new Error(`${res.status} on ${next}`)
      break
    }
    const data = await res.json()
    items.push(...(data.items ?? data.data ?? (Array.isArray(data) ? data : [])))
    next = data.next_page ?? data.next ?? null
  }
  return items
}

async function trySync<T>(label: string, fn: () => Promise<T[]>) {
  try {
    const items = await fn()
    return { label, ok: true, count: items.length, items }
  } catch (e) {
    return { label, ok: false, count: 0, items: [] as T[], error: String(e) }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const userId = await getUserId(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)

  const accessToken = await getFreshUserAccessToken(userId)
  if (!accessToken) return json({ error: 'not_connected_to_youversion' }, 409)

  const db = serviceClient()

  const [highlights, notes, bookmarks] = await Promise.all([
    trySync('highlights', () => fetchAllPages('/v1/highlights', accessToken)),
    trySync('notes', () => fetchAllPages('/v1/notes', accessToken)),
    trySync('bookmarks', () => fetchAllPages('/v1/bookmarks', accessToken)),
  ])

  if (highlights.items.length) {
    const rows = highlights.items.map((h: any) => ({
      user_id: userId,
      bible_id: h.bible_id ?? h.version_id ?? 'de-elb',
      book: h.book_usfm ?? h.book ?? 'UNK',
      chapter: h.chapter ?? 1,
      verse_start: h.verse_start ?? h.verse ?? 1,
      verse_end: h.verse_end ?? null,
      reference_label: h.reference ?? h.human_reference ?? '',
      color: h.color ?? 'yellow',
      source: 'youversion',
      youversion_id: String(h.id ?? h.uuid ?? `${h.book}-${h.chapter}-${h.verse_start}`),
    }))
    await db.from('bible_highlights').upsert(rows, { onConflict: 'user_id,source,youversion_id' })
  }

  if (notes.items.length) {
    const rows = notes.items.map((n: any) => ({
      user_id: userId,
      bible_id: n.bible_id ?? n.version_id ?? 'de-elb',
      book: n.book_usfm ?? n.book ?? 'UNK',
      chapter: n.chapter ?? 1,
      verse_start: n.verse_start ?? n.verse ?? 1,
      verse_end: n.verse_end ?? null,
      reference_label: n.reference ?? n.human_reference ?? '',
      note: n.content ?? n.text ?? '',
      source: 'youversion',
      youversion_id: String(n.id ?? n.uuid ?? `${n.book}-${n.chapter}-${n.verse_start}`),
      updated_at: new Date().toISOString(),
    }))
    await db.from('bible_notes').upsert(rows, { onConflict: 'user_id,source,youversion_id' })
  }

  if (bookmarks.items.length) {
    const rows = bookmarks.items.map((b: any) => ({
      user_id: userId,
      bible_id: b.bible_id ?? b.version_id ?? 'de-elb',
      book: b.book_usfm ?? b.book ?? 'UNK',
      chapter: b.chapter ?? 1,
      verse: b.verse ?? null,
      reference_label: b.reference ?? b.human_reference ?? '',
      source: 'youversion',
      youversion_id: String(b.id ?? b.uuid ?? `${b.book}-${b.chapter}-${b.verse ?? ''}`),
    }))
    await db.from('bible_bookmarks').upsert(rows, { onConflict: 'user_id,source,youversion_id' })
  }

  return json({
    synced: {
      highlights: { ok: highlights.ok, count: highlights.count, error: highlights.ok ? undefined : highlights.error },
      notes: { ok: notes.ok, count: notes.count, error: notes.ok ? undefined : notes.error },
      bookmarks: { ok: bookmarks.ok, count: bookmarks.count, error: bookmarks.ok ? undefined : bookmarks.error },
    },
  })
})
