import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Der Supabase-Host wird direkt beim App-Start kontaktiert (Session prüfen,
// erste Queries). Ein früher preconnect erledigt DNS + TLS-Handshake schon
// während die JS-Bundles laden – auf Mobilfunk spart das oft 200–400 ms.
// Als Plugin statt als %VITE_...%-Platzhalter, damit ein fehlendes Env-Var
// einfach nichts einfügt statt einen kaputten Link zu erzeugen.
function supabasePreconnect(env) {
  return {
    name: 'supabase-preconnect',
    transformIndexHtml() {
      const url = env.VITE_SUPABASE_URL
      if (!url || !/^https?:\/\//.test(url)) return []
      return [
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: new URL(url).origin, crossorigin: '' },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// Home ist die Landing-Route. Ohne diesen Hinweis lädt der Browser den
// Home-Chunk erst, wenn das Entry-Bundle ausgeführt wurde – ein zusätzlicher
// Round-Trip in Reihe. Mit modulepreload startet der Download schon beim
// Parsen des HTML, parallel zu React/Supabase.
function preloadLandingRoute() {
  return {
    name: 'preload-landing-route',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return []
      const entry = Object.values(ctx.bundle).find(
        c => c.type === 'chunk' && c.facadeModuleId?.replace(/\\/g, '/').endsWith('src/pages/Home.jsx')
      )
      if (!entry) return []
      // Bewusst nur der Home-Chunk selbst: seine Abhängigkeiten mitzupreloaden
      // zieht u. a. den kompletten FriendsView-Chunk (~81 kB) mit hoher
      // Priorität in den kritischen Pfad. Die Deps holt Vites Preload-Helper
      // ohnehin, sobald der Chunk ausgeführt wird.
      if (html.includes(entry.fileName)) return []
      return [{
        tag: 'link',
        attrs: { rel: 'modulepreload', crossorigin: '', href: `/${entry.fileName}` },
        injectTo: 'head',
      }]
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), supabasePreconnect(env), preloadLandingRoute()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  }
})
