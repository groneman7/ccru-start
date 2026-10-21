# Position eligibility

Issue [#12](https://github.com/groneman7/ccru-start/issues/12) adds global position requirements. Schedulers create and edit requirements on position pages. Event position cards link to the same page so volunteers can see their current qualification result and each alternative branch.

## Expression language

`calendar.positions.eligibility_expression` is nullable JSONB. Null means no qualification requirements. Every non-null expression has `{ version: 1, root: Requirement }`. A requirement is one of:

- `{ type: 'and', children: Requirement[] }`: every child must qualify.
- `{ type: 'or', children: Requirement[] }`: at least one complete child branch must qualify.
- `{ type: 'certification', certificationId: UUID, match: 'exact' | 'descendants' }`: a verified, non-deleted user certification must match the selected certification exactly, or the selected certification/any descendant, respectively.
- `{ type: 'minimum-role', role: 'User' | 'Officer' | 'Administrator' | 'Developer' }`: that role or any higher role qualifies.

Groups require at least one child and can nest recursively. Unknown fields, versions and predicate types are rejected. NOT, exact-role, user type and additional dimensions are not supported. The editor keeps existing children when switching between AND and OR. Explanation trees keep the same branch structure and show met/unmet leaves without presenting every OR alternative as mandatory.

Only live catalog entries can be referenced by a non-deleted position. Existing positions start unrestricted; migration does not infer requirements. Renames use current catalog labels. Certification deletion is blocked while any non-deleted position references it, at any nesting depth. Deleted positions retain their JSON and catalog references. The shared evaluator reads retained catalog labels and excludes deleted qualifications from matching. Restoration of a position with a now-deleted referenced certification is rejected.

## Server boundary and reuse

The existing `positionServerFns.create` / `update` operations enforce scheduler authority through the canonical CASL vocabulary. The new authenticated `positionServerFns.eligibility({ positionId, userId })` reads authoritative facts and returns `assignable`, `requirementsMet`, `eligible`, a branch-preserving `explanation`, and a profile-status reason when applicable. Volunteers may evaluate themselves; schedulers may evaluate other profiles. Client claims about qualifications, status or role are not accepted.

No requirements still requires an active, fully onboarded profile. Schedulers may evaluate invited profiles for assignment. Inactive/deleted profiles never qualify. Certifications and user type do not grant platform permissions.

`evaluatePositionEligibility` loads current facts for this operation. `evaluateRequirements` is the shared deterministic behavior for subsequent assignment, replacement and recheck commands; those commands must supply authoritative facts in their own atomic operation. This slice does not change existing assignment command semantics. Saving requirements neither scans existing assignments nor produces scan previews or notifications. Future targeted pending resolution belongs to its scheduling workflow ticket, consistent with ADR 0001.

PostgreSQL validates expression shape and live references, sharing the certification-catalog advisory mutation lock. Saving a reference and deleting its catalog entry serialize in either order. Physical position deletion is blocked; `deleted_at` supports retained references and future restoration workflows.

## Rollout

Apply reviewed migration `0010_position_eligibility` before starting this application revision. Migration `0009_dev_accounts` is an earlier prerequisite already present in the repository. Run the guarded migration planner against the explicitly selected target. Target execution requires separate authorization and a fresh verified backup. No target migration or real external message is part of this implementation.

Verification uses real authentication/RPC and server-rendered pages, public UI props, and an isolated PostgreSQL migration/SQL compatibility seam. It covers nested alternatives, matching modes, role inheritance, review/deletion states, empty requirements and assignability, permissions, validation, branch rendering/editing, historical data preservation and both catalog/reference race orders.
