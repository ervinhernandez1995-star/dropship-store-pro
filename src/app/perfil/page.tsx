'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([])
  const [tab, setTab] = useState<'perfil'|'pedidos'|'wishlist'>('perfil')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/customer-auth').then(r => r.json()).then(async d => {
      if (!d.user) { router.push('/tienda'); return }
      setUser(d.user)
      setProfile(d.profile)
      setName(d.profile?.name || '')
      setPhone(d.profile?.phone || '')
      setLoading(false)

      // Load wishlist product details
      const wRes = await fetch('/api/wishlist')
      const ids: string[] = await wRes.json()
      if (ids.length > 0) {
        // Fetch all products and filter
        const pRes = await fetch('/api/products?active=true&limit=200')
        const allProducts = await pRes.json()
        const wished = Array.isArray(allProducts)
          ? allProducts.filter((p: any) => ids.includes(p.id))
          : []
        setWishlistProducts(wished)
      }

      // Load orders
      const oRes = await fetch('/api/orders?email=' + encodeURIComponent(d.user.email))
      const oData = await oRes.json()
      setOrders(Array.isArray(oData) ? oData : [])
    })
  }, [])

  const logout = async () => {
    await fetch('/api/customer-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    router.push('/tienda')
  }

  const saveProfile = async () => {
    setSaving(true)
    await fetch('/api/customer-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) })
    setSaving(false)
    alert('✅ Perfil actualizado')
  }

  const removeFromWishlist = async (productId: string) => {
    await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, action: 'remove' }) })
    setWishlistProducts(w => w.filter(p => p.id !== productId))
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', color:'#0ea5e9', fontFamily:'DM Sans, sans-serif' }}>
      <div>Cargando perfil...</div>
    </div>
  )

  const TABS = [
    { id:'perfil', label:'👤 Mi perfil' },
    { id:'pedidos', label:`🛒 Mis pedidos (${orders.length})` },
    { id:'wishlist', label:`❤️ Favoritos (${wishlistProducts.length})` }
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#111827', borderBottom:'1px solid #1e2d47', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <a href="/tienda" style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, textDecoration:'none', display:'flex', gap:2 }}>
          <span style={{color:'#0ea5e9'}}>Todo</span><span style={{color:'#fff'}}>Click</span><span style={{color:'#f59e0b'}}>MX</span>
        </a>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:13, color:'#94a3b8' }}>{user?.email}</span>
          <button onClick={logout} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:600 }}>Cerrar sesión</button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
        {/* Avatar */}
        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800 }}>
            {(name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:22, fontWeight:700 }}>{name || 'Mi cuenta'}</div>
            <div style={{ color:'#64748b', fontSize:13 }}>{user?.email}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:28, borderBottom:'1px solid #1e2d47' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ padding:'10px 20px', background:'none', border:'none', borderBottom:`2px solid ${tab === t.id ? '#0ea5e9' : 'transparent'}`, color: tab === t.id ? '#0ea5e9' : '#64748b', fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit', marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* PERFIL */}
        {tab === 'perfil' && (
          <div style={{ background:'#111827', border:'1px solid #1e2d47', borderRadius:16, padding:28 }}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:24 }}>Información personal</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
              <div>
                <label style={{ fontSize:12, color:'#94a3b8', fontWeight:600, display:'block', marginBottom:6 }}>NOMBRE COMPLETO</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" style={{ width:'100%', padding:'11px 14px', background:'#0a0a0f', border:'1px solid #1e2d47', borderRadius:9, color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:12, color:'#94a3b8', fontWeight:600, display:'block', marginBottom:6 }}>TELÉFONO</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55 1234 5678" style={{ width:'100%', padding:'11px 14px', background:'#0a0a0f', border:'1px solid #1e2d47', borderRadius:9, color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:'#94a3b8', fontWeight:600, display:'block', marginBottom:6 }}>CORREO ELECTRÓNICO</label>
              <input value={user?.email} disabled style={{ width:'100%', padding:'11px 14px', background:'#0a0a0f', border:'1px solid #1e2d47', borderRadius:9, color:'#64748b', fontSize:14, outline:'none', boxSizing:'border-box' }} />
            </div>
            <button onClick={saveProfile} disabled={saving} style={{ background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', border:'none', borderRadius:9, padding:'11px 24px', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              {saving ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        )}

        {/* PEDIDOS */}
        {tab === 'pedidos' && (
          <div>
            {orders.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Aún no tienes pedidos</div>
                <a href="/tienda" style={{ display:'inline-block', padding:'10px 24px', background:'#0ea5e9', color:'#fff', borderRadius:9, textDecoration:'none', fontWeight:700 }}>Explorar tienda</a>
              </div>
            ) : orders.map((o: any) => (
              <div key={o.id} style={{ background:'#111827', border:'1px solid #1e2d47', borderRadius:12, padding:20, marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div>
                    <span style={{ fontFamily:'monospace', color:'#0ea5e9', fontWeight:700 }}>{o.order_number}</span>
                    <span style={{ color:'#64748b', fontSize:12, marginLeft:12 }}>{new Date(o.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ background:'rgba(245,158,11,.15)', color:'#f59e0b', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>{o.status}</span>
                    <span style={{ fontWeight:800, fontSize:16 }}>${o.total?.toLocaleString()} MXN</span>
                  </div>
                </div>
                <div style={{ fontSize:13, color:'#94a3b8' }}>{Array.isArray(o.items) ? o.items.length + ' producto(s)' : ''}</div>
              </div>
            ))}
          </div>
        )}

        {/* WISHLIST */}
        {tab === 'wishlist' && (
          <div>
            {wishlistProducts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#64748b' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>❤️</div>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Tu lista de favoritos está vacía</div>
                <a href="/tienda" style={{ display:'inline-block', padding:'10px 24px', background:'#0ea5e9', color:'#fff', borderRadius:9, textDecoration:'none', fontWeight:700 }}>Explorar tienda</a>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
                {wishlistProducts.map((p: any) => (
                  <div key={p.id} style={{ background:'#111827', border:'1px solid #1e2d47', borderRadius:12, overflow:'hidden' }}>
                    <a href={'/producto/' + p.id} style={{ display:'block', height:160, background:'#0a0a0f', overflow:'hidden' }}>
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:40 }}>📦</div>}
                    </a>
                    <div style={{ padding:12 }}>
                      <a href={'/producto/' + p.id} style={{ textDecoration:'none' }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:6, lineHeight:1.3, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.name}</div>
                      </a>
                      <div style={{ fontSize:16, fontWeight:800, color:'#0ea5e9', marginBottom:10 }}>${p.price?.toLocaleString()} MXN</div>
                      <div style={{ display:'flex', gap:6 }}>
                        <a href={'/producto/' + p.id} style={{ flex:1, padding:'7px', background:'linear-gradient(135deg,#0ea5e9,#7c3aed)', color:'#fff', textAlign:'center', borderRadius:7, textDecoration:'none', fontSize:12, fontWeight:700 }}>Ver</a>
                        <button onClick={() => removeFromWishlist(p.id)} style={{ padding:'7px 10px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:7, cursor:'pointer', fontSize:12 }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
    </div>
  )
}
