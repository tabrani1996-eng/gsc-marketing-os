-- GSC Marketing OS — hardening after independent review
-- 1. Workspaces: only name/settings are updatable; only the owner role can delete
revoke update on public.mkt_workspaces from authenticated;
grant update (name, settings) on public.mkt_workspaces to authenticated;
drop policy if exists ws_delete on public.mkt_workspaces;
create policy ws_delete on public.mkt_workspaces for delete to authenticated
  using (public.mkt_role(id) = 'owner');

-- 2. Records: only data is updatable; created_by forced on insert
revoke update on public.mkt_records from authenticated;
grant update (data) on public.mkt_records to authenticated;

create or replace function public.mkt_records_on_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  new.created_by = auth.uid();
  new.updated_by = auth.uid();
  new.created_at = now();
  new.updated_at = now();
  return new;
end $$;
revoke execute on function public.mkt_records_on_insert() from anon, public, authenticated;
drop trigger if exists mkt_records_insert on public.mkt_records;
create trigger mkt_records_insert before insert on public.mkt_records
for each row execute function public.mkt_records_on_insert();

-- 3. Patch-style update with optimistic concurrency (RLS applies: security invoker)
create or replace function public.mkt_patch_record(rec_id uuid, patch jsonb, expected_updated_at timestamptz default null)
returns public.mkt_records language plpgsql security invoker set search_path = public as $$
declare r public.mkt_records;
begin
  update public.mkt_records
     set data = data || patch
   where id = rec_id
     and (expected_updated_at is null or updated_at = expected_updated_at)
  returning * into r;
  if r.id is null then
    if exists (select 1 from public.mkt_records where id = rec_id) then
      raise exception 'CONFLICT: data ini sudah diubah oleh orang lain. Muat ulang untuk melihat versi terbaru.' using errcode = 'P0001';
    else
      raise exception 'Data tidak ditemukan atau Anda tidak punya akses.';
    end if;
  end if;
  return r;
end $$;
revoke execute on function public.mkt_patch_record(uuid, jsonb, timestamptz) from anon, public;
grant execute on function public.mkt_patch_record(uuid, jsonb, timestamptz) to authenticated;

-- 4. Owner cannot be demoted through mkt_add_member
create or replace function public.mkt_add_member(ws uuid, member_email text, member_role text default 'editor')
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if public.mkt_role(ws) is distinct from 'owner' then
    raise exception 'Hanya owner yang dapat menambah anggota';
  end if;
  if member_role not in ('editor','viewer') then
    raise exception 'Role tidak valid';
  end if;
  select id into uid from auth.users where lower(email) = lower(member_email);
  if uid is null then
    return 'not_found';
  end if;
  insert into public.mkt_members (workspace_id, user_id, email, role)
  values (ws, uid, lower(member_email), member_role)
  on conflict (workspace_id, user_id) do update set role = excluded.role
  where public.mkt_members.role <> 'owner';
  return 'ok';
end $$;
revoke execute on function public.mkt_add_member(uuid, text, text) from anon, public;
grant execute on function public.mkt_add_member(uuid, text, text) to authenticated;

-- 5. AI usage log for per-user rate limiting (written only by the edge function's service role)
create table if not exists public.mkt_ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists mkt_ai_usage_user_idx on public.mkt_ai_usage (user_id, created_at);
alter table public.mkt_ai_usage enable row level security;
revoke all on public.mkt_ai_usage from anon, authenticated;
