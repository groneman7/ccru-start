import { mutationOptions } from '@tanstack/react-query';
import {
  eventServerFns as event,
  positionServerFns as position,
  shiftServerFns as shift,
  slotServerFns as slot,
} from '~/features/calendar/calendar.functions';
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

export function createEventMutation() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createEventSchema>) =>
      event.create({ data: input }),
  });
}

export function updateEventDetailsMutation() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof updateEventSchema>) =>
      event.update({ data: input }),
  });
}

// Positions ------------------------------------------------------------------

export function createPositionMutation() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createPositionSchema>) =>
      position.create({ data: input }),
  });
}

export function updatePositionMutation() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof updatePositionDetailsSchema>) =>
      position.update({ data: input }),
  });
}

// Shifts ---------------------------------------------------------------------

export function createShiftMutation() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createShiftSchema>) =>
      shift.create({ data: input }),
  });
}

export function deleteShiftMutation() {
  return mutationOptions({
    mutationFn: (input: { shiftId: string }) => shift.delete({ data: input }),
  });
}

export function updateSlotQuantityMutation() {
  return mutationOptions({
    mutationFn: (input: { shiftId: string; quantity: number }) =>
      shift.updateSlotQuantity({ data: input }),
  });
}

// Slots ----------------------------------------------------------------------

export function assignUserMutation() {
  return mutationOptions({
    mutationFn: (input: { shiftId: string; userId: string }) =>
      slot.assignUser({ data: input }),
  });
}

export function createSlotMutation() {
  return mutationOptions({
    mutationFn: (input: Infer<typeof createSlotSchema>) =>
      slot.create({ data: input }),
  });
}

export function deleteSlotMutation() {
  return mutationOptions({
    mutationFn: (input: { slotId: string }) => slot.delete({ data: input }),
  });
}

export function reassignUserMutation() {
  return mutationOptions({
    mutationFn: (input: { slotId: string; userId: string }) =>
      slot.reassignUser({ data: input }),
  });
}
