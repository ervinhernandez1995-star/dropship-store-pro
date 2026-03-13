import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

async function sendFulfillmentEmail(order: any) {
  const items = order.items || []
  const addr = order.shipping_address || {}

  // Build AliExpress links for each item
  const itemsHtml = items.map((item: any) => {
    const aliUrl = item.source_url?.includes('aliexpress') ? item.source_url : null
    return `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:12px;font-size:14px"><strong>${item.name}</strong></td>
      <td style="padding:12px;text-align:center">${item.quantity}</td>
      <td style="padding:12px;text-align:right">$${item.price?.toFixed(2)} MXN</td>
      <td style="padding:12px;text-align:center">
        ${aliUrl ? `<a href="${aliUrl}" style="background:#e74c3c;color:white;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:12px">Pedir en AliExpress →</a>` : '<span style="color:#999;font-size:12px">URL no disponible</span>'}
      </td>
    </tr>`
  }).join('')

  const addressText = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''}, CP ${addr.zip || ''}`
  
  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#333">
  <div style="background:linear-gradient(135deg,#0ea5e9,#7c3aed);padding:24px;border-radius:12px;margin-bottom:24px">
    <h1 style="color:white;margin:0;font-size:22px">🛒 Nuevo pedido — Fulfillment requerido</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">TodoClick MX · Pedido ${order.order_number}</p>
  </div>

  <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px">
    <h2 style="margin:0 0 12px;font-size:16px">📦 Enviar a:</h2>
    <p style="margin:4px 0;font-size:15px"><strong>${order.customer_name}</strong></p>
    <p style="margin:4px 0;font-size:14px;color:#555">${addressText}</p>
    <p style="margin:4px 0;font-size:14px;color:#555">📧 ${order.customer_email}</p>
    ${order.customer_phone ? `<p style="margin:4px 0;font-size:14px;color:#555">📱 ${order.customer_phone}</p>` : ''}
  </div>

  <h2 style="font-size:16px;margin-bottom:12px">🛍 Productos a ordenar en AliExpress:</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">
    <thead>
      <tr style="background:#f1f1f1">
        <th style="padding:10px;text-align:left;font-size:13px">Producto</th>
        <th style="padding:10px;text-align:center;font-size:13px">Cant.</th>
        <th style="padding:10px;text-align:right;font-size:13px">Precio venta</th>
        <th style="padding:10px;text-align:center;font-size:13px">Acción</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div style="display:flex;gap:16px;margin-top:20px">
    <div style="flex:1;background:#e8f5e9;border-radius:8px;padding:16px;text-align:center">
      <div style="font-size:12px;color:#555;margin-bottom:4px">Total cobrado</div>
      <div style="font-size:20px;font-weight:bold;color:#2e7d32">$${order.total?.toFixed(2)} MXN</div>
    </div>
    <div style="flex:1;background:#fff8e1;border-radius:8px;padding:16px;text-align:center">
      <div style="font-size:12px;color:#555;margin-bottom:4px">Tu ganancia estimada</div>
      <div style="font-size:20px;font-weight:bold;color:#f57f17">$${order.commission?.toFixed(2)} MXN</div>
    </div>
  </div>

  <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-top:20px">
    <strong>⚡ Pasos para procesar:</strong>
    <ol style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.8">
      <li>Haz clic en cada botón "Pedir en AliExpress →" de arriba</li>
      <li>En AliExpress ingresa la dirección del cliente como dirección de envío</li>
      <li>Completa el pago en AliExpress</li>
      <li>Una vez enviado, actualiza el estado en tu <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">Panel Admin</a></li>
    </ol>
  </div>

  <p style="text-align:center;font-size:12px;color:#999;margin-top:24px">TodoClick MX · ${new Date().toLocaleString('es-MX')}</p>
</body>
</html>`

  // Send via a simple fetch to an email service
  // Using Resend API (free tier: 3000 emails/month)
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.log('RESEND_API_KEY not set — email not sent')
    console.log('Order data:', JSON.stringify(order, null, 2))
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TodoClick MX <pedidos@todoclickmx.com>',
      to: [process.env.ADMIN_EMAIL || order.customer_email],
      subject: `🛒 Nuevo pedido ${order.order_number} — Procesar en AliExpress`,
      html: emailHtml,
    }),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook Error: ${e.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id

    if (orderId) {
      await supabaseAdmin.from('orders').update({
        payment_status: 'pagado',
        status: 'confirmado',
        payment_intent_id: session.payment_intent as string,
      }).eq('id', orderId)

      // Update stock
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*, items')
        .eq('id', orderId)
        .single()

      if (order?.items) {
        for (const item of order.items) {
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('stock, sold, source_url')
            .eq('id', item.product_id)
            .single()
          if (product) {
            // Enrich item with source_url for email
            item.source_url = product.source_url
            await supabaseAdmin.from('products').update({
              stock: Math.max(0, product.stock - item.quantity),
              sold: product.sold + item.quantity,
            }).eq('id', item.product_id)
          }
        }

        // Send fulfillment email
        try {
          await sendFulfillmentEmail(order)
        } catch (e) {
          console.error('Email error:', e)
        }
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent
    await supabaseAdmin.from('orders').update({ payment_status: 'fallido' }).eq('payment_intent_id', intent.id)
  }

  return NextResponse.json({ received: true })
}
