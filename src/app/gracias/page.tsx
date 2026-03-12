'use client'
import { useSearchParams } from 'next/navigation'
export default function GraciasPage() {
  const params = useSearchParams()
  const order = params.get('order')
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, marginBottom: 12, background: 'linear-gradient(135deg,#00d4ff,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>¡Pago exitoso!</h1>
        <p style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 8 }}>Tu pedido ha sido confirmado.</p>
        {order && <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 24 }}>Número de orden: {order}</p>}
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>Recibirás un email de confirmación. Tu pedido llegará en 3–7 días hábiles.</p>
        <a href="/tienda" style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg,#00d4ff,#0099cc)', color: '#000', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 16 }}>Seguir comprando</a>
      </div>
    </div>
  )
}
