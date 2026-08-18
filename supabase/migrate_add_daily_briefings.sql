-- Stores the daily "아메리츠 경제뉴스 브리핑" Chanwoo receives from a colleague
-- over KakaoTalk each morning — pasted in as plain text and parsed into a
-- numbered list of {text, source} items, one row per calendar day. Safe to
-- run more than once.
create table if not exists daily_briefings (
  id bigint generated always as identity primary key,
  briefing_date date not null unique,
  raw_text text not null,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table daily_briefings enable row level security;
