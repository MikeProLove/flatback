create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type user_role as enum ('owner', 'tenant', 'employee', 'admin');
create type order_status as enum ('draft','pending','paid','cancelled','completed');

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  role user_role not null default 'tenant',
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  balance numeric(12,2) not null default 0,
  cashback_percent numeric(5,2) not null default 0,
  billing_account text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  last_name text not null,
  first_name text not null,
  middle_name text,
  birth_date date,
  phone text,
  email text,
  wallet_id uuid references wallets(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  last_name text not null,
  first_name text not null,
  middle_name text,
  birth_date date,
  phone text,
  email text,
  wallet_id uuid references wallets(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  last_name text not null,
  first_name text not null,
  middle_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  title text,
  description text,
  address text,
  created_at timestamptz not null default now(),
  price numeric(12,2) not null default 0
);
create index if not exists properties_owner_idx on properties(owner_id);
create index if not exists properties_search_idx on properties using gin (to_tsvector('russian', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(address,'')));

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  amount numeric(12,2) not null default 0,
  tenant_id uuid references tenants(id) on delete set null,
  owner_id uuid references owners(id) on delete set null,
  is_paid boolean not null default false,
  paid_at timestamptz,
  status order_status not null default 'draft'
);
create index if not exists orders_owner_idx on orders(owner_id);
create index if not exists orders_tenant_idx on orders(tenant_id);
create index if not exists orders_status_idx on orders(status);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12,2) not null,
  category text,
  available boolean not null default true,
  stock_qty integer not null default 0
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12,2) not null,
  category text,
  execution_time_minutes integer default 60
);

create table if not exists order_products (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  sale_price numeric(12,2) not null check (sale_price >= 0)
);
create index if not exists order_products_order_idx on order_products(order_id);

create table if not exists order_services (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  service_id uuid not null references services(id),
  quantity integer not null check (quantity > 0),
  sale_price numeric(12,2) not null check (sale_price >= 0)
);
create index if not exists order_services_order_idx on order_services(order_id);

create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  owner_id uuid references owners(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  order_status order_status,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_owner_idx on user_notifications(owner_id);
create index if not exists user_notifications_tenant_idx on user_notifications(tenant_id);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  employee_id uuid references employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists role_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  role user_role not null,
  capabilities text[],
  created_at timestamptz not null default now()
);
create index if not exists role_assignments_profile_idx on role_assignments(profile_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_profiles_updated_at
before update on profiles
for each row execute procedure set_updated_at();

create trigger trg_wallets_updated_at
before update on wallets
for each row execute procedure set_updated_at();

insert into products (name, description, price, category) values
  ('Замена замков', 'Сервисные работы', 2500, 'сервис'),
  ('Уборка после выезда', 'Генеральная уборка', 4500, 'клининг')
  on conflict do nothing;

insert into services (name, description, price, category, execution_time_minutes) values
  ('Фотосъёмка квартиры', 'Профессиональная съёмка', 6000, 'маркетинг', 120),
  ('Оценка рыночной стоимости', 'Аналитика цены', 8000, 'оценка', 90)
  on conflict do nothing;