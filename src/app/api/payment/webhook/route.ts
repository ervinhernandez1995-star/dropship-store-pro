import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

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
      // Actualizar orden como pagada
      await supabaseAdmin.from('orders').update({
        payment_status: 'pagado',
        status: 'confirmado',
        payment_intent_id: session.payment_intent as string,
      }).eq('id', orderId)

      // Actualizar stock de productos
      const { data: order } = await supabaseAdmin.from('orders').select('items').eq('id', orderId).single()
      if (order?.items) {
        for (const item of order.items) {
          const { data: product } = await supabaseAdmin.from('products').select('stock, sold').eq('id', item.product_id).single()
          if (product) {
            await supabaseAdmin.from('products').update({
              stock: Math.max(0, product.stock - item.quantity),
              sold: product.sold + item.quantity,
            }).eq('id', item.product_id)
          }
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
