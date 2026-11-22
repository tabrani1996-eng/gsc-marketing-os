-- GSC Digital Marketing OS — core schema
-- Workspaces (private, invite-only), membership with roles, and a generic
-- per-module record store (JSONB) protected by Row Level Security.

create table if not exists public.mkt_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mkt_members (
  workspace_id uuid not null references public.mkt_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null default 'editor' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.mkt_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.mkt_workspaces(id) on delete cascade,
  module text not null,
  data jsonb not null default '{}'::jsonb,
  is_sample boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mkt_records_ws_module_idx on public.mkt_records (workspace_id, module);
create index if not exists mkt_members_user_idx on public.mkt_members (user_id);
create index if not exists mkt_workspaces_owner_idx on public.mkt_workspaces (owner_id);
create index if not exists mkt_records_created_by_idx on public.mkt_records (created_by);
create index if not exists mkt_records_updated_by_idx on public.mkt_records (updated_by);

-- Helpers (security definer so policies don't recurse)
create or replace function public.mkt_role(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.mkt_members where workspace_id = ws and user_id = (select auth.uid());
$$;

create or replace function public.mkt_can_read(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mkt_members where workspace_id = ws and user_id = (select auth.uid()));
$$;

create or replace function public.mkt_can_write(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mkt_members where workspace_id = ws and user_id = (select auth.uid()) and role in ('owner','editor'));
$$;

-- Owner becomes a member automatically
create or replace function public.mkt_on_workspace_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.mkt_members (workspace_id, user_id, email, role)
  values (new.id, new.owner_id, (select email from auth.users where id = new.owner_id), 'owner')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists mkt_workspace_created on public.mkt_workspaces;
create trigger mkt_workspace_created after insert on public.mkt_workspaces
for each row execute function public.mkt_on_workspace_created();

create or replace function public.mkt_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

drop trigger if exists mkt_records_touch on public.mkt_records;
create trigger mkt_records_touch before update on public.mkt_records
for each row execute function public.mkt_touch();

-- Owner invites an existing user (must have signed up) by email
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
  on conflict (workspace_id, user_id) do update set role = excluded.role;
  return 'ok';
end $$;

revoke execute on function public.mkt_add_member(uuid, text, text) from anon, public;
grant execute on function public.mkt_add_member(uuid, text, text) to authenticated;
revoke execute on function public.mkt_on_workspace_created() from anon, public, authenticated;
revoke execute on function public.mkt_role(uuid) from anon, public;
revoke execute on function public.mkt_can_read(uuid) from anon, public;
revoke execute on function public.mkt_can_write(uuid) from anon, public;
grant execute on function public.mkt_role(uuid) to authenticated;
grant execute on function public.mkt_can_read(uuid) to authenticated;
grant execute on function public.mkt_can_write(uuid) to authenticated;

-- RLS
alter table public.mkt_workspaces enable row level security;
alter table public.mkt_members enable row level security;
alter table public.mkt_records enable row level security;

drop policy if exists ws_select on public.mkt_workspaces;
create policy ws_select on public.mkt_workspaces for select to authenticated
  using (public.mkt_can_read(id) or owner_id = (select auth.uid()));
drop policy if exists ws_insert on public.mkt_workspaces;
create policy ws_insert on public.mkt_workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists ws_update on public.mkt_workspaces;
create policy ws_update on public.mkt_workspaces for update to authenticated
  using (public.mkt_can_write(id)) with check (public.mkt_can_write(id));
drop policy if exists ws_delete on public.mkt_workspaces;
create policy ws_delete on public.mkt_workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists mem_select on public.mkt_members;
create policy mem_select on public.mkt_members for select to authenticated
  using (public.mkt_can_read(workspace_id));
drop policy if exists mem_delete on public.mkt_members;
create policy mem_delete on public.mkt_members for delete to authenticated
  using (public.mkt_role(workspace_id) = 'owner' and role <> 'owner');

drop policy if exists rec_select on public.mkt_records;
create policy rec_select on public.mkt_records for select to authenticated
  using (public.mkt_can_read(workspace_id));
drop policy if exists rec_insert on public.mkt_records;
create policy rec_insert on public.mkt_records for insert to authenticated
  with check (public.mkt_can_write(workspace_id));
drop policy if exists rec_update on public.mkt_records;
create policy rec_update on public.mkt_records for update to authenticated
  using (public.mkt_can_write(workspace_id)) with check (public.mkt_can_write(workspace_id));
drop policy if exists rec_delete on public.mkt_records;
create policy rec_delete on public.mkt_records for delete to authenticated
  using (public.mkt_can_write(workspace_id));

revoke all on public.mkt_workspaces, public.mkt_members, public.mkt_records from anon;
grant select, insert, update, delete on public.mkt_workspaces, public.mkt_records to authenticated;
grant select, delete on public.mkt_members to authenticated;
