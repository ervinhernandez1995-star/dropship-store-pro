'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Product } from '@/lib/supabase'
import ChatBot from '@/components/store/ChatBot'
import CartDrawer from '@/components/store/CartDrawer'

const CATS = ['Todos', 'Electrónica', 'Moda', 'Hogar', 'Deportes', 'Belleza', 'Juguetes', 'Automotriz', 'General']

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ active: 'true' })
    if (category !== 'Todos') params.set('category', category)
    if (search) params.set('search', search)
    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setProducts(data || [])
    setLoading(false)
  }, [category, search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const addToCart = (product: Product) => {
    setCart(c => {
      const ex = c.find(i => i.product.id === product.id)
      if (ex) return c.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...c, { product, quantity: 1 }]
    })
    setToast(`✓ ${product.name} agregado`)
    setTimeout(() => setToast(''), 2500)
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* HEADER */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/tienda" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><polyline points="3,10 8,15 17,5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, display: 'flex', gap: 3 }}>
              <span style={{ color: '#0ea5e9' }}>Todo</span>
              <span style={{ color: 'var(--text)' }}>Click</span>
              <span style={{ color: '#f59e0b' }}>MX</span>
            </div>
          </a>
          <div style={{ flex: 1 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar productos..." className="input" style={{ width: 240, padding: '8px 14px' }} />
          <button onClick={() => setCartOpen(true)} style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, padding: '8px 16px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, fontSize: 14, position: 'relative' }}>
            🛒 {totalItems > 0 && <span style={{ background: 'var(--red)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>{totalItems}</span>}
            {totalItems === 0 ? 'Carrito' : ` ${totalItems}`}
          </button>
          <a href="/admin" style={{ color: 'var(--text3)', fontSize: 12, textDecoration: 'none' }}>Admin</a>
        </div>
        {/* CATEGORÍAS */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${category === c ? 'var(--accent)' : 'var(--border)'}`, background: category === c ? 'rgba(0,212,255,0.1)' : 'transparent', color: category === c ? 'var(--accent)' : 'var(--text2)', whiteSpace: 'nowrap', transition: 'all .2s' }}>
              {c}
            </button>
          ))}
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg,#0d1321,#1a1040)', padding: '48px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 800, background: 'linear-gradient(135deg,#fff,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12 }}>
          Los mejores productos de México
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 24 }}>Envío rápido a todo México 🇲🇽 · Pago 100% seguro</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🚚 Envío gratis +$599', '🔒 Pago seguro', '↩️ Devoluciones 30 días', '⭐ Garantía de calidad'].map(b => (
            <span key={b} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 16px', fontSize: 13 }}>{b}</span>
          ))}
        </div>
      </section>

      {/* PRODUCTOS */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: 'var(--card)', borderRadius: 14, height: 380, border: '1px solid var(--border)', opacity: 0.5 }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text2)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>No hay productos disponibles</div>
            <p style={{ marginTop: 8 }}>Agrega productos desde el panel de administración</p>
            <a href="/admin" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', background: 'linear-gradient(135deg,#00d4ff,#0099cc)', color: '#000', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>Ir al Admin</a>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20, color: 'var(--text2)', fontSize: 14 }}>
              {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
              {products.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '32px 20px', marginTop: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>TodoClick MX</div>
        <p>© 2026 TodoClick MX · Envíos a toda la República Mexicana 🇲🇽</p>
      </footer>

      {/* CARRITO */}
      <CartDrawer cart={cart} setCart={setCart} open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* CHATBOT */}
      <ChatBot />

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a2236', border: '1px solid rgba(0,212,255,0.3)', color: '#e2e8f0', padding: '12px 24px', borderRadius: 10, fontSize: 14, zIndex: 999, boxShadow: '0 8px 24px rgba(0,0,0,.4)', fontWeight: 600 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (p: Product) => void }) {
  const img = product.images?.[0]
  return (
    <div className="card fade-in" style={{ padding: 0, overflow: 'hidden', transition: 'all .2s', cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}>
      <div style={{ height: 200, background: 'linear-gradient(135deg,var(--bg3),var(--card))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {img ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 64 }}>📦</span>}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>{product.category}</div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, color: 'var(--text)' }}>{product.name}</h3>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>${product.price.toLocaleString('es-MX')}<span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 2 }}> MXN</span></span>
          <span style={{ fontSize: 11, color: product.stock > 0 ? 'var(--accent3)' : 'var(--red)', fontWeight: 600 }}>{product.stock > 0 ? `✓ ${product.stock} disponibles` : '✗ Agotado'}</span>
        </div>
        <button onClick={() => onAddToCart(product)} disabled={product.stock === 0} className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: 14 }}>
          {product.stock === 0 ? 'Sin stock' : '🛒 Agregar al carrito'}
        </button>
      </div>
    </div>
  )
}
