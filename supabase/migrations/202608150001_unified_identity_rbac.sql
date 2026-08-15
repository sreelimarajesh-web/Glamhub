-- Canonical identity and multi-role authorization for SalonMate.
-- auth.users remains the credential source; this table owns application identity.
create table if not exists public.identity_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists identity_accounts_email_unique
  on public.identity_accounts (lower(email));

create table if not exists public.identity_roles (
  account_id uuid not null references public.identity_accounts(id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default now(),
  primary key (account_id, role)
);

insert into public.identity_accounts(id, email, display_name, created_at, updated_at)
select id, lower(email), name, created_at, updated_at from public.users
on conflict (id) do update set
  email = excluded.email,
  display_name = coalesce(identity_accounts.display_name, excluded.display_name),
  updated_at = now();

insert into public.identity_roles(account_id, role)
select id, case role
  when 'super_admin' then 'ADMIN'::public.platform_role
  when 'owner' then 'SALON_OWNER'::public.platform_role
end
from public.users
where role in ('super_admin', 'owner')
on conflict do nothing;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'super_admin')
      or exists(select 1 from public.identity_roles where account_id = auth.uid() and role = 'ADMIN');
$$;

create or replace function public.register_current_identity(
  requested_role public.platform_role,
  requested_name text default null
) returns public.identity_accounts
language plpgsql security definer set search_path = public as $$
declare
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  existing_account uuid;
  result public.identity_accounts;
begin
  if auth.uid() is null or current_email = '' then
    raise exception 'Authentication is required.';
  end if;
  if requested_role = 'ADMIN' then
    raise exception 'Admin roles must be provisioned by a platform administrator.';
  end if;

  select id into existing_account
    from public.identity_accounts
   where lower(email) = current_email;
  if existing_account is not null and existing_account <> auth.uid() then
    raise exception 'An account with this email already exists. Please sign in instead.';
  end if;

  insert into public.identity_accounts(id, email, display_name)
  values (auth.uid(), current_email, nullif(trim(requested_name), ''))
  on conflict (id) do update set
    display_name = coalesce(nullif(trim(excluded.display_name), ''), identity_accounts.display_name),
    updated_at = now()
  returning * into result;

  insert into public.identity_roles(account_id, role)
  values (auth.uid(), requested_role)
  on conflict do nothing;
  return result;
exception
  when unique_violation then
    raise exception 'An account with this email already exists. Please sign in instead.';
end;
$$;

alter table public.identity_accounts enable row level security;
alter table public.identity_roles enable row level security;

create policy identity_account_self_read on public.identity_accounts
  for select using (id = auth.uid() or public.is_super_admin());
create policy identity_account_self_update on public.identity_accounts
  for update using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());
create policy identity_roles_self_read on public.identity_roles
  for select using (account_id = auth.uid() or public.is_super_admin());
create policy identity_roles_admin_manage on public.identity_roles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

grant execute on function public.register_current_identity(public.platform_role, text) to authenticated;
