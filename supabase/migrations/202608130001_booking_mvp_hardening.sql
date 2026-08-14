-- Minimum booking rules: guest bookings, slot holds, closures and database conflict checks.
alter table public.customers add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.appointments add column if not exists booked_for_name text;
alter table public.appointments add column if not exists booked_for_mobile text;
alter table public.appointments add column if not exists source text not null default 'online' check (source in ('online', 'walk_in'));
alter table public.appointments add column if not exists payment_status text not null default 'pay_at_salon' check (payment_status = 'pay_at_salon');

create table if not exists public.salon_closures (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  closure_date date not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (salon_id, closure_date, start_time, end_time)
);

create table if not exists public.slot_holds (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now()
);

create index if not exists slot_holds_lookup_idx on public.slot_holds(salon_id, appointment_date, staff_id, expires_at);
create index if not exists salon_closures_lookup_idx on public.salon_closures(salon_id, closure_date);
create unique index if not exists customers_auth_user_idx on public.customers(user_id) where user_id is not null;

create or replace function public.prevent_appointment_overlap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('Pending', 'Confirmed', 'Arrived') and exists (
    select 1 from public.appointments existing
    where existing.staff_id = new.staff_id
      and existing.appointment_date = new.appointment_date
      and existing.id <> new.id
      and existing.status in ('Pending', 'Confirmed', 'Arrived')
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) then
    raise exception 'BOOKING_CONFLICT: staff member is unavailable for this time range';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_prevent_overlap on public.appointments;
create trigger appointments_prevent_overlap before insert or update of staff_id, appointment_date, start_time, end_time, status
on public.appointments for each row execute function public.prevent_appointment_overlap();

alter table public.salon_closures enable row level security;
alter table public.slot_holds enable row level security;
create policy salon_closures_public_read on public.salon_closures for select using (true);
create policy salon_closures_owner_manage on public.salon_closures for all using (public.has_salon_access(salon_id)) with check (public.has_salon_access(salon_id));
create policy slot_holds_customer_read on public.slot_holds for select using (customer_id in (select id from public.customers where user_id = auth.uid()) or public.has_salon_access(salon_id));
create policy slot_holds_customer_create on public.slot_holds for insert with check (customer_id in (select id from public.customers where user_id = auth.uid()) or public.has_salon_access(salon_id));
create policy slot_holds_customer_delete on public.slot_holds for delete using (customer_id in (select id from public.customers where user_id = auth.uid()) or public.has_salon_access(salon_id));

