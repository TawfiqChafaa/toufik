-- À appliquer seulement après revue et accord, sur un projet CAP dédié.
begin;
create table public.cap_clock (
 owner uuid primary key references auth.users(id) on delete cascade,
 seq bigint not null default 0 check(seq >= 0)
);
create table public.cap_records (
 owner uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('task','idea')),
 id text not null check(length(id) between 1 and 200),
 data jsonb not null,
 version bigint not null check(version > 0),
 deleted boolean not null default false,
 seq bigint not null,
 primary key(owner,kind,id)
);
create table public.cap_changes (
 owner uuid not null references auth.users(id) on delete cascade,
 seq bigint not null,
 record jsonb not null,
 primary key(owner,seq)
);
create table public.cap_operations (
 owner uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 request jsonb not null,
 result jsonb not null,
 primary key(owner,operation_id)
);
alter table public.cap_clock enable row level security;
alter table public.cap_records enable row level security;
alter table public.cap_changes enable row level security;
alter table public.cap_operations enable row level security;
create policy own_records on public.cap_records for select to authenticated using(owner=(select auth.uid()));
create policy own_changes on public.cap_changes for select to authenticated using(owner=(select auth.uid()));
-- Écritures exclusivement par la fonction contrainte ci-dessous. Pas d'accès anonyme.
revoke all on public.cap_clock,public.cap_records,public.cap_changes,public.cap_operations from public,anon,authenticated;
grant select on public.cap_records,public.cap_changes to authenticated;

create function public.cap_validate(p_kind text,p_data jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text)>50000 then return false; end if;
 if p_kind='task' then
  if p_data->>'due'<>'' then perform (p_data->>'due')::timestamp; end if;
  return coalesce(
   jsonb_typeof(p_data->'title')='string' and length(btrim(p_data->>'title')) between 1 and 180
   and jsonb_typeof(p_data->'area')='string'
   and p_data->>'area'=any(array['Moi','Famille','Maison','Travail','Administratif','Finances','Santé','Autres','Mes ambitions'])
   and jsonb_typeof(p_data->'duration')='number' and (p_data->>'duration')::numeric between 5 and 1440
   and jsonb_typeof(p_data->'urgent')='boolean' and jsonb_typeof(p_data->'important')='boolean'
   and jsonb_typeof(p_data->'done')='boolean' and jsonb_typeof(p_data->'due')='string'
   and (p_data->>'due'='' or p_data->>'due' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$'),false);
 elsif p_kind='idea' then
  if p_data->>'reviewAt'<>'' then perform (p_data->>'reviewAt')::timestamp; end if;
  return coalesce(
   jsonb_typeof(p_data->'text')='string' and length(btrim(p_data->>'text')) between 1 and 10000
   and p_data->>'status'=any(array['À explorer','En cours','Réalisée','Archivée'])
   and p_data->>'category'=any(array['Non classée','Moi','Famille','Maison','Travail','Administratif','Finances','Santé','Autres','Mes ambitions'])
   and jsonb_typeof(p_data->'reviewAt')='string'
   and (p_data->>'reviewAt'='' or p_data->>'reviewAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$')
   and (p_data->>'createdAt')::timestamptz <= (p_data->>'updatedAt')::timestamptz,false);
 end if;
 return false;
exception when others then return false;
end;
$$;

-- SECURITY DEFINER limité : aucune entrée owner, identité déduite du JWT,
-- accès qualifiés, chemin fixe et aucune requête dynamique.
create function public.cap_apply(p_operation uuid,p_kind text,p_id text,p_expected bigint,p_data jsonb,p_deleted boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();
 previous public.cap_records;
 resulting public.cap_records;
 prior public.cap_operations;
 request_data jsonb;
 result_data jsonb;
 next_seq bigint;
begin
 if actor is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_operation is null or p_expected is null or p_expected<0 or p_deleted is null or p_kind is null or p_id is null
  or p_kind not in ('task','idea') or length(p_id) not between 1 and 200
  or p_data->>'id' is distinct from p_id or not public.cap_validate(p_kind,p_data) then
  raise exception 'Invalid record' using errcode='22023';
 end if;
 -- Verrou par utilisateur : opérations, versions et curseur ont le même ordre de commit.
 insert into public.cap_clock(owner) values(actor) on conflict do nothing;
 perform 1 from public.cap_clock where owner=actor for update;
 request_data:=jsonb_build_object('kind',p_kind,'id',p_id,'expected',p_expected,'data',p_data,'deleted',p_deleted);
 select * into prior from public.cap_operations where owner=actor and operation_id=p_operation;
 if found then
  if prior.request<>request_data then raise exception 'Operation identifier reused with different content' using errcode='22023'; end if;
  return prior.result;
 end if;
 select * into previous from public.cap_records where owner=actor and kind=p_kind and id=p_id;
 if coalesce(previous.version,0)<>p_expected then
  return jsonb_build_object('conflict',true,'record',case when previous.id is null then null else to_jsonb(previous)-'owner' end);
 end if;
 -- Une suppression ne peut être annulée que par une résolution explicite attendue
 -- sur sa version courante. Un ancien appareil en version 0 n'écrase jamais ce tombstone.
 update public.cap_clock set seq=seq+1 where owner=actor returning seq into next_seq;
 insert into public.cap_records(owner,kind,id,data,version,deleted,seq)
 values(actor,p_kind,p_id,p_data,p_expected+1,p_deleted,next_seq)
 on conflict(owner,kind,id) do update set data=excluded.data,version=excluded.version,deleted=excluded.deleted,seq=excluded.seq
 returning * into resulting;
 result_data:=jsonb_build_object('conflict',false,'record',to_jsonb(resulting)-'owner');
 insert into public.cap_changes(owner,seq,record) values(actor,next_seq,to_jsonb(resulting)-'owner');
 insert into public.cap_operations(owner,operation_id,request,result) values(actor,p_operation,request_data,result_data);
 return result_data;
end;
$$;
revoke all on function public.cap_validate(text,jsonb) from public,anon,authenticated;
revoke all on function public.cap_apply(uuid,text,text,bigint,jsonb,boolean) from public,anon;
grant execute on function public.cap_apply(uuid,text,text,bigint,jsonb,boolean) to authenticated;
commit;
