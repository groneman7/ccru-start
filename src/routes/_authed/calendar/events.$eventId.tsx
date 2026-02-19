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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ComingSoonTooltip,
  Spinner,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceSection,
  WorkspaceSectionTitle,
} from '~/components';
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
  InputGroupAddon,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  // Spinner,
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
  component: EventPage,
  head: () => ({
    meta: [{ title: 'CCRU | Event' }],
  }),
  loader: async ({ context: { queryClient }, params: { eventId } }) => {
    await queryClient.ensureQueryData(getEventDetailsQuery(eventId));
    await queryClient.ensureQueryData(getSlotsByEventQuery(eventId));
    await queryClient.ensureQueryData(allUsersForComboboxQuery());
  },
});

function EventPage() {
  // Params
  const { currentUser } = Route.useRouteContext();
  const { eventId } = Route.useParams();

  // State
  const [editingDetails, setEditingDetails] = useState(false);

  const permissions = getUserPermissions(currentUser);

  // Queries
  const { data: eventDetails } = useQuery(getEventDetailsQuery(eventId));

  return (
    <>
      <WorkspaceHeader>{eventDetails?.name}</WorkspaceHeader>
      <WorkspaceContent className="gap-16" orientation="horizontal">
        <WorkspaceSection>
          <WorkspaceSectionTitle>
            Details
            {permissions.can('update', 'CalendarEvent') && !editingDetails && (
              <Button size="sm" onClick={() => setEditingDetails(true)}>
                <IconPencil />
                Edit
              </Button>
            )}
          </WorkspaceSectionTitle>
          <EventDetails
            editing={editingDetails}
            eventId={eventId}
            setEditing={setEditingDetails}
          />
        </WorkspaceSection>
        <WorkspaceSection>
          <WorkspaceSectionTitle>
            Teams
            {permissions.can('update', 'CalendarEvent') && (
              <ComingSoonTooltip>
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
              </ComingSoonTooltip>
            )}
          </WorkspaceSectionTitle>
          <EventTeams eventId={eventId} permissions={permissions} />
        </WorkspaceSection>
      </WorkspaceContent>
    </>
  );
}

