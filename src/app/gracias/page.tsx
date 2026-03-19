'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function GraciasContent() {
  const params = useSearchParams()
  const order = params.get('order')
  const [confetti, setConfetti] = useState(true)

  useEffect(() => {
    setTimeout(() => setConfetti(false), 4000)
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'DM Sans, sans-serif', overflow:'hidden', position:'relative' }}>
      <style>{`
        @keyframes fall { 0%{transform:translateY(-100px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Confetti */}
      {confetti && Array.from({length:20}).map((_,i) => (
        <div key={i} style={{
          position:'fixed', top:0, left:`${Math.random()*100}%`,
          width:8, height:8, borderRadius:2,
          background:['#0ea5e9','#7c3aed','#10b981','#f59e0b','#ef4444'][i%5],
          animation:`fall ${2+Math.random()*2}s ${Math.random()*1.5}s linear forwards`,
          zIndex:1000,
        }} />
      ))}

      <div style={{ textAlign:'center', maxWidth:520, animation:'fadeUp .6s ease' }}>
        <div style={{ fontSize:80, marginBottom:16, animation:'pulse 2s ease infinite' }}>🎉</div>

        <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:36, fontWeight:800, marginBottom:12, background:'linear-gradient(135deg,#0ea5e9,#10b981)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          ¡Gracias por tu compra!
        </h1>

        <p style={{ color:'#94a3b8', fontSize:16, marginBottom:8 }}>Tu pago fue procesado exitosamente.</p>

        {order && (
          <div style={{ background:'rgba(14,165,233,0.1)', border:'1px solid rgba(14,165,233,0.3)', borderRadius:12, padding:'12px 20px', marginBottom:20, display:'inline-block' }}>
            <span style={{ color:'#64748b', fontSize:13 }}>Número de orden: </span>
            <span style={{ color:'#0ea5e9', fontWeight:800, fontSize:15, fontFamily:'monospace' }}>{order}</span>
          </div>
        )}

        <div style={{ background:'#111827', border:'1px solid #1e2d47', borderRadius:16, padding:24, marginBottom:28, textAlign:'left' }}>
          {[
            { icon:'📧', title:'Confirmación por email', desc:'Recibirás los detalles de tu pedido al correo que proporcionaste.' },
            { icon:'📦', title:'Preparación del pedido', desc:'Tu pedido será preparado y enviado en 1-3 días hábiles.' },
            { icon:'🚚', title:'Tiempo de entrega', desc:'Entrega estimada en 7-15 días hábiles a todo México.' },
            { icon:'📱', title:'Seguimiento', desc:'Te notificaremos cuando tu pedido esté en camino.' },
          ].map(step => (
            <div key={step.title} style={{ display:'flex', gap:14, marginBottom:16 }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{step.icon}</span>
              <div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{step.title}</div>
                <div style={{ color:'#64748b', fontSize:13 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <a href="/tienda" style={{ display:'inline-block', padding:'13px 28px', background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', color:'#fff', borderRadius:10, fontWeight:700, textDecoration:'none', fontSize:15 }}>
            🛍 Seguir comprando
          </a>
          <a href="/perfil" style={{ display:'inline-block', padding:'13px 28px', background:'rgba(255,255,255,0.05)', border:'1px solid #1e2d47', color:'#ccc', borderRadius:10, fontWeight:700, textDecoration:'none', fontSize:15 }}>
            📦 Ver mis pedidos
          </a>
        </div>
      </div>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}

export default function GraciasPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', color:'#0ea5e9' }}>Cargando...</div>}>
      <GraciasContent />
    </Suspense>
  )
}
