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
  const [reviews, setReviews] = useState<any[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [inWishlist, setInWishlist] = useState(false)

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(d => {
        setProduct(d)
        setLoading(false)
        // Track view
        fetch(`/api/products/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'view' }) }).catch(() => {})
      })
      .catch(() => setLoading(false))

    fetch(`/api/reviews?product_id=${id}`)
      .then(r => r.json())
      .then(d => setReviews(Array.isArray(d) ? d : []))
      .catch(() => {})

    fetch(`/api/products?limit=4&exclude=${id}`)
      .then(r => r.json())
      .then(d => setRelated(Array.isArray(d) ? d.slice(0,4) : []))
      .catch(() => {})

    // Check wishlist
    try {
      const wl = JSON.parse(localStorage.getItem('wishlist') || '[]')
      setInWishlist(wl.includes(id))
    } catch {}
  }, [id])

  const addToCart = () => {
    if (!product) return
    let cart: any[] = []
    try { cart = JSON.parse(localStorage.getItem('cart') || '[]') } catch {}
    const idx = cart.findIndex((i: any) => i.product?.id === product.id)
    if (idx >= 0) cart[idx].quantity += qty
    else cart.push({ product, quantity: qty })
    localStorage.setItem('cart', JSON.stringify(cart))
    window.dispatchEvent(new Event('cart-updated'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const toggleWishlist = () => {
    try {
      let wl = JSON.parse(localStorage.getItem('wishlist') || '[]')
      if (wl.includes(id)) wl = wl.filter((i: string) => i !== id)
      else wl.push(id)
      localStorage.setItem('wishlist', JSON.stringify(wl))
      setInWishlist(!inWishlist)
    } catch {}
  }

  const submitReview = async () => {
    if (!reviewForm.name.trim() || !reviewForm.comment.trim()) return
    setSubmitting(true)
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: id, ...reviewForm })
    })
    setReviewSubmitted(true)
    setSubmitting(false)
    const updated = await fetch(`/api/reviews?product_id=${id}`).then(r => r.json())
    setReviews(Array.isArray(updated) ? updated : [])
  }

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', color:'#0ea5e9', fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid #0ea5e9', borderTopColor:'transparent', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 1s linear infinite' }} />
        Cargando producto...
      </div>
    </div>
  )

  if (!product?.id) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444', fontFamily:'DM Sans, sans-serif' }}>
      Producto no encontrado
    </div>
  )

  const images: string[] = product.images || []
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .thumb:hover{opacity:0.8} .btn-cart:hover{filter:brightness(1.1)} .related-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(14,165,233,0.2)}`}</style>

      {/* Header */}
      <div style={{ background:'#111827', borderBottom:'1px solid #1e2d47', padding:'14px 24px', display:'flex', alignItems:'center', gap:16, position:'sticky', top:0, zIndex:100 }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'1px solid #1e2d47', borderRadius:8, padding:'7px 14px', color:'#aaa', cursor:'pointer', fontSize:13 }}>← Volver</button>
        <a href="/tienda" style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:18, textDecoration:'none', display:'flex', gap:2 }}>
          <span style={{color:'#0ea5e9'}}>Todo</span><span style={{color:'#fff'}}>Click</span><span style={{color:'#f59e0b'}}>MX</span>
        </a>
        <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
          <a href="/checkout" style={{ background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', color:'#fff', textDecoration:'none', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700 }}>🛒 Ir al carrito</a>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'12px 24px', fontSize:12, color:'#555' }}>
        <a href="/tienda" style={{ color:'#0ea5e9', textDecoration:'none' }}>Tienda</a> › {product.category} › {product.name?.slice(0,40)}
      </div>

      {/* Main content */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 48px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>

        {/* LEFT: Gallery */}
        <div>
          <div style={{ borderRadius:16, overflow:'hidden', background:'#111', marginBottom:12, aspectRatio:'1/1', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #1e2d47', position:'relative' }}>
            {images[selectedImg]
              ? <img src={images[selectedImg]} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:8 }} />
              : <div style={{ fontSize:64 }}>📦</div>}
            {/* Wishlist button on image */}
            <button onClick={toggleWishlist} style={{ position:'absolute', top:12, right:12, background:inWishlist?'rgba(239,68,68,0.9)':'rgba(0,0,0,0.5)', border:'none', borderRadius:'50%', width:40, height:40, fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {inWishlist ? '❤️' : '🤍'}
            </button>
          </div>
          {images.length > 1 && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {images.map((img, i) => (
                <div key={i} className="thumb" onClick={() => setSelectedImg(i)}
                  style={{ width:72, height:72, borderRadius:8, overflow:'hidden', cursor:'pointer', border:`2px solid ${selectedImg===i?'#0ea5e9':'#1e2d47'}`, transition:'border-color .2s' }}>
                  <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              ))}
            </div>
          )}

          {/* Share buttons */}
          <div style={{ marginTop:16, display:'flex', gap:8 }}>
            <span style={{ fontSize:12, color:'#555', marginRight:4 }}>Compartir:</span>
            {[
              { label:'WhatsApp', color:'#25d366', url:`https://wa.me/?text=Mira este producto: ${encodeURIComponent(typeof window!=='undefined'?window.location.href:'')}` },
              { label:'Facebook', color:'#1877f2', url:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window!=='undefined'?window.location.href:'')}` },
            ].map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ background:s.color, color:'#fff', textDecoration:'none', padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:700 }}>{s.label}</a>
            ))}
          </div>
        </div>

        {/* RIGHT: Info */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <span style={{ background:'rgba(0,212,255,0.1)', color:'#0ea5e9', fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20, width:'fit-content', letterSpacing:1 }}>
            {product.category?.toUpperCase()}
          </span>

          <h1 style={{ fontSize:22, fontWeight:800, lineHeight:1.3, margin:0 }}>{product.name}</h1>

          {/* Rating summary */}
          {reviews.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'#f59e0b', fontSize:16 }}>{stars(Math.round(avgRating))}</span>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{avgRating.toFixed(1)} ({reviews.length} reseña{reviews.length!==1?'s':''})</span>
            </div>
          )}

          <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
            <span style={{ fontSize:38, fontWeight:900, color:'#0ea5e9' }}>${product.price?.toLocaleString('es-MX')}</span>
            <span style={{ fontSize:15, color:'#555' }}>MXN</span>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:product.stock>0?'#10b981':'#ef4444' }} />
            <span style={{ fontSize:13, color:product.stock>0?'#10b981':'#ef4444' }}>
              {product.stock>0 ? `✓ ${product.stock} disponibles` : 'Agotado'}
            </span>
            {product.sold > 0 && <span style={{ fontSize:12, color:'#555', marginLeft:8 }}>🔥 {product.sold} vendidos</span>}
          </div>

          <div style={{ background:'#111', borderRadius:12, padding:16, border:'1px solid #1e2d47' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>Descripción</div>
            <p style={{ fontSize:14, color:'#ccc', lineHeight:1.7, margin:0 }}>{product.description}</p>
          </div>

          {/* Qty + Cart */}
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', background:'#111', border:'1px solid #1e2d47', borderRadius:10, overflow:'hidden' }}>
              <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ width:42, height:46, background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer' }}>−</button>
              <span style={{ width:36, textAlign:'center', fontWeight:700, fontSize:16 }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock||99,q+1))} style={{ width:42, height:46, background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer' }}>+</button>
            </div>
            <button className="btn-cart" onClick={addToCart} disabled={product.stock===0}
              style={{ flex:1, height:46, background:added?'#10b981':'linear-gradient(135deg,#0ea5e9,#7c3aed)', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', transition:'all .2s' }}>
              {added ? '✓ ¡Agregado!' : '🛒 Agregar al carrito'}
            </button>
          </div>

          {added && (
            <a href="/checkout" style={{ display:'block', textAlign:'center', padding:'10px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:10, color:'#10b981', textDecoration:'none', fontWeight:600, fontSize:13 }}>
              Ir a pagar →
            </a>
          )}

          {/* Trust badges */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { icon:'🚚', text:'Envío gratis desde $599' },
              { icon:'🔒', text:'Pago seguro con Stripe' },
              { icon:'↩️', text:'Devoluciones en 30 días' },
              { icon:'⚡', text:'Envío en 7-15 días' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#64748b', background:'#111', padding:'8px 12px', borderRadius:8, border:'1px solid #1e2d47' }}>
                <span style={{ fontSize:15 }}>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REVIEWS SECTION */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 48px' }}>
        <div style={{ borderTop:'1px solid #1e2d47', paddingTop:40 }}>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, marginBottom:24 }}>
            Reseñas de clientes {reviews.length > 0 && <span style={{ fontSize:16, color:'#555', fontWeight:400 }}>({reviews.length})</span>}
          </h2>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
            {/* Review list */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {reviews.length === 0 ? (
                <div style={{ color:'#555', fontSize:14, padding:24, textAlign:'center', background:'#111', borderRadius:12, border:'1px solid #1e2d47' }}>
                  Sé el primero en dejar una reseña ✍️
                </div>
              ) : reviews.map(r => (
                <div key={r.id} style={{ background:'#111', borderRadius:12, padding:16, border:'1px solid #1e2d47' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>{r.customer_name}</span>
                    <span style={{ fontSize:12, color:'#555' }}>{new Date(r.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                  <div style={{ color:'#f59e0b', fontSize:15, marginBottom:6 }}>{stars(r.rating)}</div>
                  <p style={{ fontSize:13, color:'#ccc', margin:0, lineHeight:1.6 }}>{r.comment}</p>
                  {r.verified && <span style={{ fontSize:10, color:'#10b981', marginTop:6, display:'block' }}>✓ Compra verificada</span>}
                </div>
              ))}
            </div>

            {/* Write review form */}
            <div style={{ background:'#111', borderRadius:12, padding:20, border:'1px solid #1e2d47', height:'fit-content' }}>
              <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:700, marginBottom:16 }}>Escribe una reseña</h3>
              {reviewSubmitted ? (
                <div style={{ color:'#10b981', textAlign:'center', padding:16 }}>✅ ¡Gracias por tu reseña!</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div>
                    <label style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>Tu nombre</label>
                    <input value={reviewForm.name} onChange={e => setReviewForm(f => ({...f, name:e.target.value}))}
                      placeholder="Ej: María G." style={{ width:'100%', marginTop:4, padding:'9px 12px', background:'#0a0a0f', border:'1px solid #1e2d47', borderRadius:8, color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>Calificación</label>
                    <div style={{ display:'flex', gap:6, marginTop:6 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setReviewForm(f => ({...f, rating:n}))}
                          style={{ fontSize:22, background:'none', border:'none', cursor:'pointer', color: n<=reviewForm.rating ? '#f59e0b' : '#333', padding:0 }}>★</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>Tu comentario</label>
                    <textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({...f, comment:e.target.value}))}
                      placeholder="¿Qué te pareció el producto?" rows={3}
                      style={{ width:'100%', marginTop:4, padding:'9px 12px', background:'#0a0a0f', border:'1px solid #1e2d47', borderRadius:8, color:'#fff', fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box' }} />
                  </div>
                  <button onClick={submitReview} disabled={submitting||!reviewForm.name||!reviewForm.comment}
                    style={{ padding:'10px', background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', border:'none', borderRadius:8, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14 }}>
                    {submitting ? 'Enviando...' : '✍️ Publicar reseña'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RELATED PRODUCTS */}
      {related.length > 0 && (
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 48px' }}>
          <div style={{ borderTop:'1px solid #1e2d47', paddingTop:40 }}>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, marginBottom:24 }}>También te puede gustar</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              {related.map(p => (
                <a key={p.id} href={`/producto/${p.id}`} className="related-card"
                  style={{ background:'#111', borderRadius:12, border:'1px solid #1e2d47', overflow:'hidden', textDecoration:'none', color:'#fff', transition:'all .2s', display:'block' }}>
                  <div style={{ aspectRatio:'1', background:'#0a0a0f', overflow:'hidden' }}>
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:8 }} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>📦</div>}
                  </div>
                  <div style={{ padding:'12px' }}>
                    <div style={{ fontSize:12, color:'#ccc', marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.name}</div>
                    <div style={{ fontSize:16, fontWeight:800, color:'#0ea5e9' }}>${p.price?.toLocaleString('es-MX')}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {added && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#111827', border:'1px solid rgba(16,185,129,0.4)', color:'#10b981', padding:'12px 24px', borderRadius:10, fontSize:14, zIndex:9999, fontWeight:600 }}>
          ✓ Agregado al carrito
        </div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}
