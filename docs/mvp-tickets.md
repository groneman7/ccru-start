# Scheduling MVP ticket map

This document preserves the original ticket-publication breakdown and user-story traceability. It is a publication snapshot, not a current progress report. GitHub Issues are authoritative for current acceptance criteria, status, and blocking relationships. Temporary drafts and publication tooling remain local under the ignored `.scratch/` directory.

Original publication: Published and verified: 32 ready-for-agent sub-issues and 43 native blocking relationships.

Parent spec: [issue #2](https://github.com/groneman7/ccru-start/issues/2). Its title, body, and state were preserved.

At initial publication, all titles and bodies matched the approved breakdown. Each ticket was open, labelled `ready-for-agent`, and attached to the parent in dependency order. Native blocking relationships matched the approved graph.

T01–T32 retain the approved plan identifiers; GitHub issue numbers are linked below. Each feature slice includes its UI, authoritative server behavior, data changes, and meaningful verification. T01 is the read-only retained-data prerequisite. Work any ticket whose blockers are complete.

Incomplete retained data requires an explicit repair decision only for the affected migration or enforcement. The audit does not impose a global hold on unrelated authorization or catalog work, and no repair policy has been invented.

## Initially unblocked tickets

- [#3: Audit retained-data readiness for the scheduling MVP](https://github.com/groneman7/ccru-start/issues/3)
- [#4: Enforce hierarchical roles and independent Officer capabilities](https://github.com/groneman7/ccru-start/issues/4)

## Published tickets

1. **[T01 / #3: Audit retained-data readiness for the scheduling MVP](https://github.com/groneman7/ccru-start/issues/3)**

   **Blocked by:** None (can start immediately). **What it delivers:** A read-only readiness report identifying exactly which retained records need an approved repair policy before affected schema changes or monthly enforcement can proceed. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/3).

2. **[T02 / #4: Enforce hierarchical roles and independent Officer capabilities](https://github.com/groneman7/ccru-start/issues/4)**

   **Blocked by:** None (can start immediately). **What it delivers:** Administrators can grant the two Officer capabilities in the UI, while existing application and authentication operations enforce the approved authority boundaries on the server. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/4).

3. **[T03 / #5: Deliver authorized profile management and user type labels](https://github.com/groneman7/ccru-start/issues/5)**

   **Blocked by:** [#4](https://github.com/groneman7/ccru-start/issues/4). **What it delivers:** Every Officer can view full profiles, and user managers can edit managed profile information and reusable user type labels through working profile screens. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/5).

4. **[T04 / #6: Activate verified registration through required onboarding](https://github.com/groneman7/ccru-start/issues/6)**

   **Blocked by:** [#3](https://github.com/groneman7/ccru-start/issues/3), [#4](https://github.com/groneman7/ccru-start/issues/4). **What it delivers:** Email/password and Google users follow organization registration mode, verify their email, and complete required onboarding before ordinary scheduling access becomes active. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/6).

5. **[T05 / #7: Create invited profiles and atomically claim their identities](https://github.com/groneman7/ccru-start/issues/7)**

   **Blocked by:** [#6](https://github.com/groneman7/ccru-start/issues/6). **What it delivers:** A user manager can pre-create a profile, send/resend/revoke an invitation, and the volunteer can claim that same profile through either supported authentication method. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/7).

6. **[T06 / #8: Create and invite profiles with per-row bulk results](https://github.com/groneman7/ccru-start/issues/8)**

   **Blocked by:** [#7](https://github.com/groneman7/ccru-start/issues/7). **What it delivers:** User managers can submit a multi-row creation/invitation form and retain successful rows even when other rows fail. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/8).

7. **[T07 / #9: Edit own profiles and safely verify email changes](https://github.com/groneman7/ccru-start/issues/9)**

   **Blocked by:** [#5](https://github.com/groneman7/ccru-start/issues/5), [#6](https://github.com/groneman7/ccru-start/issues/6). **What it delivers:** Users can maintain their basic profile and change email without making the unverified new address a sign-in identifier prematurely. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/9).

8. **[T08 / #10: Manage the hierarchical certification catalog](https://github.com/groneman7/ccru-start/issues/10)**

   **Blocked by:** [#4](https://github.com/groneman7/ccru-start/issues/4). **What it delivers:** User managers can create, organize, rename, and safely remove reusable certification definitions in the catalog UI. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/10).

9. **[T09 / #11: Submit and review certifications with a shared inbox](https://github.com/groneman7/ccru-start/issues/11)**

   **Blocked by:** [#5](https://github.com/groneman7/ccru-start/issues/5), [#6](https://github.com/groneman7/ccru-start/issues/6), [#10](https://github.com/groneman7/ccru-start/issues/10). **What it delivers:** Volunteers submit certifications, user managers review them, and a usable in-app inbox supports shared review state, personal dismissal, and rejection messages. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/11).

10. **[T10 / #12: Author position eligibility with branch-preserving explanations](https://github.com/groneman7/ccru-start/issues/12)**

    **Blocked by:** [#11](https://github.com/groneman7/ccru-start/issues/11). **What it delivers:** Schedulers can author validated nested position requirements and users can understand the alternative qualification branches. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/12).

11. **[T11 / #13: Publish valid events and privacy-safe public listings](https://github.com/groneman7/ccru-start/issues/13)**

    **Blocked by:** [#3](https://github.com/groneman7/ccru-start/issues/3), [#4](https://github.com/groneman7/ccru-start/issues/4). **What it delivers:** Schedulers create/edit events with valid local times, and signed-out visitors see only permitted current event details until event end. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/13).

12. **[T12 / #14: Manage saved locations and copy their values into event forms](https://github.com/groneman7/ccru-start/issues/14)**

    **Blocked by:** [#13](https://github.com/groneman7/ccru-start/issues/13). **What it delivers:** Every Officer can maintain saved locations and use editable autofill in event forms without later source edits changing existing events. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/14).

13. **[T13 / #15: Assign volunteers through lifecycle-aware shifts and atomic capacity](https://github.com/groneman7/ccru-start/issues/15)**

    **Blocked by:** [#7](https://github.com/groneman7/ccru-start/issues/7), [#12](https://github.com/groneman7/ccru-start/issues/12), [#13](https://github.com/groneman7/ccru-start/issues/13). **What it delivers:** Schedulers can create shifts and assign active or invited users with authoritative confirmed/pending state, reserved capacity, conflict explanations, and in-app outcomes. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/15).

14. **[T14 / #16: Show volunteer rosters and restricted assignment history](https://github.com/groneman7/ccru-start/issues/16)**

    **Blocked by:** [#15](https://github.com/groneman7/ccru-start/issues/15). **What it delivers:** Active volunteers can browse events and rosters and access their own relevant history without receiving other volunteers' review/profile information. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/16).

15. **[T15 / #17: Enforce monthly event participation and assignment priority](https://github.com/groneman7/ccru-start/issues/17)**

    **Blocked by:** [#15](https://github.com/groneman7/ccru-start/issues/15). **What it delivers:** Schedulers configure the monthly limit and assignment decisions consistently rank distinct event participation in America/New_York. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/17).

16. **[T16 / #18: Review pending slots and suppress current conflicts](https://github.com/groneman7/ccru-start/issues/18)**

    **Blocked by:** [#17](https://github.com/groneman7/ccru-start/issues/17). **What it delivers:** Schedulers can approve or reject reserved pending assignments in the shared review UI and volunteers receive the appropriate immutable decision message. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/18).

17. **[T17 / #19: Request vacant seats with confirmed or pending outcomes](https://github.com/groneman7/ccru-start/issues/19)**

    **Blocked by:** [#16](https://github.com/groneman7/ccru-start/issues/16), [#18](https://github.com/groneman7/ccru-start/issues/18). **What it delivers:** An active volunteer can request a vacant seat before event start, receive one confirmation when eligible, or reserve a pending seat with understandable conflict reasons. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/19).

18. **[T18 / #20: Move and remove assignments through scheduler drag and drop](https://github.com/groneman7/ccru-start/issues/20)**

    **Blocked by:** [#18](https://github.com/groneman7/ccru-start/issues/18). **What it delivers:** Schedulers can reassign or remove volunteers atomically, including after start, with correct capacity, priority, and notifications. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/20).

19. **[T19 / #21: Automatically confirm affected eligible pending assignments](https://github.com/groneman7/ccru-start/issues/21)**

    **Blocked by:** [#20](https://github.com/groneman7/ccru-start/issues/20). **What it delivers:** Existing pending assignments confirm automatically when their blockers disappear, without demoting confirmed assignments or introducing edit-driven conflict scans. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/21).

20. **[T20 / #22: Withdraw confirmed assignments and review late requests](https://github.com/groneman7/ccru-start/issues/22)**

    **Blocked by:** [#19](https://github.com/groneman7/ccru-start/issues/19), [#21](https://github.com/groneman7/ccru-start/issues/21). **What it delivers:** Volunteers withdraw immediately outside the late window or retain responsibility in available state inside it, with scheduler release/denial controls. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/22).

21. **[T21 / #23: Claim available slots with atomic volunteer replacement](https://github.com/groneman7/ccru-start/issues/23)**

    **Blocked by:** [#22](https://github.com/groneman7/ccru-start/issues/22). **What it delivers:** A qualifying volunteer or authorized scheduler can replace an incumbent in the same available slot without extra capacity or a pending replacement candidate. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/23).

22. **[T22 / #24: Request scoped conflict rechecks without implicit scans](https://github.com/groneman7/ccru-start/issues/24)**

    **Blocked by:** [#22](https://github.com/groneman7/ccru-start/issues/22). **What it delivers:** Staff editors can explicitly recheck the relevant upcoming assignments, while ordinary edits/reads remain free of conflict scans and available incumbents retain replacement availability. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/24).

23. **[T23 / #25: Notify event changes and irreversibly cancel staffed events](https://github.com/groneman7/ccru-start/issues/25)**

    **Blocked by:** [#22](https://github.com/groneman7/ccru-start/issues/22). **What it delivers:** Assigned volunteers receive logistical event changes, and schedulers can irreversibly cancel an event while retaining the appropriate notification/history access. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/25).

24. **[T24 / #26: Soft-delete shifts and events with cascade provenance](https://github.com/groneman7/ccru-start/issues/26)**

    **Blocked by:** [#25](https://github.com/groneman7/ccru-start/issues/25). **What it delivers:** Schedulers can remove staffing or eligible events without physical deletion, while provenance distinguishes descendants removed together from those deleted independently. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/26).

25. **[T25 / #27: Configure and reconcile timed understaffing alerts](https://github.com/groneman7/ccru-start/issues/27)**

    **Blocked by:** [#26](https://github.com/groneman7/ccru-start/issues/26). **What it delivers:** Schedulers configure optional per-shift thresholds and see real time-driven Warning/Critical alerts without relying on page visits or unrelated edits. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/27).

26. **[T26 / #28: Resolve thresholds individually and reopen recurring understaffing](https://github.com/groneman7/ccru-start/issues/28)**

    **Blocked by:** [#27](https://github.com/groneman7/ccru-start/issues/27). **What it delivers:** Schedulers can manually resolve the current threshold without silencing later urgency, and alerts return when a filled shift becomes vacant again. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/28).

27. **[T27 / #29: Create events from independent templates with copied alerts](https://github.com/groneman7/ccru-start/issues/29)**

    **Blocked by:** [#14](https://github.com/groneman7/ccru-start/issues/14), [#27](https://github.com/groneman7/ccru-start/issues/27). **What it delivers:** Schedulers maintain templates and create one event on a selected date with copied details, local times, location, positions/capacities, and alert thresholds. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/29).

28. **[T28 / #30: Complete reference-data deletion safeguards and retained history](https://github.com/groneman7/ccru-start/issues/30)**

    **Blocked by:** [#29](https://github.com/groneman7/ccru-start/issues/29). **What it delivers:** Staff can safely remove positions, certifications, user types, templates, and saved locations using the approved live-reference restrictions rather than physical deletion or blanket historical blocks. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/30).

29. **[T29 / #31: Deactivate users with immediate session revocation](https://github.com/groneman7/ccru-start/issues/31)**

    **Blocked by:** [#15](https://github.com/groneman7/ccru-start/issues/15). **What it delivers:** User managers can deactivate a user only after upcoming active responsibilities are removed, and successful deactivation immediately ends access. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/31).

30. **[T30 / #33: Restore profiles and reference records through Developer recovery](https://github.com/groneman7/ccru-start/issues/33)**

    **Blocked by:** [#30](https://github.com/groneman7/ccru-start/issues/30), [#31](https://github.com/groneman7/ccru-start/issues/31). **What it delivers:** Developers can inspect and recover retained profiles, reference data, templates, and notification records while preserving original data and revoked-credential safety. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/33).

31. **[T31 / #34: Quietly restore slots and shifts without workflow replay](https://github.com/groneman7/ccru-start/issues/34)**

    **Blocked by:** [#24](https://github.com/groneman7/ccru-start/issues/24), [#28](https://github.com/groneman7/ccru-start/issues/28), [#33](https://github.com/groneman7/ccru-start/issues/33). **What it delivers:** Developers can restore a standalone slot or shift with original assignment state/priority while recoverable scheduling conflicts are suppressed and structural failures reject atomically. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/34).

32. **[T32 / #35: Restore event cascades atomically and preserve cancellation](https://github.com/groneman7/ccru-start/issues/35)**

    **Blocked by:** [#34](https://github.com/groneman7/ccru-start/issues/34). **What it delivers:** Developers can recover an event and exactly the descendants deleted with it in one quiet operation, without reinstating a cancelled event or partially restoring invalid staffing. [Acceptance criteria](https://github.com/groneman7/ccru-start/issues/35).

## Coverage map

| Parent user story | Tickets                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| 1                 | T11 / #13                                                                              |
| 2                 | T11 / #13                                                                              |
| 3                 | T04 / #6                                                                               |
| 4                 | T05 / #7                                                                               |
| 5                 | T04 / #6                                                                               |
| 6                 | T04 / #6                                                                               |
| 7                 | T04 / #6                                                                               |
| 8                 | T04 / #6, T07 / #9                                                                     |
| 9                 | T04 / #6, T07 / #9                                                                     |
| 10                | T07 / #9                                                                               |
| 11                | T07 / #9                                                                               |
| 12                | T07 / #9                                                                               |
| 13                | T05 / #7                                                                               |
| 14                | T05 / #7                                                                               |
| 15                | T05 / #7                                                                               |
| 16                | T05 / #7                                                                               |
| 17                | T05 / #7                                                                               |
| 18                | T06 / #8                                                                               |
| 19                | T06 / #8                                                                               |
| 20                | T05 / #7, T13 / #15                                                                    |
| 21                | T04 / #6, T05 / #7                                                                     |
| 22                | T29 / #31                                                                              |
| 23                | T29 / #31                                                                              |
| 24                | T02 / #4, T03 / #5, T12 / #14                                                          |
| 25                | T02 / #4                                                                               |
| 26                | T02 / #4                                                                               |
| 27                | T02 / #4                                                                               |
| 28                | T02 / #4                                                                               |
| 29                | T04 / #6, T05 / #7                                                                     |
| 30                | T03 / #5, T28 / #30                                                                    |
| 31                | T08 / #10                                                                              |
| 32                | T09 / #11                                                                              |
| 33                | T09 / #11                                                                              |
| 34                | T09 / #11                                                                              |
| 35                | T09 / #11                                                                              |
| 36                | T09 / #11                                                                              |
| 37                | T08 / #10, T09 / #11, T28 / #30                                                        |
| 38                | T09 / #11                                                                              |
| 39                | T10 / #12                                                                              |
| 40                | T10 / #12                                                                              |
| 41                | T10 / #12, T17 / #19                                                                   |
| 42                | T10 / #12                                                                              |
| 43                | T14 / #16                                                                              |
| 44                | T17 / #19                                                                              |
| 45                | T13 / #15, T17 / #19                                                                   |
| 46                | T13 / #15, T17 / #19                                                                   |
| 47                | T17 / #19                                                                              |
| 48                | T17 / #19                                                                              |
| 49                | T13 / #15, T16 / #18, T18 / #20                                                        |
| 50                | T16 / #18                                                                              |
| 51                | T16 / #18, T17 / #19                                                                   |
| 52                | T13 / #15                                                                              |
| 53                | T18 / #20                                                                              |
| 54                | T13 / #15, T27 / #29                                                                   |
| 55                | T13 / #15                                                                              |
| 56                | T24 / #26                                                                              |
| 57                | T13 / #15, T15 / #17                                                                   |
| 58                | T15 / #17                                                                              |
| 59                | T15 / #17, T18 / #20, T19 / #21                                                        |
| 60                | T15 / #17, T20 / #22                                                                   |
| 61                | T20 / #22                                                                              |
| 62                | T20 / #22                                                                              |
| 63                | T20 / #22, T21 / #23                                                                   |
| 64                | T20 / #22                                                                              |
| 65                | T21 / #23                                                                              |
| 66                | T21 / #23                                                                              |
| 67                | T21 / #23                                                                              |
| 68                | T15 / #17, T21 / #23                                                                   |
| 69                | T16 / #18, T17 / #19, T20 / #22                                                        |
| 70                | T17 / #19, T20 / #22, T21 / #23                                                        |
| 71                | T18 / #20, T20 / #22, T21 / #23                                                        |
| 72                | T13 / #15, T16 / #18, T18 / #20, T19 / #21                                             |
| 73                | T22 / #24                                                                              |
| 74                | T22 / #24                                                                              |
| 75                | T22 / #24                                                                              |
| 76                | T22 / #24                                                                              |
| 77                | T22 / #24                                                                              |
| 78                | T22 / #24                                                                              |
| 79                | T22 / #24                                                                              |
| 80                | T19 / #21                                                                              |
| 81                | T15 / #17, T19 / #21                                                                   |
| 82                | T19 / #21, T20 / #22, T22 / #24                                                        |
| 83                | T11 / #13, T27 / #29                                                                   |
| 84                | T23 / #25                                                                              |
| 85                | T23 / #25                                                                              |
| 86                | T23 / #25                                                                              |
| 87                | T14 / #16, T23 / #25                                                                   |
| 88                | T24 / #26                                                                              |
| 89                | T11 / #13, T14 / #16, T28 / #30                                                        |
| 90                | T27 / #29                                                                              |
| 91                | T27 / #29, T28 / #30                                                                   |
| 92                | T12 / #14, T27 / #29                                                                   |
| 93                | T14 / #16                                                                              |
| 94                | T14 / #16                                                                              |
| 95                | T14 / #16, T23 / #25                                                                   |
| 96                | T13 / #15, T16 / #18, T20 / #22, T22 / #24                                             |
| 97                | T09 / #11                                                                              |
| 98                | T09 / #11, T16 / #18, T26 / #28                                                        |
| 99                | T09 / #11, T16 / #18, T22 / #24, T23 / #25, T26 / #28                                  |
| 100               | T09 / #11, T13 / #15, T16 / #18, T18 / #20, T19 / #21, T20 / #22, T21 / #23, T23 / #25 |
| 101               | T17 / #19, T19 / #21, T21 / #23                                                        |
| 102               | T09 / #11, T16 / #18, T19 / #21, T21 / #23, T23 / #25                                  |
| 103               | T25 / #27, T27 / #29                                                                   |
| 104               | T25 / #27, T26 / #28                                                                   |
| 105               | T25 / #27                                                                              |
| 106               | T25 / #27                                                                              |
| 107               | T26 / #28                                                                              |
| 108               | T25 / #27, T26 / #28                                                                   |
| 109               | T08 / #10, T12 / #14, T13 / #15, T24 / #26, T28 / #30, T29 / #31, T30 / #33, T31 / #34 |
| 110               | T30 / #33, T31 / #34, T32 / #35                                                        |
| 111               | T30 / #33, T31 / #34, T32 / #35                                                        |
| 112               | T24 / #26, T32 / #35                                                                   |
| 113               | T31 / #34, T32 / #35                                                                   |
| 114               | T01 / #3, T13 / #15                                                                    |
| 115               | T01 / #3                                                                               |

## Retained-data follow-ups published October 19, 2026

The approved audit follow-up added two issues and clarified four existing issues. This records publication scope; current completion and dependencies are maintained in GitHub.

| Issue                                                    | Published follow-up                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [#36](https://github.com/groneman7/ccru-start/issues/36) | Reconcile the retained migration baseline without losing history.                                                                              |
| [#37](https://github.com/groneman7/ccru-start/issues/37) | Capture assignment times and backfill approved UUID-based legacy priority; depends on #36 and #4.                                              |
| [#6](https://github.com/groneman7/ccru-start/issues/6)   | Complete retained onboarding requirements through normal workflows while preserving explicit roles/statuses; add #36 as a schema prerequisite. |
| [#13](https://github.com/groneman7/ccru-start/issues/13) | Tighten event-time constraints using validated retained values; add #36 as a schema prerequisite.                                              |
| [#15](https://github.com/groneman7/ccru-start/issues/15) | Build the assignment lifecycle on #37's authoritative timestamp contract.                                                                      |
| [#17](https://github.com/groneman7/ccru-start/issues/17) | Consume accepted legacy and new assignment times through its existing dependency on #15.                                                       |

The approved UUIDv7 legacy-priority decision supersedes the initial absence of a timestamp-repair policy. Its durable definition is in the [dated design follow-up](mvp-design.md#october-18-2026-approved-assignment-time-follow-up), with the [migration and write contract](assignment-times.md) and [implementation notes](mvp-implementation-notes.md). The [retained-data audit](audits/2026-10-18-retained-data.md) remains a historical snapshot.

Existing deletion/retention work stays in #4, #20, #22, #26, #29, #30 and #31; the publication added no duplicate deletion tickets. #36 gates affected retained-schema changes, rather than unrelated work. #37 requires server-enforced scheduling permissions from #4. #15 consumes #37; #17 already depends on #15, so a separate direct #37 blocker was unnecessary.
