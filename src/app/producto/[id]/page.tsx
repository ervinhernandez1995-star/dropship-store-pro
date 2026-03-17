'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ProductPage() {
  const { id } = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImg, setSelectedImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(d => { setProduct(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const addToCart = () => {
    if (!product) return

    // Read existing cart from localStorage
    let cart: any[] = []
    try { cart = JSON.parse(localStorage.getItem('cart') || '[]') } catch { cart = [] }

    // Find existing item (cart stores {product, quantity} objects like tienda page)
    const existingIdx = cart.findIndex((i: any) => i.product?.id === product.id)
    if (existingIdx >= 0) {
      cart[existingIdx].quantity += qty
    } else {
      cart.push({ product, quantity: qty })
    }

    localStorage.setItem('cart', JSON.stringify(cart))

    // Dispatch event so CartDrawer in tienda updates
    window.dispatchEvent(new Event('cart-updated'))
    window.dispatchEvent(new StorageEvent('storage', { key: 'cart' }))

    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', color:'#0ea5e9', fontFamily:'DM Sans, sans-serif' }}>
      Cargando producto...
    </div>
  )

  if (!product) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444', fontFamily:'DM Sans, sans-serif' }}>
      Producto no encontrado
    </div>
  )

  const images: string[] = product.images || []

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#111827', borderBottom:'1px solid #1e2d47', padding:'14px 24px', display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'1px solid #1e2d47', borderRadius:8, padding:'8px 16px', color:'#aaa', cursor:'pointer', fontSize:13 }}>
          ← Volver
        </button>
        <a href="/tienda" style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:18, textDecoration:'none', display:'flex', gap:2 }}>
          <span style={{color:'#0ea5e9'}}>Todo</span><span style={{color:'#fff'}}>Click</span><span style={{color:'#f59e0b'}}>MX</span>
        </a>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>

        {/* LEFT: Gallery */}
        <div>
          <div style={{ borderRadius:16, overflow:'hidden', background:'#111', marginBottom:12, aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {images[selectedImg]
              ? <img src={images[selectedImg]} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
              : <div style={{ fontSize:64 }}>📦</div>}
          </div>
          {images.length > 1 && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {images.map((img: string, i: number) => (
                <div key={i} onClick={() => setSelectedImg(i)}
                  style={{ width:72, height:72, borderRadius:8, overflow:'hidden', cursor:'pointer', border:`2px solid ${selectedImg === i ? '#0ea5e9' : '#1e2d47'}`, flexShrink:0 }}>
                  <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Info */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <span style={{ background:'rgba(0,212,255,0.1)', color:'#0ea5e9', fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20, width:'fit-content', letterSpacing:1 }}>
            {product.category?.toUpperCase()}
          </span>

          <h1 style={{ fontSize:24, fontWeight:800, lineHeight:1.3, margin:0 }}>{product.name}</h1>

          <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
            <span style={{ fontSize:36, fontWeight:900, color:'#0ea5e9' }}>${product.price?.toLocaleString('es-MX')}</span>
            <span style={{ fontSize:16, color:'#555' }}>MXN</span>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: product.stock > 0 ? '#10b981' : '#ef4444' }} />
            <span style={{ fontSize:13, color: product.stock > 0 ? '#10b981' : '#ef4444' }}>
              {product.stock > 0 ? `✓ ${product.stock} disponibles` : 'Agotado'}
            </span>
          </div>

          <div style={{ background:'#111', borderRadius:12, padding:20, border:'1px solid #1e2d47' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>Descripción</div>
            <p style={{ fontSize:14, color:'#ccc', lineHeight:1.7, margin:0 }}>{product.description}</p>
          </div>

          {/* Qty + Add to cart */}
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', background:'#111', border:'1px solid #1e2d47', borderRadius:10, overflow:'hidden' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width:40, height:44, background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer' }}>−</button>
              <span style={{ width:36, textAlign:'center', fontWeight:700 }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock || 99, q + 1))}
                style={{ width:40, height:44, background:'none', border:'none', color:'#fff', fontSize:20, cursor:'pointer' }}>+</button>
            </div>
            <button onClick={addToCart} disabled={product.stock === 0}
              style={{ flex:1, height:44, background: added ? '#10b981' : 'linear-gradient(135deg,#0ea5e9,#7c3aed)', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', transition:'all .2s' }}>
              {added ? '✓ ¡Agregado al carrito!' : '🛒 Agregar al carrito'}
            </button>
          </div>

          {/* Go to cart button (shows after adding) */}
          {added && (
            <a href="/tienda" style={{ display:'block', textAlign:'center', padding:'10px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:10, color:'#10b981', textDecoration:'none', fontWeight:600, fontSize:13 }}>
              Ver carrito en la tienda →
            </a>
          )}

          {[
            { icon:'🚚', text:'Envío gratis a todo México' },
            { icon:'🔒', text:'Pago 100% seguro con Stripe' },
            { icon:'↩️', text:'Devoluciones en 30 días' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#94a3b8' }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {added && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#111827', border:'1px solid rgba(16,185,129,0.4)', color:'#10b981', padding:'12px 24px', borderRadius:10, fontSize:14, zIndex:9999, fontWeight:600 }}>
          ✓ Producto agregado al carrito
        </div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}
