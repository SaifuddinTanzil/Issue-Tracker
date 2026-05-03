-- 1) Add vendor scope field to user profiles.
alter table public.users
add column if not exists vendor_id text;

comment on column public.users.vendor_id is 'Vendor company identifier for external agency users. Leave NULL for internal BRAC users.';

-- FIX 1: Add the missing vendor_id column to the issues table
alter table public.issues
add column if not exists vendor_id text;

-- FIX 2: Add the missing app_name column to the issues table
alter table public.issues
add column if not exists app_name text;

-- 2) Enable and enforce RLS on issues.
alter table public.issues enable row level security;

-- Replace prior vendor-read policy safely.
drop policy if exists "vendors can read only own tickets" on public.issues;

create policy "vendors can read only own tickets"
on public.issues
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id::text = auth.uid()::text 
      and lower(coalesce(u.role::text, '')) = 'vendor'
      and (
        public.issues.vendor_id = u.vendor_id
        or public.issues.app_name = u.vendor_id
      )
  )
);

-- Internal BRAC staff retain full visibility.
drop policy if exists "internal staff can read all tickets" on public.issues;

create policy "internal staff can read all tickets"
on public.issues
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id::text = auth.uid()::text 
      and lower(coalesce(u.role::text, '')) in ('admin', 'manager', 'resolver', 'reporter')
  )
);

-- Vendor update policy: limit vendor status transitions at DB level.
drop policy if exists "vendors can update limited statuses" on public.issues;

create policy "vendors can update limited statuses"
on public.issues
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id::text = auth.uid()::text 
      and lower(coalesce(u.role::text, '')) = 'vendor'
      and (
        public.issues.vendor_id = u.vendor_id
        or public.issues.app_name = u.vendor_id
      )
  )
)
with check (
  status in ('in-progress', 'blocked', 'ready-for-retest')
);