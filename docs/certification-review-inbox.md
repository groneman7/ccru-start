# Certification review and in-app inbox

Issue [#11](https://github.com/groneman7/ccru-start/issues/11) adds user-certification records independently of the catalog, profile controls, shared user-management reviews and personal rejection messages. It does not add certification dates, new eligibility dimensions, work claiming, email delivery or assignment-resolution behavior owned by later scheduling slices.

## Profiles and decisions

`My profile` links to the existing permitted profile screen. Its certification section lets volunteers submit a catalog qualification, edit a pending submission, withdraw a pending submission, or edit/resubmit a rejected record. Pending edits retain pending state; rejected resubmission uses the same relation ID. User managers can add a qualification as verified immediately, approve/reject pending records, and remove verified qualifications. Full profile viewing by an Officer does not grant mutation authority. Normal reads exclude deleted links and definitions, and current labels come from the catalog rather than a snapshot.

One live relation per profile/qualification prevents duplicate qualification records. A rejected record remains live and is resubmitted through its existing edit control. A withdrawn record is retained with its deletion marker; a later new submission may create a new relation. There is no qualification verification based on user type or platform role.

CASL remains the permission vocabulary for both UI and server operations. Client-supplied actor/role/status values do not establish authority. Writes include the displayed relation version; edits, withdrawal and competing review decisions reject stale versions. Editing a verified record is not a volunteer action; managers remove/add the correct qualification instead.

## Inbox behavior

`/inbox` shows personal outcomes plus shared review items when the actor currently has effective user-management authority. There is no claim or assignee. Shared items are not statically limited to the managers present at submission: a newly granted manager sees current pending work, while a revoked manager loses shared visibility even if they previously read it.

Recipient read/dismiss timestamps are independent. Dismissal hides the item only for that actor and retains their delivery state; it does not resolve the shared review. Approval, rejection and withdrawal resolve the open review globally in the same transaction as the underlying change. Pending edits keep the existing review item and recipient state current. Rejected resubmission creates a new open review item with fresh recipient state while retaining the resolved original. The inbox refreshes after local actions, polls every 15 seconds and offers manual refresh. History includes resolved/dismissed non-deleted items.

Rejection optionally creates a retained comment and always creates a personal message for the volunteer. Delivered message text is copied into the notification and is immutable; later resubmission, comment replacement, review decisions and catalog renaming cannot rewrite it. Replacing the current rejection comment soft-deletes the old comment. Notification/comment records have deletion metadata, physical deletion is rejected, and per-recipient dismissal remains separate from any future privileged global deletion. Approval and manager creation produce no certification-approval message.

## Transactions and retained references

The installed Drizzle 0.45.2 Neon HTTP session throws `No transactions support in neon-http driver` from its interactive transaction method. Neon documents HTTP queries and non-interactive transactions separately from session/interactive transactions. This feature preserves the existing adapter and executes one PostgreSQL command function per domain write; the relation, comment, review closure/creation and any personal message commit or roll back together. [Neon driver documentation](https://neon.com/docs/serverless/serverless-driver).

Migration `0008_certification_review_inbox` creates four initially empty tables: user-certification relations, comments, notifications and recipient states. It does not infer qualifications from the catalog or backfill messages for existing people. Existing tables and records remain unchanged.

The relation reference guard and catalog guard share the catalog mutation lock introduced in #10. A non-deleted relation blocks catalog deletion regardless of pending/verified/rejected status. Deleted relations retain references and do not block; restoration beneath a deleted definition fails. Parent/child catalog restrictions remain intact. Both catalog deletion/link creation race orderings are rehearsed, as are simultaneous review decisions and rollback when notification delivery fails inside the transaction. These database mutation guards require Read Committed snapshots; ordinary application commands use that isolation.

## Rollout and verification

Apply migration 0008 using the [guarded migration procedure](database-migrations.md), with a fresh backup and separate authorization, **before starting the updated application**. Implementation does not authorize retained-target migration, deployment or real external messages.

Tests use real authentication, server operations, profile/inbox rendering, public UI callback props and isolated PostgreSQL migration/compatibility fixtures. They cover the complete submission/review lifecycle, changing grants, private delivery state, copied immutable text, filtered deleted relations, current labels, intentional absence of approval messages and transactional failures/races. Historical preservation projections retain their original table scope; this feature separately proves its four new tables start empty and all thirteen previous tables remain unchanged.
