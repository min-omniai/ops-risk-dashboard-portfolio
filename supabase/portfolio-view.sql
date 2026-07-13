-- Run after supabase/mask-names.sql.
-- 포폴 공개용 뷰: 실명을 가린 기록 중 최근 10개 기록일만 내보낸다.
-- 대시보드의 달력 범위도 이 뷰에 있는 날짜로만 정해진다.
-- 기업명은 masked_companies 표(실제 이름 → 'A 기업' 등)로 가린다. 실제 이름은 저장소에 두지 않고 DB에서만 관리한다.

create table if not exists public.masked_companies (
  name text primary key,
  replacement text not null,
  created_at timestamptz not null default now()
);

alter table public.masked_companies enable row level security;

grant select, insert, update, delete on table public.masked_companies to authenticated;

drop policy if exists "registered admins manage masked companies" on public.masked_companies;
create policy "registered admins manage masked companies"
on public.masked_companies for all
to authenticated
using (exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid()))
with check (exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid()));

-- 팀 번호 순서대로 'A 기업', 'B 기업', ... 을 붙인다
insert into public.masked_companies (name, replacement)
select company, chr(64 + row_number() over (order by min_team)::int) || ' 기업'
from (
  select payload->'dashboard'->>'company' company, min(team_id) min_team
  from public.team_daily_status
  where coalesce(payload->'dashboard'->>'company', '') <> ''
  group by 1
) c
on conflict (name) do nothing;

create or replace function public.mask_companies_in_text(t text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  r record;
begin
  if t is null then
    return null;
  end if;
  for r in select name, replacement from public.masked_companies order by char_length(name) desc loop
    t := replace(t, r.name, r.replacement);
  end loop;
  return t;
end;
$$;

create or replace view public.team_daily_status_portfolio
with (security_invoker = true)
as
select
  m.id,
  m.team_id,
  m.recorded_date,
  public.mask_companies_in_text(m.payload::text)::jsonb as payload,
  m.created_at,
  m.updated_at
from public.team_daily_status_masked m
where m.recorded_date in (
  select distinct recorded_date
  from public.team_daily_status
  order by recorded_date desc
  limit 10
);

grant select on public.team_daily_status_portfolio to authenticated;
