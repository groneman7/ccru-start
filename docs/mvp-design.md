# Scheduling MVP design

Status: approved by the product owner on October 18, 2026 after the grill-with-docs continuation. Section 16 records the conditional schema-migration prerequisite.

## 1. Authority and instructions for implementing agents

This document records the final decisions from the product interview and supersedes conflicting MVP requirements in `test.md`. Later decisions supersede earlier interview answers. Technical recommendations below are implementation guidance, not additional approved business rules.

Implement only the scheduling MVP and its supporting management workflows. Do not reintroduce superseded requirements from section 15. Before implementing a workflow affected by an unresolved decision in section 16, obtain that decision from the product owner; unrelated implementation may proceed. Do not silently select business behavior for an unresolved case.

This document does not authorize deployment, production migrations, or external messages. Creating it does not change the application.

### Document responsibilities

- [GLOSSARY.md](../GLOSSARY.md) defines domain terms.
- This document defines MVP product behavior, acceptance scenarios, and unresolved product decisions.
- [Architecture decisions](adr/) explain consequential design trade-offs; follow their links to the applicable product rules.
- [Implementation notes](mvp-implementation-notes.md) contain technical proposals and dated code observations. Recheck observations against the code before implementation; proposals are not additional approved business rules.

## 2. Scope and terminology

The MVP serves one organization with multiple clinic locations and kinds of events. It contains no patient data. The primary interface is the website.

Included: volunteer scheduling; positions and eligibility expressions; events and templates; users, invitations, certifications and user types; permissions; saved locations; in-app notifications; understaffing alerts; soft deletion and Developer restoration.

Excluded: inventory, clinic-flow management, operational/patient data collection, attendance tracking, multiple organizations, recurring event generation, approval-based registration, historical snapshots, read-only event closure, comprehensive assignment audit history, and suppression analytics. Event types do not need their own managed taxonomy; event names/templates describe them.

Use the canonical terms in [GLOSSARY.md](../GLOSSARY.md) throughout product discussions, code, tests, and tickets. Existing junction-table names do not need changing solely to match domain terminology.

## 3. Roles, capabilities, and access

Each user has exactly one hierarchical system role:

`User < Officer < Administrator < Developer`

Higher roles inherit lower-role privileges. Certifications do not confer platform permissions. User type is a label, not an eligibility or authorization attribute.

For MVP, there are two independently grantable, organization-wide Officer capabilities:

- Scheduling management: manage positions, events, shifts, templates, assignment reviews, assignment/reassignment/removal, conflicts and suppression, withdrawals, event cancellation, alert configuration, monthly limit, and withdrawal-window settings.
- User management: manage profiles, individual/bulk creation and invitations, activation/deactivation, user certifications and verification, certification catalog, user type assignment, and reusable user type labels.

Ordinary Users cannot receive these capabilities. Administrators and Developers have both effectively by role. Do not split these into granular Officer grants for MVP. Administrators can grant/revoke individual capability grants for Officers; Officers cannot delegate permissions.

| Action                                                 | User | Officer                        | Administrator | Developer |
| ------------------------------------------------------ | ---- | ------------------------------ | ------------- | --------- |
| Own basic profile and own certification submission     | Yes  | Yes                            | Yes           | Yes       |
| View other user profile pages in full                  | No   | Every Officer                  | Yes           | Yes       |
| Manage saved locations                                 | No   | Every Officer                  | Yes           | Yes       |
| Manage scheduling                                      | No   | Scheduling grant required      | Yes           | Yes       |
| Manage users/certifications/user types                 | No   | User-management grant required | Yes           | Yes       |
| Grant/revoke Officer capabilities                      | No   | No                             | Yes           | Yes       |
| Change roles among User, Officer, Administrator        | No   | No                             | Yes           | Yes       |
| Grant Developer or change an existing Developer's role | No   | No                             | No            | Yes       |
| Switch registration mode                               | No   | No                             | Yes           | Yes       |
| Restore soft-deleted records                           | No   | No                             | No            | Yes       |

Developers can soft-delete and restore historical items. There is no MVP UI for changing system authorization rules themselves; those remain source-code behavior. Full profile visibility for every Officer is distinct from mutation permissions.

Enforce these rules on server operations and response fields, not only buttons or route navigation. A client-supplied actor ID, role, or grant must never establish authority.

## 4. Settings, users, and registration

Organization-wide settings:

