-- Make vendor_id optional (nullable) in the apps table
-- This allows internal apps that don't have an assigned vendor

alter table public.apps
alter column vendor_id drop not null;

comment on column public.apps.vendor_id is 'Foreign key to vendors table. NULL for internal apps with no vendor assignment.';
