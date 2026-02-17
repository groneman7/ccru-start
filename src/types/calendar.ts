import { z } from 'zod';

export const calendarEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  timeBegin: z.string().nullable(),
  timeEnd: z.string().nullable(),
  createdBy: z.string().nullable(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;
