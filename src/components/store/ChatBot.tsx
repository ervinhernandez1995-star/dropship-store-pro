'use client'
import { useState, useRef, useEffect } from 'react'

type Msg = { role: 'user' | 'bot'; text: string }

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué te puedo ayudar hoy?' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg }) })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'bot', text: data.reply }])
    } catch {
      setMsgs(m => [...m, { role: 'bot', text: 'Lo siento, ocurrió un error. Intenta de nuevo.' }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <button onClick={() => setOpen(!open)} style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#00d4ff)', border: 'none', cursor: 'pointer', fontSize: 24, boxShadow: '0 8px 24px rgba(124,58,237,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
        {open ? '✕' : '🤖'}
      </button>

      {/* CHAT WINDOW */}
      {open && (
        <div style={{ position: 'fixed', bottom: 92, right: 24, width: 340, height: 460, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', zIndex: 200, boxShadow: '0 20px 60px rgba(0,0,0,.5)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#7c3aed,#00d4ff)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Asistente IA</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Powered by Groq · Siempre activo</div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? 'linear-gradient(135deg,#00d4ff,#0099cc)' : 'var(--bg3)', color: m.role === 'user' ? '#000' : 'var(--text)', fontSize: 13, lineHeight: 1.5 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg3)', fontSize: 13 }}>
                  <span className="pulse">⏳ Escribiendo...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Escribe tu pregunta..." className="input" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} />
            <button onClick={send} disabled={loading} style={{ background: 'linear-gradient(135deg,#7c3aed,#00d4ff)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
          </div>
        </div>
      )}
    </>
  )
}
