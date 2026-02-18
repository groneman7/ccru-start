import {
  IconAlignLeft,
  IconCalendar,
  IconCheck,
  IconClock,
  IconMapPin,
  IconMinus,
  IconPencil,
  IconPlus,
  IconSparkles2,
  IconTrash,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { useStore } from '@tanstack/react-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { useAppForm } from '~/components/form';
import {
  AddressFieldGroup,
  DateTimeFieldGroup,
  DescriptionFieldGroup,
} from '~/components/form/field-groups';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldLabel,
  Input,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui';
import { allUsersForComboboxQuery } from '~/features/admin/users.queries';
import type { userSchemaForCombobox } from '~/features/admin/users.schema';
import {
  assignUserMutation,
  createShiftMutation,
  deleteShiftMutation,
  deleteSlotMutation,
  reassignUserMutation,
  updateEventDetailsMutation,
  updateSlotQuantityMutation,
} from '~/features/calendar/calendar.mutations';
import {
  allPositionsQuery,
  getEventDetailsQuery,
  getSlotsByEventQuery,
} from '~/features/calendar/calendar.queries';
import type {
  positionSchema,
  shiftSchemaWithSlots,
} from '~/features/calendar/calendar.schema';
import { cn } from '~/lib/utils';
import { getUserPermissions } from '~/server/permissions';
import dayjs from 'dayjs';
import { UserRound } from 'lucide-react';
import { useState } from 'react';
import type { infer as Infer } from 'zod';

export const Route = createFileRoute('/_authed/calendar/events/$eventId')({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: 'CCRU | Event' }],
  }),
  loader: async ({ context: { queryClient }, params: { eventId } }) => {
    await queryClient.ensureQueryData(getEventDetailsQuery(eventId));
    await queryClient.ensureQueryData(getSlotsByEventQuery(eventId));
    await queryClient.ensureQueryData(allUsersForComboboxQuery());
  },
});

