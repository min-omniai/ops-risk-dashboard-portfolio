-- Run once after the base schema has been installed.

grant select on table public.admin_profiles to authenticated;
grant select, insert, update on table public.team_daily_status to authenticated;
grant usage, select on sequence public.team_daily_status_id_seq to authenticated;

alter table public.team_daily_status replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_daily_status'
  ) then
    alter publication supabase_realtime add table public.team_daily_status;
  end if;
end
$$;
