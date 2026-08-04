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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), supabasePreconnect(env)],
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
