import { relations } from "drizzle-orm/relations";
import { userInBetterAuth, sessionInBetterAuth, templatesInCalendar, junctionTemplatePositionsInCalendar, positionsInCalendar, eventsInCalendar, userTypesInAuthz, junctionShiftsInCalendar, certificationsInAuthz, junctionSlotsInCalendar } from "./schema";

export const sessionInBetterAuthRelations = relations(sessionInBetterAuth, ({one}) => ({
	userInBetterAuth: one(userInBetterAuth, {
		fields: [sessionInBetterAuth.userId],
		references: [userInBetterAuth.id]
	}),
}));

export const userInBetterAuthRelations = relations(userInBetterAuth, ({one, many}) => ({
	sessionInBetterAuths: many(sessionInBetterAuth),
	eventsInCalendars: many(eventsInCalendar),
	userTypesInAuthz: one(userTypesInAuthz, {
		fields: [userInBetterAuth.userTypeId],
		references: [userTypesInAuthz.id]
	}),
	junctionSlotsInCalendars: many(junctionSlotsInCalendar),
}));

export const junctionTemplatePositionsInCalendarRelations = relations(junctionTemplatePositionsInCalendar, ({one}) => ({
	templatesInCalendar: one(templatesInCalendar, {
		fields: [junctionTemplatePositionsInCalendar.templateId],
		references: [templatesInCalendar.id]
	}),
	positionsInCalendar: one(positionsInCalendar, {
		fields: [junctionTemplatePositionsInCalendar.positionId],
		references: [positionsInCalendar.id]
	}),
}));

export const templatesInCalendarRelations = relations(templatesInCalendar, ({many}) => ({
	junctionTemplatePositionsInCalendars: many(junctionTemplatePositionsInCalendar),
}));

export const positionsInCalendarRelations = relations(positionsInCalendar, ({many}) => ({
	junctionTemplatePositionsInCalendars: many(junctionTemplatePositionsInCalendar),
	junctionShiftsInCalendars: many(junctionShiftsInCalendar),
}));

export const eventsInCalendarRelations = relations(eventsInCalendar, ({one, many}) => ({
	userInBetterAuth: one(userInBetterAuth, {
		fields: [eventsInCalendar.createdBy],
		references: [userInBetterAuth.id]
	}),
	junctionShiftsInCalendars: many(junctionShiftsInCalendar),
}));

export const userTypesInAuthzRelations = relations(userTypesInAuthz, ({many}) => ({
	userInBetterAuths: many(userInBetterAuth),
}));

export const junctionShiftsInCalendarRelations = relations(junctionShiftsInCalendar, ({one, many}) => ({
	eventsInCalendar: one(eventsInCalendar, {
		fields: [junctionShiftsInCalendar.eventId],
		references: [eventsInCalendar.id]
	}),
	positionsInCalendar: one(positionsInCalendar, {
		fields: [junctionShiftsInCalendar.positionId],
		references: [positionsInCalendar.id]
	}),
	junctionSlotsInCalendars: many(junctionSlotsInCalendar),
}));

export const certificationsInAuthzRelations = relations(certificationsInAuthz, ({one, many}) => ({
	certificationsInAuthz: one(certificationsInAuthz, {
		fields: [certificationsInAuthz.parent],
		references: [certificationsInAuthz.id],
		relationName: "certificationsInAuthz_parent_certificationsInAuthz_id"
	}),
	certificationsInAuthzs: many(certificationsInAuthz, {
		relationName: "certificationsInAuthz_parent_certificationsInAuthz_id"
	}),
}));

export const junctionSlotsInCalendarRelations = relations(junctionSlotsInCalendar, ({one}) => ({
	junctionShiftsInCalendar: one(junctionShiftsInCalendar, {
		fields: [junctionSlotsInCalendar.shiftId],
		references: [junctionShiftsInCalendar.id]
	}),
	userInBetterAuth: one(userInBetterAuth, {
		fields: [junctionSlotsInCalendar.userId],
		references: [userInBetterAuth.id]
	}),
}));