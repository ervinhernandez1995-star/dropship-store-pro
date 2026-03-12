'use client'
import { useState, useEffect } from 'react'
import type { Product, Order } from '@/lib/supabase'

type Tab = 'dashboard' | 'productos' | 'pedidos'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [pr, or] = await Promise.all([
      fetch('/api/products?admin=true').then(r => r.json()),
      fetch('/api/orders').then(r => r.json()),
    ])
    setProducts(pr || [])
    setOrders(or || [])
    setLoading(false)
  }

  const totalRevenue = orders.filter(o => o.payment_status === 'pagado').reduce((s, o) => s + o.total, 0)
  const totalCommission = orders.filter(o => o.payment_status === 'pagado').reduce((s, o) => s + o.commission, 0)
  const pendingOrders = orders.filter(o => o.status === 'pendiente').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DropShip Pro</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Panel de Administración</div>
        </div>
        <nav style={{ padding: '16px 8px', flex: 1 }}>
          {([
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'productos', icon: '📦', label: 'Productos' },
            { id: 'pedidos', icon: '🛒', label: 'Pedidos', badge: pendingOrders },
          ] as { id: Tab; icon: string; label: string; badge?: number }[]).map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', background: tab === item.id ? 'rgba(0,212,255,0.1)' : 'transparent', color: tab === item.id ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 4, fontFamily: 'inherit', textAlign: 'left', transition: 'all .2s' }}>
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge ? <span style={{ background: 'var(--red)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <a href="/tienda" target="_blank" style={{ display: 'block', textAlign: 'center', padding: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: 'var(--accent3)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>🌐 Ver tienda →</a>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: 220, flex: 1, padding: 28 }}>
        {tab === 'dashboard' && <AdminDashboard products={products} orders={orders} totalRevenue={totalRevenue} totalCommission={totalCommission} />}
        {tab === 'productos' && <AdminProducts products={products} onRefresh={loadAll} />}
        {tab === 'pedidos' && <AdminOrders orders={orders} onRefresh={loadAll} />}
      </main>
    </div>
  )
}

// ── DASHBOARD ──────────────────────────────────────────────
function AdminDashboard({ products, orders, totalRevenue, totalCommission }: { products: Product[]; orders: Order[]; totalRevenue: number; totalCommission: number }) {
  const stats = [
    { icon: '💰', value: `$${totalRevenue.toLocaleString('es-MX')}`, label: 'Ingresos totales', color: '#00d4ff' },
    { icon: '🎯', value: `$${totalCommission.toLocaleString('es-MX')}`, label: 'Tu ganancia', color: '#10b981' },
    { icon: '📦', value: String(products.length), label: 'Productos activos', color: '#7c3aed' },
    { icon: '🛒', value: String(orders.length), label: 'Pedidos totales', color: '#f59e0b' },
  ]
  return (
    <div>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Dashboard</h1>
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
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Últimos pedidos</h3>
          {orders.slice(0, 5).map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(30,45,71,.5)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{o.order_number}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>{o.customer_name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent)' }}>${o.total.toLocaleString()}</div>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}
          {orders.length === 0 && <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>Sin pedidos aún</div>}
        </div>
        <div className="card">
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Productos más vendidos</h3>
          {[...products].sort((a, b) => b.sold - a.sold).slice(0, 5).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(30,45,71,.5)' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: i < 3 ? 'linear-gradient(135deg,#f59e0b,#f97316)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: i < 3 ? '#000' : 'var(--text2)', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'var(--accent3)', fontWeight: 700 }}>{p.sold} vendidos</div>
            </div>
          ))}
          {products.length === 0 && <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>Sin productos aún</div>}
        </div>
      </div>
    </div>
  )
}

