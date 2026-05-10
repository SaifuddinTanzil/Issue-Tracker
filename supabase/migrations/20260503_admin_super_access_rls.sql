-- Admin Super-Access: Admins can read all tickets regardless of vendor scope
-- Resolver/Reporter: Can only read tickets from their assigned apps

-- Drop existing vendor and staff policies on issues table
drop policy if exists "vendors can read only own tickets" on public.issues;
drop policy if exists "internal staff can read all tickets" on public.issues;
drop policy if exists "vendors can update limited statuses" on public.issues;
drop policy if exists "authenticated users can insert issues" on public.issues;

-- Admin policy: Full read access to all tickets
create policy "admin can read all tickets"
on public.issues
for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text 
      and lower(coalesce(u.role::text, '')) = 'admin'
  )
);

-- Resolver/Reporter policy: Can only read tickets from their assigned apps
create policy "resolver_reporter can read assigned app tickets"
on public.issues
for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text 
      and lower(coalesce(u.role::text, '')) in ('resolver', 'reporter')
      and (
        public.issues.vendor_id = u.vendor_id
        or public.issues.app_name = u.vendor_id
      )
  )
);

-- Internal staff can create issues through the live submit flow.
create policy "authenticated users can insert issues"
on public.issues
for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text 
      and lower(coalesce(u.role::text, '')) in ('admin', 'resolver', 'reporter')
  )
);

-- Resolver update policy: Can update statuses (simplified - admins only for full updates)
create policy "resolver can update statuses"
on public.issues
for update
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text 
      and lower(coalesce(u.role::text, '')) = 'resolver'
      and (
        public.issues.vendor_id = u.vendor_id
        or public.issues.app_name = u.vendor_id
      )
  )
)
with check (status in ('in-progress', 'blocked', 'ready-for-retest'));

-- Vendor update policy (keep existing status restrictions)
create policy "vendor update policy"
on public.issues
for update
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text 
      and lower(coalesce(u.role::text, '')) = 'vendor'
      and (public.issues.vendor_id = u.vendor_id or public.issues.app_name = u.vendor_id)
  )
)
with check (status in ('in-progress', 'blocked', 'ready-for-retest'));
