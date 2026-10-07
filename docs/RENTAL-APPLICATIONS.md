# Step 8 — Rental applications

## Implemented behavior

The existing `/property/apply` route receives `propertyId` through a typed navigation object from Property Details. It reloads the property from tenant discovery rather than trusting navigation data. The tenant must select an available room (`available = true` and `available_slots > 0`); the earlier NULL-room "property inquiry" option was removed and the service rejects a submission without a room. Property Details also offers **Apply for this room**, which preselects the room. A supplied `roomId` is checked against the fetched available rooms. Before submitting, a **Review** step shows property, location, room, rent, capacity, available slots, security deposit (when set) and the message. The optional message is trimmed, capped at 2,000 characters, and stored as NULL when blank.

Submission derives identity with the existing authenticated client's `auth.getUser()`. Callers cannot provide a tenant ID or status. Before insertion it reloads eligibility (`active`, verified), checks the selected room's parent/availability/slots, and queries pending/approved applications for the exact tenant/property/room combination. Pending and approved conflicts block submission; rejected and cancelled history remains untouched and may be followed by a new submission. A synchronous screen guard and service-level per-user/property/room lock prevent double taps in this client. **These checks do not prevent races between devices or sessions.**

After successful submission, the tenant is sent to My Applications with a success notice. Tenant reads explicitly filter `tenant_id`; owner reads first obtain authenticated-owned property IDs, then query only those IDs. Application/property/room reads remain subject to existing RLS. Property and room embeds are left joins so inaccessible or deleted references do not hide tenant history. Applicant names use a separate `profiles(id, full_name)` read; denied or filtered profile reads fall back to the tenant identifier already present in the application. No email/phone/profile privacy changes are introduced.

Both lists show a pending/approved/rejected/cancelled status badge, rent, submission date, message, location, cover image when accessible, and room information, with All/Pending/Approved/Rejected/Cancelled filters. **View details** opens `/(tenant)/application/[id]` or `/(owner)/application/[id]`; both reload the application scoped to the signed-in tenant or to a property the signed-in landlord owns, so changing the UUID in the route shows "not found". They refresh on focus and provide loading, empty, error/retry and explicit Refresh controls. Cleanup prevents late responses from updating a departed or refreshed screen. Owner actions require an inline confirmation that works on Android and web. After approval/rejection, buttons disappear following the reload. Each mutation checks authenticated ownership, only updates `status` and `updated_at`, and filters the update by application ID, property ID and **current `pending` status**. A concurrent decision yields a friendly refresh message rather than overwriting it.

## Status transitions

`canTransition()` in `src/services/application.service.ts` is the single rule table; every other change is refused.

| Actor | From | To |
| --- | --- | --- |
| Tenant (own application) | pending | cancelled |
| Landlord (own property) | pending | approved |
| Landlord (own property) | pending | rejected |

Tenant cancellation requires an inline confirmation, updates only `status` and `updated_at`, and filters the update by application ID, the authenticated `tenant_id` and current `pending` status. Approved, rejected and cancelled applications cannot be cancelled. Cancellation needs database support that could not be verified from the client: see **Required for cancellation** below.

## Schema discovered

Zero-row reads through the public key confirmed `applications` has exactly `id, tenant_id, property_id, room_id, message, status, created_at, updated_at`. There is no move-in date or landlord-note column, so the form only collects a room and an optional message. `status` is text, not an enum; any CHECK constraint on it is not visible to the client. Relationships to `profiles`, `properties` and `rooms` exist.

The requested owner Applications route did not exist. It was added at `app/(owner)/(tabs)/applications.tsx`, accessible using **View Rental Applications** on the current Your Listings screen. The existing owner Stack and mode switching remain intact; no owner navigation redesign was introduced.

## RLS inspection result — live policies remain unverified

Repository inspection found no SQL migrations, policy definitions, Supabase schema snapshot, or approval/slot-allocation RPC. This session has no connected Supabase SQL/catalog tool. Consequently, live RLS on `applications`, `properties`, `rooms`, and `profiles` **has not been inspected or certified**. No SQL below was executed. Client-side scope checks are useful safeguards but RLS and database permissions must enforce the security boundary.

