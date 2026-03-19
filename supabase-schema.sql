-- =============================================
-- EJECUTA ESTO EN: Supabase > SQL Editor > New Query
-- =============================================

create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  price numeric(10,2) not null,
  cost_price numeric(10,2) default 0,
  stock integer default 0,
  category text default 'General',
  images text[] default array[]::text[],
  source_url text default '',
  source_name text default '',
  active boolean default true,
  sold integer default 0,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text default '',
  shipping_address jsonb not null default '{}',
  items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) default 0,
  total numeric(10,2) not null default 0,
  commission numeric(10,2) default 0,
  status text default 'pendiente',
  payment_status text default 'pendiente',
  payment_intent_id text default '',
  stripe_session_id text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists store_config (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text not null,
  updated_at timestamptz default now()
);

insert into store_config (key, value) values
  ('store_name', 'Mi Tienda'),
  ('store_description', 'Los mejores productos al mejor precio'),
  ('commission_pct', '10'),
  ('free_shipping_from', '599'),
  ('shipping_cost', '99'),
  ('whatsapp', '')
on conflict (key) do nothing;

-- Habilitar RLS (seguridad)
alter table products enable row level security;
alter table orders enable row level security;
alter table store_config enable row level security;

-- Políticas: lectura pública para productos y config
create policy "productos publicos" on products for select using (true);
create policy "config publica" on store_config for select using (true);

-- Políticas: solo service_role puede escribir (tus APIs)
create policy "solo admin productos" on products for all using (auth.role() = 'service_role');
create policy "solo admin pedidos" on orders for all using (auth.role() = 'service_role');
create policy "solo admin config" on store_config for all using (auth.role() = 'service_role');

-- =============================================
-- NUEVAS TABLAS: Clientes y Wishlist
-- EJECUTA ESTO en Supabase > SQL Editor
-- =============================================

create table if not exists customers (
  id uuid primary key,
  email text unique not null,
  name text default '',
  phone text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists wishlists (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(customer_id, product_id)
);

alter table customers enable row level security;
alter table wishlists enable row level security;
create policy "solo admin clientes" on customers for all using (auth.role() = 'service_role');
create policy "solo admin wishlist" on wishlists for all using (auth.role() = 'service_role');

-- =============================================
-- ACTUALIZACIÓN: Campos CJ + fulfillment automático
-- EJECUTA en Supabase > SQL Editor
-- =============================================

-- Agregar campos CJ a products
alter table products add column if not exists cj_id text default '';
alter table products add column if not exists cj_variant_id text default '';
alter table products add column if not exists supplier text default 'aliexpress';
alter table products add column if not exists cost_shipping numeric(10,2) default 0;
alter table products add column if not exists updated_at timestamptz default now();

-- Agregar campos CJ a orders para fulfillment automático
alter table orders add column if not exists cj_order_id text default '';
alter table orders add column if not exists fulfillment_status text default 'pending';
alter table orders add column if not exists tracking_number text default '';
alter table orders add column if not exists tracking_url text default '';
alter table orders add column if not exists fulfilled_at timestamptz;

-- Tabla de reviews de productos
create table if not exists product_reviews (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null default 'Anónimo',
  rating integer not null check (rating between 1 and 5),
  comment text default '',
  verified boolean default false,
  created_at timestamptz default now()
);
alter table product_reviews enable row level security;
create policy "reviews publicas" on product_reviews for select using (true);
create policy "solo admin reviews" on product_reviews for all using (auth.role() = 'service_role');

-- Tabla de cupones de descuento
create table if not exists coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  discount_type text not null default 'percent', -- 'percent' | 'fixed'
  discount_value numeric(10,2) not null,
  min_order numeric(10,2) default 0,
  max_uses integer default 100,
  uses integer default 0,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table coupons enable row level security;
create policy "cupones publicos" on coupons for select using (active = true);
create policy "solo admin cupones" on coupons for all using (auth.role() = 'service_role');

-- Tabla de visitas/analytics básico
create table if not exists product_views (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade,
  viewed_at timestamptz default now()
);
alter table product_views enable row level security;
create policy "vistas publicas insert" on product_views for insert with check (true);
create policy "solo admin ver vistas" on product_views for select using (auth.role() = 'service_role');

-- Insertar cupón de bienvenida
insert into coupons (code, discount_type, discount_value, min_order, max_uses) 
values ('BIENVENIDO10', 'percent', 10, 200, 1000)
on conflict (code) do nothing;
