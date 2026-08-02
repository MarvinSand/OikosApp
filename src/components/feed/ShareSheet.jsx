import { useState } from 'react'
import { X, Link2, Send, Check } from 'lucide-react'
import ForwardSheet from '../prayer/ForwardSheet'
import { useToast } from '../../context/ToastContext'

// Sheet zum Teilen eines Feed-Posts: entweder app-intern an Geschwister
// (ForwardSheet) oder als öffentlicher Link zum Kopieren/Teilen außerhalb der App.
export default function ShareSheet({ post, onClose }) {
  const { showToast } = useToast()
  const [showForward, setShowForward] = useState(false)
  const [copied, setCopied] = useState(false)

  const postUrl = `${window.location.origin}/feed/post/${post.id}`

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(postUrl)
      setCopied(true)
      showToast('Link kopiert ✓')
      setTimeout(onClose, 700)
    } catch {
      showToast('Link konnte nicht kopiert werden', 'error')
    }
  }

  async function handleSystemShare() {
    try {
      await navigator.share({ title: 'OIKOS', text: post.title || post.body || 'Beitrag', url: postUrl })
      onClose()
    } catch {
      // Nutzer hat den Share-Dialog abgebrochen – nichts tun
    }
  }

  function buildMessage() {
    const parts = []
    if (post.title) parts.push(post.title)
    if (post.type === 'bible') {
      if (post.bible_reference) parts.push(`📖 ${post.bible_reference}`)
      if (post.bible_verse) parts.push(`„${post.bible_verse}"`)
    }
    if (post.body) parts.push(post.body)
    parts.push(postUrl)
    return { type: 'text', text: parts.join('\n\n') }
  }

  if (showForward) {
    return (
      <ForwardSheet
        previewTitle={post.title || post.body || 'Beitrag'}
        buildMessage={buildMessage}
        onClose={onClose}
      />
    )
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(58,46,36,0.35)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, backgroundColor: 'var(--color-white)',
        borderRadius: '20px 20px 0 0', zIndex: 70,
        padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        animation: 'sheetSlideUp 0.3s ease-out',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-warm-3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: 19, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Beitrag teilen</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => setShowForward(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 14px', borderRadius: 14, border: '1.5px solid var(--color-warm-3)', background: 'var(--color-bg)', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={16} color="var(--color-accent-dark)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>In der App teilen</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>An Geschwister im Chat senden</p>
            </div>
          </button>

          {typeof navigator.share === 'function' && (
            <button
              onClick={handleSystemShare}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 14px', borderRadius: 14, border: '1.5px solid var(--color-warm-3)', background: 'var(--color-bg)', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Link2 size={16} color="var(--color-warm-1)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Außerhalb teilen</p>
                <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>Mit anderen Apps teilen</p>
              </div>
            </button>
          )}

          <button
            onClick={handleCopyLink}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 14px', borderRadius: 14, border: '1.5px solid var(--color-warm-3)', background: 'var(--color-bg)', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--color-warm-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {copied ? <Check size={16} color="var(--color-warm-1)" /> : <Link2 size={16} color="var(--color-warm-1)" />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Link kopieren</p>
              <p style={{ fontFamily: 'Lora, serif', fontSize: 12, color: 'var(--color-text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{postUrl}</p>
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
