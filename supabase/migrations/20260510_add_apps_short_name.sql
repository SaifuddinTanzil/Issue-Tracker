alter table public.apps
add column if not exists short_name text;

comment on column public.apps.short_name is 'Short code or abbreviation used in admin routing and dropdowns';