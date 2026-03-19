import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente público (para el frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente admin (para APIs del servidor - tiene acceso total)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Product = {
  id: string
  name: string
  description: string
  price: number
  cost_price: number
  stock: number
  category: string
  images: string[]
  source_url: string
  source_name: string
  active: boolean
  sold: number
  created_at: string
}

export type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  commission: number
  status: 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado'
  payment_status: 'pendiente' | 'pagado' | 'fallido' | 'reembolsado'
  payment_intent_id: string
  stripe_session_id: string
  cj_order_id?: string
  fulfillment_status?: string
  tracking_number?: string
  tracking_url?: string
  fulfilled_at?: string
  notes?: string
  updated_at?: string
  created_at: string
}

export type OrderItem = {
  product_id: string
  name: string
  price: number
  quantity: number
  image: string
  source_url?: string
  cj_id?: string
  cj_variant_id?: string
}

export type OrderItem = {
  product_id: string
  name: string
  price: number
  quantity: number
  image: string
}

export type StoreConfig = {
  store_name: string
  store_description: string
  commission_pct: string
  free_shipping_from: string
  shipping_cost: string
  whatsapp: string
}
