-- Adds two new top-level tabs (siblings of Calendar/Columns):
-- 1. knowledge_items   ("지식 창고" / Knowledge Vault) — reusable answers to
--    recurring client questions (real estate, overseas assets, tax, FAFSA...)
--    and related reference material, sortable by title/category/date.
-- 2. licenses_certificates ("License & Certificate") — the advisor's own
--    license/registration/CE/E&O records in one searchable place.
-- Safe to run more than once.

create table if not exists knowledge_items (
  id bigint generated always as identity primary key,
  title text not null,
  category text,
  item_date date,
  content text,
  link text
);

create table if not exists licenses_certificates (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null check (category in ('License', 'Register', 'CE', 'E&O')),
  issuer text,
  issue_date date,
  expiry_date date,
  reference_no text,
  link text,
  note text
);

alter table knowledge_items enable row level security;
alter table licenses_certificates enable row level security;
