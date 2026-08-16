-- Replaces columns_lib's single free-text `category` with a fixed,
-- multi-select `categories text[]` so a column can carry more than one tag
-- and the Columns tab can filter by them. The old `category` column is left
-- in place (unused by the app going forward) so the original values aren't
-- lost. Safe to run more than once.
alter table columns_lib add column if not exists categories text[] not null default '{}';

-- Best-effort mapping from the old arbitrary category labels to the new
-- fixed taxonomy. Only fills rows that don't already have a category (so
-- reruns don't clobber anything manually re-tagged since). Anything that
-- doesn't match (e.g. "기타") is left uncategorized for manual review in
-- the new multi-select UI.
update columns_lib set categories = array['생명보험(Life Insurance)']
  where cardinality(categories) = 0 and category ilike '%생명보험%';

update columns_lib set categories = array['은퇴준비']
  where cardinality(categories) = 0 and category ilike '%은퇴%';

update columns_lib set categories = array['절세(Tax Savings)']
  where cardinality(categories) = 0 and category ilike '%세금%';

update columns_lib set categories = array['자산운용/투자']
  where cardinality(categories) = 0 and (category ilike '%투자%' or category ilike '%시장동향%');

update columns_lib set categories = array['학자금(FAFSA)']
  where cardinality(categories) = 0 and (category ilike '%FAFSA%' or category ilike '%자녀교육%');

update columns_lib set categories = array['401(k)/IRA Rollover']
  where cardinality(categories) = 0 and category ilike '%401%';

update columns_lib set categories = array['연금(Annuity)']
  where cardinality(categories) = 0 and (category ilike '%연금%' or category ilike '%annuity%');
