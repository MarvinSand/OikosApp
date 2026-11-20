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

// Die Landingpage ist ein eigener Lazy-Chunk. Ohne Hinweis holt ihn der Browser
// erst, nachdem das Entry-Bundle ausgeführt wurde (ein Round-Trip mehr – auf
// 3G/4G spürbar). Ausgeloggte Besucher auf „/“ bekommen ihn deshalb schon
// parallel zum Entry; eingeloggte (Supabase-Session im localStorage), die App-
// Subdomain und die native App (hostname localhost) laden nichts extra.
function preloadLandingChunk() {
  return {
    name: 'preload-landing-chunk',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return []
      // (facadeModuleId ist hier null, weil Landing.jsx den Chunk mit seinen
      // exklusiven Modulen teilt → über den Chunk-Namen finden)
      const chunk = Object.values(ctx.bundle).find(c => c.type === 'chunk' && c.name === 'Landing')
      if (!chunk) return []
      const files = [{ rel: 'modulepreload', href: `/${chunk.fileName}` }]
      for (const css of chunk.viteMetadata?.importedCss || []) files.push({ rel: 'preload', as: 'style', href: `/${css}` })
      const code = `(function(){try{var h=location.hostname;if(location.pathname!=='/'||h==='localhost'||h==='app.oikosconnect.net')return;`
        + `for(var i=0;i<localStorage.length;i++){if(/^sb-.*-auth-token$/.test(localStorage.key(i)))return}`
        + `${JSON.stringify(files)}.forEach(function(f){var l=document.createElement('link');l.rel=f.rel;if(f.as)l.as=f.as;l.crossOrigin='';l.href=f.href;document.head.appendChild(l)})}catch(e){}})()`
      return [{ tag: 'script', children: code, injectTo: 'head-prepend' }]
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), supabasePreconnect(env), preloadLandingRoute(), preloadLandingChunk()],
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
