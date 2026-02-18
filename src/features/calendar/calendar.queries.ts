import { queryOptions } from '@tanstack/react-query';
import {
  eventServerFns as event,
  positionServerFns as position,
  slotServerFns as slot,
  templateServerFns as template,
} from '~/features/calendar/calendar.functions';

// Events ---------------------------------------------------------------------

export function getEventsByMonthQuery(month: number, year: number) {
  return queryOptions({
    queryKey: ['eventsByMonth', month, year],
    queryFn: () => event.byMonth({ data: { month, year } }),
  });
}

export function getEventDetailsQuery(eventId: string) {
  return queryOptions({
    queryKey: ['eventDetails', eventId],
    queryFn: () => event.byId({ data: { eventId } }),
  });
}

// Positions ------------------------------------------------------------------

export function allPositionsQuery() {
  return queryOptions({
    queryKey: ['allPositions'],
    queryFn: () => position.all(),
  });
}

// Slots ----------------------------------------------------------------------

export function getSlotsByEventQuery(eventId: string) {
  return queryOptions({
    queryKey: ['slotsByEvent', eventId],
    queryFn: () => slot.byEventId({ data: { eventId } }),
  });
}

// Templates ------------------------------------------------------------------

export function allTemplatesQuery() {
  return queryOptions({
    queryKey: ['allTemplates'],
    queryFn: () => template.all(),
  });
}

export function getTemplateByIdQuery(templateId: string) {
  return queryOptions({
    queryKey: ['templateById', templateId],
    queryFn: () => template.byId({ data: { templateId } }),
  });
}

export function getTemplatePositionsByTemplateIdQuery(templateId: string) {
  return queryOptions({
    queryKey: ['templatePositionsByTemplateId', templateId],
    queryFn: () => template.templatePositionsByTemplateId({ data: { templateId } }),
  });
}
