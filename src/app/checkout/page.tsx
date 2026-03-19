'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled')
  const [cartData, setCartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<any>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', phone:'', street:'', city:'', state:'', zip:'' })
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    try { setCartData(JSON.parse(localStorage.getItem('cart') || '[]')) } catch {}
  }, [])

  const subtotal = cartData.reduce((s:number, i:any) => s + i.product.price * i.quantity, 0)
  const discount = coupon ? (coupon.type === 'percent' ? subtotal * coupon.value / 100 : coupon.value) : 0
  const shipping = (subtotal - discount) >= 599 ? 0 : 99
  const total = Math.max(0, subtotal - discount) + shipping

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true); setCouponError('')
    const res = await fetch(`/api/coupons?code=${encodeURIComponent(couponCode.toUpperCase())}`)
    const data = await res.json()
    setCouponLoading(false)
    if (data.valid) {
      if (subtotal < data.coupon.min_order) { setCouponError(`Este cupón requiere mínimo $${data.coupon.min_order} MXN`); return }
      setCoupon(data.coupon); setCouponError('')
    } else {
      setCouponError(data.error || 'Cupón inválido')
    }
  }

  const validate = () => {
    const e: any = {}
    if (!form.name) e.name = 'Requerido'
    if (!form.email || !form.email.includes('@')) e.email = 'Email inválido'
    if (!form.street) e.street = 'Requerido'
    if (!form.city) e.city = 'Requerido'
    if (!form.state) e.state = 'Requerido'
    if (!form.zip || form.zip.length < 5) e.zip = 'CP inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (cartData.length === 0) { alert('Tu carrito está vacío'); return }
    setLoading(true)
    const res = await fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartData.map(i => ({
          product_id: i.product.id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          image: i.product.images?.[0] || '',
          source_url: i.product.source_url || '',
          cj_id: i.product.cj_id || '',
          cj_variant_id: i.product.cj_variant_id || '',
        })),
        customer: { name: form.name, email: form.email, phone: form.phone },
        shipping_address: { street: form.street, city: form.city, state: form.state, zip: form.zip, country: 'MX' },
        coupon: coupon || null,
        discount,
      }),
    })
    const data = await res.json()
    if (data.url) {
      localStorage.removeItem('cart')
      window.location.href = data.url
    } else {
      alert('Error al procesar el pago: ' + (data.error || 'Intenta de nuevo'))
      setLoading(false)
    }
  }

  const inpStyle = (key: string) => ({
    width:'100%', padding:'10px 12px', background: errors[key] ? 'rgba(239,68,68,0.05)' : '#0a0a0f',
    border: `1px solid ${errors[key] ? '#ef4444' : '#1e2d47'}`, borderRadius:8, color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' as const
  })

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'32px 20px', fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ maxWidth:920, margin:'0 auto' }}>
        <a href="/tienda" style={{ color:'var(--text2)', textDecoration:'none', fontSize:13, display:'flex', alignItems:'center', gap:6, marginBottom:24 }}>← Regresar a la tienda</a>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <a href="/tienda" style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, textDecoration:'none', display:'flex', gap:2 }}>
            <span style={{color:'#0ea5e9'}}>Todo</span><span style={{color:'#fff'}}>Click</span><span style={{color:'#f59e0b'}}>MX</span>
          </a>
          <span style={{ color:'#555', fontSize:14 }}>›</span>
          <span style={{ fontSize:14, fontWeight:600 }}>Finalizar compra</span>
        </div>

        {cancelled && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'12px 16px', marginBottom:20, color:'#ef4444' }}>⚠️ Pago cancelado. Puedes intentarlo de nuevo.</div>}

        {cartData.length === 0 ? (
          <div style={{ textAlign:'center', padding:60 }}>
            <div style={{ fontSize:60, marginBottom:16 }}>🛒</div>
            <h2 style={{ fontFamily:'Syne, sans-serif', marginBottom:12 }}>Tu carrito está vacío</h2>
            <a href="/tienda" style={{ background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', color:'#fff', textDecoration:'none', padding:'12px 28px', borderRadius:10, fontWeight:700, display:'inline-block' }}>Ver productos</a>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:24, alignItems:'start' }}>
            {/* FORM */}
            <div className="card">
              <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, marginBottom:20 }}>📦 Datos de entrega</h2>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[
                  { key:'name', label:'Nombre completo', placeholder:'Juan Pérez García', colSpan:2 },
                  { key:'email', label:'Email', placeholder:'juan@email.com', type:'email' },
                  { key:'phone', label:'Teléfono (opcional)', placeholder:'55 1234 5678' },
                  { key:'street', label:'Dirección', placeholder:'Calle Ejemplo 123, Col. Centro', colSpan:2 },
                  { key:'city', label:'Ciudad', placeholder:'Ciudad de México' },
                  { key:'state', label:'Estado', placeholder:'CDMX' },
                  { key:'zip', label:'Código Postal', placeholder:'06600' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn:f.colSpan===2?'span 2':'span 1' }}>
                    <label style={{ fontSize:12, color:'#94a3b8', fontWeight:600, marginBottom:4, display:'block' }}>{f.label}</label>
                    <input style={inpStyle(f.key)} type={f.type||'text'} placeholder={f.placeholder}
                      value={(form as any)[f.key]} onChange={e => { setForm(p => ({...p, [f.key]:e.target.value})); setErrors((p:any) => ({...p, [f.key]:undefined})) }} />
                    {errors[f.key] && <span style={{ fontSize:11, color:'#ef4444', marginTop:2, display:'block' }}>{errors[f.key]}</span>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:20, padding:14, background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.15)', borderRadius:10, fontSize:13, color:'var(--text2)' }}>
                🔒 Pago seguro procesado por <strong style={{color:'var(--text)'}}>Stripe</strong>. Aceptamos Visa, Mastercard, OXXO y más.
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="card">
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:700, marginBottom:16 }}>🛍 Tu pedido</h2>
                {cartData.map((item:any) => (
                  <div key={item.product.id} style={{ display:'flex', gap:12, marginBottom:14, paddingBottom:14, borderBottom:'1px solid #1e2d47' }}>
                    <div style={{ width:56, height:56, borderRadius:8, overflow:'hidden', background:'#0a0a0f', flexShrink:0 }}>
                      {item.product.images?.[0]
                        ? <img src={item.product.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                        : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>📦</div>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, lineHeight:1.3, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.product.name}</div>
                      <div style={{ fontSize:12, color:'#555', marginTop:2 }}>Cant: {item.quantity}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#0ea5e9', flexShrink:0 }}>${(item.product.price * item.quantity).toLocaleString('es-MX')}</div>
                  </div>
                ))}

                {/* Coupon */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600, marginBottom:6 }}>¿Tienes un cupón?</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key==='Enter' && applyCoupon()}
                      placeholder="BIENVENIDO10" disabled={!!coupon}
                      style={{ flex:1, padding:'8px 12px', background:'#0a0a0f', border:`1px solid ${coupon?'#10b981':couponError?'#ef4444':'#1e2d47'}`, borderRadius:8, color:'#fff', fontSize:13, outline:'none' }} />
                    {coupon
                      ? <button onClick={() => { setCoupon(null); setCouponCode('') }} style={{ padding:'8px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#ef4444', fontSize:12, cursor:'pointer', fontWeight:700 }}>✕</button>
                      : <button onClick={applyCoupon} disabled={couponLoading||!couponCode.trim()} style={{ padding:'8px 14px', background:'rgba(14,165,233,0.1)', border:'1px solid rgba(14,165,233,0.3)', borderRadius:8, color:'#0ea5e9', fontSize:12, cursor:'pointer', fontWeight:700 }}>
                          {couponLoading ? '...' : 'Aplicar'}
                        </button>}
                  </div>
                  {coupon && <div style={{ fontSize:12, color:'#10b981', marginTop:4 }}>✅ Cupón "{coupon.code}" aplicado — {coupon.type==='percent'?`${coupon.value}% OFF`:`-$${coupon.value} MXN`}</div>}
                  {couponError && <div style={{ fontSize:12, color:'#ef4444', marginTop:4 }}>{couponError}</div>}
                </div>

                {/* Totals */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', color:'var(--text2)' }}>
                    <span>Subtotal</span><span>${subtotal.toLocaleString('es-MX')}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', color:'#10b981' }}>
                      <span>Descuento</span><span>−${discount.toLocaleString('es-MX')}</span>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', color:'var(--text2)' }}>
                    <span>Envío</span>
                    <span style={{ color: shipping===0 ? '#10b981' : 'inherit' }}>{shipping===0 ? '¡Gratis!' : `$${shipping}`}</span>
                  </div>
                  {shipping > 0 && <div style={{ fontSize:11, color:'#555' }}>Envío gratis a partir de $599 MXN</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:20, borderTop:'1px solid #1e2d47', paddingTop:10, marginTop:4 }}>
                    <span>Total</span>
                    <span style={{ color:'#0ea5e9' }}>${total.toLocaleString('es-MX')} MXN</span>
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={loading}
                  style={{ width:'100%', marginTop:20, padding:'14px', background:loading?'#1e2d47':'linear-gradient(135deg,#0ea5e9,#7c3aed)', border:'none', borderRadius:10, color:'#fff', fontWeight:800, fontSize:16, cursor:loading?'not-allowed':'pointer', transition:'all .2s' }}>
                  {loading ? '⏳ Procesando...' : `💳 Pagar $${total.toLocaleString('es-MX')} MXN`}
                </button>

                <div style={{ textAlign:'center', fontSize:11, color:'#555', marginTop:10 }}>
                  🔒 Pago seguro · SSL · Datos encriptados
                </div>
              </div>

              {/* Payment methods */}
              <div className="card" style={{ padding:'12px 16px' }}>
                <div style={{ fontSize:11, color:'#555', marginBottom:8, fontWeight:600 }}>MÉTODOS DE PAGO ACEPTADOS</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {['💳 Visa', '💳 Mastercard', '🏪 OXXO', '💰 Débito'].map(m => (
                    <span key={m} style={{ fontSize:11, padding:'3px 8px', background:'#1e2d47', borderRadius:6, color:'#ccc' }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}

export default function CheckoutPage() {
  return <Suspense><CheckoutContent /></Suspense>
}
