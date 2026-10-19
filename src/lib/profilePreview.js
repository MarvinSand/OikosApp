// Basisdaten, die beim Öffnen eines fremden Profils schon bekannt sind.
// UserProfile zeigt damit sofort den Kopf, statt auf den Request zu warten.
export function profilePreviewState(p) {
  if (!p?.id) return undefined
  return {
    profilePreview: {
      id: p.id,
      full_name: p.full_name ?? null,
      username: p.username ?? null,
      avatar_url: p.avatar_url ?? null,
      is_christian: p.is_christian ?? null,
    },
  }
}