// ── PRODUCTOS ─────────────────────────────────────────────────
function AdminProducts({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', cost_price: '', stock: '', category: 'General', images: [] as string[], source_url: '', source_name: '', active: true })
  const [imgPreview, setImgPreview] = useState<string | null>(null)

  const openNew = () => { setEditing(null); setForm({ name: '', description: '', price: '', cost_price: '', stock: '', category: 'General', images: [], source_url: '', source_name: '', active: true }); setImgPreview(null); setShowForm(true) }
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, description: p.description || '', price: String(p.price), cost_price: String(p.cost_price || 0), stock: String(p.stock), category: p.category, images: p.images || [], source_url: p.source_url || '', source_name: p.source_name || '', active: p.active }); setImgPreview(p.images?.[0] || null); setShowForm(true) }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setImgPreview(base64)
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64 }) })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, images: [data.url, ...f.images.filter(i => !i.startsWith('data:'))] }))
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800 }}>Productos ({products.length})</h1>
        <button onClick={openNew} className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>+ Nuevo producto</button>
      </div>

      {/* TABLA */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Producto', 'Precio', 'Costo', 'Margen', 'Stock', 'Vendidos', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const margin = p.price > 0 ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(30,45,71,.4)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
                          {p.images?.[0] ? <img src={p.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text2)' }}>{p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent)' }}>${p.price.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>${p.cost_price.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ background: 'rgba(16,185,129,.1)', color: 'var(--accent3)', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>+{margin}%</span></td>
                    <td style={{ padding: '12px 16px', color: p.stock < 10 ? 'var(--red)' : 'var(--text)' }}>{p.stock}</td>
                    <td style={{ padding: '12px 16px' }}>{p.sold}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: p.active ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)', color: p.active ? 'var(--accent3)' : 'var(--red)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.active ? '● Activo' : '● Pausado'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(p)} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>✏️</button>
                        <button onClick={() => toggle(p)} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>{p.active ? '⏸' : '▶'}</button>
                        <button onClick={() => del(p.id)} style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, color: 'var(--red)', cursor: 'pointer' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {products.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>No hay productos. ¡Agrega el primero!</div>}
        </div>
      </div>

      {/* MODAL PRODUCTO */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{editing ? 'Editar' : 'Nuevo'} Producto</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--text2)' }}>✕</button>
            </div>

            {/* IMAGEN */}
            <div style={{ marginBottom: 16 }}>
              <label className="label">Foto del producto</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                  {imgPreview ? <img src={imgPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                </div>
                <label style={{ flex: 1, border: '2px dashed var(--border)', borderRadius: 10, padding: '16px', textAlign: 'center', cursor: 'pointer', color: 'var(--text2)', fontSize: 13 }}>
                  📸 Clic para subir foto
                  <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Nombre del producto *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Auriculares Bluetooth Pro" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Descripción</label>
                <button onClick={generateDesc} disabled={generating} style={{ background: 'linear-gradient(135deg,#7c3aed,#00d4ff)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                  {generating ? '⏳ Generando...' : '🤖 Generar con IA'}
                </button>
              </div>
              <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del producto..." rows={3} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              {[
                { key: 'price', label: 'Precio venta *', placeholder: '499' },
                { key: 'cost_price', label: 'Precio costo', placeholder: '200' },
                { key: 'stock', label: 'Stock', placeholder: '50' },
              ].map(f => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input className="input" type="number" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="label">Categoría</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['General','Electrónica','Moda','Hogar','Deportes','Belleza','Juguetes','Automotriz'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Proveedor/Fuente</label>
                <input className="input" value={form.source_name} onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))} placeholder="AliExpress, Amazon..." />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">URL del producto original (opcional)</label>
              <input className="input" value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} placeholder="https://aliexpress.com/item/..." />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PEDIDOS ────────────────────────────────────────────────────
function AdminOrders({ orders, onRefresh }: { orders: Order[]; onRefresh: () => void }) {
  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    onRefresh()
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Pedidos ({orders.length})</h1>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Orden', 'Cliente', 'Total', 'Comisión', 'Pago', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid rgba(30,45,71,.4)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>{o.order_number}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{o.customer_email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>${o.total.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ background: 'rgba(16,185,129,.1)', color: 'var(--accent3)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>${o.commission.toLocaleString()}</span></td>
                  <td style={{ padding: '12px 16px' }}><PayBadge status={o.payment_status} /></td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString('es-MX')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                      {['pendiente','confirmado','enviado','entregado','cancelado'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Sin pedidos aún. ¡Comparte tu tienda!</div>}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    pendiente: { color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
    confirmado: { color: '#00d4ff', bg: 'rgba(0,212,255,.1)' },
    enviado: { color: '#7c3aed', bg: 'rgba(124,58,237,.1)' },
    entregado: { color: '#10b981', bg: 'rgba(16,185,129,.1)' },
    cancelado: { color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
  }
  const s = map[status] || map.pendiente
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status}</span>
}

function PayBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    pendiente: { color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
    pagado: { color: '#10b981', bg: 'rgba(16,185,129,.1)' },
    fallido: { color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
    reembolsado: { color: '#94a3b8', bg: 'rgba(148,163,184,.1)' },
  }
  const s = map[status] || map.pendiente
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status}</span>
}