function RouteComponent() {
  const { currentUser } = Route.useRouteContext();

  // Params & Hooks
  const { eventId } = Route.useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [expandedShiftDescriptions, setExpandedShiftDescriptions] = useState<
    Set<string>
  >(new Set());

  const permissions = getUserPermissions(currentUser);

  // Queries
  const { data: users, isLoading: usersIsLoading } = useQuery(
    allUsersForComboboxQuery(),
  );
  const { data: event, isLoading: eventIsLoading } = useQuery(
    getEventDetailsQuery(eventId),
  );
  const { data: shifts, isLoading: shiftsIsLoading } = useQuery(
    getSlotsByEventQuery(eventId),
  );

  // Mutations
  const { mutateAsync: updateEventDetails } = useMutation({
    ...updateEventDetailsMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });
  // const { mutateAsync: updateEvent } = useMutation(
  //   trpc.calendar.events.updateEventDetails.mutationOptions({
  //     onMutate: async ({ ...eventData }) => {
  //       await queryClient.cancelQueries({ queryKey: eventDetailsKey });

  //       const rollback = queryClient.getQueryData(eventDetailsKey);
  //       queryClient.setQueryData(eventDetailsKey, (prev) => {
  //         if (!prev) return prev;

  //         return {
  //           ...prev,
  //           ...eventData,
  //         };
  //       });

  //       return { rollback };
  //     },
  //     onError: (_error, _variables, ctx) => {
  //       queryClient.setQueryData(eventDetailsKey, ctx?.rollback);
  //     },
  //     onSettled: async () => {
  //       await queryClient.invalidateQueries({ queryKey: eventDetailsKey });
  //     },
  //   }),
  // );

  const { mutateAsync: deleteShift } = useMutation({
    ...deleteShiftMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });
  // const { mutate: deleteShift } = useMutation(
  //   trpc.calendar.shifts.deleteShift.mutationOptions({
  //     onMutate: async ({ shiftId }) => {
  //       await queryClient.cancelQueries({ queryKey: SHIFTS_KEY });

  //       const rollback = queryClient.getQueriesData<Shift[]>({
  //         queryKey: SHIFTS_KEY,
  //       });

  //       queryClient.setQueriesData<Shift[]>(
  //         { queryKey: SHIFTS_KEY },
  //         (prev) => {
  //           if (!prev) return prev;

  //           return prev.filter((_shift) => _shift.id !== shiftId);
  //         },
  //       );

  //       setExpandedShiftDescriptions((prev) => {
  //         const next = new Set(prev);
  //         next.delete(shiftId);
  //         return next;
  //       });

  //       return { rollback };
  //     },
  //     onError: (_error, _variables, ctx) => {
  //       if (!ctx?.rollback) return;
  //       for (const [queryKey, snapshot] of ctx.rollback) {
  //         queryClient.setQueryData(queryKey, snapshot);
  //       }
  //     },
  //     onSettled: async () => {
  //       await queryClient.invalidateQueries({ queryKey: SHIFTS_KEY });
  //     },
  //   }),
  // );

  // Tanstack Form
  const form = useAppForm({
    defaultValues: {
      eventName: event?.name || '',
      description: event?.description || '',
      location: event?.location || '',
      date: event?.timeBegin
        ? dayjs(event.timeBegin).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
      timeBegin: event?.timeBegin
        ? dayjs(event.timeBegin).format('h:mm A')
        : '',
      timeEnd: event?.timeEnd ? dayjs(event.timeEnd).format('h:mm A') : '',
    },
    onSubmit: ({ value }) => {
      const eventData = {
        description: value.description || undefined,
        location: value.location || undefined,
        name: value.eventName,
        timeBegin: dayjs(`${value.date} ${value.timeBegin}`).toISOString(),
        timeEnd: value.timeEnd
          ? dayjs(`${value.date} ${value.timeEnd}`).toISOString()
          : undefined,
      };

      updateEventDetails({
        ...eventData,
        eventId: eventId,
      });

      setIsEditing(false);
    },
  });

  // Render
  if (eventIsLoading || shiftsIsLoading || usersIsLoading)
    return <div>Loading event</div>;
  if (!event) {
    console.error('Event not found');
    return <div>Event not found</div>;
  }
  return (
    <>
      <WorkspaceHeader>{event.name}</WorkspaceHeader>
      <WorkspaceContent
        className="gap-16"
        orientation="horizontal"
        toolbar={
          permissions.can('update', 'CalendarEvent') ? (
            <div>
              <Button
                disabled={isEditing}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <IconPencil />
                Edit
              </Button>
            </div>
          ) : null
        }
      >
        {/* DETAILS */}
        <div className="flex flex-1 flex-col gap-2 lg:max-w-md">
          <span className="text-xl font-semibold">Details</span>
          {isEditing ? (
            // Form
            <form
              className="flex flex-1 flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <form.Field name="eventName">
                {(eventNameField) => (
                  <Field>
                    <FieldLabel htmlFor={eventNameField.name}>
                      Event name
                    </FieldLabel>
                    <Input
                      id={eventNameField.name}
                      name={eventNameField.name}
                      value={eventNameField.state.value}
                      onBlur={eventNameField.handleBlur}
                      onChange={(e) =>
                        eventNameField.handleChange(e.target.value)
                      }
                    />
                  </Field>
                )}
              </form.Field>
              <DateTimeFieldGroup
                form={form}
                fields={{
                  date: 'date',
                  timeBegin: 'timeBegin',
                  timeEnd: 'timeEnd',
                }}
              />
              <AddressFieldGroup
                form={form}
                fields={{ location: 'location' }}
              />
              <DescriptionFieldGroup
                form={form}
                fields={{ eventName: 'eventName', description: 'description' }}
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={() => {
                    form.reset();
                    setIsEditing(false);
                  }}
                >
                  <IconX />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="solid"
                  onClick={() => form.handleSubmit()}
                >
                  <IconCheck />
                  Save
                </Button>
              </div>
            </form>
          ) : (
            // Display
            <div className="flex flex-col gap-4">
              {/* Date and time */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <IconCalendar className="size-4" />
                  <span className="flex-1">
                    {dayjs(event.timeBegin).format('dddd, MMMM D, YYYY')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <IconClock className="size-4" />
                  <span className="flex-1">{`${dayjs(event.timeBegin).format('h:mm A')}${event.timeEnd ? ` — ${dayjs(event.timeEnd).format('h:mm A')}` : null}`}</span>
                </div>
                <Button className="ml-6" size="sm" variant="link">
                  Add to calendar
                </Button>
              </div>
              {/* Location */}
              {event.location && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <IconMapPin className="size-4" />
                    <span className="flex-1">{event.location}</span>
                  </div>
                  <Button className="ml-6" size="sm" variant="link">
                    Get directions
                  </Button>
                </div>
              )}
              {/* Description */}
              {event.description && (
                <div className="flex items-start gap-2">
                  <IconAlignLeft className="mt-1 size-4" />
                  {/* TODO: This doesn't currently render things like line breaks, and <pre> does not work. */}
                  <span className="flex-1">{event.description}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {/* TEAMS */}
        <div className="flex flex-1 flex-col gap-2 lg:max-w-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">Teams</span>
            </div>
            {permissions.can('update', 'CalendarEvent') && (
              <Button size="sm" variant="link">
                <Link
                  to="/"
                  // to="/admin/matrix"
                  // search={{
                  //   eventId: event.id,
                  // }}
                >
                  Open in Matrix
                </Link>
              </Button>
            )}
          </div>
          {permissions.can('update', 'CalendarEvent') && (
            <DialogAddShift
              eventId={event.id}
              existingShifts={
                shifts
                  ?.sort((a, b) =>
                    a.position.display.localeCompare(b.position.display),
                  )
                  .map((s) => s.position.id) ?? []
              }
            />
          )}
          <div className="flex flex-col gap-4">
            {shifts &&
              shifts
                .sort((a, b) =>
                  a.position.display.localeCompare(b.position.display),
                )
                .map((shift) => {
                  // TODO: Add permission logic
                  const CAN_SIGN_UP = shift.quantity > shift.slots.length;
                  const isDescriptionExpanded = expandedShiftDescriptions.has(
                    shift.id,
                  );
                  return (
                    <Card key={shift.id}>
                      <CardHeader>
                        <CardTitle>{shift.position.display}</CardTitle>
                        <CardDescription>
                          {permissions.can('modify', 'Shift') ? (
                            <PopoverSlotQuantity shift={shift} />
                          ) : (
                            `${shift.slots.length} of ${shift.quantity} filled`
                          )}
                        </CardDescription>
                        {shift.position.description && (
                          <div className="flex gap-2">
                            <IconAlignLeft className="mt-1 size-3" />
                            <CardDescription className="flex-1 text-foreground">
                              <span
                                className={cn(
                                  'inline',
                                  isDescriptionExpanded
                                    ? undefined
                                    : 'line-clamp-1',
                                )}
                              >
                                {shift.position.description}
                              </span>
                              {'  '}
                              <button
                                className="inline cursor-pointer border-0 bg-transparent p-0 text-xs text-muted-foreground underline underline-offset-3"
                                onClick={() =>
                                  setExpandedShiftDescriptions((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(shift.id)) {
                                      next.delete(shift.id);
                                    } else {
                                      next.add(shift.id);
                                    }
                                    return next;
                                  })
                                }
                                type="button"
                              >
                                {isDescriptionExpanded
                                  ? 'Show less'
                                  : 'Show more'}
                              </button>
                            </CardDescription>
                          </div>
                        )}
                        {CAN_SIGN_UP && (
                          <CardAction>
                            <Button size="sm">
                              <IconSparkles2 />
                              Sign up
                            </Button>
                          </CardAction>
                        )}
                      </CardHeader>
                      <CardContent className="flex flex-col px-4">
                        {shift.slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center gap-1"
                          >
                            <SlotDisplay
                              canModify={permissions.can('modify', 'Shift')}
                              slot={slot}
                              users={users ?? []}
                            />
                          </div>
                        ))}
                      </CardContent>
                      {permissions.can('modify', 'Shift') && (
                        <CardFooter className="gap-2">
                          <PopoverAssignSlot
                            shift={shift}
                            users={users ?? []}
                          />
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  onClick={() => {
                                    deleteShift({ shiftId: shift.id });
                                  }}
                                  type="button"
                                >
                                  <IconTrash />
                                </Button>
                              }
                            />
                            <TooltipContent sideOffset={8}>
                              Remove shift
                            </TooltipContent>
                          </Tooltip>
                        </CardFooter>
                      )}
                    </Card>
                  );
                })}
          </div>
        </div>
      </WorkspaceContent>
    </>
  );
}

function SlotDisplay({
  canModify,
  slot,
  users,
}: {
  canModify?: boolean;
  slot: Infer<typeof shiftSchemaWithSlots>['slots'][number];
  users: Infer<typeof userSchemaForCombobox>[];
}) {
  const { mutateAsync: reassignSlot } = useMutation({
    ...reassignUserMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });
  // const { mutate: reassignSlot } = useMutation(
  //   trpc.calendar.shifts.reassignSlot.mutationOptions({
  //     onMutate: async ({ slotId, userId }) => {
  //       await queryClient.cancelQueries({ queryKey: SHIFTS_KEY });

  //       const rollback = queryClient.getQueriesData<Shift[]>({
  //         queryKey: SHIFTS_KEY,
  //       });
  //       const user = users.find((u) => u.id === userId);

  //       queryClient.setQueriesData<Shift[]>(
  //         { queryKey: SHIFTS_KEY },
  //         (prev) => {
  //           if (!prev) return prev;

  //           return prev.map((_shift) => ({
  //             ..._shift,
  //             slots: _shift.slots.map((_slot) =>
  //               _slot.id === slotId
  //                 ? {
  //                     ..._slot,
  //                     user: {
  //                       id: userId,
  //                       displayName: user?.display ?? 'Unknown user',
  //                       image: null,
  //                     },
  //                   }
  //                 : _slot,
  //             ),
  //           }));
  //         },
  //       );

  //       return { rollback };
  //     },
  //     onError: (_error, _variables, ctx) => {
  //       if (!ctx?.rollback) return;
  //       for (const [queryKey, snapshot] of ctx.rollback) {
  //         queryClient.setQueryData(queryKey, snapshot);
  //       }
  //     },
  //     onSettled: async () => {
  //       await queryClient.invalidateQueries({ queryKey: SHIFTS_KEY });
  //     },
  //   }),
  // );

  const { mutateAsync: deleteSlot } = useMutation({
    ...deleteSlotMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });
  // const { mutate: deleteSlot } = useMutation(
  //   trpc.calendar.shifts.deleteSlot.mutationOptions({
  //     onMutate: async ({ slotId }) => {
  //       await queryClient.cancelQueries({ queryKey: SHIFTS_KEY });

  //       const rollback = queryClient.getQueriesData<Shift[]>({
  //         queryKey: SHIFTS_KEY,
  //       });

  //       queryClient.setQueriesData<Shift[]>(
  //         { queryKey: SHIFTS_KEY },
  //         (prev) => {
  //           if (!prev) return prev;

  //           return prev.map((_shift) => ({
  //             ..._shift,
  //             slots: _shift.slots.filter((_slot) => _slot.id !== slotId),
  //           }));
  //         },
  //       );

  //       return { rollback };
  //     },
  //     onError: (_error, _variables, ctx) => {
  //       if (!ctx?.rollback) return;
  //       for (const [queryKey, snapshot] of ctx.rollback) {
  //         queryClient.setQueryData(queryKey, snapshot);
  //       }
  //     },
  //     onSettled: async () => {
  //       await queryClient.invalidateQueries({ queryKey: SHIFTS_KEY });
  //     },
  //   }),
  // );

  return canModify ? (
    <>
      <Combobox
        defaultValue={users.find((u) => u.id === slot.user.id)}
        items={users.sort((a, b) => a.nameLast!.localeCompare(b.nameLast!))}
        itemToStringLabel={(user: Infer<typeof userSchemaForCombobox>) =>
          user.displayName
        }
        itemToStringValue={(user: Infer<typeof userSchemaForCombobox>) =>
          user.id
        }
        onValueChange={(value) => {
          if (!value) return;
          reassignSlot({
            slotId: slot.id,
            userId: value.id,
          });
        }}
      >
        <ComboboxTrigger
          className="py-6"
          render={
            <Button
              className="flex-1 justify-start font-normal"
              variant="ghost"
            >
              <div className="flex size-8 items-center justify-center overflow-hidden rounded-full border bg-gray-100">
                <UserRound className="size-8 translate-y-1 scale-120 fill-gray-500/30 stroke-0" />
              </div>
              <ComboboxValue />
            </Button>
          }
        />
        <ComboboxContent>
          <ComboboxInput showTrigger={false} />
          <ComboboxList>
            {(user: Infer<typeof userSchemaForCombobox>) => (
              <ComboboxItem value={user}>{user.displayName}</ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => {
          deleteSlot({ slotId: slot.id });
        }}
      >
        <IconTrash />
      </Button>
    </>
  ) : (
    <div className="flex flex-1 items-center gap-2 px-3 py-2">
      <div className="flex size-8 items-center justify-center overflow-hidden rounded-full border bg-gray-100">
        <UserRound className="size-8 translate-y-1 scale-120 fill-gray-500/30 stroke-0" />
      </div>
      <span>{slot.user.displayName}</span>
    </div>
  );
}

function PopoverSlotQuantity({
  shift,
}: {
  shift: Infer<typeof shiftSchemaWithSlots>;
}) {
  const [quantity, setQuantity] = useState<number>(shift.quantity);
  const minSlots = Math.max(shift.slots.length, 1);

  const { mutateAsync: updateSlotQuantity } = useMutation({
    ...updateSlotQuantityMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });
  // const { mutate: updateSlotQuantity } = useMutation(
  //   trpc.calendar.shifts.updateSlotQuantity.mutationOptions({
  //     onMutate: async ({ shiftId, quantity }) => {
  //       await queryClient.cancelQueries({ queryKey: SHIFTS_KEY });

  //       const rollback = queryClient.getQueriesData<Shift[]>({
  //         queryKey: SHIFTS_KEY,
  //       });

  //       queryClient.setQueriesData<Shift[]>(
  //         { queryKey: SHIFTS_KEY },
  //         (prev) => {
  //           if (!prev) return prev;

  //           return prev.map((_shift) =>
  //             _shift.id === shiftId
  //               ? {
  //                   ..._shift,
  //                   quantity: Math.max(quantity, _shift.slots.length),
  //                 }
  //               : _shift,
  //           );
  //         },
  //       );

  //       return { rollback };
  //     },
  //     onError: (_error, _variables, ctx) => {
  //       if (!ctx?.rollback) return;
  //       for (const [queryKey, snapshot] of ctx.rollback) {
  //         queryClient.setQueryData(queryKey, snapshot);
  //       }
  //     },
  //     onSettled: async () => {
  //       await queryClient.invalidateQueries({ queryKey: SHIFTS_KEY });
  //     },
  //   }),
  // );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="xs">
            {shift.slots.length} of {shift.quantity} filled
          </Button>
        }
      />
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Modify quantity</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1">
            <Button
              disabled={quantity <= Math.max(minSlots, 1)}
              size="icon-xs"
              variant="ghost"
              onClick={() => setQuantity((v) => v - 1)}
            >
              <IconMinus className="size-3" />
            </Button>
            <Input
              className="w-12 [&_input]:text-center"
              inputMode="numeric"
              size="sm"
              type="text"
              value={quantity}
              onBeforeInput={(e) => {
                if (
                  e.nativeEvent.data &&
                  !/^[0-9]+$/.test(e.nativeEvent.data)
                ) {
                  e.preventDefault();
                }
              }}
              onBlur={(e) =>
                Number(e.target.value) < minSlots && setQuantity(minSlots)
              }
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <Button
              size="icon-xs"
              type="button"
              variant="ghost"
              onClick={() => setQuantity((v) => v + 1)}
            >
              <IconPlus className="size-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <PopoverClose
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    setQuantity(shift.quantity);
                  }}
                >
                  <IconX />
                </Button>
              }
            />
            <PopoverClose
              render={
                <Button
                  disabled={quantity === shift.quantity}
                  size="sm"
                  variant="solid"
                  onClick={() => {
                    if (quantity !== shift.quantity) {
                      updateSlotQuantity({
                        shiftId: shift.id,
                        quantity,
                      });
                    }
                  }}
                >
                  <IconCheck />
                  Save
                </Button>
              }
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type DialogAddShiftProps = {
  eventId: string;
  existingShifts: string[]; // Array of shift IDs
};
function DialogAddShift({ eventId, existingShifts }: DialogAddShiftProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const { data: positions } = useQuery(allPositionsQuery());

  const { mutateAsync: addShifts } = useMutation({
    ...createShiftMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });
  // const { mutate: addShifts } = useMutation(
  //   trpc.calendar.shifts.createShifts.mutationOptions({
  //     onMutate: async ({ shiftsToCreate }) => {
  //       await queryClient.cancelQueries({ queryKey: SHIFTS_KEY });

  //       const rollback = queryClient.getQueriesData<Shift[]>({
  //         queryKey: SHIFTS_KEY,
  //       });

  //       queryClient.setQueriesData<Shift[]>(
  //         { queryKey: SHIFTS_KEY },
  //         // @ts-expect-error - TODO: Fix this
  //         (prev) => {
  //           if (!prev) return prev;

  //           const optimisticShifts = shiftsToCreate
  //             .filter(
  //               (s) =>
  //                 !prev.some(
  //                   (existing) => existing.position.id === s.positionId,
  //                 ),
  //             )
  //             .map((s) => {
  //               const position = positions?.find((p) => p.id === s.positionId);
  //               return {
  //                 id: `optimistic-shift-${s.positionId}-${Date.now()}`,
  //                 quantity: s.quantity,
  //                 position: {
  //                   id: s.positionId,
  //                   name: position?.name ?? 'Unknown position',
  //                   display: position?.display ?? 'Unknown position',
  //                 },
  //                 slots: [],
  //               };
  //             });

  //           return [...prev, ...optimisticShifts];
  //         },
  //       );

  //       return { rollback };
  //     },
  //     onError: (_error, _variables, ctx) => {
  //       if (!ctx?.rollback) return;
  //       for (const [queryKey, snapshot] of ctx.rollback) {
  //         queryClient.setQueryData(queryKey, snapshot);
  //       }
  //     },
  //     onSettled: async () => {
  //       await queryClient.invalidateQueries({ queryKey: SHIFTS_KEY });
  //     },
  //   }),
  // );

  const form = useAppForm({
    defaultValues: {
      shiftsToCreate: [] as {
        position: Infer<typeof positionSchema>;
        quantity: number;
      }[],
    },
    onSubmit: ({ value }) => {
      const shiftsToCreate = value.shiftsToCreate.map((s) => ({
        positionId: s.position.id,
        quantity: s.quantity,
      }));

      addShifts({ eventId, shiftsToCreate });
    },
  });

  const length = useStore(
    form.store,
    (state) => state.values.shiftsToCreate.length,
  );

  return (
    <Dialog onOpenChange={(open) => !open && form.reset()}>
      <DialogTrigger
        render={
          <Button variant="ghost">
            <IconPlus />
            Add shift
          </Button>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add Shifts</DialogTitle>
          <DialogDescription>Add shifts for this event.</DialogDescription>
        </DialogHeader>
        <div className="flex w-3/5 flex-col gap-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <form.Field mode="array" name="shiftsToCreate">
              {(shiftsToCreateField) => (
                <div>
                  {shiftsToCreateField.state.value.map((shift, i) => (
                    <div key={shift.position.id} className="flex gap-2">
                      <form.Field name={`shiftsToCreate[${i}].position`}>
                        {(positionField) => (
                          <div>{positionField.state.value.display}</div>
                        )}
                      </form.Field>
                      <form.Field name={`shiftsToCreate[${i}].quantity`}>
                        {(quantityField) => (
                          <div>{quantityField.state.value}</div>
                        )}
                      </form.Field>
                    </div>
                  ))}
                  <Combobox
                    items={positions?.filter(
                      (position) =>
                        !existingShifts.includes(position.id) &&
                        !form.state.values.shiftsToCreate.some(
                          (s) => s.position.id === position.id,
                        ),
                    )}
                    itemToStringLabel={(
                      position: Infer<typeof positionSchema>,
                    ) => position.display}
                    onValueChange={(v) =>
                      v &&
                      shiftsToCreateField.pushValue({
                        position: v,
                        quantity: 1,
                      })
                    }
                  >
                    <ComboboxInput placeholder="Search positions..." />
                    <ComboboxContent>
                      <ComboboxEmpty>No positions found.</ComboboxEmpty>
                      <ComboboxList>
                        {(position: Infer<typeof positionSchema>) => (
                          <ComboboxItem key={position.id} value={position}>
                            <div className="flex flex-1 items-center justify-between">
                              <span>{position.display}</span>
                              <span className="text-xs text-gray-500">
                                {position.name}
                              </span>
                            </div>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              )}
            </form.Field>
          </form>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button>
                <IconX />
                Cancel
              </Button>
            }
          />
          <Tooltip
            open={tooltipOpen && length === 0}
            onOpenChange={setTooltipOpen}
          >
            <TooltipTrigger
              render={
                <div className="has-disabled:cursor-not-allowed">
                  <Button
                    disabled={length === 0}
                    variant="solid"
                    onClick={() => {
                      if (length === 0) return;
                      form.handleSubmit();
                    }}
                  >
                    <IconCheck />
                    Save
                  </Button>
                </div>
              }
            />
            <TooltipContent>Select positions to add</TooltipContent>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PopoverAssignSlot({
  shift,
  users,
}: {
  shift: Infer<typeof shiftSchemaWithSlots>;
  users: Infer<typeof userSchemaForCombobox>[];
}) {
  const [open, setOpen] = useState(false);
  const [userToAssign, setUserToAssign] = useState<
    (typeof users)[number] | null
  >(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const { mutateAsync: assignSlot } = useMutation({
    ...assignUserMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });
  // const { mutate: assignSlot } = useMutation(
  //   trpc.calendar.shifts.assignUserToShift.mutationOptions({
  //     onMutate: async ({ shiftId, userId }) => {
  //       await queryClient.cancelQueries({ queryKey: SHIFTS_KEY });

  //       const rollback =
  //         queryClient.getQueriesData<Shift[]>({ queryKey: SHIFTS_KEY }) ?? [];
  //       const user = users.find((u) => u.id === userId);
  //       const optimisticSlotId = `optimistic-${shiftId}-${userId}-${Date.now()}`;

  //       queryClient.setQueriesData<Shift[]>(
  //         { queryKey: SHIFTS_KEY },
  //         (prev) => {
  //           if (!prev) return prev;

  //           return prev.map((_shift) => {
  //             if (_shift.id !== shiftId) return _shift;
  //             if (_shift.slots.some((slot) => slot.user.id === userId)) {
  //               return _shift;
  //             }
  //             const slots = [
  //               ..._shift.slots,
  //               {
  //                 id: optimisticSlotId,
  //                 user: {
  //                   id: userId,
  //                   displayName: user?.display ?? 'Unknown user',
  //                   image: null,
  //                 },
  //               },
  //             ];

  //             return {
  //               ..._shift,
  //               quantity: Math.max(_shift.quantity, slots.length),
  //               slots,
  //             };
  //           });
  //         },
  //       );
  //       return { rollback, optimisticSlotId, shiftId, userId };
  //     },
  //     onSuccess: (data, _variables, ctx) => {
  //       if (!ctx) return;

  //       queryClient.setQueriesData<Shift[]>(
  //         { queryKey: SHIFTS_KEY },
  //         (prev) => {
  //           if (!prev) return prev;

  //           return prev.map((_shift) => {
  //             if (_shift.id !== ctx.shiftId) return _shift;

  //             return {
  //               ..._shift,
  //               quantity: data.quantity,
  //               slots: _shift.slots.map((slot) => {
  //                 if (slot.id !== ctx.optimisticSlotId) return slot;

  //                 return {
  //                   ...slot,
  //                   id: data.slotId,
  //                 };
  //               }),
  //             };
  //           });
  //         },
  //       );
  //     },
  //     onError: (_error, _variables, ctx) => {
  //       if (!ctx?.rollback) return;
  //       for (const [queryKey, snapshot] of ctx.rollback) {
  //         queryClient.setQueryData(queryKey, snapshot);
  //       }
  //     },
  //     onSettled: async () => {
  //       await queryClient.invalidateQueries({ queryKey: SHIFTS_KEY });
  //     },
  //   }),
  // );

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        // Reset state when dialog is closed
        if (!value) {
          setUserToAssign(null);
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button className="flex-1">
            <IconUserPlus />
            Assign
          </Button>
        }
      />
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Assign User</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-1">
          <Combobox
            items={users}
            value={userToAssign}
            itemToStringLabel={(user: (typeof users)[number]) =>
              `${user.displayName}`
            }
            onValueChange={setUserToAssign}
          >
            <ComboboxInput placeholder="Search users..." />
            <ComboboxContent>
              <ComboboxEmpty>No users found.</ComboboxEmpty>
              <ComboboxList>
                {(user) => (
                  <ComboboxItem key={user.id} value={user}>
                    {user.display}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <div className="flex items-center justify-end gap-1">
          <PopoverClose
            render={
              <Button>
                <IconX />
                Cancel
              </Button>
            }
          />
          <PopoverClose
            render={
              <Tooltip
                open={tooltipOpen && userToAssign === null}
                onOpenChange={setTooltipOpen}
              >
                <TooltipTrigger
                  render={
                    <div className="has-disabled:cursor-not-allowed">
                      <Button
                        disabled={!userToAssign}
                        variant="solid"
                        onClick={() => {
                          if (!userToAssign) return;
                          assignSlot({
                            shiftId: shift.id,
                            userId: userToAssign.id,
                          });
                        }}
                      >
                        <IconCheck />
                        Save
                      </Button>
                    </div>
                  }
                />
                <TooltipContent>Select a user to assign</TooltipContent>
              </Tooltip>
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
