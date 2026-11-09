-- À exécuter dans Supabase > SQL Editor.
-- Activez RLS : chaque utilisateur authentifié ne voit que ses propres données.
create table if not exists public.settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 opening_balance numeric(15,2) not null default 0 check(opening_balance >= 0),
 created_at timestamptz not null default now()
);
create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date,
 label text not null,
 category text,
 type text not null check(type in ('credit','debit')),
 amount numeric(15,2) not null check(amount > 0),
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.employees (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 grade text,
 hired_at date,
 bonus_total numeric(15,2) not null default 0 check(bonus_total >= 0),
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.stock (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 category text,
 quantity integer not null default 0 check(quantity >= 0),
 threshold integer not null default 0 check(threshold >= 0),
 unit_cost numeric(15,2) not null default 0 check(unit_cost >= 0),
 created_at timestamptz not null default now()
);
create table if not exists public.invoices (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 reference text not null,
 partner text not null,
 description text not null,
 amount numeric(15,2) not null default 0 check(amount >= 0),
 due_date date,
 status text not null default 'En attente',
 notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 due_date date,
 priority text not null default 'Normale',
 status text not null default 'À faire',
 notes text,
 created_at timestamptz not null default now()
);

alter table public.settings enable row level security;
alter table public.transactions enable row level security;
alter table public.employees enable row level security;
alter table public.stock enable row level security;
alter table public.invoices enable row level security;
alter table public.tasks enable row level security;

-- Une seule politique par table pour toutes les opérations.
do $$ declare tbl text; begin
 for tbl in select unnest(array['settings','transactions','employees','stock','invoices','tasks']) loop
  execute format('drop policy if exists "owner_only" on public.%I',tbl);
  execute format('create policy "owner_only" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',tbl);
 end loop;
end $$;

-- Aucun accès anonyme aux données.
revoke all on public.settings,public.transactions,public.employees,public.stock,public.invoices,public.tasks from anon;
grant select,insert,update,delete on public.settings,public.transactions,public.employees,public.stock,public.invoices,public.tasks to authenticated;
create index if not exists transactions_owner_date_idx on public.transactions(user_id,date desc);
create index if not exists employees_owner_idx on public.employees(user_id);
create index if not exists stock_owner_idx on public.stock(user_id);
create index if not exists invoices_owner_idx on public.invoices(user_id);
create index if not exists tasks_owner_idx on public.tasks(user_id);
