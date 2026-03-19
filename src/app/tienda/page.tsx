'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Product } from '@/lib/supabase'
import ChatBot from '@/components/store/ChatBot'
import CartDrawer from '@/components/store/CartDrawer'

const CATS = [
  { id: 'Todos', icon: '🏠', label: 'Inicio', color: '#0ea5e9',
    img: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300&q=80' },
  { id: 'Electrónica', icon: '⚡', label: 'Electrónica', color: '#7c3aed',
    img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&q=80' },
  { id: 'Moda', icon: '👗', label: 'Moda', color: '#ec4899',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80' },
  { id: 'Hogar', icon: '🏡', label: 'Hogar', color: '#f59e0b',
    img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&q=80' },
  { id: 'Deportes', icon: '💪', label: 'Deportes', color: '#10b981',
    img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&q=80' },
  { id: 'Belleza', icon: '✨', label: 'Belleza', color: '#f43f5e',
    img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&q=80' },
  { id: 'Juguetes', icon: '🎮', label: 'Juguetes', color: '#8b5cf6',
    img: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&q=80' },
  { id: 'Automotriz', icon: '🚗', label: 'Auto', color: '#64748b',
    img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&q=80' },
]

const SORTS = [
  { id: 'new', label: 'Más nuevos' },
  { id: 'price_asc', label: 'Menor precio' },
  { id: 'price_desc', label: 'Mayor precio' },
  { id: 'popular', label: 'Más vendidos' },
]

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sort, setSort] = useState('new')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [cart, setCart] = useState<{product: Product; quantity: number}[]>(() => {
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
  const [bannerIdx, setBannerIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const banners = [
    { 
      bg: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', 
      text: '🔥 Ofertas del día', sub: 'Hasta 70% de descuento', btn: 'Ver ofertas',
      img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
      action: () => { setSearch('oferta'); setCategory('Todos') }
    },
    { 
      bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', 
      text: '⚡ Envío gratis', sub: 'En pedidos mayores a $599 MXN', btn: 'Comprar ahora',
      img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
      action: () => { setSearch(''); setCategory('Todos') }
    },
    { 
      bg: 'linear-gradient(135deg,#10b981,#0ea5e9)', 
      text: '✨ Nuevos productos', sub: 'Recién llegados esta semana', btn: 'Explorar',
      img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
      action: () => { setCategory('Todos'); setSort('new') }
    },
  ]

  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 4000)
    return () => clearInterval(t)
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ active: 'true' })
    if (category !== 'Todos') params.set('category', category)
    if (search) params.set('search', search)
    const data = await fetch('/api/products?' + params).then(r => r.json()).catch(() => [])
    let sorted = Array.isArray(data) ? [...data] : []
    if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price)
    else if (sort === 'popular') sorted.sort((a, b) => (b.sold || 0) - (a.sold || 0))
    setProducts(sorted)
    setLoading(false)
  }, [category, search, sort])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    const sync = () => { try { setCart(JSON.parse(localStorage.getItem('cart') || '[]')) } catch {} }
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
    }).catch(() => {})
  }, [])

  const toggleWishlist = async (productId: string) => {
    if (!customer?.user) { setShowAuthModal(true); return }
    const inList = wishlist.includes(productId)
    setWishlist(w => inList ? w.filter(id => id !== productId) : [...w, productId])
    await fetch('/api/wishlist', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ product_id: productId, action: inList ? 'remove' : 'add' }) })
  }

  const handleAuth = async () => {
    setAuthLoading(true); setAuthError('')
    const res = await fetch('/api/customer-auth', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: authMode, email: authEmail, password: authPassword, name: authName }) })
    const data = await res.json()
    if (data.error) { setAuthError(data.error); setAuthLoading(false); return }
    setCustomer(data); setShowAuthModal(false); setAuthLoading(false)
    fetch('/api/wishlist').then(r => r.json()).then(w => setWishlist(Array.isArray(w) ? w : []))
  }

  const logout = async () => {
    await fetch('/api/customer-auth', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'logout' }) })
    setCustomer(null); setWishlist([])
  }

  const addToCart = (product: Product) => {
    setCart(c => { const ex = c.find(i => i.product.id === product.id); if (ex) return c.map(i => i.product.id === product.id ? {...i, quantity: i.quantity+1} : i); return [...c, {product, quantity: 1}] })
    setToast('✓ ' + product.name.slice(0, 30) + '...')
    setTimeout(() => setToast(''), 2500)
  }

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'"DM Sans", sans-serif', color:'#111' }}>
      <style>{`
        * { box-sizing: border-box; }
        .pc:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12) !important; }
        .pc { transition: all .2s !important; }
        .cat-btn:hover { background: #0ea5e9 !important; color: #fff !important; }
        .atc:hover { background: #0284c7 !important; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn .3s ease; }
        ::-webkit-scrollbar { height: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
      `}</style>

      {/* TOP HEADER */}
      <div style={{ background:'#0ea5e9', color:'#fff', padding:'6px 0', textAlign:'center', fontSize:12, fontWeight:600 }}>
        🚚 Envío gratis en pedidos mayores a $599 MXN · 🔒 Pago 100% seguro
      </div>

      {/* MAIN HEADER */}
      <header style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:200, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth:1300, margin:'0 auto', padding:'0 20px', height:64, display:'flex', alignItems:'center', gap:16 }}>
          {/* Logo */}
          <a href="/tienda" style={{ textDecoration:'none', flexShrink:0 }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:22, display:'flex', gap:1 }}>
              <span style={{color:'#0ea5e9'}}>Todo</span><span style={{color:'#111'}}>Click</span><span style={{color:'#f59e0b'}}>MX</span>
            </div>
          </a>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ flex:1, maxWidth:520 }}>
            <div style={{ display:'flex', background:'#f3f4f6', borderRadius:50, overflow:'hidden', border:'2px solid transparent', transition:'border-color .2s' }}
              onFocus={() => {}} onBlur={() => {}}>
              <input ref={searchRef} value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Buscar productos, marcas..."
                style={{ flex:1, padding:'10px 18px', background:'transparent', border:'none', outline:'none', fontSize:14, color:'#111' }} />
              <button type="submit" style={{ padding:'10px 18px', background:'#0ea5e9', border:'none', cursor:'pointer', color:'#fff', fontSize:14 }}>🔍</button>
            </div>
          </form>

          {/* Actions */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:'auto', flexShrink:0 }}>
            {customer?.user ? (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <a href="/perfil" style={{ display:'flex', alignItems:'center', gap:6, textDecoration:'none', color:'#111', fontSize:13, fontWeight:600 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:12 }}>
                    {(customer.profile?.name || customer.user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <span style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
                    <span style={{ fontSize:11, color:'#888' }}>Hola,</span>
                    <span>{customer.profile?.name?.split(' ')[0] || 'Mi cuenta'}</span>
                  </span>
                </a>
                <button onClick={logout} style={{ background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:11 }}>Salir</button>
              </div>
            ) : (
              <button onClick={() => { setShowAuthModal(true); setAuthMode('login') }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'none', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'#111' }}>
                👤 Iniciar sesión
              </button>
            )}

            <a href="/perfil" title="Favoritos" style={{ position:'relative', padding:8, color:'#555', fontSize:20, textDecoration:'none' }}>
              ♡
              {wishlist.length > 0 && <span style={{ position:'absolute', top:2, right:2, background:'#ef4444', color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>{wishlist.length}</span>}
            </a>

            <button onClick={() => setCartOpen(true)} style={{ position:'relative', display:'flex', alignItems:'center', gap:8, padding:'9px 18px', background:'#0ea5e9', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>
              🛒 Carrito
              {totalItems > 0 && <span style={{ background:'#ef4444', color:'#fff', borderRadius:'50%', width:20, height:20, fontSize:11, display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>{totalItems}</span>}
            </button>
          </div>
        </div>

        {/* CATEGORY NAV */}
        <nav style={{ borderTop:'1px solid #f3f4f6', background:'#fff' }}>
          <div style={{ maxWidth:1300, margin:'0 auto', padding:'0 20px', display:'flex', gap:4, overflowX:'auto' }}>
            {CATS.map(c => (
              <button key={c.id} onClick={() => { setCategory(c.id); setSearch(''); setSearchInput('') }}
                style={{ padding:'10px 16px', background:'transparent', color:category===c.id?c.color:'#555', border:'none', cursor:'pointer', fontSize:13, fontWeight:category===c.id?700:500, whiteSpace:'nowrap', borderBottom:`2px solid ${category===c.id?c.color:'transparent'}`, transition:'all .15s', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                {c.img && <div style={{ width:20, height:20, borderRadius:4, overflow:'hidden', flexShrink:0 }}><img src={c.img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>}
                {c.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main style={{ maxWidth:1300, margin:'0 auto', padding:'20px' }}>

        {/* HERO BANNER */}
        {category === 'Todos' && !search && (
          <div onClick={() => banners[bannerIdx].action?.()} style={{ borderRadius:16, overflow:'hidden', marginBottom:24, position:'relative', height:220, cursor:'pointer', background:banners[bannerIdx].bg, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 48px', transition:'all .5s' }}>
            <div style={{ position:'relative', zIndex:2 }}>
              <h2 style={{ color:'#fff', fontFamily:'Syne, sans-serif', fontSize:32, fontWeight:800, margin:'0 0 8px', textShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>{banners[bannerIdx].text}</h2>
              <p style={{ color:'rgba(255,255,255,0.9)', fontSize:16, margin:'0 0 20px' }}>{banners[bannerIdx].sub}</p>
              <button onClick={e => { e.stopPropagation(); banners[bannerIdx].action?.() }} style={{ background:'#fff', color:'#0ea5e9', border:'none', borderRadius:8, padding:'10px 24px', fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,0.15)' }}>{banners[bannerIdx].btn} →</button>
            </div>
            <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'40%', overflow:'hidden' }}>
              {banners[bannerIdx].img && <img src={banners[bannerIdx].img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.35, mixBlendMode:'luminosity' }} />}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right, rgba(0,0,0,0.4), transparent)' }} />
            </div>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(0,0,0,0.1), transparent)' }} />
            {/* Dots */}
            <div style={{ position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6 }}>
              {banners.map((_, i) => <div key={i} onClick={() => setBannerIdx(i)} style={{ width:i===bannerIdx?24:8, height:8, borderRadius:4, background:i===bannerIdx?'#fff':'rgba(255,255,255,0.4)', cursor:'pointer', transition:'all .3s' }} />)}
            </div>
          </div>
        )}

        {/* QUICK CATEGORY CARDS with photos */}
        {category === 'Todos' && !search && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
            {CATS.slice(1).map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{ position:'relative', height:110, borderRadius:14, overflow:'hidden', cursor:'pointer', border:'none', padding:0, transition:'transform .2s, box-shadow .2s', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='scale(1.03)'; (e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(0,0,0,0.15)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.08)' }}>
                {/* Background photo */}
                <img src={c.img} alt={c.label} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                {/* Gradient overlay */}
                <div style={{ position:'absolute', inset:0, background:`linear-gradient(to top, ${c.color}ee 0%, ${c.color}88 50%, transparent 100%)` }} />
                {/* Label */}
                <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 12px', textAlign:'left' }}>
                  <div style={{ fontSize:15, fontWeight:800, color:'#fff', textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>{c.label}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* TOOLBAR */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, background:'#fff', padding:'10px 16px', borderRadius:10, border:'1px solid #e5e7eb' }}>
          <div style={{ fontSize:13, color:'#888' }}>
            {loading ? 'Cargando...' : <><strong style={{color:'#111'}}>{products.length}</strong> productos {category !== 'Todos' ? `en ${category}` : ''} {search && `· "${search}"`}</>}
            {search && <button onClick={() => { setSearch(''); setSearchInput('') }} style={{ marginLeft:8, background:'#fee2e2', color:'#ef4444', border:'none', borderRadius:4, padding:'2px 8px', fontSize:11, cursor:'pointer', fontWeight:700 }}>✕ Limpiar</button>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding:'6px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, background:'#fff', cursor:'pointer', outline:'none', color:'#111' }}>
              {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <div style={{ display:'flex', gap:4 }}>
              <button onClick={() => setViewMode('grid')} style={{ padding:'6px 10px', background:viewMode==='grid'?'#0ea5e9':'#f3f4f6', border:'none', borderRadius:6, cursor:'pointer', color:viewMode==='grid'?'#fff':'#888', fontSize:14 }}>⊞</button>
              <button onClick={() => setViewMode('list')} style={{ padding:'6px 10px', background:viewMode==='list'?'#0ea5e9':'#f3f4f6', border:'none', borderRadius:6, cursor:'pointer', color:viewMode==='list'?'#fff':'#888', fontSize:14 }}>≡</button>
            </div>
          </div>
        </div>

        {/* PRODUCTS */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:viewMode==='grid'?'repeat(auto-fill,minmax(200px,1fr))':'1fr', gap:16 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background:'#fff', borderRadius:12, height:viewMode==='grid'?340:120, border:'1px solid #e5e7eb', overflow:'hidden', position:'relative' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,#f3f4f6 0%,#e5e7eb 50%,#f3f4f6 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }} />
              </div>
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', background:'#fff', borderRadius:16, border:'1px solid #e5e7eb' }}>
            <div style={{ fontSize:60, marginBottom:16 }}>🔍</div>
            <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:22, marginBottom:8, color:'#111' }}>No encontramos productos</h3>
            <p style={{ color:'#888', marginBottom:20 }}>
              {search ? `No hay resultados para "${search}"` : `No hay productos en ${category} aún`}
            </p>
            <button onClick={() => { setCategory('Todos'); setSearch(''); setSearchInput('') }}
              style={{ padding:'10px 24px', background:'#0ea5e9', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14 }}>
              Ver todos los productos
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
            {products.map(p => <GridCard key={p.id} product={p} onAdd={addToCart} inWishlist={wishlist.includes(p.id)} onWishlist={toggleWishlist} />)}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {products.map(p => <ListCard key={p.id} product={p} onAdd={addToCart} inWishlist={wishlist.includes(p.id)} onWishlist={toggleWishlist} />)}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ background:'#111', color:'#888', padding:'40px 20px', marginTop:48 }}>
        <div style={{ maxWidth:1300, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:32 }}>
          <div>
            <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, marginBottom:12, display:'flex', gap:2 }}>
              <span style={{color:'#0ea5e9'}}>Todo</span><span style={{color:'#fff'}}>Click</span><span style={{color:'#f59e0b'}}>MX</span>
            </div>
            <p style={{ fontSize:13, lineHeight:1.7, color:'#666' }}>Tu tienda online de confianza. Productos de calidad con envío a todo México.</p>
          </div>
          <div>
            <div style={{ fontWeight:700, color:'#fff', marginBottom:12, fontSize:14 }}>Mi cuenta</div>
            {['Mis pedidos', 'Mis favoritos', 'Mi perfil', 'Iniciar sesión'].map(l => (
              <a key={l} href="/perfil" style={{ display:'block', color:'#666', textDecoration:'none', fontSize:13, marginBottom:8, transition:'color .15s' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#0ea5e9'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#666'}>{l}</a>
            ))}
          </div>
          <div>
            <div style={{ fontWeight:700, color:'#fff', marginBottom:12, fontSize:14 }}>Ayuda</div>
            {['Envíos y entregas', 'Devoluciones', 'Política de privacidad', 'Términos'].map(l => (
              <a key={l} href="#" style={{ display:'block', color:'#666', textDecoration:'none', fontSize:13, marginBottom:8 }}>{l}</a>
            ))}
          </div>
          <div>
            <div style={{ fontWeight:700, color:'#fff', marginBottom:12, fontSize:14 }}>Contáctanos</div>
            <p style={{ fontSize:13, color:'#666', lineHeight:1.7 }}>¿Tienes alguna pregunta?<br />Escríbenos por WhatsApp o en el chat de la tienda.</p>
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              {['📱 WhatsApp', '💬 Chat'].map(b => (
                <button key={b} style={{ padding:'6px 14px', background:'#1e2d47', border:'none', borderRadius:6, color:'#ccc', fontSize:12, cursor:'pointer' }}>{b}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth:1300, margin:'32px auto 0', paddingTop:24, borderTop:'1px solid #1e2d47', textAlign:'center', fontSize:12, color:'#555' }}>
          © 2026 TodoClick MX · Envíos a toda la República Mexicana 🇲🇽
        </div>
      </footer>

      <CartDrawer cart={cart} setCart={setCart} open={cartOpen} onClose={() => setCartOpen(false)} />
      <ChatBot />

      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#111', color:'#fff', padding:'12px 24px', borderRadius:10, fontSize:14, zIndex:9999, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:10, whiteSpace:'nowrap' }}>
          <span style={{ color:'#10b981', fontSize:18 }}>✓</span> {toast}
          <button onClick={() => setCartOpen(true)} style={{ marginLeft:8, padding:'4px 10px', background:'#0ea5e9', border:'none', borderRadius:6, color:'#fff', fontSize:12, cursor:'pointer', fontWeight:700 }}>Ver carrito</button>
        </div>
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAuthModal(false) }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:36, width:'100%', maxWidth:400, position:'relative', boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>
            <button onClick={() => setShowAuthModal(false)} style={{ position:'absolute', top:14, right:16, background:'#f3f4f6', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:14, color:'#666' }}>✕</button>
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:24 }}>{authMode==='login'?'👤':'✨'}</div>
              <h2 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:22, margin:'0 0 6px', color:'#111' }}>{authMode==='login'?'Iniciar sesión':'Crear cuenta'}</h2>
              <p style={{ color:'#888', fontSize:13, margin:0 }}>{authMode==='login'?'Accede a tus pedidos y favoritos':'Guarda favoritos y rastrea pedidos'}</p>
            </div>
            {authMode==='signup' && (
              <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Nombre completo"
                style={{ width:'100%', padding:'11px 14px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:9, color:'#111', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:10 }} />
            )}
            <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="tu@email.com" type="email"
              style={{ width:'100%', padding:'11px 14px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:9, color:'#111', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:10 }} />
            <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAuth()} placeholder="Contraseña" type="password"
              style={{ width:'100%', padding:'11px 14px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:9, color:'#111', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:authError?8:14 }} />
            {authError && <div style={{ color:'#ef4444', fontSize:12, marginBottom:12, background:'#fef2f2', padding:'8px 12px', borderRadius:7, border:'1px solid #fecaca' }}>⚠️ {authError}</div>}
            <button onClick={handleAuth} disabled={authLoading}
              style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', border:'none', borderRadius:9, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', marginBottom:12, opacity:authLoading ? 0.7 : 1 }}>
              {authLoading ? 'Cargando...' : authMode==='login' ? 'Entrar →' : 'Crear cuenta gratis →'}
            </button>
            <div style={{ textAlign:'center', fontSize:13, color:'#888' }}>
              {authMode==='login'?'¿No tienes cuenta? ':'¿Ya tienes cuenta? '}
              <button onClick={() => { setAuthMode(authMode==='login'?'signup':'login'); setAuthError('') }}
                style={{ background:'none', border:'none', color:'#0ea5e9', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                {authMode==='login'?'Regístrate gratis':'Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}

function GridCard({ product, onAdd, inWishlist, onWishlist }: { product: Product; onAdd: (p: Product) => void; inWishlist: boolean; onWishlist: (id: string) => void }) {
  const img = product.images?.[0]
  const [hovered, setHovered] = useState(false)
  return (
    <div className="pc" style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ position:'relative', aspectRatio:'1', background:'#f9fafb', overflow:'hidden' }}>
        <a href={`/producto/${product.id}`} style={{ display:'block', width:'100%', height:'100%' }}>
          {img
            ? <img src={hovered ? (product.images?.[1] || img) : img} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:8, transition:'opacity .3s' }} />
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>📦</div>}
        </a>
        <button onClick={() => onWishlist(product.id)}
          style={{ position:'absolute', top:8, right:8, background:'rgba(255,255,255,0.9)', border:'none', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
          {inWishlist ? '❤️' : '🤍'}
        </button>
        {product.sold && product.sold > 10 && (
          <div style={{ position:'absolute', top:8, left:8, background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4 }}>🔥 POPULAR</div>
        )}
        {hovered && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px', background:'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
            <button onClick={() => onAdd(product)} disabled={product.stock===0} className="atc"
              style={{ width:'100%', padding:'8px', background:'#0ea5e9', border:'none', borderRadius:8, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', transition:'background .15s' }}>
              {product.stock===0 ? 'Sin stock' : '+ Agregar al carrito'}
            </button>
          </div>
        )}
      </div>
      <div style={{ padding:'12px' }}>
        <a href={`/producto/${product.id}`} style={{ textDecoration:'none', color:'inherit' }}>
          <div style={{ fontSize:12, color:'#0ea5e9', fontWeight:600, marginBottom:4 }}>{product.category}</div>
          <div style={{ fontSize:14, fontWeight:600, lineHeight:1.3, marginBottom:8, color:'#111', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{product.name}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:18, fontWeight:800, color:'#0ea5e9' }}>${product.price.toLocaleString('es-MX')}<span style={{ fontSize:11, color:'#aaa', fontWeight:400 }}> MXN</span></span>
            {product.stock < 5 && product.stock > 0 && <span style={{ fontSize:10, color:'#f59e0b', fontWeight:700 }}>¡Últimas {product.stock}!</span>}
          </div>
        </a>
        <button onClick={() => onAdd(product)} disabled={product.stock===0}
          style={{ width:'100%', marginTop:8, padding:'9px', background:product.stock===0?'#e5e7eb':'#0ea5e9', border:'none', borderRadius:8, color:product.stock===0?'#999':'#fff', fontWeight:700, fontSize:13, cursor:product.stock===0?'not-allowed':'pointer', transition:'background .15s' }}>
          {product.stock===0 ? 'Sin stock' : '🛒 Agregar'}
        </button>
      </div>
    </div>
  )
}

function ListCard({ product, onAdd, inWishlist, onWishlist }: { product: Product; onAdd: (p: Product) => void; inWishlist: boolean; onWishlist: (id: string) => void }) {
  const img = product.images?.[0]
  return (
    <div className="pc" style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden', display:'flex', gap:0, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
      <a href={`/producto/${product.id}`} style={{ width:140, minWidth:140, background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        {img ? <img src={img} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:8 }} /> : <span style={{ fontSize:40 }}>📦</span>}
      </a>
      <div style={{ flex:1, padding:'16px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'#0ea5e9', fontWeight:600, marginBottom:4 }}>{product.category}</div>
          <a href={`/producto/${product.id}`} style={{ textDecoration:'none' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#111', marginBottom:6, lineHeight:1.3 }}>{product.name}</div>
          </a>
          <div style={{ fontSize:13, color:'#888', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{product.description}</div>
        </div>
        <div style={{ textAlign:'right', minWidth:140 }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#0ea5e9', marginBottom:4 }}>${product.price.toLocaleString('es-MX')}</div>
          <div style={{ fontSize:12, color:product.stock>0?'#10b981':'#ef4444', marginBottom:12 }}>{product.stock>0?`✓ ${product.stock} disponibles`:'Agotado'}</div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => onWishlist(product.id)} style={{ padding:'7px 10px', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:7, cursor:'pointer', fontSize:16 }}>{inWishlist?'❤️':'🤍'}</button>
            <button onClick={() => onAdd(product)} disabled={product.stock===0}
              style={{ flex:1, padding:'9px 16px', background:'#0ea5e9', border:'none', borderRadius:8, color:'#fff', fontWeight:700, fontSize:13, cursor:product.stock===0?'not-allowed':'pointer' }}>
              {product.stock===0?'Sin stock':'🛒 Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
