-- Zaya platform administration, moderation, notifications, and immutable auditing.
-- Additive/idempotent changes preserve all existing application records.

alter table public.users add column if not exists account_status text not null default 'active';
alter table public.users add column if not exists status_reason text;
alter table public.users add column if not exists status_changed_at timestamptz;
alter table public.users add column if not exists soft_deleted_at timestamptz;
alter table public.identity_accounts add column if not exists account_status text not null default 'active';
alter table public.customers add column if not exists account_id uuid references public.identity_accounts(id) on delete set null;

alter table public.salons add column if not exists approval_status text not null default 'pending';
alter table public.salons add column if not exists rejection_reason text;
alter table public.salons add column if not exists approval_changed_at timestamptz;
alter table public.salons add column if not exists approval_changed_by uuid references public.identity_accounts(id) on delete set null;
alter table public.salons add column if not exists account_status text not null default 'active';
alter table public.salons add column if not exists suspension_reason text;
alter table public.salons add column if not exists documents jsonb not null default '[]'::jsonb;
alter table public.salons add column if not exists soft_deleted_at timestamptz;

-- Existing active salons predate approval workflow and remain discoverable.
update public.salons set approval_status = 'approved' where active and approval_status = 'pending';

alter table public.appointments add column if not exists admin_cancellation_reason text;
alter table public.appointments add column if not exists last_changed_by uuid references public.identity_accounts(id) on delete set null;
alter table public.appointments add column if not exists last_changed_at timestamptz;
alter table public.appointments add column if not exists soft_deleted_at timestamptz;