Run these **read-only** queries in Supabase SQL Editor and review the actual policies before applying changes:

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('applications', 'properties', 'rooms', 'profiles');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('applications', 'properties', 'rooms', 'profiles')
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('applications', 'properties', 'rooms', 'profiles');

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'applications';

select conname, pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.applications'::regclass;

select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'applications';

select p.proname, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and p.proname ~* '(application|approve|allocat|occupan)';
```

Required capabilities are tenant SELECT/INSERT for their own applications; landlord SELECT and pending-only UPDATE for applications of their own properties; property/room SELECT sufficient for eligibility and ownership checks. **Profile visibility need not expand:** a missing applicant name has a UI fallback. A tenant can retain an application even if an inactive property's details are hidden under existing policies.

## Required for cancellation — not applied

Run the read-only inspection queries above first. Cancellation works only if both of these hold.

1. `status` must accept `'cancelled'`. If `pg_constraint` shows a CHECK listing only pending/approved/rejected, the update fails with `23514` and the app reports "Cancelling applications is not enabled yet". Replace the constraint, using the name the inspection query returned:

```sql
alter table public.applications drop constraint applications_status_check; -- use the actual name
alter table public.applications add constraint applications_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));
```

2. A tenant must be allowed to UPDATE their own pending application to cancelled, and nothing else. Without such a policy the update silently affects no rows and the app reports that the application could not be cancelled.

```sql
create policy istay_applications_tenant_cancel
on public.applications for update to authenticated
using (tenant_id = (select auth.uid()) and status = 'pending')
with check (tenant_id = (select auth.uid()) and status = 'cancelled');
```

The `grant update (status, updated_at)` in the baseline below already covers the columns this needs. Check that no existing broader UPDATE policy lets a tenant set `approved`: permissive policies combine with OR.

## Required to block self-applications — not applied

Every account has tenant capabilities, so a landlord can browse in Tenant Mode. The app refuses an application when the authenticated user owns the property (Property Details hides Apply, the Apply route shows "You cannot apply to your own property.", and `submitApplication` rejects it). A direct API call bypasses all of that, so the rule also belongs in the database. A CHECK constraint cannot reference another table; use either option.

Option A — add the condition to the tenant INSERT policy (already included in the baseline below). Only effective if no other permissive INSERT policy on `applications` allows the row.

Option B — a trigger, which holds regardless of which policies exist:

```sql
create or replace function public.applications_block_self_application()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.properties p
    where p.id = new.property_id and p.owner_id = new.tenant_id
  ) then
    raise exception 'You cannot apply to your own property.'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;
revoke execute on function public.applications_block_self_application()
  from public, anon, authenticated;

create trigger applications_block_self_application
before insert or update of tenant_id, property_id on public.applications
for each row execute function public.applications_block_self_application();
```

Find any existing self-applications first:

```sql
select a.id, a.status, a.created_at
from public.applications a
join public.properties p on p.id = a.property_id
where p.owner_id = a.tenant_id;
```

## Conditional application policy/permission baseline — manual review only

If inspection shows missing or overly permissive application policies/permissions, the following is an exact baseline for this Step 8 lifecycle. It deliberately **replaces all existing application policies**, so first preserve their definitions and reconcile any other legitimate workflows. Do not simply add new permissive policies beside broad existing policies: permissive policies combine with OR. Review existing column grants too; table-level REVOKE does not remove pre-existing column grants.

This baseline relies on property SELECT policies permitting owners to read their properties. Those policies must not depend recursively on reading applications. RLS limits rows/transitions; column grants prevent a landlord from changing tenant/property/room IDs, message, ID, or creation time through a direct API call.

```sql
begin;

alter table public.applications enable row level security;

do $review$
declare existing_policy record;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'applications'
  loop
    execute format('drop policy %I on public.applications', existing_policy.policyname);
  end loop;
