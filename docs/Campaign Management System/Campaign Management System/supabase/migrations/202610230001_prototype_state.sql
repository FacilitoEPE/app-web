create table if not exists public.agro_prototype_state (
 id text primary key check (id = 'prototype'),
 revision bigint not null check (revision > 0),
 snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object')
);
alter table public.agro_prototype_state enable row level security;
revoke all on table public.agro_prototype_state from public, anon, authenticated;
grant select, insert, update on table public.agro_prototype_state to service_role;

create table if not exists public.agro_prototype_access (
 token_hash text primary key check (length(token_hash) = 64)
);
alter table public.agro_prototype_access enable row level security;
revoke all on table public.agro_prototype_access from public, anon, authenticated;
grant select, insert on table public.agro_prototype_access to service_role;

create or replace function public.agro_assert_prototype_access(access_token text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists (
   select 1 from public.agro_prototype_access
   where token_hash = pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(access_token,'UTF8')),'hex')
 ) then raise exception 'Prototype access denied' using errcode = '42501'; end if;
end;
$$;
revoke execute on function public.agro_assert_prototype_access(text) from public, anon, authenticated;

create or replace function public.agro_read_prototype_state(access_token text, metadata_only boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 perform public.agro_assert_prototype_access(access_token);
 select case when metadata_only then pg_catalog.jsonb_build_object('revision',s.revision)
             else pg_catalog.jsonb_build_object('revision',s.revision,'snapshot',s.snapshot) end
 into result from public.agro_prototype_state s where id = 'prototype';
 return result;
end;
$$;
revoke execute on function public.agro_read_prototype_state(text,boolean) from public, anon, authenticated;
grant execute on function public.agro_read_prototype_state(text,boolean) to anon, service_role;

create or replace function public.agro_save_prototype_state(access_token text, expected_revision bigint, next_snapshot jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare saved_revision bigint;
begin
 perform public.agro_assert_prototype_access(access_token);
 if (next_snapshot->>'schema') is distinct from '1'
    or (next_snapshot->>'revision')::bigint is distinct from expected_revision + 1
    or pg_catalog.jsonb_typeof(next_snapshot->'data') is distinct from 'object'
    or pg_catalog.jsonb_typeof(next_snapshot->'applied') is distinct from 'array' then
   raise exception 'Invalid prototype snapshot';
 end if;
 update public.agro_prototype_state
 set snapshot = next_snapshot, revision = expected_revision + 1
 where id = 'prototype' and revision = expected_revision
 returning revision into saved_revision;
 return saved_revision;
end;
$$;
revoke execute on function public.agro_save_prototype_state(text,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.agro_save_prototype_state(text,bigint,jsonb) to anon, service_role;
