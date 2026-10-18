# Retain current assignment state rather than ownership history

The MVP keeps a slot’s current owner/state and latest transition metadata; replacement changes the existing slot, and conflict lists and suppression history are not retained. This deliberately limits the model to the agreed scheduling workflows rather than the excluded ownership-audit and suppression-analytics features; delivered notification text is retained independently so a later transition does not rewrite a past message.

The operational rules are maintained in [MVP design section 6](../mvp-design.md#6-slot-lifecycle-and-capacity), with notification behavior in [section 10](../mvp-design.md#10-notifications-and-understaffing).
