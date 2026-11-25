#!/usr/bin/env node
// Rendert ein Code-Video (videos/<name>/scene.html mit window.setTime(t)) zu MP4.
//   node marketing/social/render-video.cjs 001-frohe-botschaft            → komplettes Video
//   node marketing/social/render-video.cjs 001-frohe-botschaft --stills 3,20,40   → nur Standbilder (Kontrolle)
// Optionen: --fps 30  --workers 4  --duration 80  --page cover.html (anderes HTML im Video-Ordner, z. B. für Cover)
// Ausgabe: videos/<name>/out/video.mp4 (mit audio.wav, falls vorhanden) + video-silent.mp4
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os')
const { spawnSync } = require('child_process')
const { chromium } = require('playwright')

const ROOT = __dirname
const name = process.argv[2]
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d }
const fps = +arg('fps', 30), workers = +arg('workers', 4), duration = +arg('duration', 80)
const stills = arg('stills', null), pageName = arg('page', 'scene.html')
const dir = path.join(ROOT, 'videos', name)
if (!name || !fs.existsSync(path.join(dir, pageName))) { console.error('Aufruf: node render-video.cjs <ordner> [--stills 1,2,3]'); process.exit(1) }
const out = path.join(dir, 'out'); fs.mkdirSync(out, { recursive: true })

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res)
})

async function open(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
  page.on('pageerror', e => console.log('PAGEERROR', e.message))
  await page.goto(`http://127.0.0.1:${port}/videos/${name}/${pageName}`)
  await page.waitForFunction('window.__ready === true', null, { timeout: 30000 })
  return page
}

server.listen(0, async () => {
  const port = server.address().port
  const browser = await chromium.launch()
  try {
    if (stills) {
      const page = await open(browser, port)
      for (const t of stills.split(',').map(Number)) {
        await page.evaluate(t => window.setTime(t), t)
        await page.screenshot({ path: path.join(out, `still-${String(t).replace('.', '_')}.jpg`), type: 'jpeg', quality: 90 })
      }
      console.log('Standbilder →', out)
    } else {
      const frames = fs.mkdtempSync(path.join(process.env.FRAMES_DIR || os.tmpdir(), 'frames-'))
      const total = Math.round(duration * fps)
      let done = 0; const t0 = Date.now()
      await Promise.all(Array.from({ length: workers }, async (_, w) => {
        const page = await open(browser, port)
        for (let i = w; i < total; i += workers) {
          await page.evaluate(t => window.setTime(t), i / fps)
          await page.screenshot({ path: path.join(frames, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 93 })
          if (++done % 150 === 0) console.log(`${done}/${total} Frames (${Math.round((Date.now() - t0) / 1000)} s)`)
        }
      }))
      const enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(fps)]
      const base = ['-y', '-framerate', String(fps), '-i', path.join(frames, '%05d.jpg')]
      const audio = path.join(dir, 'audio.wav')
      spawnSync('ffmpeg', [...base, ...enc, path.join(out, 'video-silent.mp4')], { stdio: 'inherit' })
      if (fs.existsSync(audio)) spawnSync('ffmpeg', [...base, '-i', audio, ...enc, '-c:a', 'aac', '-b:a', '192k', '-shortest', path.join(out, 'video.mp4')], { stdio: 'inherit' })
      fs.rmSync(frames, { recursive: true, force: true })
      console.log('Fertig →', out)
    }
  } finally { await browser.close(); server.close() }
})
