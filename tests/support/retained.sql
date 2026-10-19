-- Synthetic fixtures only; no retained personal data or credentials.
-- The credential hash is for fixture-password-36, produced by Better Auth hashPassword.
INSERT INTO authz.user_types (id,name,display) VALUES
('01930000-0000-7000-8000-000000000101','volunteer','Volunteer');
INSERT INTO "better-auth"."user" (id,display,email,email_verified,name_first,name_last,status,role,user_type_id,timestamp_created_at,timestamp_updated_at,timestamp_onboarding_completed) VALUES
('01930000-0000-7000-8000-000000000001','Fixture User','user@example.invalid',true,'Fixture','User','active','User','01930000-0000-7000-8000-000000000101','2026-01-01','2026-01-02','2026-01-03'),
('01930000-0000-7000-8000-000000000002','Fixture Officer','officer@example.invalid',false,'Fixture','Officer','active','Officer',NULL,'2026-01-01','2026-01-02',NULL),
('01930000-0000-7000-8000-000000000003','Fixture Administrator','admin@example.invalid',true,'Fixture','Administrator','inactive','Administrator',NULL,'2026-01-01','2026-01-02',NULL),
('01930000-0000-7000-8000-000000000004','Fixture Developer','developer@example.invalid',true,'Fixture','Developer','active','Developer',NULL,'2026-01-01','2026-01-02','2026-01-03'),
('01930000-0000-7000-8000-000000000005','Fixture Invite','invite@example.invalid',false,'Fixture','Invite','invited','User',NULL,'2026-01-01','2026-01-02',NULL);
INSERT INTO "better-auth".account (id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES
('01930000-0000-7000-8000-000000000011','01930000-0000-7000-8000-000000000001','credential','01930000-0000-7000-8000-000000000001','6b9606853cf858f2d6111128c503e7aa:7139b23f51c6c3fdd2f1453dc08eba4e7571501147f5c93b21b70f7f04f9f9a307ed7c8ec1dc0c44e226d60bf13e3ce96d5a408354ad76aa6af1801c4cd97757','2026-01-01','2026-01-02'),
('01930000-0000-7000-8000-000000000012','synthetic-google-id','google','01930000-0000-7000-8000-000000000002',NULL,'2026-01-01','2026-01-02');
INSERT INTO "better-auth".session (id,expires_at,token,created_at,updated_at,user_id) VALUES
('01930000-0000-7000-8000-000000000021','2099-01-01','synthetic-retained-session','2026-01-01','2026-01-02','01930000-0000-7000-8000-000000000001');
INSERT INTO "better-auth".verification (id,identifier,value,expires_at) VALUES
('01930000-0000-7000-8000-000000000031','synthetic-verification','synthetic-value','2099-01-01');
INSERT INTO authz.certifications (id,name,display,parent) VALUES
('01930000-0000-7000-8000-000000000111','parent','Parent',NULL),
('01930000-0000-7000-8000-000000000112','child','Child','01930000-0000-7000-8000-000000000111');
INSERT INTO calendar.positions (id,name,display,description) VALUES
('01930000-0000-7000-8000-000000000201','position','Fixture position','Retained position');
INSERT INTO calendar.events (id,name,description,location,time_begin,time_end,created_by) VALUES
('01930000-0000-7000-8000-000000000301','Historical fixture','Retained description','{"name":"Fixture clinic","line1":"1 Test Way","line2":null,"city":"Test","state":"NY","zip":"00000"}','2026-01-10T14:00:00Z','2026-01-10T16:00:00Z','01930000-0000-7000-8000-000000000004');
INSERT INTO calendar.junction_shifts (id,event_id,position_id,quantity,status) VALUES
('01930000-0000-7000-8000-000000000401','01930000-0000-7000-8000-000000000301','01930000-0000-7000-8000-000000000201',2,'active'),
('01930000-0000-7000-8000-000000000402','01930000-0000-7000-8000-000000000301','01930000-0000-7000-8000-000000000201',1,'deleted');
INSERT INTO calendar.junction_slots (id,shift_id,user_id,status) VALUES
('01930000-0000-7000-8000-000000000501','01930000-0000-7000-8000-000000000401','01930000-0000-7000-8000-000000000001','active'),
('01930000-0000-7000-8000-000000000502','01930000-0000-7000-8000-000000000402','01930000-0000-7000-8000-000000000003','deleted');
INSERT INTO calendar.templates (id,name,display,description,time_begin,time_end,location) VALUES
('01930000-0000-7000-8000-000000000601','template','Fixture template','Retained template','09:00','11:00','{"name":"Template location"}');
INSERT INTO calendar.junction_template_positions (id,template_id,position_id,quantity) VALUES
('01930000-0000-7000-8000-000000000701','01930000-0000-7000-8000-000000000601','01930000-0000-7000-8000-000000000201',2);
