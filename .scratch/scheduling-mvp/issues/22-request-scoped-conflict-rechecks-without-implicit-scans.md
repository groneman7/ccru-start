## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Staff editors can explicitly recheck the relevant upcoming assignments, while ordinary edits/reads remain free of conflict scans and available incumbents retain replacement availability.

Parent user stories covered: 73, 74, 75, 76, 77, 78, 79, 82, 96, 99.

## Acceptance criteria

- [ ] Add default-OFF scoped opt-in controls to user role/certification, position requirement, event date/time, and monthly-limit edits; schedulers can explicitly request all upcoming slots.
- [ ] Use the approved scopes: that user, that position, the changed event if its new start is upcoming, and affected event-start months. User-management-only Officers may request the edited user's check without manual slot authority.
- [ ] Without explicit detection request, do not scan assignments, show conflict preview/count, or generate scan messages; preserve separate targeted automatic resolution when blockers disappear.
- [ ] Exclude slots once start is reached. Current conflicts demote confirmed to pending even after previous suppression; failing pending remains pending. Generate explanatory system comment and scheduler review/own pending state without volunteer notification.
- [ ] Available with conflicts remains available and gets a generic scheduler-only review item with requester/time, without persisted conflict details. Viewing does not scan; an explicit recheck supplies current reasons.
- [ ] Suppression clears the warning until another requested check; release/replacement resolves it and unresolved warnings remain actionable after start. Integrate with replacement if present, and require later replacement code to preserve this resolution contract.
- [ ] Verify every scope, grants, repeated/suppressed conflicts, no-scan reads/edits, immutable delivered messages, available warning lifecycle, and no automatic start/closure cleanup through server and focused controls tests.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#22](https://github.com/groneman7/ccru-start/issues/22)
