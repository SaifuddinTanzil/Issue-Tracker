-- 1) Create comments table if it doesn't exist, with is_internal support for split commenting.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  is_internal boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 2) Add is_internal column if it doesn't exist (for existing comments tables).
alter table public.comments
add column if not exists is_internal boolean not null default false;

comment on column public.comments.is_internal is 'If true, this comment is visible only to BRAC staff. If false, it is visible to both BRAC staff and the assigned vendor.';

-- 3) Enable RLS on comments table.
alter table public.comments enable row level security;

-- 4) Drop existing policies if any (safe cleanup).
drop policy if exists "authenticated users can read own comments" on public.comments;
drop policy if exists "authenticated users can insert own comments" on public.comments;
drop policy if exists "internal staff can read all comments" on public.comments;
drop policy if exists "vendors can read external comments" on public.comments;
drop policy if exists "vendors can insert external comments" on public.comments;

-- 5) BRAC Staff policy: Full access (SELECT, INSERT, UPDATE all comments).
create policy "internal staff can read all comments"
on public.comments
for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text
      and lower(coalesce(u.role::text, '')) in ('admin', 'resolver', 'reporter')
  )
);

create policy "internal staff can insert all comments"
on public.comments
for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text
      and lower(coalesce(u.role::text, '')) in ('admin', 'resolver', 'reporter')
  )
  and user_id::text = auth.uid()::text
);

create policy "internal staff can update all comments"
on public.comments
for update
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text
      and lower(coalesce(u.role::text, '')) in ('admin', 'resolver', 'reporter')
  )
);

-- 6) Vendor policy: Can ONLY SELECT external comments (is_internal = false) for their own tickets.
create policy "vendors can read external comments"
on public.comments
for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text
      and lower(coalesce(u.role::text, '')) = 'vendor'
      and exists (
        select 1 from public.issues i
        where i.id = public.comments.issue_id
          and (i.vendor_id = u.vendor_id or i.app_name = u.vendor_id)
      )
  )
  and is_internal = false
);

-- 7) Vendor policy: Can ONLY INSERT external comments (is_internal must be false).
create policy "vendors can insert external comments"
on public.comments
for insert
to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.id::text = auth.uid()::text
      and lower(coalesce(u.role::text, '')) = 'vendor'
      and exists (
        select 1 from public.issues i
        where i.id = public.comments.issue_id
          and (i.vendor_id = u.vendor_id or i.app_name = u.vendor_id)
      )
  )
  and is_internal = false
  and user_id::text = auth.uid()::text
);

-- 8) Create indexes for performance.
create index if not exists comments_issue_id_idx on public.comments(issue_id);
create index if not exists comments_user_id_idx on public.comments(user_id);
create index if not exists comments_created_at_idx on public.comments(created_at);
