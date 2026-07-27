-- Adds 본문(content)/링크(link) fields to columns_lib so a column's actual
-- article body (or a link to it) can be viewed from the app. Safe to run
-- more than once.
alter table columns_lib add column if not exists content text;
alter table columns_lib add column if not exists link text;
