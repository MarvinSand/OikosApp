#!/usr/bin/env node
// Rendert ein Post-Deck als fertige Bilder für Instagram (1080×1350) und TikTok (1080×1920).
//   node marketing/social/render.cjs 001-launch            → beide Formate
//   node marketing/social/render.cjs 001-launch ig         → nur Instagram
// Ausgabe: posts/<post>/export/{instagram,tiktok}/NN.jpg + overview-*.jpg (Kontaktbogen)
// Braucht nur Playwright (in der Cloud-Umgebung vorinstalliert) und Python/Pillow für den Kontaktbogen.
const http = require('http')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require('playwright')

const ROOT = __dirname
const post = process.argv[2]
const only = process.argv[3]
if (!post || !fs.existsSync(path.join(ROOT, 'posts', post, 'slides.html'))) {
  console.error('Aufruf: node render.cjs <post-ordner> [ig|tt]')
  process.exit(1)
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' })
  fs.createReadStream(p).pipe(res)
})

const FORMATS = [
  { key: 'ig', dir: 'instagram', w: 1080, h: 1350 },
  { key: 'tt', dir: 'tiktok', w: 1080, h: 1920 },
].filter(f => !only || f.key === only)

server.listen(0, async () => {
  const port = server.address().port
  const browser = await chromium.launch()
  try {
    for (const f of FORMATS) {
      const page = await browser.newPage({ viewport: { width: f.w + 80, height: f.h + 80 }, deviceScaleFactor: 1 })
      page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log(`[${f.key}] ${m.text()}`) })
      await page.goto(`http://127.0.0.1:${port}/posts/${post}/slides.html?f=${f.key}`)
      await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 })
      await page.waitForTimeout(300)
      const out = path.join(ROOT, 'posts', post, 'export', f.dir)
      fs.rmSync(out, { recursive: true, force: true })
      fs.mkdirSync(out, { recursive: true })
      const slides = await page.$$('.slide')
      for (let i = 0; i < slides.length; i++) {
        const box = await slides[i].boundingBox()
        if (Math.round(box.width) !== f.w || Math.round(box.height) !== f.h) throw new Error(`Slide ${i + 1}: ${box.width}×${box.height} statt ${f.w}×${f.h}`)
        const file = path.join(out, `${String(i + 1).padStart(2, '0')}.jpg`)
        await slides[i].screenshot({ path: file, type: 'jpeg', quality: 95 })
      }
      console.log(`${f.dir}: ${slides.length} Slides → ${path.relative(process.cwd(), out)}`)
      await page.close()
      try {
        execFileSync('python3', ['-c', `
import glob,sys
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/*.jpg'))
cols=5; tw=360; th=int(tw*${f.h}/${f.w}); g=16
rows=(len(fs)+cols-1)//cols
sheet=Image.new('RGB',(cols*tw+(cols+1)*g, rows*th+(rows+1)*g),(11,15,26))
for i,fn in enumerate(fs):
    im=Image.open(fn).convert('RGB').resize((tw,th),Image.LANCZOS)
    sheet.paste(im,(g+(i%cols)*(tw+g), g+(i//cols)*(th+g)))
sheet.save(sys.argv[2],quality=88)
`, out, path.join(ROOT, 'posts', post, 'export', `overview-${f.dir}.jpg`)])
      } catch (e) { console.warn('Kontaktbogen übersprungen:', e.message) }
    }
  } finally {
    await browser.close()
    server.close()
  }
})
