# Scheduling

Volunteer staffing for one organization’s clinic and other events. These terms describe the agreed scheduling domain.

## Language

**Event**:
One clinic or other event occurrence.

**Position**:
A reusable staffing role with global eligibility requirements.

**Shift**:
One position associated with one event, with a maximum slot count.

**Slot**:
A particular user’s assignment to a shift, including retained former assignments. Empty seats are vacancies, not slots.

**Template**:
A creation-time blueprint for one event on a selected date.

**Scheduler**:
An Officer with scheduling-management permission, an Administrator, or a Developer.

**User manager**:
An Officer with user-management permission, an Administrator, or a Developer.

**Upcoming**:
An event whose start is strictly in the future at the time of an operation.

**Active-capacity slot**:
A confirmed, pending, or available assignment that has not been soft-deleted and occupies capacity.

**Pending slot**:
An assignment that reserves capacity and requires scheduler review.
_Avoid_: Waitlist entry, pending review

**Available slot**:
A confirmed incumbent’s late-withdrawal request, which retains the incumbent’s responsibility and occupied capacity until release or replacement.

**Suppression**:
A scheduler’s approval of an individual assignment despite all its current conflicts.
_Avoid_: Eligibility override

**Certification**:
A qualification in the organization’s hierarchical catalog. Only a user’s verified certifications satisfy automatic eligibility.

**User type**:
A profile label that confers neither scheduling eligibility nor platform permissions.

**Cancellation**:
An irreversible event state that cancels its active-capacity assignments.

**In-progress event**:
An event whose start has been reached and whose end has not yet been reached.

**Past event**:
An event whose end has been reached.

**Monthly participation**:
One volunteer’s involvement in one event through at least one active-capacity slot, belonging to the calendar month of that event’s start in the organization’s timezone.

**Assignment priority**:
A volunteer’s place in assignment-creation order for monthly-limit evaluation. Event participation uses the earliest of the volunteer’s remaining active-capacity assignments in that event.