function EventDetails({
  editing,
  eventId,
  setEditing,
}: {
  editing: boolean;
  eventId: string;
  setEditing: (editing: boolean) => void;
}) {
  // Hooks
  const queryClient = useQueryClient();

  // Queries
  const { data: eventDetails, isLoading: eventIsLoading } = useQuery(
    getEventDetailsQuery(eventId),
  );

  // Mutations
  const { mutateAsync: updateEventDetails } = useMutation({
    ...updateEventDetailsMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getEventDetailsQuery(eventId).queryKey,
      });
    },
  });

  // Tanstack Form
  const form = useAppForm({
    defaultValues: {
      eventName: eventDetails?.name || '',
      description: eventDetails?.description || '',
      location: eventDetails?.location || '',
      date: eventDetails?.timeBegin
        ? dayjs(eventDetails.timeBegin).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
      timeBegin: eventDetails?.timeBegin
        ? dayjs(eventDetails.timeBegin).format('h:mm A')
        : '',
      timeEnd: eventDetails?.timeEnd
        ? dayjs(eventDetails.timeEnd).format('h:mm A')
        : '',
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
        data: eventData,
        eventId,
      });

      setEditing(false);
    },
  });

  // Render
  if (eventIsLoading) {
    return <div>Loading event</div>;
  }
  if (!eventDetails) {
    return <div>Event not found</div>;
  }
  return (
    <>
      {editing ? (
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
                  onChange={(e) => eventNameField.handleChange(e.target.value)}
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
          <AddressFieldGroup form={form} fields={{ location: 'location' }} />
          <DescriptionFieldGroup
            form={form}
            fields={{ eventName: 'eventName', description: 'description' }}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => {
                form.reset();
                setEditing(false);
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
                {dayjs(eventDetails.timeBegin).format('dddd, MMMM D, YYYY')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IconClock className="size-4" />
              <span className="flex-1">{`${dayjs(eventDetails.timeBegin).format('h:mm A')}${eventDetails.timeEnd ? ` — ${dayjs(eventDetails.timeEnd).format('h:mm A')}` : null}`}</span>
            </div>
            <ComingSoonTooltip>
              <Button className="ml-6" size="sm" variant="link">
                Add to calendar
              </Button>
            </ComingSoonTooltip>
          </div>
          {/* Location */}
          {eventDetails.location && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <IconMapPin className="size-4" />
                <span className="flex-1">{eventDetails.location}</span>
              </div>
              <ComingSoonTooltip>
                <Button className="ml-6" size="sm" variant="link">
                  Get directions
                </Button>
              </ComingSoonTooltip>
            </div>
          )}
          {/* Description */}
          {eventDetails.description && (
            <div className="flex items-start gap-2">
              <IconAlignLeft className="mt-1 size-4" />
              {/* TODO: This doesn't currently render things like line breaks, and <pre> does not work. */}
              <span className="flex-1 whitespace-pre-wrap">
                {eventDetails.description}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function EventTeams({
  eventId,
  permissions,
}: {
  eventId: string;
  permissions: ReturnType<typeof getUserPermissions>;
}) {
  // Hooks
  const queryClient = useQueryClient();

  // State
  const [expandedShiftDescriptions, setExpandedShiftDescriptions] = useState<
    Set<string>
  >(new Set());

  // Queries
  // const { data: users } = useQuery(allUsersForComboboxQuery());
  const { data: shifts, isLoading: shiftsIsLoading } = useQuery(
    getSlotsByEventQuery(eventId),
  );

  // Mutations
  const { mutateAsync: deleteShift, isPending } = useMutation({
    ...deleteShiftMutation(),
    onMutate: () => {
      // Optimistic update logic here
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getSlotsByEventQuery(eventId).queryKey,
      });
    },
  });

  // Render
  if (shiftsIsLoading) {
    return <div>Loading teams</div>;
  }
  return (
    <>
      {permissions.can('update', 'CalendarEvent') && (
        <DialogAddShift
          eventId={eventId}
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

                    {CAN_SIGN_UP && (
                      <CardAction>
                        <ComingSoonTooltip>
                          <Button size="sm">
                            <IconSparkles2 />
                            Sign up
                          </Button>
                        </ComingSoonTooltip>
                      </CardAction>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 px-4">
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
                            {isDescriptionExpanded ? 'Show less' : 'Show more'}
                          </button>
                        </CardDescription>
                      </div>
                    )}
                    {shift.slots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-1">
                        <SlotDisplay
                          eventId={eventId}
                          canModify={permissions.can('modify', 'Shift')}
                          slot={slot}
                        />
                      </div>
                    ))}
                  </CardContent>
                  {permissions.can('modify', 'Shift') && (
                    <CardFooter className="gap-2">
                      <PopoverAssignSlot shift={shift} />
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              disabled={isPending}
                              onClick={() => {
                                deleteShift({ shiftId: shift.id });
                              }}
                              type="button"
                            >
                              {isPending ? <Spinner /> : <IconTrash />}
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
    </>
  );
}

function SlotDisplay({
  eventId,
  canModify,
  slot,
}: {
  eventId: string;
  canModify?: boolean;
  slot: Infer<typeof shiftSchemaWithSlots>['slots'][number];
}) {
  // Hooks
  const queryClient = useQueryClient();

  // Queries
  const { data: users, isLoading: usersLoading } = useQuery(
    allUsersForComboboxQuery(),
  );

  // Mutations
  const { mutateAsync: reassignSlot } = useMutation({
    ...reassignUserMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });

  const { mutateAsync: deleteSlot } = useMutation({
    ...deleteSlotMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getSlotsByEventQuery(eventId).queryKey,
      });
    },
  });

  return canModify ? (
    <>
      <Combobox
        defaultValue={users?.find((u) => u.id === slot.user.id)}
        items={users?.sort((a, b) => a.nameLast!.localeCompare(b.nameLast!))}
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
          <ComboboxInput showTrigger={false}>
            {usersLoading && (
              <InputGroupAddon
                align="inline-end"
                className="text-muted-foreground"
              >
                <Spinner />
              </InputGroupAddon>
            )}
          </ComboboxInput>
          <ComboboxList>
            {(user: Infer<typeof userSchemaForCombobox>) => (
              <ComboboxItem key={user.id} value={user}>
                {user.displayName}
              </ComboboxItem>
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
      <span>{slot.user.displayName}test</span>
    </div>
  );
}

function PopoverSlotQuantity({
  shift,
}: {
  shift: Infer<typeof shiftSchemaWithSlots>;
}) {
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState<number>(shift.quantity);
  const minSlots = Math.max(shift.slots.length, 1);

  const { mutateAsync: updateSlotQuantity } = useMutation({
    ...updateSlotQuantityMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getSlotsByEventQuery(shift.eventId).queryKey,
      });
    },
  });

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
  const queryClient = useQueryClient();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const { data: positions } = useQuery(allPositionsQuery());

  const { mutateAsync: addShifts } = useMutation({
    ...createShiftMutation(),
    onMutate: () => {
      // Optimistic update logic here
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getSlotsByEventQuery(eventId).queryKey,
      });
    },
  });

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
                    items={positions.filter(
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
}: {
  shift: Infer<typeof shiftSchemaWithSlots>;
}) {
  const queryClient = useQueryClient();
  const slotsQueryKey = getSlotsByEventQuery(shift.eventId).queryKey;

  const { data: users, isLoading: usersLoading } = useQuery(
    allUsersForComboboxQuery(),
  );

  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [userToAssign, setUserToAssign] = useState<Infer<
    typeof userSchemaForCombobox
  > | null>(null);

  const { mutateAsync: assignSlot, isPending } = useMutation({
    ...assignUserMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: slotsQueryKey,
      });
    },
    onSuccess: () => {
      setOpen(false);
    },
  });

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
            itemToStringLabel={(user: Infer<typeof userSchemaForCombobox>) =>
              `${user.displayName}`
            }
            onValueChange={setUserToAssign}
          >
            <ComboboxInput
              showTrigger={!usersLoading}
              data-slot="input-group-control"
              placeholder="Search users..."
            >
              {usersLoading && (
                <InputGroupAddon
                  align="inline-end"
                  className="text-muted-foreground"
                >
                  <Spinner />
                </InputGroupAddon>
              )}
            </ComboboxInput>
            <ComboboxContent>
              <ComboboxEmpty>No users found.</ComboboxEmpty>
              <ComboboxList>
                {(user: Infer<typeof userSchemaForCombobox>) => (
                  <ComboboxItem key={user.id} value={user}>
                    {user.displayName}
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
                    {isPending ? (
                      <Spinner />
                    ) : (
                      <>
                        <IconCheck />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              }
            />
            <TooltipContent>Select a user to assign</TooltipContent>
          </Tooltip>
        </div>
      </PopoverContent>
    </Popover>
  );
}
