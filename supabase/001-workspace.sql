-- 在 Supabase > SQL Editor 新建查询，完整执行一次。
-- 每位用户一份工作空间；其中包括项目、员工、README、工作日志及项目备份。
begin;
create table if not exists public.linghang_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint linghang_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint linghang_payload_size check (octet_length(payload::text) <= 10485760)
);
alter table public.linghang_workspaces enable row level security;
revoke all on public.linghang_workspaces from public, anon;
grant select, insert, update on public.linghang_workspaces to authenticated;
drop policy if exists "linghang_owner_select" on public.linghang_workspaces;
create policy "linghang_owner_select" on public.linghang_workspaces for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "linghang_owner_insert" on public.linghang_workspaces;
create policy "linghang_owner_insert" on public.linghang_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "linghang_owner_update" on public.linghang_workspaces;
create policy "linghang_owner_update" on public.linghang_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 版本号比较与写入在数据库内一次完成，防止多设备静默覆盖。
create or replace function public.linghang_save_workspace(expected_revision bigint, new_payload jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare next_revision bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(new_payload) <> 'object'
     or jsonb_typeof(new_payload->'projects') is distinct from 'array'
     or jsonb_typeof(new_payload->'agents') is distinct from 'array'
     or jsonb_typeof(new_payload->'histories') is distinct from 'object'
     then raise exception 'INVALID_WORKSPACE'; end if;
  if expected_revision = 0 then
    insert into public.linghang_workspaces(user_id, payload, revision)
      values (auth.uid(), new_payload, 1) on conflict (user_id) do nothing
      returning revision into next_revision;
  else
    update public.linghang_workspaces set payload = new_payload, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = expected_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'WORKSPACE_CONFLICT'; end if;
  return next_revision;
end;
$$;
revoke all on function public.linghang_save_workspace(bigint,jsonb) from public, anon;
grant execute on function public.linghang_save_workspace(bigint,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
