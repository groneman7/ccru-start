# Event publication and public visibility

Issue [#13](https://github.com/groneman7/ccru-start/issues/13) adds valid event windows and signed-out event pages at `/events` and `/events/:eventId`. The sign-in page links to the public list.

## Time rules

Every event has a finite start and end instant. End must be strictly later, and both instants must fall on the same calendar date in `America/New_York`. A UTC-date boundary is allowed when the organization date remains the same. New events publish immediately; there is no draft or cross-midnight mode.

Event operations accept ISO timestamps with an explicit UTC offset or `Z`; host-local strings are rejected. Event forms interpret entered date/time values in America/New_York, display that timezone, reject nonexistent spring-forward times, and offer the first/second occurrence of a repeated fall-back hour. Editing preserves the existing occurrence. Templates use organization-local times when creating an event; their default is the first occurrence of a repeated hour, and events can be edited to select the other occurrence. A template without valid times cannot create an event; no end value is inferred. General template management/constraints remain part of the template slice.

The authoritative event phase is upcoming before start, in progress from start inclusive until end exclusive, and past at end. Scheduler `byId` responses include that phase. Calendar month queries use organization-local month boundaries, and calendar grouping/event details/assignment confirmation display organization-local dates and times.

## Public audience

`publicEventServerFns.list` and `byId` use an explicit database projection: opaque event ID for navigation, name, description, location and start/end. The location is additionally projected to name/address fields so unexpected JSON properties cannot leak. No authentication/session/profile lookup, staffing join, creator, position, capacity, vacancy count, assignment, roster name or profile data enters these responses. Signed-out access to authenticated scheduling operations remains denied.

Only non-cancelled, non-deleted events whose end is strictly in the future are public. Public detail returns no event for unavailable IDs, and the route returns 404 without event data. Public RPC and page responses use `Cache-Control: no-store`; route loaders fetch fresh data. Loaded public pages hide an event at its end with a timer even if the visitor does not navigate. Public pages provide event details only; signup and assignment commands retain their authenticated boundaries.

Schedulers may edit past events indefinitely. Existing relationship queries continue to read current positions/users rather than snapshots. Event edits still do not send assignment notifications; those belong to the later assignment/cancellation integration. Cancellation/deletion timestamps support public exclusion, while their mutation/cascade workflows remain in their respective tickets.

## Retained data and rollout

The October 21 read-only target audit revalidated all 17 events and 2 templates: none had missing, reversed, non-finite or invalid local-date event windows. No retained values were modified.

Migration `0011_published_events` revalidates every retained event before any DDL. Unexpected invalid values abort the transaction with an explicit correction message. It makes event end non-null, adds the fixed-zone finite/positive/same-date check, and adds nullable cancellation/deletion timestamps. Existing instants remain unchanged; no duration or historical state is inferred.

Apply the reviewed migration before starting this application revision. Target execution requires separate approval and a fresh verified backup. This implementation uses isolated databases and sends no real external messages.

## Verification

Tests use real auth/RPC and signed-out SSR routes, public UI props and the approved clock seam, and isolated PostgreSQL migrations/SQL. The application fixture runs in Pacific/Honolulu; SQL constraint checks also change session timezone. Checks cover exact start/end boundaries, strict public payload keys including nested location, cancellation/deletion, no public past access, past editing/current references, template-copy offsets, DST controls and open-page expiry. Migration rehearsals preserve the complete preceding dataset, reject invalid retained rows without modifying them, and enforce constraints on subsequent writes.
