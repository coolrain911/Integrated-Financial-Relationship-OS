-- Restructures prospects from (name, segment) into
-- (last_name, first_name, korean_name, category), matching how Current
-- Client (people) is organized. Safe to run more than once.

-- Prospect names are a mix of Korean names ("정경숙", "송명한 (Daniel Song)")
-- and plain Latin names written in natural "First Last" order ("Luke Chung",
-- "Grace Lee") — the OPPOSITE order from the "LastName FirstName" convention
-- used for clients/people. So this uses its own split, not split_last_first:
-- a name containing any Hangul is kept whole as last_name (Korean names
-- don't meaningfully split into last/first), otherwise it's split assuming
-- First-then-Last order.
create or replace function split_prospect_name(full_name text, out last_name text, out first_name text)
language plpgsql
immutable
as $$
declare
  trimmed text := trim(coalesce(full_name, ''));
  sp int;
begin
  if trimmed = '' then
    last_name := null;
    first_name := null;
    return;
  end if;

  if trimmed ~ '[가-힣]' then
    last_name := trimmed;
    first_name := null;
    return;
  end if;

  sp := position(' ' in trimmed);
  if sp = 0 then
    last_name := trimmed;
    first_name := null;
  else
    first_name := left(trimmed, sp - 1);
    last_name := nullif(trim(substring(trimmed from sp + 1)), '');
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'prospects' and column_name = 'name'
  ) then

    alter table prospects add column if not exists last_name text;
    alter table prospects add column if not exists first_name text;
    alter table prospects add column if not exists korean_name text;
    alter table prospects add column if not exists category text;

    -- The original `name` is kept verbatim as korean_name so nothing is
    -- lost; last_name/first_name are a best-effort split (see
    -- split_prospect_name above) for display/sorting.
    update prospects
    set last_name = (split_prospect_name(name)).last_name,
        first_name = (split_prospect_name(name)).first_name,
        korean_name = name,
        category = segment
    where last_name is null;

    alter table prospects drop column name;
    alter table prospects drop column segment;
  end if;
end;
$$;

-- Moves a prospect into people atomically (insert + delete in one
-- transaction), so a prospect can never be dropped without the corresponding
-- person existing, or vice versa. The new person has no policies yet.
--
-- prospects.korean_name has no equivalent column on people, so it's folded
-- into the new person's note (prefixed "한글명: ...") rather than dropped.
create or replace function convert_prospect(p_id bigint)
returns people
language plpgsql
as $$
declare
  v_prospect prospects%rowtype;
  v_person people%rowtype;
  v_note text;
begin
  select * into v_prospect from prospects where id = p_id;
  if not found then
    return null;
  end if;

  v_note := concat_ws(
    E'\n',
    case when nullif(v_prospect.korean_name, '') is not null
      then '한글명: ' || v_prospect.korean_name end,
    nullif(v_prospect.note, '')
  );

  insert into people (last_name, first_name, email, phone, note)
  values (
    coalesce(nullif(v_prospect.last_name, ''), nullif(v_prospect.korean_name, ''), '(이름 미상)'),
    v_prospect.first_name,
    v_prospect.email,
    v_prospect.phone,
    nullif(v_note, '')
  )
  returning * into v_person;

  delete from prospects where id = p_id;

  return v_person;
end;
$$;
