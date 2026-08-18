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
update columns_lib set categories = array['Life Insurance']
  where cardinality(categories) = 0 and category ilike '%생명보험%';

update columns_lib set categories = array['은퇴준비']
  where cardinality(categories) = 0 and category ilike '%은퇴%';

update columns_lib set categories = array['Tax Saving/Diversification']
  where cardinality(categories) = 0 and category ilike '%세금%';

update columns_lib set categories = array['자산운용/투자']
  where cardinality(categories) = 0 and (category ilike '%투자%' or category ilike '%시장동향%');

update columns_lib set categories = array['학자금']
  where cardinality(categories) = 0 and (category ilike '%FAFSA%' or category ilike '%자녀교육%');

update columns_lib set categories = array['Qualified Plan/IRA Rollover']
  where cardinality(categories) = 0 and category ilike '%401%';

update columns_lib set categories = array['Annuity']
  where cardinality(categories) = 0 and (category ilike '%연금%' or category ilike '%annuity%');

-- Catch-all: anything still unmapped (the old "기타" bucket, or anything else
-- that didn't match a specific rule above) goes into the new "기타" category
-- rather than staying empty.
update columns_lib set categories = array['기타']
  where cardinality(categories) = 0;

-- Rename pass: shortens the two labels that made the filter-chip row wrap
-- onto two lines. Safe to run against a database that was migrated before
-- this rename (array_replace is a no-op where the old label isn't present).
update columns_lib set categories = array_replace(categories, '생명보험(Life Insurance)', 'Life Insurance');
update columns_lib set categories = array_replace(categories, '연금(Annuity)', 'Annuity');
update columns_lib set categories = array_replace(categories, '401(k)/IRA Rollover', 'Qualified Plan/IRA Rollover');
update columns_lib set categories = array_replace(categories, '절세(Tax Savings)', 'Tax Saving/Diversification');
update columns_lib set categories = array_replace(categories, '학자금(FAFSA)', '학자금');
