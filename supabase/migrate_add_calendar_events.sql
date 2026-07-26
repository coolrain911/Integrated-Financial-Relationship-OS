-- Adds the calendar_events table (user-added calendar entries shown on
-- Dashboard Today). Safe to run more than once.
create table if not exists calendar_events (
  id bigint generated always as identity primary key,
  event_date date not null,
  title text not null,
  note text
);

alter table calendar_events enable row level security;
