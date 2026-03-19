import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

async function autofulfillWithCJ(order: any) {
  const cjApiKey = process.env.CJ_API_KEY
  if (!cjApiKey) return null

  try {
    // Get CJ token
    const tokenRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: cjApiKey }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.result) return null
    const token = tokenData.data.accessToken

    const addr = order.shipping_address || {}
    const items = order.items || []

    // Only fulfill items that have a cj_id
    const cjItems = items.filter((i: any) => i.cj_id || i.cj_variant_id)
    if (cjItems.length === 0) return null

    const orderRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': token },
      body: JSON.stringify({
        orderNumber: order.order_number,
        shippingZip: addr.zip || '06600',
        shippingCountryCode: 'MX',
        shippingCountry: 'Mexico',
        shippingProvince: addr.state || '',
        shippingCity: addr.city || '',
        shippingAddress: addr.street || addr.address || '',
        shippingCustomerName: order.customer_name,
        shippingPhone: order.customer_phone || '',
        products: cjItems.map((i: any) => ({
          vid: i.cj_variant_id || i.cj_id,
          quantity: i.quantity || 1,
        }))
      })
    })
    const orderData = await orderRes.json()
    return orderData.result ? orderData.data : null
  } catch { return null }
}

async function sendFulfillmentEmail(order: any, cjResult: any) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const addr = order.shipping_address || {}
  const items = order.items || []
  const addressText = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''}, CP ${addr.zip || ''}`

  const itemsHtml = items.map((item: any) => {
    const hasCJ = item.cj_id || item.cj_variant_id
    const sourceUrl = item.source_url || item.cj_id
    return `<tr style="border-bottom:1px solid #eee">
      <td style="padding:10px;font-size:13px"><strong>${item.name}</strong></td>
      <td style="padding:10px;text-align:center">${item.quantity}</td>
      <td style="padding:10px;text-align:right">$${item.price?.toFixed(2)}</td>
      <td style="padding:10px;text-align:center">
        ${hasCJ && cjResult
          ? `<span style="background:#10b981;color:white;padding:4px 10px;border-radius:20px;font-size:11px">✅ Auto-pedido CJ</span>`
          : sourceUrl
            ? `<a href="${sourceUrl}" style="background:#0ea5e9;color:white;padding:4px 10px;border-radius:6px;text-decoration:none;font-size:11px">Pedir manualmente →</a>`
            : '<span style="color:#999;font-size:11px">Sin URL</span>'
        }
      </td>
    </tr>`
  }).join('')

  const emailHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px;color:#333">
  <div style="background:linear-gradient(135deg,#0ea5e9,#7c3aed);padding:20px;border-radius:12px;margin-bottom:20px">
    <h1 style="color:white;margin:0;font-size:20px">🛒 Nuevo Pedido — TodoClick MX</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px">Pedido #${order.order_number} · $${order.total?.toFixed(2)} MXN</p>
  </div>
  ${cjResult ? `<div style="background:#d1fae5;border:1px solid #10b981;border-radius:8px;padding:14px;margin-bottom:16px">
    <strong style="color:#059669">✅ Fulfillment automático enviado a CJDropshipping</strong>
    <p style="margin:4px 0;font-size:13px;color:#065f46">CJ Order ID: ${cjResult.orderId || 'procesando...'}</p>
  </div>` : ''}
  <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:16px">
    <strong>📦 Enviar a:</strong><br>
    <span style="font-size:14px">${order.customer_name} · ${order.customer_email}</span><br>
    <span style="font-size:13px;color:#555">${addressText}</span>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #eee;border-radius:8px;overflow:hidden">
    <thead><tr style="background:#f1f1f1">
      <th style="padding:8px;text-align:left">Producto</th>
      <th style="padding:8px;text-align:center">Cant</th>
      <th style="padding:8px;text-align:right">Precio</th>
      <th style="padding:8px;text-align:center">Fulfillment</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div style="margin-top:16px;padding:14px;background:#fff3cd;border-radius:8px;font-size:13px">
    <strong>💰 Resumen:</strong> Total cobrado: <strong>$${order.total?.toFixed(2)} MXN</strong>
  </div>
  <p style="margin-top:20px;font-size:12px;color:#999;text-align:center">TodoClick MX · Panel Admin: todoclickmx.vercel.app/admin</p>
</body></html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'TodoClick MX <noreply@todoclickmx.vercel.app>',
      to: [process.env.ADMIN_EMAIL || 'ocvillepeter@gmail.com'],
      subject: `🛒 Pedido #${order.order_number} — $${order.total?.toFixed(2)} MXN`,
      html: emailHtml,
    })
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(body, sig, webhookSecret)
      : JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    try {
      const orderNumber = metadata.order_number || `TC-${Date.now()}`
      const items = JSON.parse(metadata.items || '[]')

      const order = {
        order_number: orderNumber,
        customer_name: session.customer_details?.name || metadata.customer_name || 'Cliente',
        customer_email: session.customer_details?.email || '',
        customer_phone: session.customer_details?.phone || '',
        shipping_address: JSON.parse(metadata.shipping_address || '{}'),
        items,
        subtotal: (session.amount_subtotal || 0) / 100,
        total: (session.amount_total || 0) / 100,
        status: 'pagado',
        payment_status: 'pagado',
        stripe_session_id: session.id,
        payment_intent_id: session.payment_intent as string || '',
        fulfillment_status: 'pending',
      }

      const { data: savedOrder } = await supabaseAdmin
        .from('orders').insert(order).select().single()

      // Attempt auto-fulfillment via CJ
      const cjResult = await autofulfillWithCJ(order)

      if (cjResult && savedOrder) {
        await supabaseAdmin.from('orders').update({
          cj_order_id: cjResult.orderId || '',
          fulfillment_status: 'submitted',
        }).eq('id', savedOrder.id)
      }

      // Update product sold count
      for (const item of items) {
        if (item.product_id) {
          try { await supabaseAdmin.rpc('increment_sold', { product_id: item.product_id, qty: item.quantity || 1 }) } catch {}
        }
      }

      await sendFulfillmentEmail(order, cjResult)

    } catch (e: any) {
      console.error('Webhook error:', e.message)
    }
  }

  return NextResponse.json({ received: true })
}
