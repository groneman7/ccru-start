import { getEventsByMonthDAL } from '~/server/dal/calendar.dal';

export interface GetEventsByMonthInput {
  month: number;
  year: number;
}

export async function getEventsByMonthService(input: GetEventsByMonthInput) {
  const { month, year } = input;

  const events = await getEventsByMonthDAL(month, year);
  return events;
}
