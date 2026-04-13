import {
  IconAlignLeft,
  IconCalendar,
  IconCheck,
  IconCircleCheckFilled,
  IconExternalLink,
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
  DialogFooter,
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
import {
  createEmptyLocation,
  formatLocationInline,
  formatLocationLines,
  parseLocationInput,
} from '~/features/calendar/location';
import {
  assignUserMutation,
  createShiftMutation,
  deleteShiftMutation,
  deleteSlotMutation,
  reassignUserMutation,
  updateEventDetailsMutation,
  updateSlotQuantityMutation,
} from '~/features/calendar/mutations';
import {
  allPositionsQuery,
  getEventDetailsQuery,
  getSlotsByEventQuery,
} from '~/features/calendar/queries';
import type {
  locationSchema,
  positionSchema,
  shiftSchemaWithSlots,
} from '~/features/calendar/schema';
import { allUsersForComboboxQuery } from '~/features/users/queries';
import type { userSchemaForCombobox } from '~/features/users/schema';
import { cn } from '~/lib/utils';
import { getUserPermissions } from '~/server/permissions';
import dayjs from 'dayjs';
import { UserRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { infer as Infer } from 'zod';

export const Route = createFileRoute('/_authed/calendar/events/$eventId')({
  component: EventPage,
  head: () => ({
    meta: [{ title: 'CCRU | Event' }],
  }),
  loader: async ({ context: { queryClient }, params: { eventId } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getEventDetailsQuery(eventId)),
      queryClient.ensureQueryData(getSlotsByEventQuery(eventId)),
      queryClient.ensureQueryData(allUsersForComboboxQuery()),
    ]);
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
      location: eventDetails?.location ?? createEmptyLocation(),
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
      const parsedLocation = parseLocationInput(value.location);

      if (parsedLocation.isPartial) {
        toast.error('Please complete all required location fields.');
        return;
      }

      const eventData = {
        description: value.description || undefined,
        name: value.eventName,
        timeBegin: dayjs(`${value.date} ${value.timeBegin}`).toISOString(),
        timeEnd: value.timeEnd
          ? dayjs(`${value.date} ${value.timeEnd}`).toISOString()
          : undefined,
        ...(parsedLocation.location
          ? { location: parsedLocation.location }
          : {}),
      };

      updateEventDetails({
        data: eventData,
        eventId,
      });

      setEditing(false);
    },
  });

  function buildGoogleMapsUrl(location: Infer<typeof locationSchema>): string {
    const query = encodeURIComponent(
      [
        location.line1,
        location.line2,
        location.city,
        location.state,
        location.zip,
      ]
        .filter(Boolean)
        .join(', '),
    );

    return `https://www.google.com/maps/search/${query}`;
  }

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
            <div className="flex gap-2">
              <IconCalendar className="mt-1 size-4" />
              <div className="flex flex-1 flex-col">
                <span className="flex-1">
                  {dayjs(eventDetails.timeBegin).format('dddd, MMMM D, YYYY')}
                </span>
                <span className="flex-1">{`${dayjs(eventDetails.timeBegin).format('h:mm A')}${eventDetails.timeEnd ? ` — ${dayjs(eventDetails.timeEnd).format('h:mm A')}` : null}`}</span>
              </div>
            </div>
            <a>
              <ComingSoonTooltip>
                <Button className="ml-6" size="sm" variant="link">
                  Add to calendar
                </Button>
              </ComingSoonTooltip>
            </a>
          </div>
          {/* Location */}
          {formatLocationLines(eventDetails.location).length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <IconMapPin className="mt-1 size-4" />
                <div className="flex flex-1 flex-col">
                  {formatLocationLines(eventDetails.location).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
              </div>
              {eventDetails.location ? (
                <a
                  href={buildGoogleMapsUrl(eventDetails.location)}
                  target="_blank"
                >
                  <Button className="ml-6" size="sm" variant="link">
                    Open in Google Maps
                    <IconExternalLink />
                  </Button>
                </a>
              ) : null}
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
  permissions: ReturnType<typeof getUserPermissions>; // TODO: Fix this
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
        <PopoverAddShifts
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
              const slotsAvailable = shift.quantity - shift.slots.length;
              const isDescriptionExpanded = expandedShiftDescriptions.has(
                shift.id,
              );
              return (
                <Card key={shift.id}>
                  <CardHeader>
                    <CardTitle>{shift.position.display}</CardTitle>
                    <CardDescription>
                      {permissions.can('modify', 'Shift') ? (
                        <PopoverModifySlotQuantity shift={shift} />
                      ) : (
                        `${shift.slots.length} of ${shift.quantity} filled`
                      )}
                    </CardDescription>

                    <ButtonSignUp
                      eventId={eventId}
                      shiftId={shift.id}
                      slotsAvailable={slotsAvailable}
                    />
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

type ButtonSignUpProps = {
  eventId: string;
  shiftId: string;
  slotsAvailable: number;
};
function ButtonSignUp({ eventId, shiftId, slotsAvailable }: ButtonSignUpProps) {
  const { currentUser } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);

  // TODO: Add permission logic
  const canSignUp = slotsAvailable > 0;

  // Queries
  const { data: eventDetails } = useQuery(getEventDetailsQuery(eventId));

  // Mutations
  const { mutateAsync: signUp, status } = useMutation({
    ...assignUserMutation(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getSlotsByEventQuery(eventId).queryKey,
      });
    },
  });

  return (
    <>
      {/* FIXME: If user signs up then is deleted, the sign up button is not shown because the mutation is still in success state. */}
      {canSignUp && status !== 'success' ? (
        <CardAction>
          <Button
            size="sm"
            onClick={() => {
              signUp(
                { shiftId, userId: currentUser.id },
                {
                  onSuccess: () => {
                    setOpen(true);
                  },
                },
              );
            }}
          >
            {status === 'pending' ? (
              <Spinner />
            ) : (
              <>
                <IconSparkles2 />
                Sign up
              </>
            )}
          </Button>
        </CardAction>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-1 flex-col items-center justify-center">
              <IconCircleCheckFilled className="size-32 text-emerald-500" />
              <span className="text-center text-2xl font-semibold">
                Thank you for signing up!
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-lg font-semibold">Floater</span>
              <span>{eventDetails!.name}</span>
              {formatLocationInline(eventDetails!.location) && (
                <span>{formatLocationInline(eventDetails!.location)}</span>
              )}
              <span>
                {dayjs(eventDetails!.timeBegin).format('dddd, MMMM M, YYYY')}
              </span>
              <span>
                {dayjs(eventDetails!.timeBegin).format('h:mm A')}
                {' – '}
                {eventDetails!.timeEnd
                  ? dayjs(eventDetails!.timeEnd).format('h:mm A')
                  : null}
              </span>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button>Close</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          user.display
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
                {user.display}
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
      <span>{slot.user.display}</span>
    </div>
  );
}

function normalizeQuantity(quantity: number, minQuantity: number) {
  if (!Number.isInteger(quantity)) return minQuantity;

  return Math.max(quantity, minQuantity);
}

function SlotQuantitySelector({
  minQuantity,
  quantity,
  onQuantityChange,
  onRemove,
}: {
  minQuantity: number;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onRemove?: () => void;
}) {
  const normalizedQuantity = normalizeQuantity(quantity, minQuantity);
  const isAtMinimum = normalizedQuantity <= minQuantity;

  return (
    <div className="flex items-center gap-1">
      <Button
        disabled={!onRemove && isAtMinimum}
        size="icon-xs"
        type="button"
        variant="ghost"
        onClick={() => {
          if (isAtMinimum) {
            onRemove?.();
            return;
          }

          onQuantityChange(normalizedQuantity - 1);
        }}
      >
        {onRemove && isAtMinimum ? (
          <IconTrash className="size-3" />
        ) : (
          <IconMinus className="size-3" />
        )}
      </Button>
      <Input
        className="w-12 [&_input]:text-center"
        inputMode="numeric"
        size="sm"
        type="text"
        value={quantity}
        onBeforeInput={(e) => {
          if (e.nativeEvent.data && !/^[0-9]+$/.test(e.nativeEvent.data)) {
            e.preventDefault();
          }
        }}
        onBlur={(e) =>
          onQuantityChange(
            normalizeQuantity(Number(e.target.value), minQuantity),
          )
        }
        onChange={(e) => onQuantityChange(Number(e.target.value))}
      />
      <Button
        size="icon-xs"
        type="button"
        variant="ghost"
        onClick={() => onQuantityChange(normalizedQuantity + 1)}
      >
        <IconPlus className="size-3" />
      </Button>
    </div>
  );
}

function PopoverModifySlotQuantity({
  shift,
}: {
  shift: Infer<typeof shiftSchemaWithSlots>;
}) {
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState<number>(shift.quantity);
  const minSlots = Math.max(shift.slots.length, 1);
  const normalizedQuantity = normalizeQuantity(quantity, minSlots);

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
          <SlotQuantitySelector
            minQuantity={minSlots}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
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
                  disabled={normalizedQuantity === shift.quantity}
                  size="sm"
                  variant="solid"
                  onClick={() => {
                    if (normalizedQuantity !== shift.quantity) {
                      updateSlotQuantity({
                        shiftId: shift.id,
                        quantity: normalizedQuantity,
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

function PopoverAddShifts({
  eventId,
  existingShifts,
}: {
  eventId: string;
  existingShifts: string[]; // Array of shift IDs
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // Queries
  const { data: positions } = useQuery(allPositionsQuery());

  // Mutations
  const { mutateAsync: addShifts, isPending } = useMutation({
    ...createShiftMutation(),
  });

  // Form
  const form = useAppForm({
    defaultValues: {
      positionSearch: '',
      selectedPosition: null as Infer<typeof positionSchema> | null,
      shiftsToCreate: [] as {
        position: Infer<typeof positionSchema>;
        quantity: number;
      }[],
    },
    onSubmit: ({ value }) => {
      const shiftsToCreate = value.shiftsToCreate.map((s) => ({
        positionId: s.position.id,
        quantity: normalizeQuantity(s.quantity, 1),
      }));

      addShifts(
        { eventId, shiftsToCreate },
        {
          onSettled: () => {
            queryClient.invalidateQueries({
              queryKey: getSlotsByEventQuery(eventId).queryKey,
            });
          },
          onSuccess: () => {
            setOpen(false);
            form.reset();
          },
        },
      );
    },
  });

  const length = useStore(
    form.store,
    (state) => state.values.shiftsToCreate.length,
  );

  // Render
  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        // Reset state when dialog is closed
        if (!isOpen) {
          form.reset();
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="ghost">
            <IconPlus />
            Add shift
          </Button>
        }
      />
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Add Shifts</PopoverTitle>
        </PopoverHeader>
        <div>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <form.Field mode="array" name="shiftsToCreate">
              {(shiftsToCreateField) => (
                <div className="flex flex-col gap-1">
                  {shiftsToCreateField.state.value.map((shift, i) => (
                    <div
                      key={shift.position.id}
                      className="flex items-center gap-2 border-2 border-blue-400"
                    >
                      <div className="min-w-40 flex-1">
                        {shift.position.display}
                      </div>
                      <form.Field name={`shiftsToCreate[${i}].quantity`}>
                        {(quantityField) => (
                          <SlotQuantitySelector
                            minQuantity={1}
                            quantity={quantityField.state.value}
                            onRemove={() => shiftsToCreateField.removeValue(i)}
                            onQuantityChange={(quantity) =>
                              quantityField.handleChange(quantity)
                            }
                          />
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
                    value={form.state.values.selectedPosition}
                    itemToStringLabel={(
                      position: Infer<typeof positionSchema>,
                    ) => position.display}
                    onValueChange={(v) => {
                      if (!v) return;
                      shiftsToCreateField.pushValue({
                        position: v,
                        quantity: 1,
                      });
                      form.setFieldValue('selectedPosition', null);
                    }}
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
        <div className="flex items-center justify-end gap-2">
          <PopoverClose
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
                    disabled={length === 0 || isPending}
                    variant="solid"
                    onClick={() => {
                      if (length === 0) return;
                      form.handleSubmit();
                    }}
                  >
                    {isPending ? <Spinner /> : <IconCheck />}
                    Save
                  </Button>
                </div>
              }
            />
            <TooltipContent>Select positions to add</TooltipContent>
          </Tooltip>
        </div>
      </PopoverContent>
    </Popover>
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
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        // Reset state when dialog is closed
        if (!isOpen) {
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
              `${user.display}`
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
                    {isPending ? <Spinner /> : <IconCheck />}
                    Save
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
