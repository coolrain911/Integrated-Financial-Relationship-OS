-- Adds a "주의 요망" status flag to policies. Safe to run more than once.
alter table policies add column if not exists needs_attention boolean not null default false;
