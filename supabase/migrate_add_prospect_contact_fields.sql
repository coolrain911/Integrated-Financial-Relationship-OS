-- Splits the old single "category" field (which doubled as both contact
-- channel AND an implicit "미접촉 잠재고객" not-yet-contacted sentinel) into
-- two separate concerns: contacted (접촉유무, boolean) and category (접촉경로,
-- now restricted to a fixed taxonomy). Safe to run more than once.
alter table prospects add column if not exists contacted boolean not null default false;

-- Anything that wasn't the "미접촉" sentinel implies they were reached
-- through some channel — set contacted=true before the sentinel text itself
-- gets cleared below.
update prospects set contacted = true
  where category is not null and category not ilike '%미접촉%';

-- Clear the old "not contacted yet" sentinel — that's now represented by
-- contacted=false with no channel, not a category value.
update prospects set category = null
  where category ilike '%미접촉%';

-- Remap old free-text category values onto the new fixed channel taxonomy.
-- "모임/골프" (a merged historical value) is treated as 골프 here since that's
-- the more specific of the two — reclassify individual rows manually in the
-- Potential Client tab if a particular one was actually a 모임 contact.
update prospects set category = '골프' where category ilike '%골프%';
update prospects set category = '모임' where category ilike '%모임%';
update prospects set category = '교회' where category ilike '%교회%';
update prospects set category = '전화/이메일 연락'
  where category ilike '%전화%' or category ilike '%이메일%';
update prospects set category = '광고/명함' where category ilike '%명함%' or category ilike '%광고%';
update prospects set category = '소개' where category ilike '%소개%';

-- Catch-all: anything left that isn't already one of the fixed values
-- becomes "기타" rather than staying as stale free text.
update prospects set category = '기타'
  where category is not null and category not in (
    '소개', '골프', '모임', '교회', '전화/이메일 연락', 'CPA/변호사', '광고/명함', '기타'
  );
