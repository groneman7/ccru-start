# Overview

## Primary objective

The primary function of this platform is for scheduling staffing at a local free acute care clinic. There will be no patient information involved. It is exclusively operated by volunteers including board certified physicians, resident physicians, medical students, and other ancilary members such as nurses and pharmacists. The clinic also allows some other people such as graduate/undergraduate shadowing and graduate/undergraduate service-based capstone projects. The main way for users to interact with this platform will be via website.

## Additional objectives

In addition to volunteer scheduling for acute care clinics, the platform should be able to help facilitators manage the flow of any given clinic shift, track inventory, and collect any non-protected data for analyzing/improving clinic operations. This data may include but is not limited to clinic start times, end times, patient check-in/check-out times (deidentified), and disposition information.

# Details & Implementation

## Clinic structure

The organization hosts free acute care clinics operated primarily by medical students with direct supervision from board certified attending physicians. Multiple clinics are hosted with generally regular schedules and predictable volunteer staffing needs; for example, a general acute care clinic may be hosted at a homeless shelter every Monday evening, another may be hosted at a family resource center one Saturday morning per month, an ophthalmology specialty clinic may be hosted at another location two Tuesdays per month, and so on.
Generally, each shift will need at least one supervising physician to oversee trainee work, one or more medical students responsible for checking patients in and collecting vitals/demographics, multiple medical students responsible for seeing patients, and one medical student for facilitating clinic flow, addressing any problems that arise, and providing insight on resources that can be recommended to patients. Other roles include residents who oversee medical students and report to the supervising physician, shadowing students, service-based capstone projects, and ancilary services such as nurses and pharmacists.
Because this is exclusively volunteer-driven, end users should be able to view events for which they can sign up as well as see any upcoming or previous shifts.

## Officers and administrator

Additional features necessary for managing the organization should be permitted to users with certain organizational roles such as developers, administrators (faculty advisors and organizational executive leadership), and officers (users with non-executive leadership roles within the organization). For example, developers should have unrestricted access to all platform functions, administrators should have user management permissions and other important platform functions, and officers should have elevated permissions to access role-specific functions. For instance, an officer tasked with overseeing shift scheduling should be able to create/edit individual events, create/edit event templates, manage all personnell on any given shift (e.g., removing or reassigning users or overriding conflicts in scheduling restrictions [see below]); another officer tasked with managing inventory should be given elevated inventory permissions; all officers should have some basic inventory priveleges to easily facilitate clinic flow.

## End users

End users should have access only to the necessary features that allow them to easily sign up for shifts, change shifts (with some restrictions), see their past and future assignments, and edit basic details on their profile such as name, photo, and contact information.

## Scheduling restrictions

Not all users should be permitted to sign up for all shift positions. For example, a supervising physician role may require a user with any board certification or board certification in a certain specialty—opthalmology for an opthalmology specialty clinic, pediatrics for a general acute care clinic, and so on. Some clinics will have more than one supervising physician role with different requirements (e.g., a general role for any board certification as well as a pediatric specific role). Similarly, only medical students with organizational training (e.g., triage/check-in, patient interviewing, facilitating, etc.) can be allowed to sign up for those shift positions.
In the case that user details are not fully accurate at the time of signing up, an end user should still be permitted to temporarily sign up for the shift which should be sent to officers/administrators for approval. Along these lines, officers/administrators should may also benefit from a dashboard to highlight all conflicts like this as well as warnings for upcoming shifts when certain positions are not filled. These warnings may need to appear differently based on the urgency: a shift within the next 4 days without a supervising physician assigned may warrant a red critical warning while a shift 4-7 days in the future with empty interviewer (medical student) slots may warrant a yellow urgent warning.

## User registration

Users should be able to use a number of methods for authentication including basic username/password and some social providers (e.g., Google). Ideally, medical students and physicians affiliated with the university would be encouraged to use single sign-on; however, that is not likely to be a reality as this platform is not provided by the university and it will likely not be feasible/realistic to work with university cybersecurity etc. to accomplish SSO.
One consideration for registration is to have two modes: one for open registration (e.g., during the beginning of an academic year) and another for restricting registration such that admin/officers must approve registration before the user can access the platform.
Another consideration for expediting registration/onboarding is for admin/officers to create one or more user profiles at once and send invitations to those users.

## Application management

Organizations should have interfaces to manage certain features such as users, events/templates, positions, certifications, etc.

## Other details

At some point, shift data should become static and read-only. This means the information in the database should reflect details that were true at the time of shift execution rather than current details which may change. For example, a first year medical student may have only triage/check-in training at the time of a shift, but later they become a second year student and complete additional training. The shift in question should preserve the role/status/name/etc. that were present at the time of the shift which may be especially important when looking at historical information. This is most obvious when considering the scenario of a medical student who graduates and returns to the clinic as a resident or board certified physician: looking at historical data should show that a medical student shift was performed by "Evan Groneman, MS-1" rather than "Evan Groneman, MD".
User permissions should not be tied soley to organizational role or training status. For example, a supervising physician may be an end-user, a medical student may be an administrator, and so on. Generally, platform authorization is related to organizational role, and shift sign-up restrictions are related to training level; but there may be other scenarios.
