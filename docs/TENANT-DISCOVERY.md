# Step 7 — Tenant Property Discovery

Implemented on October 6, 2026. Read the exact [Expo v57 reference](https://docs.expo.dev/versions/v57.0.0/) and [Router reference](https://docs.expo.dev/versions/v57.0.0/sdk/router/), the local Supabase skill, the current Supabase changelog, and the relevant Supabase query/mutation documentation before implementation.

## Files

Created:

- `src/services/tenant-discovery.service.ts`: shared types, public property queries, search validation, photo ordering, available rooms, amenities, favorites.
- `src/hooks/use-tenant-discovery.ts`: debounced, cancellable, focus-based discovery refresh.
- `src/hooks/use-tenant-favorites.ts`: focus refresh, confirmed mutations, duplicate-click protection and error state.
- `src/components/tenant-listings.tsx`: reusable listing card and loading/error/empty state.
- `tests/tenant-discovery.test.cjs`: 15 offline service tests.
- `docs/TENANT-DISCOVERY.md`: implementation report and manual checklist.

Modified:

- `app/(tenant)/(tabs)/index.tsx`.
- `app/(tenant)/(tabs)/search.tsx`.
- `app/(tenant)/(tabs)/favorites.tsx`.
- `app/(tenant)/property/[id].tsx` (previously empty; filled the existing route).

The workspace already contained unrelated edits. Authentication, landlord management, application/profile/notification/message/smart-match code, layouts, dependencies, schema and RLS were not changed by this task. A temporary read-only metadata inspection script was removed after verification.

## Data access

Every property query goes through `publicQuery()`, which explicitly adds `.eq("status", "active")` and `.eq("verified", true)`. Results also pass the same visibility predicate before rendering. Details and supporting photo/room/amenity helpers cannot bypass these filters with a manually supplied UUID. Malformed IDs return an unavailable state without making a property request.

Properties and favorite IDs are read in deterministic pages of 200 to avoid the default response row limit. Favorite property lookups use chunks of 100 IDs. Property queries select public listing fields and related photos, rooms and amenities, and do not select owner IDs or profiles.

All production requests use the existing authenticated `requireSupabase()` client. RLS remains the security boundary. No service-role/admin credentials or schema/policy changes were used.

Photos sort cover first, then `sort_order`, then ID. Rooms must have `available === true` and positive available slots. Property and room rents remain distinct. Numeric rents are normalized for display. Missing description/deposit/photos/amenities/rooms have explicit display fallbacks.

## Screens and navigation

Home keeps its existing hero, quick actions, owner card, horizontal cards and recent cards. Its incomplete direct query was replaced by the shared service, with focus refresh, loading, empty and retry states. Cards display real locations, property type, rent, verification and room slot totals. Existing logo placeholders remain. There were no mock listing arrays in the inspected Home snapshot; its local-only favorite implementation was removed. No demo listings were introduced.

Home's search submission forwards the entered text to Search. Home, Search and Favorites cards all navigate to the existing details route with real UUIDs.

Search replaces the placeholder with real listings and supports case-insensitive partial text search across name, address, barangay and city; exact city and property type; and inclusive minimum/maximum property-level monthly rent. Clearing filters returns to all public listings. Blank prices are unrestricted. Invalid, negative, non-finite or inverted prices produce friendly validation messages before querying. Search input is debounced by 300 ms and superseded requests are cancelled/ignored. Search retains safe-area handling and allows keyboard interaction with its scrolling form. The previous Search UI had no amenity or availability filters to reconnect.

Details fills the existing empty route. It shows name, type, verification, all ordered photos, full address, description, property rent, deposit, utility inclusion, amenities and available rooms with their own rent, description, capacity and open slots. It refreshes on focus and handles invalid/unavailable listings and retryable errors. No private landlord information is requested. No public landlord profile contract was available in the repo.

`app/(tenant)/property/apply.tsx` was empty before this task, so there was no existing Apply flow to connect. Details does not link to an empty screen or invent an application workflow. The existing route declaration remains untouched.

Favorites now reads real saved listings and excludes listings that later become inactive/unverified. Hearts work on Home, Search and Details; Favorites permits removal and details navigation. State refreshes on focus. Favorite controls remain disabled until state has loaded and during mutations. Mutations update UI only after confirmation, so failures preserve the preceding state and show a retryable error.

Favorite user IDs come from `auth.getUser()` rather than a caller-supplied ID. Every read/delete includes `user_id`; inserts contain authenticated `user_id` and `property_id`. Save rechecks current property visibility. Existing favorites are checked before insertion, same-user/listing mutations are serialized in this client, and database unique conflicts are accepted only after a confirming read. Deletes are also checked afterward to catch silently blocked deletion. Cross-device duplicate prevention depends on the existing unique constraint; its presence could not be inspected with the permitted credentials.

## Verification

- `npm.cmd run typecheck`: passed.
- `node --test tests/*.test.cjs`: 53 passed, 0 failed, including all existing auth, landlord-management and submission tests.
- New tests cover visibility, unavailable details, invalid IDs, price validation, search construction/escaping, cover ordering, room availability/rent preservation, empty results, authenticated favorite reads/add/remove, duplicate/concurrent saves, hidden favorites, failed and silently blocked mutations, unauthenticated requests, pagination, and child helpers for hidden properties.
- Tests use mocked clients and do not depend on live Supabase.
- Separate read-only live checks confirmed `favorites.property_id` and `favorites.user_id` exist; `tenant_id` and `id` do not. Checks used `limit=0`, retrieving no tenant rows.
- A zero-row request accepted the complete property field selection, related-table joins, active/verified filters and quoted text search syntax.

No confirmed database or RLS defect was discovered. The public API metadata endpoint required privileged access, which was not used. Zero-row checks validate API shape, not row visibility or authenticated permissions. Tenant-specific favorites INSERT/DELETE/SELECT policies, cross-user isolation, unique constraints, activation/deactivation behavior and rendered Android/web interaction require the manual checks below. No live favorite mutations were attempted.

## Android and web checklist

Run these checks on both platforms using existing tenant accounts and legitimate listings. Do not weaken RLS to make a check pass.

1. Launch Android with `npm.cmd run android` (or the existing development build) and web with `npm.cmd run web`; sign in as a tenant.
2. Have an eligible listing created through landlord management and verified/activated through the existing authorized workflow. Return to Home without restarting; confirm it appears. Confirm pending, draft, rejected, inactive and unverified listings are absent.
3. Check Home's photo/logo fallback, name, property type, barangay/city/province, rent, verified badge and available slot count. Check quick actions and owner mode switching still navigate normally.
4. Submit a Home search and confirm the text reaches Search. Search separately by name, address, barangay and city, including apostrophes, commas, quotes, `%` and `_`; confirm no request syntax errors.
5. Set an exact city and property type matching a real listing (for example the owner's `Apartment`, `Boarding House` or `Dormitory` value). Set minimum and maximum rent; verify inclusive boundaries. Clear filters and verify public listings return.
6. Enter invalid rent, negative rent and minimum greater than maximum; confirm friendly validation. Search for a nonexistent location; confirm an empty state. Type several queries quickly and confirm the final query wins.
7. Open a listing from Home and Search. Confirm its UUID, full address, description, utilities, deposit, amenities and every photo. Verify cover-first and sort-order behavior. Verify room rent can differ from property rent, capacity/open slots are accurate, and unavailable/zero-slot rooms are excluded.
8. On web, open `/property/not-a-uuid` and then the details URL with a real pending/inactive/unverified UUID. On Android, navigate to equivalent existing detail links. Confirm the unavailable state and that hidden property content never loads.
9. Save from Home, navigate to Details, Search and Favorites, and confirm consistent saved state. Rapidly tap Save; verify only one row for this user/property in the existing database. Return/reload/restart and confirm persistence.
10. Remove a favorite from Favorites and from Details. Confirm it disappears from Favorites and other hearts update when those screens regain focus.
11. Deactivate or unverify a saved listing through the existing authorized workflow. Revisit Favorites, Home, Search and Details; confirm the listing is hidden/unavailable and cannot be newly saved.
12. Sign in as a second tenant. Confirm the first tenant's favorites are not visible. Validate SELECT/INSERT/DELETE isolation and the existing unique constraint through your normal database review tools; report failures without altering policies as part of this implementation.
13. Disable network or simulate denied reads/writes. Confirm friendly errors, Retry recovery, no false saved/removed state and no raw backend details in the UI.
14. Check screens with a small device, bottom safe area and open Search keyboard. Scroll the details gallery and long room/amenity lists. Verify no clipped navigation or inaccessible controls.
15. Revisit Applications, Profile, Smart Match, Notifications, Messages and owner/tenant switching; confirm behavior matches the preexisting app. Apply remains unimplemented as it was before Step 7.
