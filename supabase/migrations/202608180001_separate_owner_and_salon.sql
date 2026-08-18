-- Keep OAuth identity and business details in independently-owned relations.
alter table public.users rename column name to owner_name;
alter table public.users add column if not exists avatar_url text;

alter table public.salons rename column name to salon_name;
alter table public.salons rename column location to town;
alter table public.salons rename column whatsapp to whatsapp_number;
alter table public.salons add column if not exists opening_hours text;

comment on column public.users.owner_name is 'Personal name supplied by the identity provider; never used as a salon name.';
comment on column public.salons.salon_name is 'Official business name entered explicitly by a salon owner.';
create index if not exists salons_owner_id_idx on public.salons(owner_id);
