-- The KakaoTalk briefing's article list often arrives as a photo (a
-- newspaper clipping screenshot) rather than selectable text, so a briefing
-- needs to be attachable as an image instead of (or alongside) pasted text.
-- Safe to run more than once.
alter table daily_briefings alter column raw_text drop not null;
alter table daily_briefings add column if not exists image_path text;

-- Private bucket for the uploaded briefing image, same pattern as the
-- "licenses" bucket — served only through our own /api routes using the
-- service role key.
insert into storage.buckets (id, name, public)
values ('briefings', 'briefings', false)
on conflict (id) do nothing;
