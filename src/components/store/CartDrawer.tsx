'use client'
import { useEffect } from 'react'
import type { Product } from '@/lib/supabase'

type CartItem = { product: Product; quantity: number }

export default function CartDrawer({ cart, setCart, open, onClose }: {
  cart: CartItem[]; setCart: (c: CartItem[]) => void; open: boolean; onClose: () => void
}) {
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const shipping = subtotal >= 599 ? 0 : subtotal > 0 ? 99 : 0
  const total = subtotal + shipping

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
  }
  const remove = (id: string) => setCart(cart.filter(i => i.product.id !== id))

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 400, maxWidth: '90vw', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800 }}>🛒 Carrito ({cart.length})</h2>
          <button onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'var(--text2)', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <div style={{ fontSize: 16 }}>Tu carrito está vacío</div>
              <button onClick={onClose} style={{ marginTop: 16, padding: '10px 24px', background: 'linear-gradient(135deg,#00d4ff,#0099cc)', color: '#000', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Ver productos</button>
            </div>
          ) : cart.map(item => (
            <div key={item.product.id} style={{ display: 'flex', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0 }}>
                {item.product.images?.[0] ? <img src={item.product.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📦</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.product.name}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>${item.product.price.toLocaleString()} MXN</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updateQty(item.product.id, -1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}>−</button>
                  <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}>+</button>
                  <button onClick={() => remove(item.product.id)} style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, width: 28, height: 28, color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text2)', marginBottom: 8 }}><span>Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text2)', marginBottom: 12 }}><span>Envío</span><span style={{ color: shipping === 0 ? 'var(--accent3)' : 'var(--text)' }}>{shipping === 0 ? 'GRATIS' : `$${shipping}`}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800, marginBottom: 16 }}><span>Total</span><span style={{ color: 'var(--accent)' }}>${total.toLocaleString()} MXN</span></div>
            <a href="/checkout" style={{ display: 'block', textAlign: 'center', padding: '14px', background: 'linear-gradient(135deg,#00d4ff,#0099cc)', color: '#000', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 16 }}>
              🔒 Finalizar compra
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
