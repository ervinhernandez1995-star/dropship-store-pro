import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  try {
    const { items, customer, shipping_address } = await req.json()

    // Calcular totales
    const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
    const shippingCost = subtotal >= 599 ? 0 : 99
    const total = subtotal + shippingCost
    const commissionPct = 10
    const commission = total * (commissionPct / 100)

    // Generar número de orden
    const orderNumber = `ORD-${Date.now()}`

    // Crear orden en Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        order_number: orderNumber,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        shipping_address,
        items,
        subtotal,
        shipping: shippingCost,
        total,
        commission,
        status: 'pendiente',
        payment_status: 'pendiente',
      }])
      .select().single()

    if (orderError) throw new Error(orderError.message)

    // Crear sesión de Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      locale: 'es',
      customer_email: customer.email,
      line_items: [
        ...items.map((item: any) => ({
          price_data: {
            currency: 'mxn',
            product_data: {
              name: item.name,
              images: item.image ? [item.image] : [],
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        ...(shippingCost > 0 ? [{
          price_data: {
            currency: 'mxn',
            product_data: { name: 'Envío estándar' },
            unit_amount: shippingCost * 100,
          },
          quantity: 1,
        }] : []),
      ],
      metadata: { order_id: order.id, order_number: orderNumber },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gracias?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?cancelled=true`,
    })

    // Actualizar orden con session id
    await supabaseAdmin.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id)

    return NextResponse.json({ url: session.url, order_number: orderNumber })
  } catch (e: any) {
    console.error('Checkout error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
