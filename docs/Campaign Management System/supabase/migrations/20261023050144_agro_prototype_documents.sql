create table public.agro_prototype_documents (
 id uuid primary key,
 name text not null check (length(name) between 1 and 180),
 mime text not null check (mime in ('application/pdf','image/png','image/jpeg')),
 content bytea not null check (octet_length(content) between 1 and 2097152),
 created_at timestamptz not null default now()
);
alter table public.agro_prototype_documents enable row level security;
revoke all on public.agro_prototype_documents from public,anon,authenticated;
create function public.agro_upload_prototype_document(access_token text, document_id uuid, file_name text, file_mime text, file_base64 text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform public.agro_assert_prototype_access(access_token);
 if length(file_base64)>2796204 then raise exception 'Documento demasiado grande'; end if;
 insert into public.agro_prototype_documents(id,name,mime,content) values(document_id,file_name,file_mime,pg_catalog.decode(file_base64,'base64'));
 return document_id;
end;
$$;
create function public.agro_read_prototype_document(access_token text, document_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare doc jsonb;
begin
 perform public.agro_assert_prototype_access(access_token);
 select pg_catalog.jsonb_build_object('id',id,'name',name,'mime',mime,'base64',pg_catalog.encode(content,'base64')) into doc from public.agro_prototype_documents where id=document_id;
 return doc;
end;
$$;
revoke all on function public.agro_upload_prototype_document(text,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.agro_read_prototype_document(text,uuid) from public,anon,authenticated;
grant execute on function public.agro_upload_prototype_document(text,uuid,text,text,text) to anon,service_role;
grant execute on function public.agro_read_prototype_document(text,uuid) to anon,service_role;
comment on table public.agro_prototype_documents is 'Small PDF/image attachments for the public synthetic agro prototype; direct access denied, scoped server token required.';
