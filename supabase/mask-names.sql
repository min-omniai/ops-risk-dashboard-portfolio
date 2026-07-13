-- Run once after the base schema has been installed.
-- 대시보드는 team_daily_status 원본 대신 실명을 가린 team_daily_status_masked 뷰를 읽는다.
-- 가릴 이름은 masked_names 표에 둔다. 누락된 이름은 Table Editor에서 행을 추가하면 바로 반영된다.
-- source: learner(스크럼 기록 자동) · auto(본문 분석) · manual(직접 추가) · given(성 없이 이름만)

create table if not exists public.masked_names (
  name text primary key check (char_length(name) between 2 and 5),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

alter table public.masked_names enable row level security;

grant select, insert, update, delete on table public.masked_names to authenticated;

drop policy if exists "registered admins manage masked names" on public.masked_names;
create policy "registered admins manage masked names"
on public.masked_names for all
to authenticated
using (exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid()))
with check (exists (select 1 from public.admin_profiles where admin_profiles.user_id = auth.uid()));

-- 성은 남기고 나머지는 'ㅇㅇ' (복성은 두 글자 유지)
create or replace function public.mask_person_name(n text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when char_length(n) >= 4 and left(n, 2) in ('남궁', '황보', '제갈', '선우', '독고', '사공', '서문') then left(n, 2)
    else left(n, 1)
  end || 'ㅇㅇ'
$$;

create or replace function public.mask_names_in_text(t text)
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

  for r in select name, source from public.masked_names order by char_length(name) desc loop
    -- source = 'given': 성 없이 이름만 등록된 행 ("길동" → "ㅇㅇ님")
    if r.source = 'given' then
      t := regexp_replace(t, '(^|[^가-힣])' || r.name || '(님|씨)', '\1ㅇㅇ\2', 'g');
      continue;
    end if;
    t := replace(t, r.name, public.mask_person_name(r.name));
    -- 이름만 부르는 경우 ("길동님")
    if char_length(r.name) = 3 then
      t := regexp_replace(t, '(^|[^가-힣])' || substr(r.name, 2) || '(님|씨)', '\1ㅇㅇ\2', 'g');
    end if;
  end loop;

  -- 목록에 없는 이름 보호: [홍길동] 표기, "홍길동 강사"
  t := regexp_replace(t, '\[([가-힣])[가-힣]{2}\]', '[\1ㅇㅇ]', 'g');
  t := regexp_replace(t, '(^|[^가-힣])(?!기획반|운영진|플밍반|아트반|담당자)([가-힣])[가-힣]{2}(\s?강사)', '\1\2ㅇㅇ\3', 'g');

  return t;
end;
$$;

create or replace view public.team_daily_status_masked
with (security_invoker = true)
as
select
  id,
  team_id,
  recorded_date,
  public.mask_names_in_text(payload::text)::jsonb as payload,
  created_at,
  updated_at
from public.team_daily_status;

grant select on public.team_daily_status_masked to authenticated;

-- 학습자 이름은 스크럼 기록에서 자동 등록
insert into public.masked_names (name, source)
select distinct entry->>'learnerName', 'learner'
from public.team_daily_status t,
  jsonb_array_elements(coalesce(t.payload->'scrumEntries', '[]'::jsonb)) entry
where char_length(coalesce(entry->>'learnerName', '')) between 2 and 5
on conflict (name) do nothing;
