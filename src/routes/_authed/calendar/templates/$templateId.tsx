import { IconAlignLeft, IconForms, IconTrash } from '@tabler/icons-react';
import { useStore } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAppForm } from '~/components/form';
import {
  AddressFieldGroup,
  DescriptionFieldGroup,
} from '~/components/form/field-groups';
import {
  Button,
  Card,
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
import {
  createEventFromTemplateMutation,
  createTemplatePositionsMutation,
  deleteTemplatePositionMutation,
  updateTemplateDetailsMutation,
  updateTemplatePositionQuantityMutation,
} from '~/features/calendar/calendar.mutations';
import {
  allPositionsQuery,
  allTemplatesQuery,
  getTemplateByIdQuery,
} from '~/features/calendar/calendar.queries';
import type {
  positionSchema,
  templateSchemaWithPositions,
} from '~/features/calendar/calendar.schema';
import { parseAndFormatTime } from '~/lib/utils';
import dayjs from 'dayjs';
import {
  Check,
  CheckIcon,
  Clock,
  MapPin,
  Minus,
  PencilIcon,
  Plus,
  PlusIcon,
  TextAlignStart,
  X,
  XIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { literal, object, string, union } from 'zod';
import type { infer as Infer } from 'zod';

const timeSchema = string().regex(
  /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
  'Please enter a valid time.',
);

export const Route = createFileRoute('/_authed/calendar/templates/$templateId')(
  {
    loader: async ({ context: { queryClient }, params: { templateId } }) => {
      await queryClient.fetchQuery(getTemplateByIdQuery(templateId));
      await queryClient.fetchQuery(allTemplatesQuery());
    },
    component: RouteComponent,
    head: () => ({
      meta: [{ title: 'CCRU | Event Template' }],
    }),
  },
);

function RouteComponent() {
  const { templateId } = Route.useParams();
  const { currentUser } = Route.useRouteContext();

  const queryClient = useQueryClient();
  const nav = useNavigate();

  const [isEditing, setIsEditing] = useState(false);

  const { data: template, isLoading: templateIsLoading } = useQuery(
    getTemplateByIdQuery(templateId),
  );

  const { mutate: deleteTemplatePosition, isPending: deleteIsPending } =
    useMutation({
      ...deleteTemplatePositionMutation(),
      // onMutate: async (variables) => {
      //   const templateQueryKey = getTemplateByIdQuery(templateId).queryKey;
      //   await queryClient.cancelQueries({ queryKey: templateQueryKey });

      //   const previousTemplate =
      //     queryClient.getQueryData<Infer<typeof templateSchemaWithPositions>>(
      //       templateQueryKey,
      //     );

      //   queryClient.setQueryData<Infer<typeof templateSchemaWithPositions>>(
      //     templateQueryKey,
      //     (current) => {
      //       if (!current) return current;

      //       return {
      //         ...current,
      //         positions: current.positions.filter(
      //           (position) =>
      //             position.junctionId !== variables.templatePositionId,
      //         ),
      //       };
      //     },
      //   );

      //   return { previousTemplate };
      // },
      // onError: (_error, _variables, context) => {
      //   if (context?.previousTemplate) {
      //     queryClient.setQueryData(
      //       getTemplateByIdQuery(templateId).queryKey,
      //       context.previousTemplate,
      //     );
      //   }
      // },
      onSettled: async () => {
        await queryClient.invalidateQueries({
          queryKey: getTemplateByIdQuery(templateId).queryKey,
        });
      },
      onSuccess: () => {
        toast.success('Template removed.');
        nav({ to: '/calendar/templates' });
      },
    });

  const { mutateAsync: updateTemplateDetails, isPending: isSavingDetails } =
    useMutation({
      ...updateTemplateDetailsMutation(),
      // onMutate: async (variables) => {
      //   const templateQueryKey = getTemplateByIdQuery(templateId).queryKey;
      //   const allTemplatesQueryKey = allTemplatesQuery().queryKey;

      //   await Promise.all([
      //     queryClient.cancelQueries({ queryKey: templateQueryKey }),
      //     queryClient.cancelQueries({ queryKey: allTemplatesQueryKey }),
      //   ]);

      //   const previousTemplate =
      //     queryClient.getQueryData<Infer<typeof templateSchemaWithPositions>>(
      //       templateQueryKey,
      //     );
      //   const previousTemplates =
      //     queryClient.getQueryData<Infer<typeof templateSchema>[]>(
      //       allTemplatesQueryKey,
      //     );

      //   queryClient.setQueryData<Infer<typeof templateSchemaWithPositions>>(
      //     templateQueryKey,
      //     (current) =>
      //       current
      //         ? {
      //             ...current,
      //             ...variables.data,
      //           }
      //         : current,
      //   );

      //   queryClient.setQueryData<Infer<typeof templateSchema>[]>(
      //     allTemplatesQueryKey,
      //     (current) =>
      //       current?.map((template) =>
      //         template.id === variables.templateId
      //           ? { ...template, ...variables.data }
      //           : template,
      //       ) ?? current,
      //   );

      //   return { previousTemplate, previousTemplates };
      // },
      // onError: (_error, _variables, context) => {
      //   if (context?.previousTemplate) {
      //     queryClient.setQueryData(
      //       getTemplateByIdQuery(templateId).queryKey,
      //       context.previousTemplate,
      //     );
      //   }
      //   if (context?.previousTemplates) {
      //     queryClient.setQueryData(
      //       allTemplatesQuery().queryKey,
      //       context.previousTemplates,
      //     );
      //   }
      // },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getTemplateByIdQuery(templateId).queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: allTemplatesQuery().queryKey,
          }),
        ]);
      },
      onSuccess: () => {
        toast.success('Template details saved.');
      },
    });

  const {
    mutateAsync: createEventFromTemplate /* isPending: isCreatingEvent */,
  } = useMutation({
    ...createEventFromTemplateMutation(),
    onMutate: () => {
      // onMutate here
    },
    onSuccess: ({ id }) => {
      toast.success('Event created from template.');
      nav({
        to: '/calendar/events/$eventId',
        params: { eventId: id },
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: template?.name ?? '',
      display: template?.display ?? '',
      description: template?.description ?? '',
      location: template?.location ?? '',
      timeBegin: template?.timeBegin ?? '',
      timeEnd: template?.timeEnd ?? '',
    },
    validators: {
      onSubmit: object({
        name: string().min(1, 'Please enter a template name.'),
        display: string().min(1, 'Please enter an event name.'),
        description: string(),
        location: string(),
        timeBegin: timeSchema,
        timeEnd: union([timeSchema, literal('')]),
      }),
    },
    onSubmit: async ({ value }) => {
      const normalizedTimeBegin =
        parseAndFormatTime(value.timeBegin)?.iso ?? value.timeBegin;
      const normalizedTimeEnd = value.timeEnd
        ? (parseAndFormatTime(value.timeEnd)?.iso ?? value.timeEnd)
        : null;

      await updateTemplateDetails({
        templateId,
        data: {
          name: value.name.trim(),
          display: value.display.trim(),
          description: value.description || null,
          location: value.location || null,
          timeBegin: normalizedTimeBegin,
          timeEnd: normalizedTimeEnd,
        },
      });
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (!template) return;
    form.reset({
      name: template.name,
      display: template.display,
      description: template.description ?? '',
      location: template.location ?? '',
      timeBegin: template.timeBegin,
      timeEnd: template.timeEnd ?? '',
    });
    setIsEditing(false);
  }, [form, template]);

  if (templateIsLoading) {
    return <div>Loading template</div>;
  }
  if (!template) return <div>Template not found</div>;

  const formatTime = (time: string | null) =>
    time ? dayjs(`1970-01-01T${time}`).format('h:mm A') : null;

  return (
    <div className="flex flex-1 flex-col gap-8 lg:flex-row">
      <div className="flex flex-1 flex-col gap-2 lg:max-w-md">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-semibold">Details</span>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <PencilIcon />
                Edit
              </Button>
            )}
            <DialogCreateEventFromTemplate
              isPending={false}
              onCreateEvent={async (date) => {
                await createEventFromTemplate({
                  templateId,
                  date,
                  createdBy: currentUser.id,
                });
              }}
            />
          </div>
        </div>
        {isEditing ? (
          <form
            className="flex flex-1 flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <form.Field name="name">
              {(nameField) => (
                <Field>
                  <FieldLabel htmlFor={nameField.name}>Name</FieldLabel>
                  <Input
                    id={nameField.name}
                    name={nameField.name}
                    value={nameField.state.value}
                    onBlur={nameField.handleBlur}
                    onChange={(e) => nameField.handleChange(e.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="display">
              {(displayField) => (
                <Field>
                  <FieldLabel htmlFor={displayField.name}>
                    Event name
                  </FieldLabel>
                  <Input
                    id={displayField.name}
                    name={displayField.name}
                    value={displayField.state.value}
                    onBlur={displayField.handleBlur}
                    onChange={(e) => displayField.handleChange(e.target.value)}
                  />
                </Field>
              )}
            </form.Field>
            <div className="flex gap-2">
              <form.AppField name="timeBegin">
                {(field) => (
                  <field.TimeField
                    label="Start time"
                    placeholder="e.g., 1:00 PM or 1300"
                  />
                )}
              </form.AppField>
              <form.AppField name="timeEnd">
                {(field) => (
                  <field.TimeField
                    label="End time"
                    placeholder="e.g., 1:00 PM or 1300"
                  />
                )}
              </form.AppField>
            </div>
            <AddressFieldGroup form={form} fields={{ location: 'location' }} />
            <DescriptionFieldGroup
              form={form}
              fields={{ eventName: 'eventName', description: 'description' }}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                disabled={isSavingDetails}
                onClick={() => {
                  form.reset();
                  setIsEditing(false);
                }}
                type="button"
              >
                <XIcon />
                Cancel
              </Button>
              <Button disabled={isSavingDetails} variant="solid" type="submit">
                <CheckIcon />
                Save
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <IconForms className="size-4" />
              <span className="text-lg">{template.display}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4" />
              <span className="flex-1">{`${formatTime(template.timeBegin)}${template.timeEnd ? ` - ${formatTime(template.timeEnd)}` : ''}`}</span>
            </div>
            {template.location && (
              <div className="flex items-center gap-2">
                <MapPin className="size-4" />
                <span className="flex-1">{template.location}</span>
              </div>
            )}
            {template.description && (
              <div className="flex items-start gap-2">
                <TextAlignStart className="mt-1 size-4" />
                <span className="flex-1 whitespace-pre-wrap">
                  {template.description}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 lg:max-w-lg">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-semibold">Positions</span>
        </div>
        <DialogAddTemplatePosition
          existingPositionIds={template.positions.map((p) => p.id)}
          templateId={templateId}
        />
        <div className="flex flex-col gap-4">
          {template.positions
            .sort((a, b) => a.display.localeCompare(b.display))
            .map((templatePosition) => {
              return (
                <Card key={templatePosition.junctionId}>
                  <CardHeader>
                    <CardTitle>{templatePosition.display}</CardTitle>
                    <CardDescription>
                      <PopoverTemplatePositionQuantity
                        templateId={templateId}
                        templatePosition={templatePosition}
                      />
                    </CardDescription>
                    {templatePosition.description && (
                      <div className="flex gap-2">
                        <IconAlignLeft className="mt-1 size-3" />
                        <CardDescription className="flex-1 text-foreground">
                          <span>{templatePosition.description}</span>
                        </CardDescription>
                      </div>
                    )}
                  </CardHeader>
                  <CardFooter className="gap-2">
                    <Button
                      className="flex-1"
                      disabled={deleteIsPending}
                      onClick={() =>
                        deleteTemplatePosition({
                          templatePositionId: templatePosition.junctionId,
                        })
                      }
                      type="button"
                    >
                      <IconTrash />
                      Remove
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function DialogCreateEventFromTemplate({
  isPending,
  onCreateEvent,
}: {
  isPending: boolean;
  onCreateEvent: (date: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const form = useAppForm({
    defaultValues: {
      date: dayjs().format('YYYY-MM-DD'),
    },
    // validators: {
    //   onSubmit: object({
    //     date: iso.date(),
    //   }),
    // },
    onSubmit: async ({ value }) => {
      await onCreateEvent(value.date);
      setOpen(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) form.reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="solid">
            <PlusIcon />
            Create event
          </Button>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Create a new event from this template. Positions will be copied as
            shifts.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.AppField name="date">
            {(field) => (
              <field.DateField label="Date" placeholder="Select a date" />
            )}
          </form.AppField>
        </form>
        <DialogFooter>
          <DialogClose
            render={
              <Button disabled={isPending}>
                <XIcon />
                Cancel
              </Button>
            }
          />
          <Button
            disabled={isPending}
            variant="solid"
            onClick={() => form.handleSubmit()}
          >
            <CheckIcon />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PopoverTemplatePositionQuantity({
  templateId,
  templatePosition,
}: {
  templateId: string;
  templatePosition: Infer<
    typeof templateSchemaWithPositions
  >['positions'][number];
}) {
  const queryClient = useQueryClient();
  const templateQueryKey = getTemplateByIdQuery(templateId).queryKey;
  const [quantity, setQuantity] = useState<number>(templatePosition.quantity);
  const { mutateAsync: updateTemplatePositionQuantity, isPending: isSaving } =
    useMutation({
      ...updateTemplatePositionQuantityMutation(),
      // onMutate: async (variables) => {
      //   await queryClient.cancelQueries({ queryKey: templateQueryKey });

      //   const previousTemplate =
      //     queryClient.getQueryData<Infer<typeof templateSchemaWithPositions>>(
      //       templateQueryKey,
      //     );

      //   queryClient.setQueryData<Infer<typeof templateSchemaWithPositions>>(
      //     templateQueryKey,
      //     (current) => {
      //       if (!current) return current;

      //       return {
      //         ...current,
      //         positions: current.positions.map((position) =>
      //           position.junctionId === variables.templatePositionId
      //             ? { ...position, quantity: variables.quantity }
      //             : position,
      //         ),
      //       };
      //     },
      //   );

      //   return { previousTemplate };
      // },
      // onError: (_error, _variables, context) => {
      //   if (context?.previousTemplate) {
      //     queryClient.setQueryData(templateQueryKey, context.previousTemplate);
      //   }
      // },
      onSettled: async () => {
        await queryClient.invalidateQueries({
          queryKey: templateQueryKey,
        });
      },
    });

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button className="my-1" size="sm">
            Quantity: {templatePosition.quantity}
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
              disabled={quantity <= 1}
              size="icon-xs"
              variant="ghost"
              onClick={() => setQuantity((v) => v - 1)}
            >
              <Minus className="size-3" />
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
              onBlur={(e) => Number(e.target.value) < 1 && setQuantity(1)}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <Button
              size="icon-xs"
              type="button"
              variant="ghost"
              onClick={() => setQuantity((v) => v + 1)}
            >
              <Plus className="size-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <PopoverClose
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setQuantity(templatePosition.quantity)}
                >
                  <X />
                </Button>
              }
            />
            <PopoverClose
              render={
                <Button
                  disabled={
                    isSaving ||
                    quantity < 1 ||
                    !Number.isInteger(quantity) ||
                    quantity === templatePosition.quantity
                  }
                  size="sm"
                  variant="solid"
                  onClick={() =>
                    updateTemplatePositionQuantity({
                      templatePositionId: templatePosition.junctionId,
                      quantity,
                    })
                  }
                >
                  <Check />
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

function DialogAddTemplatePosition({
  templateId,
  existingPositionIds,
}: {
  templateId: string;
  existingPositionIds: string[];
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { data: positions } = useQuery(allPositionsQuery());
  const { mutate: createTemplatePositions, isPending: createIsPending } =
    useMutation({
      ...createTemplatePositionsMutation(),
      onMutate: () => {
        // Optimistic update logic here
      },
    });

  const form = useAppForm({
    defaultValues: {
      templatePositionsToCreate: [] as {
        position: Infer<typeof positionSchema>;
        quantity: number;
      }[],
    },
    onSubmit: ({ value }) => {
      createTemplatePositions({
        templateId,
        templatePositionsToCreate: value.templatePositionsToCreate.map(
          (entry) => ({
            positionId: entry.position.id,
            quantity: entry.quantity,
          }),
        ),
      });
    },
  });

  const selectedLength = useStore(
    form.store,
    (state) => state.values.templatePositionsToCreate.length,
  );

  return (
    <Dialog onOpenChange={(open) => !open && form.reset()}>
      <DialogTrigger
        render={
          <Button variant="ghost">
            <PlusIcon />
            Add position
          </Button>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add Positions</DialogTitle>
          <DialogDescription>
            Add position quantities that will become shifts when creating an
            event from this template.
          </DialogDescription>
        </DialogHeader>
        <div className="flex w-full flex-col gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <form.Field mode="array" name="templatePositionsToCreate">
              {(templatePositionsField) => (
                <div className="flex flex-col gap-2">
                  {templatePositionsField.state.value.map((entry, i) => (
                    <div
                      key={entry.position.id}
                      className="flex items-center gap-2"
                    >
                      <form.Field
                        name={`templatePositionsToCreate[${i}].position`}
                      >
                        {(positionField) => (
                          <div className="min-w-40 flex-1">
                            {positionField.state.value.display}
                          </div>
                        )}
                      </form.Field>
                      <form.Field
                        name={`templatePositionsToCreate[${i}].quantity`}
                      >
                        {(quantityField) => (
                          <div className="flex items-center gap-1">
                            <Button
                              disabled={quantityField.state.value <= 1}
                              size="icon-xs"
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                quantityField.handleChange((v) => v - 1)
                              }
                            >
                              <Minus className="size-3" />
                            </Button>
                            <Input
                              className="w-12 [&_input]:text-center"
                              inputMode="numeric"
                              size="sm"
                              type="text"
                              value={quantityField.state.value}
                              onBeforeInput={(e) => {
                                if (
                                  e.nativeEvent.data &&
                                  !/^[0-9]+$/.test(e.nativeEvent.data)
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              onBlur={(e) =>
                                Number(e.target.value) < 1 &&
                                quantityField.handleChange(1)
                              }
                              onChange={(e) =>
                                quantityField.handleChange(
                                  Number(e.target.value),
                                )
                              }
                            />
                            <Button
                              size="icon-xs"
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                quantityField.handleChange((v) => v + 1)
                              }
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        )}
                      </form.Field>
                      <Button
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                        onClick={() => templatePositionsField.removeValue(i)}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  <Combobox
                    items={positions.filter(
                      (position) =>
                        !existingPositionIds.includes(position.id) &&
                        !form.state.values.templatePositionsToCreate.some(
                          (entry) => entry.position.id === position.id,
                        ),
                    )}
                    itemToStringLabel={(position: (typeof positions)[number]) =>
                      position.display
                    }
                    onValueChange={(value) =>
                      value &&
                      templatePositionsField.pushValue({
                        position: value,
                        quantity: 1,
                      })
                    }
                  >
                    <ComboboxInput placeholder="Search positions..." />
                    <ComboboxContent>
                      <ComboboxEmpty>No positions found.</ComboboxEmpty>
                      <ComboboxList>
                        {(position: (typeof positions)[number]) => (
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
                <XIcon />
                Cancel
              </Button>
            }
          />
          <Tooltip
            open={tooltipOpen && selectedLength === 0}
            onOpenChange={setTooltipOpen}
          >
            <TooltipTrigger
              render={
                <div className="has-disabled:cursor-not-allowed">
                  <Button
                    disabled={createIsPending || selectedLength === 0}
                    variant="solid"
                    onClick={() => {
                      if (selectedLength === 0) return;
                      form.handleSubmit();
                    }}
                  >
                    <CheckIcon />
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