| Setting                           | MVP value/behavior                                                       | Who changes it                                  |
| --------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| Timezone                          | `America/New_York`; use for calendar boundaries and event interpretation | No configurable timezone workflow was requested |
| Monthly event limit per volunteer | Default 3; same value for every volunteer                                | Scheduler                                       |
| Late-withdrawal window            | Default 72 hours before event start                                      | Scheduler                                       |
| Registration mode                 | Initially invitation-only; may switch to open self-registration          | Administrator/Developer                         |

### Authentication and onboarding

- Use Better Auth with email/password and Google sign-in only.
- Open registration: verified email and completed onboarding make the user active, with ordinary end-user scheduling access and no additional approval.
- Required onboarding fields: first name, last name, email, and phone number. Middle name is optional. Generate the display name from first, optional middle, and last name; users do not enter a display name. Photo and post-nominals are optional.
- Require a phone number with a country code; accept ordinary formatting and store a normalized number. Phone verification is not required.
- Users may edit their basic profile and request an email change themselves. Until the new address is verified, the existing verified sign-in information remains usable; the new email must not become a sign-in identifier prematurely.
- User type changes require user-management authority.
- Inactive users cannot sign in or receive new assignments. Deactivation immediately ends existing sessions.
- Deactivation is blocked while the user has upcoming active-capacity assignments; those must first be removed. Cancellation removes slots from active-capacity states.
- Schedulers may assign invited, not-yet-active users. This is the non-active exception; inactive users are not assignable.

### Profile creation and invitations

- A user manager first creates a profile and can then choose to send an invitation to its email.
- First/last names and email are supplied for invitation; middle name is optional and phone may be supplied by the volunteer at onboarding.
- Invitations have no expiration in MVP.
- User managers can resend or revoke an unclaimed invitation. Resending invalidates its previous link; revoking blocks claiming through that invitation. Retain the pre-created profile and assignments. Claimed profiles use normal account-management workflows.
- An unclaimed profile has no volunteer scheduling access until verified sign-in and completed onboarding. Scheduler assignment of invited profiles remains permitted.
- In open-registration mode, revoking an invitation does not prohibit otherwise permitted self-registration. Registration with verified matching email claims the existing profile rather than creating a duplicate. Revoked invitation credentials remain unusable.
- Claim, resend, and revoke operations are atomic. The first completed operation determines what subsequent operations may validly do; a claimed profile cannot subsequently be treated as an unclaimed invitation.
- Verified registration email must match the invited profile email case-insensitively. Either supported authentication method can claim that profile. Do not create a second user for the same invited identity.
- Invitation-only mode denies account creation through either authentication path for an uninvited email and instructs the user to contact the organization.
- Outstanding invitations remain valid if registration mode changes to open.
- Bulk creation/invitation uses a multi-row form, not CSV upload. Process valid rows even when other rows fail, with individual errors.
- A row whose email already belongs to a profile fails; bulk operations do not update or reinvite existing profiles implicitly.
- Invitation email delivery is required despite operational notifications being in-app only. Authentication verification email is also a separate mechanism.

## 5. Certifications and eligibility

### Certifications

The certification catalog is hierarchical. Training level, organizational training, and specialties are certifications/subsets in this hierarchy, not new eligibility dimensions.

User-certification records have verification state separate from the catalog record:

- Volunteer submission: `pending`.
- Added by a user manager: verified immediately.
- Approval by a user manager: verified.
- Rejection: retain a `rejected` record; notify the volunteer, with an optional reviewer comment.
- A rejected submission can be edited and resubmitted on the same record.
- Volunteers may edit or withdraw their own pending certification submissions before review. Editing retains pending state; withdrawal soft-deletes the submission.
- Renaming a catalog certification updates its displayed name everywhere without changing its identity or existing verification.
- Approval itself does not notify the volunteer, but any resulting assignment confirmation does.
- Only verified certifications satisfy automatic eligibility.
- There are no certification effective/expiration dates in MVP.
- Volunteers cannot remove their own verified certifications; a user manager must do that.

### Position expressions

Positions support arbitrary nested `AND`/`OR` logic over only:

1. Verified certifications, either exact match or the selected certification plus any descendant.
2. System role, interpreted hierarchically as a minimum role. No exact-role predicate is needed.

A child certification satisfies a parent-inclusive predicate. User type does not participate. A position with no eligibility expression admits every otherwise assignable active user; scheduler assignment of invited users remains allowed.

There are no event-level or template-level alternative eligibility expressions. The earlier word “override” means approving an individual assignment despite its current conflicts, not editing position rules for an event.

