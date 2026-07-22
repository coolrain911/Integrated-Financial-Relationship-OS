-- Adds a "Surrendered" status flag to policies. Safe to run more than once.
alter table policies add column if not exists surrendered boolean not null default false;
