'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
export const dynamic = "force-dynamic"
export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled')
  const [cartData, setCartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', street: '', city: '', state: '', zip: '' })

  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (saved) setCartData(JSON.parse(saved))
  }, [])

  const subtotal = cartData.reduce((s: number, i: any) => s + i.product.price * i.quantity, 0)
  const shipping = subtotal >= 599 ? 0 : 99
  const total = subtotal + shipping

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.street || !form.city || !form.state || !form.zip) {
      alert('Por favor completa todos los campos')
      return
    }
    setLoading(true)
    const res = await fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartData.map(i => ({ product_id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity, image: i.product.images?.[0] || '' })),
        customer: { name: form.name, email: form.email, phone: form.phone },
        shipping_address: { street: form.street, city: form.city, state: form.state, zip: form.zip, country: 'MX' },
      }),
    })
    const data = await res.json()
    if (data.url) {
      localStorage.removeItem('cart')
      window.location.href = data.url
    } else {
      alert('Error al procesar el pago: ' + data.error)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/tienda" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>← Regresar a la tienda</a>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 28 }}>Finalizar compra</h1>

        {cancelled && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: 'var(--red)' }}>⚠️ Pago cancelado. Puedes intentarlo de nuevo.</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* FORM */}
          <div className="card">
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Datos de entrega</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'name', label: 'Nombre completo', placeholder: 'Juan Pérez', colSpan: 2 },
                { key: 'email', label: 'Email', placeholder: 'juan@email.com', type: 'email' },
                { key: 'phone', label: 'Teléfono', placeholder: '55 1234 5678' },
                { key: 'street', label: 'Dirección', placeholder: 'Calle, número, colonia', colSpan: 2 },
                { key: 'city', label: 'Ciudad', placeholder: 'Ciudad de México' },
                { key: 'state', label: 'Estado', placeholder: 'CDMX' },
                { key: 'zip', label: 'Código Postal', placeholder: '06600' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.colSpan === 2 ? 'span 2' : 'span 1' }}>
                  <label className="label">{f.label}</label>
                  <input className="input" type={f.type || 'text'} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: 14, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 10, fontSize: 13, color: 'var(--text2)' }}>
              🔒 Pago seguro procesado por <strong style={{ color: 'var(--text)' }}>Stripe</strong>. Aceptamos tarjetas Visa, Mastercard y más.
            </div>
          </div>

          {/* RESUMEN */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Tu pedido</h2>
              {cartData.map((item: any) => (
                <div key={item.product.id} style={{ display: 'flex', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 50, height: 50, borderRadius: 8, background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0 }}>
                    {item.product.images?.[0] ? <img src={item.product.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.product.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>x{item.quantity}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>${(item.product.price * item.quantity).toLocaleString()}</div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text2)' }}><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text2)' }}><span>Envío</span><span style={{ color: shipping === 0 ? 'var(--accent3)' : 'var(--text)' }}>{shipping === 0 ? 'GRATIS' : `$${shipping}`}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginTop: 8 }}><span>Total</span><span style={{ color: 'var(--accent)' }}>${total.toLocaleString()} MXN</span></div>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading || cartData.length === 0} className="btn-primary" style={{ width: '100%', fontSize: 16, padding: '14px' }}>
              {loading ? '⏳ Procesando...' : '🔒 Pagar con Stripe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
