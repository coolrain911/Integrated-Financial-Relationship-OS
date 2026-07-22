-- Financial Relationship OS schema.
-- Run this once in the Supabase SQL Editor on a fresh project.

create table if not exists clients (
  id bigint generated always as identity primary key,
  name text not null,
  email text,
  phone text,
  age integer,
  policy text,
  issue_date date,
  carrier text,
  product text,
  -- face_amount/premium/av are stored as text (rather than numeric) because
  -- the source data uses the literal string "na" as a sentinel alongside
  -- real numbers and nulls; the API layer converts back to a number where
  -- possible.
  face_amount text,
  premium text,
  av text,
  needs_review boolean not null default false,
  review_reason text,
  comment text,
  note text,
  reviewed boolean not null default false,
  birthday_month integer,
  birthday_day integer
);

create table if not exists prospects (
  id bigint generated always as identity primary key,
  name text,
  email text,
  phone text,
  segment text,
  note text
);

create table if not exists columns_lib (
  id bigint generated always as identity primary key,
  num numeric,
  title text not null,
  category text,
  file text
);

-- No RLS policies are defined below, so once RLS is enabled, anon/authenticated
-- roles have zero access to these tables. The app talks to Supabase only from
-- Next.js server routes using the service role key, which bypasses RLS
-- entirely — the browser never holds Supabase credentials.
alter table clients enable row level security;
alter table prospects enable row level security;
alter table columns_lib enable row level security;

-- Moves a prospect into clients atomically (insert + delete in one
-- transaction), so a prospect can never be dropped without the corresponding
-- client existing, or vice versa. Returns the new client row, or NULL if the
-- prospect id doesn't exist.
create or replace function convert_prospect(p_id bigint)
returns clients
language plpgsql
as $$
declare
  v_prospect prospects%rowtype;
  v_client clients%rowtype;
begin
  select * into v_prospect from prospects where id = p_id;
  if not found then
    return null;
  end if;

  insert into clients (name, email, phone, note)
  values (v_prospect.name, v_prospect.email, v_prospect.phone, v_prospect.note)
  returning * into v_client;

  delete from prospects where id = p_id;

  return v_client;
end;
$$;