The UI explains unmet requirements before a volunteer submits an ordinary request. With nested logic, explanations must preserve alternative branches rather than present every leaf as independently mandatory.

Validate eligibility expressions and referenced records server-side. `NOT` and additional predicate types are outside the approved expression language. See the [implementation notes](mvp-implementation-notes.md#eligibility-expression-representation) for the proposed representation.

### Other scheduling conflicts

- Multiple positions in the same event: hard stop for end-user requests; schedulers can override.
- Organization-wide monthly limit: counts distinct events, not positions. Multiple slots for one volunteer in one event count once.
- Count all `confirmed`, `pending`, and `available` participation in non-cancelled/non-deleted events. Include past events in the current month. Exclude rejected, cancelled, and soft-deleted slots.
- Determine the calendar month by event start in `America/New_York`, regardless of when signup or replacement occurs. A December replacement for a January event counts toward the replacement volunteer’s January limit and releases the incumbent’s January participation if no other active-capacity slot remains for that event.
- Use assignment creation time, not confirmation time, to rank participation. Warn only on events beyond the limit in creation order.
- Replacing the volunteer starts a new assignment timestamp for the replacement; priority is not inherited from the incumbent. A move between positions within the same event preserves the volunteer’s assignment timestamp; a move to another event starts a new one.
- A volunteer’s priority for an event is the earliest timestamp among their remaining active-capacity slots in that event. Removing their earliest slot can therefore change that event’s priority within the month.
- A volunteer above the limit may request an ordinary vacant slot as `pending`; exceeding the limit is not a hard submission block.
- Overlapping times between separate events are not an MVP conflict rule.

Do not count the candidate's existing slot twice during evaluation. Multiple slots in the same event do not add another monthly event. Restoration preserves original assignment timestamps; its side-effect and conflict boundaries are defined in section 11.

## 6. Slot lifecycle and capacity

| State        | Occupies capacity | Monthly participation | Meaning                                                                   |
| ------------ | ----------------- | --------------------- | ------------------------------------------------------------------------- |
| `confirmed`  | Yes               | Yes                   | Automatically eligible or scheduler approved/suppressed conflicts.        |
| `pending`    | Yes               | Yes                   | Assignment exists and reserves capacity; scheduler review required.       |
| `available`  | Yes               | Yes, for incumbent    | Confirmed incumbent requested late withdrawal; replacement may take over. |
| `rejected`   | No                | No                    | Scheduler rejected request; retain record.                                |
| `cancelled`  | No                | No                    | Event cancellation changed an active-capacity slot.                       |
| Soft-deleted | No                | No                    | Withdrawn, removed, or deleted; retained but hidden normally.             |

Soft deletion can be an orthogonal marker rather than another state value. State and deletion must never accidentally make a deleted slot consume capacity.

Pending is functionally assigned like confirmed, including reservation, monthly counting, and understaffing calculations, except for review UI and the restrictions below. It is not a waitlist. Other volunteers cannot compete for its reserved capacity.

### Assignment actions

| Trigger                                                                   | Result                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| End user requests a vacant seat, passes all checks                        | New `confirmed` slot.                                                                    |
| End user requests a vacant seat, fails eligibility or monthly-limit check | Show reasons; permit submission as `pending`.                                            |
| End user already has an active-capacity slot in this event                | Block another assignment.                                                                |
| Shift full, with no available replacement slot                            | Block end-user request; no pending over-capacity request.                                |
| Scheduler assigns/moves user with no conflict                             | `confirmed`.                                                                             |
| Scheduler assigns/moves user with conflicts                               | Show reasons; allow suppress-all now (`confirmed`) or proceed unsuppressed (`pending`).  |
| Scheduler approves pending                                                | `confirmed`; optional comment.                                                           |
| Scheduler rejects pending                                                 | `rejected`; optional comment; release capacity and notify user.                          |
| Rejected user requests same shift again                                   | Allow a new request/slot; retain rejected record; no retry restriction.                  |
| Scheduler assigns beyond shift capacity                                   | Increase maximum slots by one to accommodate the assignment; do not block.               |
| Scheduler moves an existing user between shifts                           | Atomic move, including checks, optional suppression and destination capacity adjustment. |

End users cannot change positions atomically: they must withdraw and then request another shift, subject to each workflow's restrictions. Schedulers should have drag/drop reassignment.

Every event and template has at most one non-deleted shift/position association for each position. Capacity is an integer of at least one. Represent zero capacity by removing the shift. Capacity reduction below active-capacity occupancy is blocked on the server as well as in UI.

### Withdrawal and replacement

- End users may sign up only strictly before event start.
- End users may make no slot changes once the event starts; schedulers can continue managing slots indefinitely.
- End users may never alter their `pending` slots, even outside the withdrawal window. After submission, show generic instructions to contact schedulers; no in-app contact workflow or configured contact email is required.
- A confirmed volunteer outside the late-withdrawal window withdraws immediately; soft-delete the slot.
- A confirmed volunteer inside the window requests withdrawal; state becomes `available`, preserving the original user and responsibility.
- An available slot still consumes one unit of capacity. UI marks it takeable and shows its incumbent. An unresolved request stays `available` after event start, though only schedulers can then act.
- Scheduler approves late withdrawal: soft-delete the slot, leaving a genuinely vacant seat. Do not notify the volunteer merely because approval happened without a replacement.
- Scheduler denies withdrawal: return `available` to `confirmed`; notify volunteer, with optional comment.
- End-user replacement must pass all automatic checks. Otherwise hard stop: unlike a vacant seat, this request cannot be stored pending. Once incumbent withdrawal is approved and seat is vacant, ordinary pending signup is allowed.
- Scheduler replacement with conflicts must address/suppress them immediately; it cannot leave the replacement pending.
- Successful replacement updates the existing slot's user to the replacement and state to `confirmed`. No separate candidate or retained incumbent slot is required. Latest transition comment notes replacement; notify released incumbent.
- An eligible replacement releases the original volunteer automatically and atomically, without a separate scheduler approval.

### Latest transition metadata

Store current state and only the most recent transition comment/metadata. A full sequence of state changes, historical slot ownership, and suppression analytics are outside MVP.

- Manual comments are optional; UI may encourage them; backend never requires them.
- Suppression covers all current conflicts as one decision.
- Do not persist conflict lists or suppressed conflict identifiers on slots.
- Later requested checks can flag the same previously suppressed conflict again.
- A transition with no new comment clears the prior comment.
- A recheck changing confirmed to pending generates an explanatory system comment, including the relevant change such as position-requirement modification.
- Automatic confirmation generates a system comment explaining that checks pass and notifies the user.
- Latest comments help privileged staff diagnose behavior; approval/rejection comments are delivered to the volunteer through notifications, not placed on the event signup UI.

## 7. Rechecks and automatic resolution

Separate two behaviors:

1. Detection that may newly flag an existing assignment is opt-in.
2. Resolution that can confirm an already pending assignment is automatic when its blocking conditions disappear.

### Opt-in checks

After a relevant edit, the editor may explicitly request assignment checks. Default is OFF. Without opt-in, do not scan existing assignments, show conflict previews/counts, or generate notifications from a scan. Checks during new assignment/replacement actions still always occur.

| Edited entity                  | Default opt-in scope                              |
| ------------------------------ | ------------------------------------------------- |
| User role/certifications       | That user's upcoming slots                        |
| Position requirements          | Upcoming slots for that position                  |
| Event date/time                | Slots in that event, if its new start is upcoming |
| Monthly limit                  | Upcoming slots in affected calendar months        |
| Explicit scheduler-wide action | Option to check all upcoming slots                |

An Officer with user-management capability may request the scoped recheck while editing a user even without scheduling capability. That does not grant manual slot-management powers.

- Confirmed slots with any current conflict become `pending`, even if a scheduler previously suppressed that conflict.
- Pending slots remain pending while checks fail.
- Available slots with a new conflict stay `available`, with scheduler-only conflict warning; do not remove replacement availability.
- Persist that warning as a generic review item with the check requester and time, without saved conflict details. Viewing it does not scan assignments. An explicit recheck supplies current reasons; scheduler suppression clears the warning until a later requested check flags it again.
- Past/in-progress slots are excluded once start is reached.
- Confirmed-to-pending changes appear on the volunteer's own assignment and in scheduler review UI; do not notify that volunteer.
- Lowering monthly limits or changing event dates originally preserved states with warnings. Those answers were superseded by opt-in checks: when requested, conflicting confirmed slots become pending; when not requested, no reevaluation scan occurs.

### Automatic resolution

Automatically reconsider affected upcoming pending slots when a blocking condition disappears, including certification approval, a qualifying role change, another participation being removed, requirements being relaxed, or monthly limit increasing. Confirm only if all current checks pass. No opt-in is required for this resolution path.

Rank all active-capacity event participation for the volunteer within the event-start calendar month, including past participation in that month. A pending assignment may automatically confirm only when its event ranks within the first N participations (N is the monthly limit) and all other current checks pass. Earlier pending assignments retain their rank even while missing a certification; later requests cannot block earlier requests merely by increasing the total count. For example, with limit 3 and requests A/B/C/D in that order, approving B’s certification can confirm B while D stays pending.

A scheduler-approved over-limit assignment stays confirmed and does not take priority away from earlier-ranked pending assignments. Do not automatically demote confirmed assignments as a side effect of the resolution path. It must not turn every mutation into the global conflict scan the product owner explicitly excluded. Scope it to affected users/positions/events/months and pending slots.

Available slots remain withdrawal requests; resolving their eligibility does not approve/deny withdrawal. No automatic closure-time cleanup exists. Past pending slots and unresolved withdrawals may remain in those states until a scheduler changes them.

## 8. Events, templates, and locations

### Events

- New events publish immediately; no draft state.
- Both start and end times are required, and end must be strictly later than start on the same calendar date; cross-midnight events are outside MVP. Apply the same positive-duration rule to templates. Existing records missing end times require manual review and explicit correction; do not infer values.
- Past events are editable indefinitely by schedulers and display current related user, position, and user-type data.
- No historical snapshots, freezing, read-only deadline, close/extend/reopen action, or attendance outcomes.
- Schedulers may assign users after start and to past events; there is no closure-based edit cutoff.
- Changing date, time, location, or cancellation status notifies assigned volunteers. Title/description changes do not.
- Cancellation is a distinct, irreversible state. Change all active-capacity slots to `cancelled`, retain them, exclude them from limits/capacity, and notify those volunteers with standard text plus optional custom message.
- Cancellation disappears from public and ordinary volunteer calendar listings. Affected volunteers retain access through notification/history; schedulers see all events including cancelled ones.
- A cancelled event may subsequently be soft-deleted by a scheduler.
- Event soft deletion is blocked while active-capacity slots exist. Cancel it or remove users first. Rejected/cancelled/already-deleted slots do not block deletion.
- Event deletion cascades soft deletion to related shifts and slots. Never physically delete them.
- A Developer restoring an event restores descendants deleted with that event, but not records independently deleted beforehand.

### Templates

- Create one event for a selected date, copying event details, time values, location values, positions/capacities, and alert thresholds.
- Subsequent template edits never propagate to existing events.
- No recurring-series generation or template eligibility overrides.
- Future events created from a template do not block its soft deletion.
- An optional source-template identifier is provenance only, not a source of live behavior.

### Saved locations

- Every Officer, Administrator, and Developer can manage reusable saved locations.
- Event/template forms allow manual name/address entry or autofill from a saved record.
- Autofill copies values. Later saved-location edits do not update existing events/templates.
- Saved locations follow soft deletion/Developer-only restoration.

## 9. Visibility and UI projections

An event is upcoming before start, in progress from start (inclusive) to end (exclusive), and past at end. Public listings include non-cancelled upcoming/in-progress events and remove them exactly at end; assigned volunteers can access past events through their permitted history from that point. Signup and future-assignment rechecks still stop at start, and scheduler editing remains unrestricted afterward.

| Viewer                     | Events and staffing                                                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed out                 | Non-cancelled upcoming/current events: title/name, date, time, location, description only. No positions, capacities, vacancy counts, names, or assignments. No past-event calendar.                                                                            |
| Active signed-in volunteer | Upcoming events regardless of certifications; roster names; own pending state; available slots with incumbent name and availability. No other users' profile pages. Past-event view only for events where the volunteer was assigned, including cancellations. |
| Every Officer              | Full user profile pages, including contact/certification details, independent of capability grants. Mutation authority still depends on grants.                                                                                                                |
| Scheduler                  | All scheduling events/history including cancellations; review/conflict indicators; assignment management.                                                                                                                                                      |

Other volunteers' pending/review/conflict indicators are scheduler-only. End users see their own pending state, but decision comments/outcomes arrive through notification rather than staffing UI. Public responses must be deliberately projected, not full event/slot objects with fields hidden in the browser.

## 10. Notifications and understaffing

Operational notifications are in-app only. Invitation/authentication emails remain necessary separately. Email changes require verification at the new address and a security notice to the old address, without an operational in-app notification.

### Shared review notifications

- Scheduling review items are global to users with effective scheduling-management authority; no claiming/assignment to one scheduler.
- Pending certification items use the same behavior for user managers.
- Each recipient tracks their own read/dismiss state. One person's dismissal does not dismiss the item for others.
- Resolution closes the underlying item globally. New or recurring conditions can create/reopen an actionable alert according to the rules below.
- A withdrawn pending certification resolves its review item; editing a pending submission keeps the same item current.
- Replacing, releasing, or suppressing an available slot resolves the incumbent’s warning. An unresolved warning remains visible to schedulers after event start, since schedulers can still act.
- Review-item updates do not rewrite already delivered notification text.

### Delivery matrix

| Trigger                                             | Audience and behavior                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Pending slot/review conflict or withdrawal request  | Shared scheduling queue                                                        |
| Pending certification submission                    | Shared user-management queue                                                   |
| Slot approved/rejected                              | Volunteer; optional reviewer comment                                           |
| Slot automatically confirmed                        | Volunteer; generated explanation                                               |
| Certification rejected                              | Volunteer; optional reviewer comment                                           |
| Certification approved                              | No certification-approval notification                                         |
| Confirmed slot becomes pending in requested recheck | Scheduler review UI/queue and own pending indicator; no volunteer notification |
| Late withdrawal approved without replacement        | No volunteer notification                                                      |
| Late withdrawal denied                              | Incumbent volunteer                                                            |
| Automatic replacement                               | Released incumbent volunteer                                                   |
| Scheduler assigns/reassigns/removes volunteer       | Affected volunteer; optional comment                                           |
| Entire shift removed                                | Active-slot volunteers; optional custom message                                |
| Event date/time/location change                     | Assigned volunteers                                                            |
| Event title/description change                      | No notification                                                                |
| Event cancellation                                  | Active-slot volunteers; standard text plus optional custom message             |

Successful confirmed self-signup and replacement claims generate one in-app confirmation. Immediate self-withdrawal shows on-screen success without another in-app notification. Pending self-signup shows pending status and creates the existing shared scheduling review item.

Automatic replacement confirmation should use the ordinary confirmation path for the replacement; avoid duplicate messages from overlapping triggers. The MVP does not need slot-transition history to retain already delivered notification content.

### Understaffing alerts

- Configure multiple thresholds per shift in templates/events. Events without a template configure their own thresholds. Templates copy thresholds at creation.
- No threshold is required for a shift/event to be created.
- Two system-defined severity labels: Warning (amber) and Critical (red); fixed colors, not user-customized.
- Configure lead times in days and hours. When multiple thresholds are active, show one current alert per shift at the highest unresolved severity, with lower thresholds available in its details. Manual resolution remains threshold-specific.
- Thresholds are lead-time conditions relative to event start. Alert when occupancy is below full maximum slots; no separately configurable minimum-filled target.
- Confirmed, pending, and available slots all count as filled. An incumbent's replacement availability does not itself make the shift understaffed.
- Alerts resolve on filling capacity, cancellation/deletion, or the required event end time.
- Schedulers may manually resolve an alert even with vacancies.
- Manual resolution applies to that threshold; reaching a new threshold triggers a new alert.
- If a shift fills and later becomes vacant while a threshold remains active, an alert reappears.
- Individual dismissal is not global manual resolution.

Time-driven thresholds require a reconciliation mechanism that runs without unrelated user edits; choose a supported server job or equivalent mechanism during implementation. Do not implement temporal alerts solely as client-rendered colors.

## 11. Soft deletion and restoration

No domain record is permanently deleted in MVP. Users, catalog records, templates, events, shifts, slots, notifications, and comments use soft deletion/deactivation where appropriate. Latest slot-comment replacement is an explicit exception to full historical retention: a complete transition-comment archive is not required.

- Normal views exclude soft-deleted records; history displays retained non-deleted records according to visibility rules.
- Restoration is Developer-only. Administrators, Officers, and Users cannot restore.
- Deletion checks use domain rules; foreign-key retention alone is not a reason to block every historical reference.
- Only non-deleted references block certification and user-type deletion. Retained soft-deleted links do not block it; restoring a link must pass current restoration checks.
- Restoration is atomic. Retain the original business data and timestamps, including assignment timestamps; restoring is not a new signup.
- For standalone slot, shift, and event restoration, suppress monthly-limit, eligibility, and duplicate-event-participation conflicts. Preserve original assignment timestamps and slot states, including pending and available; confirmed slots remain confirmed. Restored participation counts and retains its original monthly priority. Do not retain conflict lists or suppression history.
- Reject restoration for structural failures: duplicate live shift/position records, insufficient capacity, inactive users, or active assignments beneath cancelled or still-deleted parents. Do not partially restore an event.
- Developer restoration is quiet and exceptional: create no new volunteer/staff notifications or review notifications, perform no assignment rechecks, and trigger no automatic assignment confirmations. Restored data is visible normally; existing review records retain their state and old notifications are not redelivered. Ordinary scheduled understaffing evaluation resumes under the existing alert rules.
- If restored participation pushes another event beyond a volunteer’s monthly limit, do not demote, flag, or notify that assignment automatically. Subsequent signup/replacement evaluations include the restored participation normally; an explicit recheck may flag the conflict later.
- Restoring a cancelled event preserves cancellation and cancelled slot states. Reject restoration of an active assignment under a cancelled or still-deleted parent.
- Authentication cleanup is exempt from domain-record retention: expired/revoked sessions and one-use verification/reset tokens may be physically removed. Retaining a profile must not retain usable revoked credentials.

| Entity                      | Deletion/deactivation restriction                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User                        | Cannot deactivate with upcoming active-capacity slots. Revoke sessions on deactivation.                                                                                  |
| Position                    | Block while referenced by future events or templates. Past-event references alone do not block. Keep joins capable of displaying retained position data for past events. |
| Certification catalog entry | Block while assigned to users, parenting child certifications, or referenced in an eligibility expression.                                                               |
| User type                   | Block while assigned to any profile.                                                                                                                                     |
| Template                    | Events created from it do not block deletion.                                                                                                                            |
| Shift                       | May be removed with active slots; soft-delete those slots and notify users.                                                                                              |
| Event                       | Active-capacity slots block deletion; cancellation is allowed. Cascade soft deletion of descendants once deletion is permitted.                                          |

Restore only descendants deleted in the root operation, retaining independently deleted descendants as deleted. See the [implementation notes](mvp-implementation-notes.md#deletion-provenance) for a proposed way to distinguish them.

## 12. Implementation guidance

Read the [technical proposals](mvp-implementation-notes.md#proposed-data-and-service-design) before designing schema changes or command boundaries. Preserve the product behavior above when refining those proposals.

## 13. Codebase observations

Read the [dated code map and implementation gaps](mvp-implementation-notes.md#current-code-map-and-implementation-gaps) when planning implementation. Reinspect the actual code; those observations describe prior state, not desired behavior.

## 14. Delivery sequence and acceptance checks

Suggested dependency order:

1. Resolve relevant open decisions; introduce lifecycle/deletion foundations, settings, authorization and migrations.
2. Implement user identity/onboarding, invitations/bulk creation, profile access, user types and verified certifications.
3. Implement position expression evaluator, shifts/capacity, creation-time templates and saved-location autofill.
4. Implement slot commands, scheduler drag/drop, withdrawal/replacement and monthly limits with concurrency enforcement.
5. Implement scoped opt-in detection and targeted automatic resolution.
6. Implement notification queues, recipient state, event cancellation, understaffing reconciliation, and lifecycle restoration.
7. Add public/volunteer/history projections and verify complete workflows.

Each feature slice should include schema/service/UI together where practical. Use existing framework conventions; do not replace the application stack merely to implement this specification.

Minimum acceptance scenarios:

- An Officer without scheduling grant cannot mutate scheduling through a direct server call; every Officer can view profiles/manage saved locations.
- A user manager without scheduling grant can verify a certification and opt into a targeted recheck, but cannot manually approve a slot.
- Administrators cannot grant Developer, demote a Developer, or restore deleted records.
- Google cannot create an uninvited account in invitation-only mode; invited email matches case-insensitively and claims one profile.
- Bulk form persists valid rows and reports invalid/duplicate rows independently.
- Deactivation with upcoming active slots fails; successful deactivation terminates sessions.
- Nested AND/OR, descendant-inclusive/exact certification and hierarchical role predicates produce correct explanations/results; user type has no effect.
- Pending signup reserves the seat and counts monthly; a fourth distinct event is pending; two scheduler-created positions at one event count once.
- Concurrent last-seat requests cannot overbook. Scheduler overflow increases capacity; reducing below occupancy fails server-side.
- Ordinary failed eligibility allows pending, while available-slot replacement with failed checks is blocked for an end user and requires immediate suppression for a scheduler.
- Late withdrawal preserves incumbent; denial restores confirmed; replacement updates the same slot and releases incumbent without extra capacity.
- Pending self-edit/withdrawal is blocked; all end-user slot actions stop at start; scheduler operations continue.
- A change without recheck does not scan/notify; scoped requested checks can make upcoming confirmed slots pending, preserve available, and skip past slots.
- Certification approval, qualifying role grants, reduced participation, relaxed requirements, and raised limits automatically confirm qualifying upcoming pending slots without demoting confirmed slots.
- Templates/saved-location edits never propagate to existing event values.
- Cancellation is irreversible, cancels active slots, frees monthly participation and notifies users. Assigned active slots block event deletion.
- Developer event restoration restores only descendants deleted in that cascade.
- Warning/Critical thresholds use full-capacity occupancy including pending/available; manual resolution does not silence a new threshold; alert timeouts work even without page visits.
- Individual notification dismissal does not resolve globally; rejection notifications preserve comments even after later transition-comment clearing.
- Public responses omit staffing/profile details; volunteer history excludes unrelated past events and includes their cancelled events.
- Past events remain editable and show current related data; no accidental snapshot/closure/attendance system is introduced.

### Existing-data schema migration requirements

This concerns updating records already present when the application schema changes, not a feature for importing assignments. Apply it only when existing records must be retained. Preserve existing records: map legacy active slots to confirmed and legacy deleted slots to soft-deleted, retaining users and relationships. Preserve user identities, roles, and explicit statuses. Require review of missing/ambiguous user statuses and missing event/template end times rather than inventing values. Audit physical-delete paths. If retained existing slots actually lack timestamps, their backfill policy must be settled at the schema-migration stage before monthly enforcement. No common migration timestamp or fallback priority order has been approved. Do not infer verification for any unexpected live user-certification data; review it explicitly.

## 15. Superseded decisions: do not implement

| Earlier direction                                                      | Final MVP behavior                                                                                                      |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pending review` naming                                                | `pending`                                                                                                               |
| Event/template eligibility overrides                                   | Global position expressions only; assignment suppression does not change rules                                          |
| Persist each suppressed conflict for later comparison                  | No stored slot conflicts/suppression history; requested rechecks can flag again                                         |
| Full slot-transition/ownership history                                 | Current state and latest comment/metadata only; replacement mutates existing slot                                       |
| Only confirmed slots count monthly                                     | Confirmed, pending, available; distinct events; creation order                                                          |
| Automatic scans after requirement/certification changes                | Detection opt-in, scoped; no preview/scan without request; resolution of existing pending conflicts is automatic        |
| Capacity always blocks scheduler assignment                            | Scheduler overflow expands capacity; reduction below occupancy still blocked                                            |
| Pending user withdrawal within a notice window                         | Users cannot change pending slots at all; generic contact instruction                                                   |
| Pending replacement for an available slot                              | No pending candidate; end user must pass, scheduler must suppress now                                                   |
| Live template alert linkage                                            | Copy all template configuration at creation; no propagation; template deletion not blocked by created events            |
| Closure 24 hours after end/start, irreversible read-only and snapshots | Removed entirely; past events editable, live related data                                                               |
| Resolve unresolved slots/withdrawals at closure                        | No closure cleanup                                                                                                      |
| Reversible event cancellation/reinstatement                            | Cancellation irreversible; active slots become cancelled                                                                |
| Delete event despite assigned volunteers, cascading immediately        | Active-capacity slots block deletion; cancel/remove first, then soft-delete descendants                                 |
| Broad Officer scheduling/user powers                                   | Separate global capability grants; full profile viewing and saved-location management remain available to every Officer |
| Approval-based registration                                            | Deferred; open/invitation-only modes only                                                                               |
| Reject restoration for suppressible scheduling conflicts                | Suppress monthly/eligibility/duplicate-event conflicts; preserve original data, timestamps, and slot states              |
| Notify volunteers about upcoming restored assignments                  | Quiet restoration; no action-triggered notifications, assignment rechecks, or automatic confirmations                   |
| Optional event/template end time                                       | Both start and end times required, on the same calendar date                                                            |
| User-entered display name or optional first/last names                  | First/last required; middle optional; display name generated from name components                                       |

## 16. Remaining decisions and boundaries

The product owner confirmed shared understanding and approved this design on October 18, 2026. The product decisions from the interview are incorporated into the normative sections above; no interview question remains open.

### Conditional schema-migration prerequisite

There is no assignment-import feature. If a future schema migration must retain existing records with missing assignment timestamps or other incomplete required fields, establish an explicit repair/backfill policy before enabling the affected behavior. Inspect the actual retained data first; no fallback ordering or timestamp has been approved. Existing user/status preservation and active/deleted slot mapping are agreed in section 14. This conditional prerequisite does not block unrelated implementation.
