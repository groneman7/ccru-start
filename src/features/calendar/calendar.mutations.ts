import { mutationOptions } from '@tanstack/react-query';
import {
  eventServerFns as event,
  positionServerFns as position,
  shiftServerFns as shift,
  slotServerFns as slot,
} from '~/features/calendar/calendar.server';
import type { infer as Infer } from 'zod';
import type {
  createEventSchema,
  createPositionSchema,
  createShiftSchema,
  createSlotSchema,
  updateEventSchema,
  updatePositionDetailsSchema,
} from './calendar.schema';

// Events ---------------------------------------------------------------------

export function createEvent() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createEventSchema>) =>
      event.create({ data: input }),
  });
}

export function updateEventDetails() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof updateEventSchema>) =>
      event.update({ data: input }),
  });
}

// Positions ------------------------------------------------------------------

export function createPosition() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createPositionSchema>) =>
      position.create({ data: input }),
  });
}

export function updatePosition() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof updatePositionDetailsSchema>) =>
      position.update({ data: input }),
  });
}

// Shifts ---------------------------------------------------------------------

export function createShift() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createShiftSchema>) =>
      shift.create({ data: input }),
  });
}

export function deleteShift() {
  return mutationOptions({
    mutationFn: (input: { shiftId: string }) => shift.delete({ data: input }),
  });
}
// Slots ----------------------------------------------------------------------

export function assignUser() {
  return mutationOptions({
    mutationFn: (input: { shiftId: string; userId: string }) =>
      slot.assignUser({ data: input }),
  });
}

export function createSlot() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createSlotSchema>) =>
      slot.create({ data: input }),
  });
}

export function deleteSlot() {
  return mutationOptions({
    mutationFn: (input: { slotId: string }) => slot.delete({ data: input }),
  });
}

export function reassignUser() {
  return mutationOptions({
    mutationFn: (input: { slotId: string; userId: string }) =>
      slot.reassignUser({ data: input }),
  });
}
