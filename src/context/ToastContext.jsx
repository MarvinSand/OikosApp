import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

function ToastContainer({ toasts }) {
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8,
      width: '90%', maxWidth: 380, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          backgroundColor: t.type === 'error' ? '#C0392B' : t.type === 'info' ? 'var(--color-text)' : 'var(--color-accent-dark)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: 12,
          fontFamily: 'Lora, serif', fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          animation: 'toastIn 0.25s ease-out',
          lineHeight: 1.4,
        }}>
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
