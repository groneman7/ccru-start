# Separate conflict detection from pending-assignment resolution

Detecting new conflicts in existing assignments requires an explicit, scoped recheck, while affected upcoming pending assignments are reconsidered automatically when blocking conditions disappear. This preserves the agreed boundary that an edit alone must not scan assignments or reopen prior scheduler approvals, while allowing pending requests to confirm when eligible. Automatic resolution never demotes confirmed assignments.

The operational rules are maintained in [MVP design section 7](../mvp-design.md#7-rechecks-and-automatic-resolution).