end
$review$;

revoke insert, update, delete, truncate on public.applications
  from public, anon, authenticated;
-- Remove inherited prior column write grants as well.
revoke insert (id, tenant_id, property_id, room_id, message, status, created_at, updated_at),
       update (id, tenant_id, property_id, room_id, message, status, created_at, updated_at)
  on public.applications from public, anon, authenticated;
grant select on public.applications to authenticated;
grant insert (tenant_id, property_id, room_id, message, status)
  on public.applications to authenticated;
grant update (status, updated_at) on public.applications to authenticated;

create policy istay_applications_tenant_read
on public.applications for select to authenticated
using (tenant_id = (select auth.uid()));

create policy istay_applications_owner_read
on public.applications for select to authenticated
using (exists (
  select 1 from public.properties p
  where p.id = applications.property_id and p.owner_id = (select auth.uid())
));

create policy istay_applications_tenant_insert
on public.applications for insert to authenticated
with check (
  tenant_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.properties p
    where p.id = applications.property_id and p.status = 'active' and p.verified = true
      and p.owner_id <> (select auth.uid())
  )
  and (
    exists (
      select 1 from public.rooms r
      where r.id = applications.room_id
        and r.property_id = applications.property_id
        and r.available = true and r.available_slots > 0
    )
  )
);

create policy istay_applications_tenant_cancel
on public.applications for update to authenticated
using (tenant_id = (select auth.uid()) and status = 'pending')
with check (tenant_id = (select auth.uid()) and status = 'cancelled');

create policy istay_applications_owner_decide
on public.applications for update to authenticated
using (
  status = 'pending' and exists (
    select 1 from public.properties p
    where p.id = applications.property_id and p.owner_id = (select auth.uid())
  )
)
with check (
  status in ('approved', 'rejected') and exists (
    select 1 from public.properties p
    where p.id = applications.property_id and p.owner_id = (select auth.uid())
  )
);

commit;
```

If property/room reads required by Step 8 are absent, these narrowly scoped SELECT policies are candidates. Apply only after reviewing existing policies and grants; these statements do not correct unrelated overly broad policies. They require existing authenticated SELECT grants for the relevant tables/columns. No profile policy is required for this feature.

```sql
-- Only if these tables' RLS/SELECT capabilities are missing; review first.
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
grant select on public.properties, public.rooms to authenticated;

create policy istay_step8_property_read
on public.properties for select to authenticated
using ((status = 'active' and verified = true) or owner_id = (select auth.uid()));

create policy istay_step8_room_read
on public.rooms for select to authenticated
using (exists (
  select 1 from public.properties p
  where p.id = rooms.property_id
    and (p.owner_id = (select auth.uid()) or (p.status = 'active' and p.verified = true))
));
```

These are **conditional recommendations**, not evidence that the current live policies are missing. In particular, do not expand `profiles` policies to expose tenant data. After manual application, test direct API access with separate tenant and owner sessions, not just the screen flow.

## Recommended duplicate indexes — optional, not applied

First identify existing conflicts (including NULL-room combinations):

```sql
select tenant_id, property_id, room_id, count(*), array_agg(id order by created_at)
from public.applications
where status in ('pending', 'approved')
group by tenant_id, property_id, room_id
having count(*) > 1;
```

After resolving conflicts and reviewing room deletion behavior, these two partial unique indexes enforce the same combination rule across clients, including NULL rooms:

```sql
create unique index applications_open_room_unique
on public.applications (tenant_id, property_id, room_id)
where room_id is not null and status in ('pending', 'approved');

