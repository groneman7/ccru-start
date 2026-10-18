## Parent

https://github.com/groneman7/ccru-start/issues/2

## What to build

Schedulers can create shifts and assign active or invited users with authoritative confirmed/pending state, reserved capacity, conflict explanations, and in-app outcomes.

Parent user stories covered: 20, 45, 46, 49, 52, 54, 55, 57, 72, 96, 100, 109, 114.

## Acceptance criteria

- [ ] Introduce the approved confirmed/pending/available/rejected/cancelled slot lifecycle, orthogonal soft deletion, assignment-creation timestamp, and latest transition comment/actor/time. Confirmed/pending/available occupy capacity; rejected/cancelled/deleted do not.
- [ ] Provide one live shift per event/position, positive integer capacity, and UI/server rejection of capacity reductions below active-capacity occupancy.
- [ ] Before changing the mutation behavior, consolidate existing assignment/capacity writes into one authoritative command and select a supported transactional/concurrency mechanism compatible with the application database adapter. Keep the existing stack.
- [ ] Scheduler assignment admits active and invited profiles, rejects inactive users, evaluates the current eligibility/duplicate-event conflicts, and offers suppress-all confirmed or unsuppressed pending when conflicts exist. No conflict lists or suppression history are persisted.
- [ ] Atomically create the assignment and grow maximum slots by one on scheduler overflow. Concurrent writes cannot produce inconsistent occupancy or lose an update.
- [ ] Connect pending assignments to the shared scheduling queue and deliver the approved affected-volunteer assignment messages through the existing inbox. Optional comments never become backend-required, and absent new comment clears prior text.
- [ ] Preserve legacy records with agreed active/deleted mappings. If retained assignments lack current-owner timestamps, require the explicitly approved repair policy before dependent behavior is enabled; never invent monthly priority.
- [ ] Verify direct authorization, active/invited/inactive assignment, confirmed/pending occupancy, duplicate live shifts, capacity races and overflow rollback, retained data, and current-state UI. Monthly-limit evaluation extends this command in its own slice before volunteer signup is enabled.
- [ ] Deliver the UI, authoritative server behavior, data changes, and meaningful verification needed for this slice together; follow the parent spec and existing architecture decisions. Tests use the approved server-operation/authentication/UI/clock seams as applicable and an isolated database, without production migrations or real external messages.

## Blocked by

- [#7](https://github.com/groneman7/ccru-start/issues/7)
- [#12](https://github.com/groneman7/ccru-start/issues/12)
- [#13](https://github.com/groneman7/ccru-start/issues/13)
