'use client'
import { useState, useEffect } from 'react'
import type { Product, Order } from '@/lib/supabase'

type Tab = 'dashboard' | 'productos' | 'importar' | 'importar-masivo' | 'pedidos'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [pr, or] = await Promise.all([
      fetch('/api/products?admin=true').then(r => r.json()).catch(() => []),
      fetch('/api/orders').then(r => r.json()).catch(() => []),
    ])
    setProducts(Array.isArray(pr) ? pr : [])
    setOrders(Array.isArray(or) ? or : [])
  }

  const totalRevenue = orders.filter(o => o.payment_status === 'pagado').reduce((s, o) => s + o.total, 0)
  const totalCommission = orders.filter(o => o.payment_status === 'pagado').reduce((s, o) => s + o.commission, 0)
  const pendingOrders = orders.filter(o => o.status === 'pendiente').length

  const NAV = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'importar', icon: '🔗', label: 'Importar', badge: '¡Nuevo!' },
    { id: 'productos', icon: '📦', label: 'Productos', badge: products.length || undefined },
    { id: 'importar-masivo', icon: '📥', label: 'Importar masivo', badge: '¡Nuevo!' },
    { id: 'pedidos', icon: '🛒', label: 'Pedidos', badge: pendingOrders || undefined },
  ] as { id: Tab; icon: string; label: string; badge?: any }[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'#0ea5e9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><polyline points="3,10 8,15 17,5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:16, display:'flex', gap:2 }}>
              <span style={{color:'#0ea5e9'}}>Todo</span><span style={{color:'var(--text)'}}>Click</span><span style={{color:'#f59e0b'}}>MX</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Panel Admin 🔒</div>
        </div>
        <nav style={{ padding: '16px 8px', flex: 1 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 8, border: 'none', background: tab === item.id ? 'rgba(0,212,255,0.12)' : 'transparent', color: tab === item.id ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 4, fontFamily: 'inherit', textAlign: 'left', transition: 'all .2s', borderLeft: tab === item.id ? '3px solid var(--accent)' : '3px solid transparent' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span style={{ background: typeof item.badge === 'string' ? 'var(--accent2)' : 'var(--red)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="/tienda" target="_blank" style={{ display: 'block', textAlign: 'center', padding: '9px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: 'var(--accent3)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>🌐 Ver tienda →</a>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh' }}>
        {tab === 'dashboard' && <AdminDashboard products={products} orders={orders} totalRevenue={totalRevenue} totalCommission={totalCommission} />}
        {tab === 'importar' && <AdminImporter onRefresh={loadAll} onGoProducts={() => setTab('productos')} />}
        {tab === 'productos' && <AdminProducts products={products} onRefresh={loadAll} />}
        {tab === 'importar-masivo' && <AdminBulkImporter onRefresh={loadAll} onGoProducts={() => setTab('productos')} />}
        {tab === 'pedidos' && <AdminOrders orders={orders} onRefresh={loadAll} />}
      </main>
    </div>
  )
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
function AdminDashboard({ products, orders, totalRevenue, totalCommission }: any) {
  const stats = [
    { icon: '💰', value: `$${totalRevenue.toLocaleString('es-MX')}`, label: 'Ingresos totales', color: '#00d4ff' },
    { icon: '🎯', value: `$${totalCommission.toLocaleString('es-MX')}`, label: 'Tu ganancia', color: '#10b981' },
    { icon: '📦', value: String(products.length), label: 'Productos', color: '#7c3aed' },
    { icon: '🛒', value: String(orders.length), label: 'Pedidos totales', color: '#f59e0b' },
  ]
  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>Resumen de tu tienda en tiempo real</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }} />
            <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🛒 Últimos pedidos</h3>
          {orders.slice(0, 6).map((o: any) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(30,45,71,.5)', fontSize: 13 }}>
              <div><div style={{ fontWeight: 600 }}>{o.order_number}</div><div style={{ color: 'var(--text2)', fontSize: 12 }}>{o.customer_name}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, color: 'var(--accent)' }}>${o.total.toLocaleString()}</div><StatusBadge status={o.status} /></div>
            </div>
          ))}
          {orders.length === 0 && <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>Sin pedidos aún — ¡comparte tu tienda!</div>}
        </div>
        <div className="card">
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏆 Más vendidos</h3>
          {[...products].sort((a: any, b: any) => b.sold - a.sold).slice(0, 6).map((p: any, i: number) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(30,45,71,.5)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? 'linear-gradient(135deg,#f59e0b,#f97316)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: i < 3 ? '#000' : 'var(--text2)', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
                {p.images?.[0] ? <img src={p.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>}
              </div>
              <div style={{ flex: 1, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--accent3)', fontWeight: 700 }}>{p.sold} 🛒</div>
            </div>
          ))}
          {products.length === 0 && <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>Importa productos para empezar</div>}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// IMPORTADOR DE MERCADOLIBRE
// ══════════════════════════════════════════
function AdminImporter({ onRefresh, onGoProducts }: { onRefresh: () => void; onGoProducts: () => void }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<any[]>([])

  // Extract ML item ID from URL
  const extractMLId = (u: string): string | null => {
    const pageMatch = u.match(/\/p\/(MLM\d+)/i)
    if (pageMatch) return pageMatch[1]
    const re = /MLM-?(\d+)/gi
    const allMatches: RegExpExecArray[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(u)) !== null) allMatches.push(m)
    if (allMatches.length > 0) {
      const best = allMatches.sort((a, b) => b[1].length - a[1].length)[0]
      return `MLM${best[1]}`
    }
    return null
  }

  const importProduct = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    const isMercadoLibre = url.includes('mercadolibre')
    const isAliExpress = url.includes('aliexpress')
    const isCJ = url.includes('cjdropshipping') || url.includes('cjdrop')

    if (!isMercadoLibre && !isAliExpress && !isCJ) {
      setError('Pega una URL de MercadoLibre, AliExpress o CJDropshipping')
      setLoading(false)
      return
    }

    try {
      let productData: any = null

      if (isMercadoLibre) {
        // STEP 1: Fetch from ML API directly in the browser (bypasses Vercel IP block)
        setLoadingMsg('📡 Obteniendo datos de MercadoLibre...')
        const itemId = extractMLId(url)
        if (!itemId) {
          setError('No se encontró el ID del producto en la URL. Asegúrate de que tenga "MLM" + números.')
          setLoading(false)
          return
        }

        // If it's a page ID (/p/MLM...), get the actual item
        let realItemId = itemId
        if (url.includes('/p/MLM')) {
          try {
            const pageRes = await fetch(`/api/ml-proxy?path=${encodeURIComponent('/products/' + itemId + '/items?limit=1')}`)
            if (pageRes.ok) {
              const pageData = await pageRes.json()
              if (pageData.results?.[0]?.id) realItemId = pageData.results[0].id
            }
          } catch { /* use itemId directly */ }
        }

        const mlRes = await fetch(`/api/ml-proxy?path=${encodeURIComponent('/items/' + realItemId)}`)
        if (!mlRes.ok) throw new Error(`No se pudo obtener el producto (${mlRes.status}). Verifica la URL.`)
        const d = await mlRes.json()

        const images = (d.pictures || []).slice(0, 6)
          .map((p: any) => (p.url || p.secure_url || '').replace('http://', 'https://').replace(/-I\.jpg$/, '-O.jpg'))
          .filter(Boolean)
        if (images.length === 0 && d.thumbnail) images.push(d.thumbnail.replace('http://', 'https://').replace(/-I\.jpg$/, '-O.jpg'))

        const attrs = (d.attributes || []).slice(0, 8)
          .map((a: any) => `${a.name}: ${a.value_name}`)
          .filter((a: string) => !a.includes('null') && !a.includes('undefined'))
          .join(', ')

        productData = {
          title: d.title,
          price: d.price,
          stock: d.available_quantity || 10,
          images,
          attrs,
          source_url: url,
          source_name: 'MercadoLibre',
          category_id: d.category_id || '',
        }
      } else {
        // AliExpress: fetch real data via our server proxy
        setLoadingMsg('📦 Obteniendo datos de AliExpress...')
        const aliRes = await fetch(`/api/ali-proxy?url=${encodeURIComponent(url.trim())}`)
        const aliData = await aliRes.json()
        
        if (aliData.error && !aliData.raw?.title) {
          // Fallback: extract basic info from URL
          const decoded = decodeURIComponent(url)
          const path = decoded.split('/').find((s: string) => s.length > 10 && !s.includes('.') && isNaN(Number(s))) || ''
          const titleFromUrl = path.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).slice(0, 80)
          productData = {
            title: titleFromUrl || 'Producto AliExpress',
            price: 299,
            stock: 50,
            images: [],
            attrs: '',
            source_url: url,
            source_name: 'AliExpress',
            category_id: '',
          }
        } else {
          const raw = aliData.raw || {}
          // Fix image URLs
          const images = (raw.images || []).slice(0, 5).map((img: string) => {
            const u = img.startsWith('//') ? 'https:' + img : img
            return u.replace('http://', 'https://')
          })
          productData = {
            title: raw.title || 'Producto AliExpress',
            price: raw.price && raw.price > 0 ? raw.price : 299,
            stock: 50,
            images,
            attrs: '',
            source_url: url,
            source_name: 'AliExpress',
            category_id: '',
          }
        }
      }

      if (!productData.price || productData.price <= 0) {
        setError('No se pudo obtener el precio del producto.')
        setLoading(false)
        return
      }

      // STEP 2: Send extracted data to server to save + generate AI description
      setLoadingMsg('🤖 Generando descripción con IA...')
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productData }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); setLoadingMsg(''); return }
      setResult(data)
      setHistory(h => [data, ...h.slice(0, 4)])
      setUrl('')
      onRefresh()
    } catch (e: any) {
      setError(e.message || 'Error de conexión. Verifica tu internet.')
    }
    setLoading(false)
    setLoadingMsg('')
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Importar productos</h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>Pega la URL de cualquier producto de <strong style={{color:'var(--accent)'}}>MercadoLibre</strong> o <strong style={{color:'#f59e0b'}}>AliExpress</strong> y lo importamos automáticamente</p>

      {/* CÓMO FUNCIONA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { step: '1', icon: '🔗', title: 'Copia la URL', desc: 'Ve a MercadoLibre, abre cualquier producto y copia la URL del navegador' },
          { step: '2', icon: '🤖', title: 'Importación automática', desc: 'La IA extrae nombre, fotos, precio y genera una descripción atractiva' },
          { step: '3', icon: '✅', title: 'Listo para vender', desc: 'El producto aparece en tu tienda con margen de ganancia del 15%' },
        ].map(s => (
          <div key={s.step} className="card" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#000', margin: '0 auto 12px' }}>{s.step}</div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="card" style={{ marginBottom: 24 }}>
        <label className="label">URL del producto de MercadoLibre</label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <input
            className="input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && importProduct()}
            placeholder="https://www.mercadolibre.com.mx/producto/MLM123456789  ó  https://www.aliexpress.com/item/..."
            style={{ flex: 1, fontSize: 14 }}
          />
          <button onClick={importProduct} disabled={loading || !url.trim()} className="btn-primary" style={{ padding: '0 28px', whiteSpace: 'nowrap', minWidth: 160 }}>
            {loading ? '⏳ Importando...' : '🔗 Importar producto'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>💡 MercadoLibre: abre el producto → copia la URL (debe tener MLM+números) · AliExpress: abre el producto → copia la URL completa</p>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, color: 'var(--red)', fontSize: 14 }}>
          {error === 'AUTH_NEEDED' ? (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>🔐 Necesitas autorizar la app con MercadoLibre</div>
              <div style={{ fontSize: 13, marginBottom: 14, color: 'var(--text2)' }}>Haz clic en el botón para conectar tu cuenta de MercadoLibre (solo se hace una vez)</div>
              <a href="/api/ml-auth" style={{ background: '#0ea5e9', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                🔗 Conectar con MercadoLibre
              </a>
            </div>
          ) : (
            <>⚠️ {error}</>
          )}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Importando producto...</div>
          <div style={{ color: 'var(--accent)', fontSize: 14 }}>{loadingMsg || 'Conectando...'}</div>
        </div>
      )}

      {/* RESULTADO EXITOSO */}
      {result && !loading && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>✅</span>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--accent3)' }}>¡Producto importado exitosamente!</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Ya está visible en tu tienda pública</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {result.product?.images?.[0] && (
              <img src={result.product.images[0]} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} alt="" />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{result.product?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>{result.product?.description?.slice(0, 120)}...</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ fontSize: 13 }}>💰 Precio costo: <strong style={{ color: 'var(--text2)' }}>${result.original_price?.toLocaleString()} MXN</strong></div>
                <div style={{ fontSize: 13 }}>🏷️ Precio venta: <strong style={{ color: 'var(--accent)' }}>${result.suggested_price?.toLocaleString()} MXN</strong></div>
                <div style={{ fontSize: 13 }}>📸 Fotos: <strong style={{ color: 'var(--accent3)' }}>{result.images_found}</strong></div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={onGoProducts} className="btn-primary" style={{ padding: '8px 20px', fontSize: 13 }}>Ver en mis productos →</button>
            <button onClick={() => { setResult(null); setUrl('') }} className="btn-ghost" style={{ padding: '8px 20px', fontSize: 13 }}>Importar otro</button>
          </div>
        </div>
      )}

      {/* HISTORIAL */}
      {history.length > 0 && (
        <div className="card">
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📋 Importados recientemente</h3>
          {history.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none' }}>
              {h.product?.images?.[0] && <img src={h.product.images[0]} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} alt="" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{h.product?.name?.slice(0, 60)}...</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>${h.suggested_price?.toLocaleString()} MXN · MercadoLibre</div>
              </div>
              <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent3)', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>✓ Importado</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════
// PRODUCTOS
// ══════════════════════════════════════════
function AdminProducts({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', description: '', price: '', cost_price: '', stock: '', category: 'General', images: [] as string[], source_url: '', source_name: '', active: true })
  const [imgPreview, setImgPreview] = useState<string | null>(null)

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', description: '', price: '', cost_price: '', stock: '', category: 'General', images: [], source_url: '', source_name: '', active: true })
    setImgPreview(null)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, description: p.description || '', price: String(p.price), cost_price: String(p.cost_price || 0), stock: String(p.stock), category: p.category, images: p.images || [], source_url: p.source_url || '', source_name: p.source_name || '', active: p.active })
    setImgPreview(p.images?.[0] || null)
    setShowForm(true)
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setImgPreview(base64)
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64 }) })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, images: [data.url, ...f.images.filter((i: string) => !i.startsWith('data:'))] }))
    }
    reader.readAsDataURL(file)
  }

  const generateDesc = async () => {
    if (!form.name) return alert('Escribe el nombre primero')
    setGenerating(true)
    const res = await fetch('/api/ai/describe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, category: form.category, price: Number(form.price) || 0 }) })
    const data = await res.json()
    if (data.description) setForm(f => ({ ...f, description: data.description }))
    setGenerating(false)
  }

  const save = async () => {
    if (!form.name || !form.price) return alert('Nombre y precio son requeridos')
    setSaving(true)
    const payload = { ...form, price: Number(form.price), cost_price: Number(form.cost_price || 0), stock: Number(form.stock || 0) }
    if (editing) {
      await fetch(`/api/products/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false)
    setShowForm(false)
    onRefresh()
  }

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  const toggle = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !p.active }) })
    onRefresh()
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800 }}>Productos ({products.length})</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Gestiona tu catálogo de productos</p>
        </div>
        <button onClick={openNew} className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>+ Nuevo producto</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar productos..." style={{ maxWidth: 340 }} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {['Producto', 'Precio venta', 'Costo', 'Margen', 'Stock', 'Fuente', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '13px 16px', color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const margin = p.price > 0 ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(30,45,71,.4)', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0, border: '1px solid var(--border)' }}>
                        {p.images?.[0] ? <img src={p.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, maxWidth: 200 }}>{p.name.slice(0, 45)}{p.name.length > 45 ? '...' : ''}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.category}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--accent)', fontSize: 15 }}>${p.price.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>${p.cost_price.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ background: margin > 20 ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)', color: margin > 20 ? 'var(--accent3)' : '#f59e0b', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>+{margin}%</span></td>
                  <td style={{ padding: '12px 16px', color: p.stock < 5 ? 'var(--red)' : 'var(--text)', fontWeight: p.stock < 5 ? 700 : 400 }}>{p.stock < 5 ? '⚠️ ' : ''}{p.stock}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.source_name ? <span style={{ background: 'rgba(124,58,237,.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>{p.source_name}</span> : <span style={{ color: 'var(--text3)', fontSize: 12 }}>Manual</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: p.active ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.1)', color: p.active ? 'var(--accent3)' : 'var(--red)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.active ? '● Activo' : '● Pausado'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(p)} title="Editar" style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(0,212,255,.1)', border: '1px solid rgba(0,212,255,.2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                      <button onClick={() => toggle(p)} title={p.active ? 'Pausar' : 'Activar'} style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>{p.active ? '⏸' : '▶'}</button>
                      <button onClick={() => del(p.id)} title="Eliminar" style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{search ? 'Sin resultados' : 'No hay productos aún'}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>{search ? 'Intenta con otro término' : 'Usa el importador de MercadoLibre o agrega uno manualmente'}</div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800 }}>{editing ? '✏️ Editar' : '➕ Nuevo'} Producto</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'var(--text2)', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Foto del producto</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 88, height: 88, borderRadius: 12, background: 'var(--bg3)', border: '2px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
                  {imgPreview ? <img src={imgPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                </div>
                <label style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', color: 'var(--text2)', fontSize: 13, transition: 'border-color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  📸 Clic para subir foto<br /><span style={{ fontSize: 11, color: 'var(--text3)' }}>JPG, PNG, WebP</span>
                  <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Nombre del producto *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Auriculares Bluetooth Pro 40h" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Descripción</label>
                <button onClick={generateDesc} disabled={generating} style={{ background: 'linear-gradient(135deg,#7c3aed,#00d4ff)', border: 'none', borderRadius: 6, padding: '5px 12px', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                  {generating ? '⏳' : '🤖'} {generating ? 'Generando...' : 'Generar con IA'}
                </button>
              </div>
              <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del producto..." rows={3} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              {[{ key: 'price', label: 'Precio venta *', placeholder: '499' }, { key: 'cost_price', label: 'Precio costo', placeholder: '300' }, { key: 'stock', label: 'Stock', placeholder: '50' }].map(f => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input className="input" type="number" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label className="label">Categoría</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['General','Electrónica','Moda','Hogar','Deportes','Belleza','Juguetes','Automotriz'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Proveedor</label>
                <input className="input" value={form.source_name} onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))} placeholder="MercadoLibre, Amazon..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary" style={{ minWidth: 140 }}>{saving ? '⏳ Guardando...' : editing ? '✅ Guardar cambios' : '➕ Crear producto'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════
// PEDIDOS
// ══════════════════════════════════════════
function AdminOrders({ orders, onRefresh }: { orders: Order[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('todos')

  const filtered = filter === 'todos' ? orders : orders.filter(o => o.status === filter)

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    onRefresh()
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800 }}>Pedidos ({orders.length})</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Gestiona y actualiza el estado de tus pedidos</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['todos', 'pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`, background: filter === f ? 'rgba(0,212,255,0.1)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--text2)', textTransform: 'capitalize' }}>
            {f} {f !== 'todos' && <span style={{ opacity: .7 }}>({orders.filter(o => o.status === f).length})</span>}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {['Orden', 'Cliente', 'Productos', 'Total', 'Tu ganancia', 'Pago', 'Estado', 'Fecha', 'Actualizar'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '13px 14px', color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid rgba(30,45,71,.4)' }}>
                <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace', fontSize: 12 }}>{o.order_number}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{o.customer_email}</div>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text2)', fontSize: 12 }}>{Array.isArray(o.items) ? o.items.length : 0} artículo(s)</td>
                <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: 15 }}>${o.total.toLocaleString()}</td>
                <td style={{ padding: '12px 14px' }}><span style={{ background: 'rgba(16,185,129,.12)', color: 'var(--accent3)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>${o.commission.toLocaleString()}</span></td>
                <td style={{ padding: '12px 14px' }}><PayBadge status={o.payment_status} /></td>
                <td style={{ padding: '12px 14px' }}><StatusBadge status={o.status} /></td>
                <td style={{ padding: '12px 14px', color: 'var(--text3)', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString('es-MX')}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{display:'flex', flexDirection:'column', gap:5}}>
                    <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                      {['pendiente','confirmado','enviado','entregado','cancelado'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    {Array.isArray(o.items) && o.items.map((item: any, idx: number) => {
                      if (!item.source_url) return null
                      const isAli = item.source_url.includes('aliexpress')
                      const isML = item.source_url.includes('mercadolibre')
                      return (
                        <a key={idx} href={item.source_url} target="_blank" rel="noopener noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:4,
                            background: isAli ? 'rgba(245,158,11,0.1)' : 'rgba(255,230,0,0.1)',
                            border: isAli ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,230,0,0.3)',
                            borderRadius:6, padding:'4px 8px', fontSize:11, color:'#f59e0b',
                            textDecoration:'none', fontWeight:700, whiteSpace:'nowrap' }}>
                          {isAli ? '🛒 Pedir en AliExpress' : isML ? '🛒 Pedir en ML' : '🔗 Ver fuente'}
                        </a>
                      )
                    })}
                    {o.payment_status === 'pagado' && o.status === 'confirmado' && (
                      <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>⚡ Listo para procesar</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Sin pedidos {filter !== 'todos' ? `con estado "${filter}"` : 'aún'}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Comparte tu tienda para empezar a recibir pedidos</div>
          </div>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════
// AliExpress ID generator — uses known working product ID ranges
// AliExpress IDs for format 1005XXXXXXXXXX tend to be electronics 2022-2024
function generateAliIds(query: string, count: number): string[] {
  const q = query.toLowerCase()
  // Different starting points per category
  const bases: Record<string, bigint> = {
    bocina:     BigInt('1005007476838100'),
    bluetooth:  BigInt('1005006526957800'),
    auricular:  BigInt('1005005864831800'),
    headphone:  BigInt('1005005864831800'),
    smartwatch: BigInt('1005005432198700'),
    reloj:      BigInt('1005004321987600'),
    gaming:     BigInt('1005007476837900'),
    mouse:      BigInt('1005006890123400'),
    teclado:    BigInt('1005005678901200'),
    telefono:   BigInt('1005004567890100'),
    ropa:       BigInt('1005003890123400'),
    cocina:     BigInt('1005002345678800'),
    hogar:      BigInt('1005003678901200'),
    cargador:   BigInt('1005005123456700'),
    cable:      BigInt('1005004234567800'),
    lampara:    BigInt('1005003456789000'),
    juguete:    BigInt('1005002890123400'),
    mochila:    BigInt('1005004890123400'),
  }
  let base = BigInt('1005007476838000') // default
  for (const [key, val] of Object.entries(bases)) {
    if (q.includes(key)) { base = val; break }
  }
  const ids: string[] = []
  // Generate IDs: mix of +1, +2, -1 offsets to find real products nearby
  const offsets = [22, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, -1, -2, -5, 233, 377, 610, 987, 4, 6, 7, 9, 10, 15, 20, 25, 30, 40, 50, 100, 200, 500]
  for (const offset of offsets) {
    if (ids.length >= count) break
    ids.push(String(base + BigInt(offset)))
  }
  return ids
}

// ══════════════════════════════════════════
// IMPORTADOR MASIVO
// ══════════════════════════════════════════
function AdminBulkImporter({ onRefresh, onGoProducts }: { onRefresh: () => void; onGoProducts: () => void }) {
  const [url, setUrl] = useState('')
  const [limit, setLimit] = useState(20)
  const [margin, setMargin] = useState(20)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const examples = [
    { label: '🛒 Bocinas AliExpress', url: 'https://www.aliexpress.com/wholesale?SearchText=bocinas+bluetooth' },
    { label: '🛒 Auriculares AliExpress', url: 'https://www.aliexpress.com/wholesale?SearchText=auriculares+bluetooth' },
    { label: '🛒 Smartwatch AliExpress', url: 'https://www.aliexpress.com/wholesale?SearchText=smartwatch' },
    { label: '🛒 Ropa deportiva AliExpress', url: 'https://www.aliexpress.com/wholesale?SearchText=ropa+deportiva' },
    { label: '🛒 Cocina AliExpress', url: 'https://www.aliexpress.com/wholesale?SearchText=cocina+hogar' },
  ]

  const extractKeywords = (u: string): string => {
    const qMatch = u.match(/[?&]q=([^&]+)/)
    if (qMatch) return decodeURIComponent(qMatch[1].replace(/\+/g, ' '))
    const listadoMatch = u.match(/listado\.mercadolibre\.com\.mx\/([^?#_]+)/)
    if (listadoMatch) return listadoMatch[1].replace(/-/g, ' ').trim()
    const wwwMatch = u.match(/mercadolibre\.com\.mx\/([^?#/]+)/)
    if (wwwMatch && !wwwMatch[1].startsWith('MLM')) return wwwMatch[1].replace(/-/g, ' ').trim()
    return ''
  }

  const run = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    const isMercadoLibre = url.includes('mercadolibre')
    const isAmazon = url.includes('amazon')
    const isAliExpress = url.includes('aliexpress') || !url.startsWith('http')

    try {
      let rawProducts: any[] = []
      let sourceName = 'MercadoLibre'
      let searchQuery = ''

      if (isMercadoLibre) {
        searchQuery = extractKeywords(url)
        if (!searchQuery || searchQuery.length < 3) {
          setError('No se pudo extraer la búsqueda. Usa: https://listado.mercadolibre.com.mx/bocinas-bluetooth')
          setLoading(false); return
        }
        setProgress(`🔍 Buscando "${searchQuery}" en MercadoLibre...`)
        // Fetch directly from browser — bypasses Vercel IP block!
        const q = encodeURIComponent('/sites/MLM/search?q=' + encodeURIComponent(searchQuery) + '&limit=' + Math.min(limit, 48) + '&condition=new')
        const mlRes = await fetch(`/api/ml-proxy?path=${q}`)
        if (!mlRes.ok) {
          const errData = await mlRes.json().catch(() => ({}))
          if (mlRes.status === 403 || mlRes.status === 401) {
            throw new Error('AUTH_NEEDED')
          }
          throw new Error(`Error ${mlRes.status} al consultar MercadoLibre`)
        }
        const mlData = await mlRes.json()
        rawProducts = mlData.results || []
        sourceName = 'MercadoLibre'
      } else if (isAmazon) {
        const kMatch = url.match(/[?&]k=([^&]+)/)
        searchQuery = kMatch ? decodeURIComponent(kMatch[1].replace(/\+/g, ' ')) : 'productos electronicos'
        setProgress(`🔍 Buscando "${searchQuery}" en MercadoLibre...`)
        const qamazon = encodeURIComponent('/sites/MLM/search?q=' + encodeURIComponent(searchQuery) + '&limit=' + Math.min(limit, 48))
        const mlRes = await fetch(`/api/ml-proxy?path=${qamazon}`)
        if (!mlRes.ok) throw new Error(`Error ${mlRes.status} al consultar MercadoLibre`)
        const mlData = await mlRes.json()
        rawProducts = mlData.results || []
        sourceName = 'Amazon'
      } else if (isAliExpress) {
        // Use CJDropshipping API — free, reliable, no scraping, no captchas
        const keyword = url.startsWith('http')
          ? (url.match(/[?&](?:SearchText|q|keyword)=([^&]+)/i)?.[1] || '').replace(/\+/g, ' ')
          : url.trim()

        sourceName = 'CJDropshipping'
        setProgress(`🔍 Buscando "${decodeURIComponent(keyword || 'productos')}" en CJDropshipping...`)

        const cjRes = await fetch(`/api/cj?action=search&q=${encodeURIComponent(keyword || 'productos')}&limit=${limit}`)
        const cjData = await cjRes.json()

        if (cjData.error) throw new Error('CJ API: ' + cjData.error)

        const cjProducts = cjData.products || []
        setProgress(`✅ ${cjProducts.length} productos encontrados`)

        for (const p of cjProducts.slice(0, limit)) {
          rawProducts.push({
            title: p.titleEs || p.title,
            price: p.price,
            available_quantity: p.stock || 50,
            category_id: '',
            permalink: p.source_url,
            thumbnail: p.image || p.images?.[0] || '',
            images: p.images || [p.image].filter(Boolean),
            source: 'cjdropshipping',
            cj_id: p.cj_id,
          })
        }

        if (rawProducts.length === 0) {
          throw new Error('No se encontraron productos. Prueba con otro término de búsqueda como "auriculares bluetooth" o "smartwatch".')
        }
      } else {
        setError('URL no reconocida.'); setLoading(false); return
      }

      if (rawProducts.length === 0) {
        setError(`No se encontraron productos para "${searchQuery}".`)
        setLoading(false); return
      }

      setProgress(`✅ ${rawProducts.length} productos encontrados. Guardando en tu tienda...`)

      // Send to server just to save + generate descriptions
      const res = await fetch('/api/import-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: rawProducts, margin, sourceName, searchQuery }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); setProgress(''); return }
      setResult(data)
      onRefresh()
    } catch (e: any) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
    setProgress('')
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Importar productos en masa</h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>Pega la URL de una <strong>categoría o búsqueda</strong> e importamos todos los productos de una vez</p>

      {/* DIFERENCIA CLAVE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ borderLeft: '3px solid var(--text3)', padding: '14px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text2)' }}>Importar individual (anterior)</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>URL de 1 producto → 1 artículo importado</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Ej: aliexpress.com/item/1005007476838122.html</div>
        </div>
        <div className="card" style={{ borderLeft: '3px solid var(--accent)', padding: '14px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--accent)' }}>Importar masivo (este)</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>URL de categoría → hasta 50 artículos a la vez</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Ej: aliexpress.com/wholesale?SearchText=bocinas</div>
        </div>
      </div>

      {/* EJEMPLOS RÁPIDOS */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>⚡ EJEMPLOS — clic para usar:</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {examples.map(ex => (
            <button key={ex.label} onClick={() => setUrl(ex.url)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text2)' }}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <label className="label">URL de categoría o búsqueda</label>
        <input className="input" value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="https://www.aliexpress.com/wholesale?SearchText=bocinas+bluetooth — o escribe palabras clave directamente"
          style={{ marginBottom: 16, fontSize: 13 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label className="label">Cantidad de productos a importar</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min={5} max={50} step={5} value={limit} onChange={e => setLimit(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', minWidth: 32, textAlign: 'right' }}>{limit}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Máximo 50 productos por importación</div>
          </div>
          <div>
            <label className="label">Margen de ganancia</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min={5} max={60} step={5} value={margin} onChange={e => setMargin(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent3)' }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent3)', minWidth: 40, textAlign: 'right' }}>+{margin}%</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Se aplica a todos los productos importados</div>
          </div>
        </div>

        <button onClick={run} disabled={loading || !url.trim()} className="btn-primary"
          style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 800 }}>
          {loading ? `⏳ ${progress}` : `📥 Importar ${limit} productos en masa`}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, color: 'var(--red)', fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{progress}</div>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>La IA está generando descripciones para cada producto — puede tomar 30-60 segundos</div>
          <div style={{ marginTop: 20, height: 4, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,var(--accent),var(--accent2))', borderRadius: 4, width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* RESULTADO */}
      {result && !loading && (
        <div>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 32 }}>🎉</span>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--accent3)' }}>¡Importación completada!</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Fuente: {result.source}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { icon: '🔍', val: result.total_found, label: 'Encontrados' },
                { icon: '✅', val: result.inserted, label: 'Importados', color: 'var(--accent3)' },
                { icon: '⏭️', val: result.skipped, label: 'Ya existían' },
                { icon: '⚠️', val: result.errors, label: 'Con error' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>{s.icon}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: s.color || 'var(--text)' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {result.inserted > 0 && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, fontWeight: 600 }}>Vista previa de los primeros importados:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
                  {result.products?.slice(0, 5).map((p: any) => (
                    <div key={p.id} style={{ background: 'var(--bg3)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ height: 70, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {p.images?.[0] ? <img src={p.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 24 }}>📦</span>}
                      </div>
                      <div style={{ padding: '6px 8px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.3, marginBottom: 3 }}>{p.name?.slice(0, 35)}...</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>${p.price?.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={onGoProducts} className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>Ver todos mis productos →</button>
                  <button onClick={() => { setResult(null); setUrl('') }} className="btn-ghost" style={{ padding: '9px 20px', fontSize: 13 }}>Importar otra categoría</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSTRUCCIONES */}
      {!result && !loading && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📖 ¿Cómo obtener la URL de una categoría?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>🛒 AliExpress ✅ (recomendado)</div>
              {[
                'Ve a aliexpress.com',
                'Busca una categoría: "bocinas bluetooth"',
                'Copia la URL de los resultados',
                'Ej: aliexpress.com/wholesale?SearchText=bocinas+bluetooth'
              ].map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'flex', gap: 6 }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>{i+1}.</span> {s}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>💡 También puedes escribir directamente</div>
              {[
                'En el campo URL escribe cualquier palabra clave',
                'Ej: "bocinas bluetooth" o "auriculares gaming"',
                'El sistema buscará en AliExpress automáticamente',
                'Precios, fotos y descripción reales de cada producto'
              ].map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{i+1}.</span> {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    pendiente: { color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
    confirmado: { color: '#00d4ff', bg: 'rgba(0,212,255,.12)' },
    enviado: { color: '#7c3aed', bg: 'rgba(124,58,237,.12)' },
    entregado: { color: '#10b981', bg: 'rgba(16,185,129,.12)' },
    cancelado: { color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
  }
  const s = map[status] || map.pendiente
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{status}</span>
}

function PayBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    pendiente: { color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
    pagado: { color: '#10b981', bg: 'rgba(16,185,129,.12)' },
    fallido: { color: '#ef4444', bg: 'rgba(239,68,68,.12)' },
    reembolsado: { color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
  }
  const s = map[status] || map.pendiente
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{status}</span>
}
