-- Remediate salon names written by the historical Google OAuth prefill.
-- New names are only confirmed by an explicit salon business-form submission.
alter table public.salons
  add column if not exists salon_name_confirmed boolean not null default false;

update public.salons s
   set salon_name = null
  from public.users u
 where s.owner_id = u.id
   and not s.salon_name_confirmed
   and lower(trim(s.salon_name)) = lower(trim(u.owner_name));

comment on column public.salons.salon_name_confirmed is
  'True only after the owner explicitly submits the salon business form.';
