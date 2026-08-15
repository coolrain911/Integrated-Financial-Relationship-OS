-- Adds a table for manually-entered insurance-carrier crediting indexes
-- (e.g. MLSB, S&P MARC 5%, Barclays Focus) that aren't available from any
-- public market-data API. Safe to run more than once.
create table if not exists manual_indexes (
  id bigint generated always as identity primary key,
  name text not null unique,
  value numeric,
  note text,
  updated_at timestamptz not null default now()
);

insert into manual_indexes (name)
values ('MLSB'), ('S&P MARC 5%'), ('Barclays Focus')
on conflict (name) do nothing;
