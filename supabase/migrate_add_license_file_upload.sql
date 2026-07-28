-- Lets a License & Certificate record have an uploaded file (PDF or image
-- scan) attached, stored in a private Supabase Storage bucket and served
-- only through this app's own /api routes (the service role key never
-- reaches the browser). Safe to run more than once.

alter table licenses_certificates add column if not exists file_path text;
alter table licenses_certificates add column if not exists file_name text;

insert into storage.buckets (id, name, public)
values ('licenses', 'licenses', false)
on conflict (id) do nothing;
