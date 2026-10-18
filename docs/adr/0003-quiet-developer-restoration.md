# Developer restoration preserves data and avoids workflow side effects

Developer-only restoration is an exceptional recovery operation, not a routine scheduling action. Preserve original business data, timestamps, and assignment states, suppress recoverable scheduling conflicts, and avoid action-triggered notifications, assignment rechecks, or automatic confirmations; structural integrity failures still reject the operation atomically. This deliberately favors quiet recovery over replaying normal signup and review workflows, while later explicit checks and ordinary alert evaluation can still operate on the restored data.

The operational rules are maintained in [MVP design section 11](../mvp-design.md#11-soft-deletion-and-restoration).
