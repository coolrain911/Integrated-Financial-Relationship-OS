-- Adds a "정책변경" status flag to policies. Safe to run more than once.
alter table policies add column if not exists policy_changed boolean not null default false;