alter table public.offers add column if not exists approval_status text not null default 'pending';
alter table public.offers add column if not exists approval_reason text;
alter table public.offers add column if not exists minimum_booking_value_inr int not null default 0;
alter table public.offers add column if not exists usage_limit int;
alter table public.offers add column if not exists usage_count int not null default 0;
alter table public.offers add column if not exists scheduled_at timestamptz;
alter table public.offers add column if not exists approved_by uuid references public.identity_accounts(id) on delete set null;
alter table public.offers add column if not exists approved_at timestamptz;
alter table public.offers add column if not exists soft_deleted_at timestamptz;

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references public.identity_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  soft_deleted_at timestamptz
);
alter table public.services add column if not exists category_id uuid references public.service_categories(id) on delete restrict;

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.identity_accounts(id) on delete restrict,
  action text not null,
  affected_table text not null,
  affected_record_id text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid references public.identity_accounts(id) on delete set null,
  salon_id uuid references public.salons(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  review_id text,
  complaint_type text not null,
  details text not null,
  status text not null default 'open',
  internal_notes text,
  review_hidden boolean not null default false,
  resolution text,
  resolved_by uuid references public.identity_accounts(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  soft_deleted_at timestamptz
);

create table if not exists public.platform_notifications (
  id uuid primary key default gen_random_uuid(),
  audience_type text not null,
  salon_id uuid references public.salons(id) on delete set null,
  account_id uuid references public.identity_accounts(id) on delete set null,
  title text not null,
  body text not null,
  related_type text,
  related_id text,
  created_by uuid references public.identity_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  scheduled_at timestamptz,
  soft_deleted_at timestamptz
);

create table if not exists public.notification_receipts (
  notification_id uuid not null references public.platform_notifications(id) on delete cascade,
  account_id uuid not null references public.identity_accounts(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (notification_id, account_id)
);

create table if not exists public.offer_approvals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete restrict,
  status text not null default 'pending',
  reason text,
  reviewed_by uuid references public.identity_accounts(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  id text primary key default 'default',
  platform_name text not null default 'Zaya',
  support_contact text not null default 'support@zaya.app',
  booking_rules text not null default 'Pay at salon',
  cancellation_window_hours int not null default 2,
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  commission_percentage numeric(5,2) not null default 0,
  updated_by uuid references public.identity_accounts(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.service_categories(name,slug,sort_order) values
 ('Hair','hair',1),('Beard','beard',2),('Facial','facial',3),('Makeup','makeup',4),
 ('Spa','spa',5),('Nail Care','nail-care',6),('Kids','kids',7)
on conflict (slug) do update set sort_order=excluded.sort_order;
insert into public.platform_settings(id) values ('default') on conflict (id) do nothing;

-- Data validation is enforced independently of the admin UI.
do $$ begin
  alter table public.users add constraint users_account_status_check check (account_status in ('active','suspended','blocked'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.identity_accounts add constraint identity_account_status_check check (account_status in ('active','suspended','blocked'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.salons add constraint salons_approval_status_check check (approval_status in ('pending','approved','rejected'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.salons add constraint salons_account_status_check check (account_status in ('active','suspended'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.complaints add constraint complaints_status_check check (status in ('open','in_progress','resolved'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.offers add constraint offers_approval_status_check check (approval_status in ('pending','approved','rejected'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.offers add constraint offers_discount_bounds_check check (discount_amount > 0 and (discount_type <> 'Percentage' or discount_amount <= 100));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.offers add constraint offers_date_order_check check (end_date is null or start_date is null or end_date >= start_date);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.platform_settings add constraint platform_currency_check check (currency = 'INR');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.platform_settings add constraint platform_commission_check check (commission_percentage between 0 and 100);
exception when duplicate_object then null; end $$;

create or replace function public.sync_salon_booking_eligibility() returns trigger
language plpgsql set search_path=public as $$
begin
  new.active := new.approval_status = 'approved' and new.account_status = 'active' and new.soft_deleted_at is null;
  if new.approval_status = 'rejected' and nullif(trim(new.rejection_reason),'') is null then
    raise exception 'A rejection reason is required.';
  end if;
  if new.account_status = 'suspended' and nullif(trim(new.suspension_reason),'') is null then
    raise exception 'A suspension reason is required.';
  end if;
  return new;
end $$;
drop trigger if exists salons_sync_booking_eligibility on public.salons;
create trigger salons_sync_booking_eligibility before insert or update of approval_status,account_status,soft_deleted_at,rejection_reason,suspension_reason on public.salons for each row execute function public.sync_salon_booking_eligibility();

create or replace function public.prevent_ineligible_salon_booking() returns trigger
language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.salons s where s.id=new.salon_id and s.approval_status='approved' and s.account_status='active' and s.active and s.soft_deleted_at is null) then
    raise exception 'This salon is not accepting new bookings.';
  end if;
  return new;
end $$;
drop trigger if exists appointments_require_eligible_salon on public.appointments;
create trigger appointments_require_eligible_salon before insert on public.appointments for each row execute function public.prevent_ineligible_salon_booking();

create or replace function public.prevent_expired_offer_use() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.active and (new.approval_status <> 'approved' or (new.start_date is not null and new.start_date > current_date) or (new.end_date is not null and new.end_date < current_date) or (new.usage_limit is not null and new.usage_count >= new.usage_limit)) then
    raise exception 'Offer is not currently eligible for activation.';
  end if;
  return new;
end $$;
drop trigger if exists offers_validate_activation on public.offers;
create trigger offers_validate_activation before insert or update on public.offers for each row execute function public.prevent_expired_offer_use();

create or replace function public.prevent_admin_audit_mutation() returns trigger
language plpgsql as $$ begin raise exception 'Admin audit records are immutable.'; end $$;
drop trigger if exists admin_actions_immutable on public.admin_actions;
create trigger admin_actions_immutable before update or delete on public.admin_actions for each row execute function public.prevent_admin_audit_mutation();

create index if not exists salons_admin_status_idx on public.salons(approval_status,account_status);
create index if not exists users_admin_status_idx on public.users(account_status);
create index if not exists complaints_admin_status_idx on public.complaints(status,created_at desc);
create index if not exists notifications_audience_idx on public.platform_notifications(audience_type,created_at desc);
create index if not exists admin_actions_record_idx on public.admin_actions(affected_table,affected_record_id,created_at desc);
create index if not exists offers_approval_idx on public.offers(approval_status,active,end_date);

alter table public.service_categories enable row level security;
alter table public.admin_actions enable row level security;
alter table public.complaints enable row level security;
alter table public.platform_notifications enable row level security;
alter table public.notification_receipts enable row level security;
alter table public.offer_approvals enable row level security;
alter table public.platform_settings enable row level security;

create policy service_categories_read on public.service_categories for select using (active or public.is_super_admin());
create policy service_categories_admin_manage on public.service_categories for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy admin_actions_admin_read on public.admin_actions for select using (public.is_super_admin());
create policy admin_actions_admin_insert on public.admin_actions for insert with check (public.is_super_admin() and admin_id=auth.uid());
create policy complaints_customer_create on public.complaints for insert with check (customer_account_id=auth.uid());
create policy complaints_participant_read on public.complaints for select using (public.is_super_admin() or customer_account_id=auth.uid() or (salon_id is not null and public.has_salon_access(salon_id)));
create policy complaints_admin_manage on public.complaints for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy notifications_admin_manage on public.platform_notifications for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy notifications_recipient_read on public.platform_notifications for select using (public.is_super_admin() or account_id=auth.uid() or exists(select 1 from public.notification_receipts r where r.notification_id=id and r.account_id=auth.uid()) or (salon_id is not null and public.has_salon_access(salon_id)));
create policy notification_receipts_self_read on public.notification_receipts for select using (account_id=auth.uid() or public.is_super_admin());
create policy notification_receipts_self_update on public.notification_receipts for update using (account_id=auth.uid()) with check (account_id=auth.uid());
create policy notification_receipts_admin_insert on public.notification_receipts for insert with check (public.is_super_admin());
create policy offer_approvals_admin_manage on public.offer_approvals for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy offer_approvals_owner_read on public.offer_approvals for select using (exists(select 1 from public.offers o where o.id=offer_id and public.has_salon_access(o.salon_id)));
create policy platform_settings_read on public.platform_settings for select using (true);
create policy platform_settings_admin_manage on public.platform_settings for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Customers may see only their own appointments; salon owners remain restricted by has_salon_access.
create policy appointments_customer_read on public.appointments for select using (exists(select 1 from public.customers c where c.id=customer_id and c.account_id=auth.uid()));

-- Replace permissive public discovery policies with approval-aware policies.
drop policy if exists public_active_salons on public.salons;
create policy public_approved_active_salons on public.salons for select using ((approval_status='approved' and account_status='active' and active and soft_deleted_at is null) or public.has_salon_access(id));
drop policy if exists offers_public_read on public.offers;
create policy offers_eligible_read on public.offers for select using ((active and approval_status='approved' and soft_deleted_at is null and (start_date is null or start_date<=current_date) and (end_date is null or end_date>=current_date) and (usage_limit is null or usage_count<usage_limit)) or public.has_salon_access(salon_id));
