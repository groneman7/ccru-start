-- Current-feature authorization fixtures have completed onboarding. Historical
-- preservation tests continue using retained.sql unchanged; registration tests
-- exercise retained identities with incomplete fields separately.
UPDATE "better-auth"."user" SET email_verified=true, phone_number='+15550100100',
 timestamp_onboarding_completed=COALESCE(timestamp_onboarding_completed,'2026-01-03')
 WHERE status='active';
