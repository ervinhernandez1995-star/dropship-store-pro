'use client'

import { useSearchParams } from 'next/navigation'

export const dynamic = "force-dynamic"

export default function GraciasPage() {

  const params = useSearchParams()
  const order = params.get('order')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
          ¡Pedido confirmado!
        </h1>

        <p style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 8 }}>
          Tu pedido ha sido confirmado.
        </p>

        {order && (
          <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 24 }}>
            Número de orden: {order}
          </p>
        )}

        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>
          Recibirás un email de confirmación.
        </p>

        <a href="/tienda" style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: 8 }}>
          Volver a la tienda
        </a>

      </div>
    </div>
  )
}