create unique index applications_open_property_unique
on public.applications (tenant_id, property_id)
where room_id is null and status in ('pending', 'approved');
```

Important: the existing `ON DELETE SET NULL` room FK can turn distinct room applications into the same NULL-room combination. These indexes can therefore block a room deletion if that would collide with another pending/approved inquiry or another deleted room's application. Decide how to retain/archive such applications before installing them; no automatic cleanup or schema change is proposed here. The app maps an actual `23505` conflict to a friendly duplicate message if a matching unique constraint/index is installed.

## Room allocation recommendation

Submitting never changes room slots. Approval also leaves slots unchanged: no existing atomic approval/allocation RPC could be confirmed. For actual occupancy, introduce a separately reviewed database transaction/RPC that verifies authenticated ownership, locks/checks the pending application, validates and conditionally decrements the chosen room's slots, and updates application status in the **same transaction**. Concurrent approvals and repeat calls must not allocate twice; a full room must roll back the entire decision. Do not implement this as multiple client writes. Decide property-inquiry allocation semantics separately. SQL for a new allocation RPC is intentionally not invented without confirming the actual database functions/triggers and occupancy model.

## Verification and manual checklist (Android and web)

Automated tests use mocked transport and exercise the production TypeScript, not a live Supabase project. Run `npm run typecheck`, `node --test tests/*.test.cjs`, and `node --test tests/application.test.cjs`.

Checklist items below that mention a "Property inquiry" predate the required-room rule: a room must now be selected, and submission goes through the Review step. Also verify: a pending application can be cancelled from My Applications and from its details screen after confirmation; approved/rejected/cancelled ones offer no Cancel; a cancelled room application can be submitted again; the landlord sees the cancelled status and no Approve/Reject on it; the status filters work in both modes.

1. Reload the updated app on Android. Repeat the checklist using the web build. Use a tenant, owner A, and unrelated owner B with verified authenticated accounts.
2. From Home, Search, and Favorites, open an active verified property and tap Apply. Verify property name/type/location/image/rent and available room details. Only available rooms with positive slots should appear.
3. Choose Property inquiry, enter a message with leading/trailing spaces, submit once, and verify success feedback and a new **pending** My Applications entry. The stored room/message should be NULL/trimmed as appropriate.
4. Submit a room-specific request; verify room name/date/message in history. Rapidly tap Submit and confirm one insertion. Return to Apply for the same combination: pending/approved conflicts must block submission. A different room or property-inquiry combination is separate.
5. While Apply is open, make the property inactive/unverified or selected room unavailable/full through existing authorized controls. Submit must refuse it. Test an invalid property UUID, a missing property, a malformed room ID and a room ID from another property via the route's query parameters.
6. Use an owner account to open Profile → Your Listings → View Rental Applications. Verify only owned-property applications appear. Where profiles cannot be read, verify an applicant identifier appears without failing the list.
7. Approve a pending request: verify confirmation first; Cancel must not write. Confirm once, check approved status and disappearance of action buttons. Reject another pending request similarly. Room slots must remain unchanged for both submission and approval.
8. Return to tenant My Applications and verify the new status on focus/Refresh. A rejected request may be submitted again without altering the previous rejected history. Approved/rejected rows must not offer owner actions.
9. With two owner sessions, decide the same pending application concurrently. Only one transition should win; the other must ask for refresh rather than overwrite it. Test owner B's read/update access directly: requests must not expose/change owner A's applications under RLS.
10. Delete a selected room through existing authorized controls in a disposable test listing. Its application should survive with NULL room and render safely. If the optional indexes were installed, review the documented NULL-room collision case first. If an inactive property embed is hidden, application history should still render with a property-information fallback.
11. Use an account with no applications/properties to verify empty states. Disconnect connectivity, open lists/submit/decide, and verify friendly errors and Retry/Refresh. For an uncertain submission response, check My Applications before resubmitting.
12. Navigate away during reads and actions; switch accounts and refresh. Confirm previous-account data and late results do not populate the current list. Verify Home, Search (case-insensitive and abort-safe), Favorites, Profile, Smart Match, Notifications, Messages, mode switching and property-management routes still behave as before.
13. Perform the read-only RLS inspection above. With normal authenticated sessions, verify own-only tenant SELECT/INSERT, owner-only SELECT/UPDATE, pending-only transitions and immutability of application identity fields. If current policies fail those checks, manually review the conditional SQL before deploying to users.
