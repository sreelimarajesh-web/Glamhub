import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('admin dashboard exposes every required section', async () => {
  const source = await readFile(new URL('../js/admin-dashboard.js', import.meta.url), 'utf8');
  for (const section of ['dashboard','salons','users','bookings','categories','offers','complaints','notifications','settings']) {
    assert.match(source, new RegExp(`['\"]${section}['\"]`));
  }
  for (const safeguard of ['confirmAction','audit(','salonAcceptsBookings','Cancellation reason','Rejection reason']) {
    assert.ok(source.includes(safeguard) || (await readFile(new URL('../src/app.js', import.meta.url),'utf8')).includes(safeguard));
  }
});

test('admin offers are published for selection in owner campaigns', async () => {
  const adminSource = await readFile(new URL('../js/admin-dashboard.js', import.meta.url), 'utf8');
  const ownerSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(adminSource, /appDb\.platformOffers\s*=\s*structuredClone\(adminDb\.platformOffers/);
  assert.match(ownerSource, /availablePlatformOffers\(\)/);
  assert.match(ownerSource, /No active offers available/);
  assert.match(adminSource, /item\.active=item\.status==='active'/);
  assert.match(adminSource, /item\.approvalStatus=action==='approve'\?'approved':'rejected'/);
});

test('admin migration creates protected operational records and enforcement triggers', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202608160001_admin_platform.sql', import.meta.url), 'utf8');
  for (const table of ['service_categories','admin_actions','complaints','platform_notifications','notification_receipts','offer_approvals','platform_settings']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  for (const control of ['admin_actions_immutable','appointments_require_eligible_salon','offers_validate_activation','public_approved_active_salons','appointments_customer_read']) {
    assert.ok(sql.includes(control), `missing database control: ${control}`);
  }
});
