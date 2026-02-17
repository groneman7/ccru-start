import { createServerFn } from '@tanstack/react-start';
import { getEventsByMonthService } from '~/server/services/calendar.services';
import { number, object } from 'zod';

const inputSchema = object({
  month: number(),
  year: number(),
});

export const getEventsByMonth = createServerFn()
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    return await getEventsByMonthService(data);
  });
