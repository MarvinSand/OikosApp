import { createClient } from 'jsr:@supabase/supabase-js@2'

// Liest den Supabase-JWT aus dem Authorization-Header und liefert die
// zugehörige user.id. Läuft gegen die Auth-API (kein Service-Role-Bypass),
// damit ein fremdes/abgelaufenes Token zuverlässig abgelehnt wird.
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}
