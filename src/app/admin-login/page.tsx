'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const login = async () => {
    if (!password) return
    setLoading(true); setError('')
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Contraseña incorrecta')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ width:380, padding:40, background:'#111827', border:'1px solid #1e2d47', borderRadius:20 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#0ea5e9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><polyline points="3,10 8,15 17,5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:22, display:'flex', gap:3, justifyContent:'center' }}>
            <span style={{color:'#0ea5e9'}}>Todo</span><span style={{color:'#fff'}}>Click</span><span style={{color:'#f59e0b'}}>MX</span>
          </div>
          <div style={{ color:'#64748b', fontSize:13, marginTop:6 }}>Panel Administrativo</div>
        </div>

        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:8, fontWeight:600 }}>Contraseña de administrador</div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="••••••••••••"
          style={{ width:'100%', padding:'12px 16px', background:'#0a0a0f', border:`1px solid ${error ? '#ef4444' : '#1e2d47'}`, borderRadius:10, color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box', marginBottom:8 }}
        />
        {error && <div style={{ color:'#ef4444', fontSize:12, marginBottom:12 }}>⚠️ {error}</div>}

        <button onClick={login} disabled={loading || !password} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', marginTop:8, opacity: loading ? .7 : 1 }}>
          {loading ? 'Verificando...' : '🔐 Entrar al panel'}
        </button>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <a href="/tienda" style={{ color:'#64748b', fontSize:12, textDecoration:'none' }}>← Volver a la tienda</a>
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet" />
    </div>
  )
}
