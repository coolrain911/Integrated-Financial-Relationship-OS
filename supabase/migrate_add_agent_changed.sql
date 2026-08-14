-- Adds an "에이전트변경" status flag to policies. Safe to run more than once.
alter table policies add column if not exists agent_changed boolean not null default false;
