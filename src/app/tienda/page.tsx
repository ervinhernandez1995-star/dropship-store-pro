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
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [customer, setCustomer] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [wishlist, setWishlist] = useState<string[]>([])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ active: 'true' })
    if (category !== 'Todos') params.set('category', category)
    if (search) params.set('search', search)
    const data = await fetch('/api/products?' + params).then(r => r.json())
    setProducts(data || [])
    setLoading(false)
  }, [category, search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Sync cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(cart))
    }
  }, [cart])

  // Listen for cart updates from producto/[id] page
  useEffect(() => {
    const sync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('cart') || '[]')
        setCart(saved)
      } catch {}
    }
    window.addEventListener('cart-updated', sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener('cart-updated', sync); window.removeEventListener('storage', sync) }
  }, [])

  useEffect(() => {
    fetch('/api/customer-auth').then(r => r.json()).then(d => {
      if (d.user) {
        setCustomer(d)
        fetch('/api/wishlist').then(r => r.json()).then(w => setWishlist(Array.isArray(w) ? w : []))
      }
    })
  }, [])

  const toggleWishlist = async (productId: string) => {
    if (!customer?.user) { setShowAuthModal(true); return }
    const inList = wishlist.includes(productId)
    setWishlist(w => inList ? w.filter(id => id !== productId) : [...w, productId])
    await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, action: inList ? 'remove' : 'add' }) })
  }

  const handleAuth = async () => {
    setAuthLoading(true); setAuthError('')
    const res = await fetch('/api/customer-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: authMode, email: authEmail, password: authPassword, name: authName }) })
    const data = await res.json()
    if (data.error) { setAuthError(data.error); setAuthLoading(false); return }
    setCustomer(data); setShowAuthModal(false); setAuthLoading(false)
    fetch('/api/wishlist').then(r => r.json()).then(w => setWishlist(Array.isArray(w) ? w : []))
  }

  const logout = async () => {
    await fetch('/api/customer-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    setCustomer(null); setWishlist([])
  }

  const addToCart = (product: Product) => {
    setCart(c => { const ex = c.find(i => i.product.id === product.id); if (ex) return c.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i); return [...c, { product, quantity: 1 }] })
    setToast('✓ ' + product.name + ' agregado')
    setTimeout(() => setToast(''), 2500)
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/tienda" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><polyline points="3,10 8,15 17,5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, display: 'flex', gap: 3 }}>
              <span style={{ color: '#0ea5e9' }}>Todo</span><span style={{ color: 'var(--text)' }}>Click</span><span style={{ color: '#f59e0b' }}>MX</span>
            </div>
          </a>
          <div style={{ flex: 1 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar productos..." className="input" style={{ width: 220, padding: '8px 14px' }} />
          <button onClick={() => setCartOpen(true)} style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, padding: '8px 16px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            🛒 {totalItems > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{totalItems}</span>} <span>{totalItems === 0 ? 'Carrito' : totalItems}</span>
          </button>
          {customer?.user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <a href="/perfil" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, padding: '7px 14px', textDecoration: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>{(customer.profile?.name || customer.user?.email || 'U')[0].toUpperCase()}</span>
                {customer.profile?.name ? customer.profile.name.split(' ')[0] : 'Mi cuenta'}
              </a>
              <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 11, padding: '4px 6px' }}>Salir</button>
            </div>
          ) : (
            <button onClick={() => { setShowAuthModal(true); setAuthMode('login') }} style={{ background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', border: 'none', borderRadius: 10, padding: '9px 18px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
              👤 Iniciar sesión
            </button>
          )}
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (category === c ? 'var(--accent)' : 'var(--border)'), background: category === c ? 'rgba(0,212,255,0.1)' : 'transparent', color: category === c ? 'var(--accent)' : 'var(--text2)', whiteSpace: 'nowrap', transition: 'all .2s' }}>{c}</button>
          ))}
        </div>
      </header>

      <section style={{ background: 'linear-gradient(135deg,#0d1321,#1a1040)', padding: '48px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 800, background: 'linear-gradient(135deg,#fff,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12 }}>Los mejores productos de México</h1>
        <p style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 24 }}>Envío rápido a todo México 🇲🇽 · Pago 100% seguro</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🚚 Envío gratis +$599', '🔒 Pago seguro', '↩️ Devoluciones 30 días', '⭐ Garantía de calidad'].map(b => (
            <span key={b} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '6px 16px', fontSize: 13 }}>{b}</span>
          ))}
        </div>
      </section>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
            {[...Array(8)].map((_, i) => <div key={i} style={{ background: 'var(--card)', borderRadius: 14, height: 380, border: '1px solid var(--border)', opacity: 0.5 }} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text2)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>No hay productos disponibles</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20, color: 'var(--text2)', fontSize: 14 }}>{products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
              {products.map(p => <ProductCard key={p.id} product={p} onAddToCart={addToCart} inWishlist={wishlist.includes(p.id)} onToggleWishlist={toggleWishlist} />)}
            </div>
          </>
        )}
      </main>

      <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '32px 20px', marginTop: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>TodoClick MX</div>
        <p>© 2026 TodoClick MX · Envíos a toda la República Mexicana 🇲🇽</p>
        <p style={{ marginTop: 8 }}>
          <a href="/perfil" style={{ color: 'var(--text3)', marginRight: 16 }}>Mi cuenta</a>
          <a href="/admin-login" style={{ color: 'var(--text3)' }}>Admin</a>
        </p>
      </footer>

      <CartDrawer cart={cart} setCart={setCart} open={cartOpen} onClose={() => setCartOpen(false)} />
      <ChatBot />

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a2236', border: '1px solid rgba(0,212,255,0.3)', color: '#e2e8f0', padding: '12px 24px', borderRadius: 10, fontSize: 14, zIndex: 9999, fontWeight: 600 }}>{toast}</div>}

      {showAuthModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAuthModal(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#111827', border: '1px solid #1e2d47', borderRadius: 20, padding: 36, width: '100%', maxWidth: 400, position: 'relative' }}>
            <button onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>{authMode === 'login' ? '👤' : '✨'}</div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, margin: '0 0 6px', color: '#fff' }}>{authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{authMode === 'login' ? 'Accede a tus pedidos y favoritos' : 'Guarda favoritos y rastrea pedidos'}</p>
            </div>
            {authMode === 'signup' && <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Tu nombre completo" style={{ width: '100%', padding: '11px 14px', background: '#0a0a0f', border: '1px solid #1e2d47', borderRadius: 9, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />}
            <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="tu@email.com" type="email" style={{ width: '100%', padding: '11px 14px', background: '#0a0a0f', border: '1px solid #1e2d47', borderRadius: 9, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="Contraseña (mín. 6 caracteres)" type="password" style={{ width: '100%', padding: '11px 14px', background: '#0a0a0f', border: '1px solid #1e2d47', borderRadius: 9, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: authError ? 8 : 16 }} />
            {authError && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 7 }}>⚠️ {authError}</div>}
            <button onClick={handleAuth} disabled={authLoading} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 14, opacity: authLoading ? 0.7 : 1 }}>
              {authLoading ? 'Cargando...' : authMode === 'login' ? '→ Entrar' : '→ Crear cuenta gratis'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              {authMode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError('') }} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                {authMode === 'login' ? 'Regístrate gratis' : 'Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCard({ product, onAddToCart, inWishlist, onToggleWishlist }: { product: Product; onAddToCart: (p: Product) => void; inWishlist?: boolean; onToggleWishlist?: (id: string) => void }) {
  const img = product.images?.[0]
  return (
    <div className="card fade-in" style={{ padding: 0, overflow: 'hidden', transition: 'all .2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}>
      <div style={{ position: 'relative' }}>
        <a href={'/producto/' + product.id} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ height: 200, background: 'linear-gradient(135deg,var(--bg3),var(--card))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {img ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 64 }}>📦</span>}
          </div>
        </a>
        <button onClick={() => onToggleWishlist?.(product.id)} title={inWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos'} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17 }}>
          {inWishlist ? '❤️' : '🤍'}
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>{product.category}</div>
        <a href={'/producto/' + product.id} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, color: 'var(--text)' }}>{product.name}</h3>
        </a>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>${product.price.toLocaleString('es-MX')}<span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 2 }}> MXN</span></span>
          <span style={{ fontSize: 11, color: product.stock > 0 ? 'var(--accent3)' : 'var(--red)', fontWeight: 600 }}>{product.stock > 0 ? '✓ ' + product.stock + ' disponibles' : '✗ Agotado'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={'/producto/' + product.id} style={{ flex: 1, padding: '10px', fontSize: 13, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text2)', textAlign: 'center', textDecoration: 'none', fontWeight: 600 }}>Ver detalles</a>
          <button onClick={() => onAddToCart(product)} disabled={product.stock === 0} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: 13 }}>
            {product.stock === 0 ? 'Sin stock' : '🛒 Al carrito'}
          </button>
        </div>
      </div>
    </div>
  )
}
