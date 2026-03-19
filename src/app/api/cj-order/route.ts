import { NextRequest, NextResponse } from 'next/server'
import { cjFetch } from '@/lib/cj'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { orderId, products, shipping } = body

  if (!orderId || !products?.length || !shipping) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  try {
    // Create CJ order
    const data = await cjFetch('/shopping/order/createOrderV2', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: orderId,
        shippingZip: shipping.zip || '',
        shippingCountryCode: 'MX',
        shippingCountry: 'Mexico',
        shippingProvince: shipping.state || '',
        shippingCity: shipping.city || '',
        shippingAddress: shipping.address || '',
        shippingCustomerName: shipping.name || '',
        shippingPhone: shipping.phone || '',
        shippingEmail: shipping.email || '',
        houseNumber: '',
        remark: 'TodoClick MX order',
        products: products.map((p: any) => ({
          vid: p.variant_id || p.cj_id,
          quantity: p.quantity || 1,
        })),
      }),
    })

    if (!data.result) {
      return NextResponse.json({ error: data.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, cj_order_id: data.data?.orderId })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
