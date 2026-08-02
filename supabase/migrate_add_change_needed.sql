-- Adds a "변경필요" status flag to policies. Safe to run more than once.
alter table policies add column if not exists change_needed boolean not null default false;
