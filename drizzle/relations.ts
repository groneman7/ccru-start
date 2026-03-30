import { relations } from "drizzle-orm/relations";
import { userInBetterAuth, eventsInCalendar, sessionInBetterAuth, templatesInCalendar, junctionTemplatePositionsInCalendar, positionsInCalendar, userTypesInAuthz, junctionShiftsInCalendar, junctionSlotsInCalendar } from "./schema";

export const eventsInCalendarRelations = relations(eventsInCalendar, ({one, many}) => ({
	userInBetterAuth: one(userInBetterAuth, {
		fields: [eventsInCalendar.createdBy],
		references: [userInBetterAuth.id]
	}),
	junctionShiftsInCalendars: many(junctionShiftsInCalendar),
}));

export const userInBetterAuthRelations = relations(userInBetterAuth, ({one, many}) => ({
	eventsInCalendars: many(eventsInCalendar),
	sessionInBetterAuths: many(sessionInBetterAuth),
	userTypesInAuthz: one(userTypesInAuthz, {
		fields: [userInBetterAuth.userTypeId],
		references: [userTypesInAuthz.id]
	}),
	junctionSlotsInCalendars: many(junctionSlotsInCalendar),
}));

export const sessionInBetterAuthRelations = relations(sessionInBetterAuth, ({one}) => ({
	userInBetterAuth: one(userInBetterAuth, {
		fields: [sessionInBetterAuth.userId],
		references: [userInBetterAuth.id]
	}),
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