# Profile management and user types

Issue [#5](https://github.com/groneman7/ccru-start/issues/5) replaces the placeholder profile route and adds reusable user-type management within the existing application.

## Access and editing

Every active Officer, Administrator and Developer can view another non-deleted profile's full name, photo, contact information, verification state, role, profile status and current user-type label. An ordinary User can read only their own profile. CASL rules in `src/server/permissions/index.ts` are shared by the controls and authoritative server operations; those operations resolve a fresh trusted session.

User managers can edit basic profile fields on others' profiles. Active or invited identities retain own basic-profile editing. First and last names are required when saving; middle name, photo URL, post-nominals and phone are optional on a managed profile. Supplied phones require a country code and normalize ordinary spaces, parentheses, dots and hyphens. Display names are generated from the first, optional middle and last names by the profile edit operation. It accepts no email, role, status, grant, verification, completion or deletion fields. Email changes and activation/onboarding remain owned by their separate workflows.

User managers can create, rename, assign, clear and soft-delete reusable user types. Every type has a stable ID; renaming changes its current label in profile and session projections without taking a snapshot. A user type never changes system role, Officer grants, or eligibility. The existing staffing selection retains its six-field projection and adds no contact, verification or permission fields.

Profiles are at `/admin/users/:userId/profile`; labels are managed at `/admin/user-types`, linked from the admin sidebar. Viewing either screen grants no mutation authority. Profile and type mutations invalidate the relevant profile, directory, session and type queries. Certification and history content remain in their own tickets.

## Retention and concurrency

Forward migration `drizzle/mvp/0005_retained_user_types.sql` adds nullable `deleted_at` markers to profiles and user types without changing existing business values or marking any existing records deleted. Profile deletion workflows themselves are not implemented by this ticket. Inactive profiles are retained, non-deleted references and still block type deletion.

Normal domain reads exclude deleted profiles/types. The unused Better Auth admin list/get profile endpoints are disabled because their generic reads bypass the domain deletion filters; the application's profile pages and server operations remain available to Officers. Deleted actors receive no CASL permissions, and the application session query treats them as signed out. Native authentication updates cannot set deletion metadata. Existing Developer impersonation/session tools retain their own CASL guards.

A database trigger locks the referenced type when a live profile is assigned or restored. A second trigger rejects type soft deletion while any non-deleted profile references it. These protections serialize both race orderings: an assignment that commits first prevents deletion; a deletion that commits first prevents assignment. Deleted references remain intact and do not block deletion. Restoring such a reference later requires a live type; no restoration endpoint is added here. Foreign keys and existing records are retained; no physical deletion or historical workflow replay occurs.

## Apply before running the updated application

The updated profile and authentication queries require the new columns. Apply this migration to the intended database **before** running/deploying this application version. The implementation rehearses it only on disposable fixtures; it does not apply it to the retained target automatically.

Use the [guarded migration procedure](database-migrations.md), select `MIGRATION_DATABASE_URL` explicitly, retain a recoverable backup, inspect the pending plan, and then apply only as a separately authorized operation. Existing baseline and earlier migration files remain immutable. A failed trigger check or migration rolls back in the runner's transaction.

The migration tests cover preservation across all 12 business tables, repeat execution, retained deleted references, inactive-reference blocking, restore rejection and both assignment/deletion races. Real HTTP/SSR and UI checks cover permitted profile rendering and editing, protected-field rejections, each audience's mutation restrictions, minimal selections, current labels, and user-type controls. Earlier timestamp-cutover tests use the legacy SQL write contract at their old schema stage; the current UI commands are tested separately against the complete latest schema.
