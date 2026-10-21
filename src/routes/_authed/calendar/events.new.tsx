import { IconCheck, IconX } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { WorkspaceContent, WorkspaceHeader } from '~/components';
import { useAppForm } from '~/components/form';
import {
  AddressFieldGroup,
  DateTimeFieldGroup,
  DescriptionFieldGroup,
} from '~/components/form/field-groups';
import { Button, Field, FieldLabel, Input } from '~/components/ui';
import {
  eventLocalFields,
  eventLocalToInstant,
} from '~/features/calendar/event-time';
import type { TimeOccurrence } from '~/features/calendar/event-time-choices';
import { EventTimeChoiceFieldGroup } from '~/features/calendar/event-time-field-group';
import {
  createEmptyLocation,
  parseLocationInput,
} from '~/features/calendar/location';
import { createEventMutation } from '~/features/calendar/mutations';
import { locationFormSchema } from '~/features/calendar/schema';
import { useState } from 'react';
import { toast } from 'sonner';
import { iso, object, string, union, null as zNull } from 'zod';

export const Route = createFileRoute('/_authed/calendar/events/new')({
  component: NewEventPage,
  head: () => ({
    meta: [{ title: 'CCRU | Create Event' }],
  }),
});

function NewEventPage() {
  const { currentUser } = Route.useRouteContext();
  const [beginOccurrence, setBeginOccurrence] =
    useState<TimeOccurrence>('earlier');
  const [endOccurrence, setEndOccurrence] = useState<TimeOccurrence>('earlier');
  const [timeError, setTimeError] = useState('');
  // Queries & Mutations
  const { mutateAsync: createEvent, isPending: isCreating } = useMutation({
    ...createEventMutation(),
    onMutate: async () => {
      // Optimistic update logic here
    },
  });

  // Hooks
  const nav = useNavigate();

  // Form
  const form = useAppForm({
    defaultValues: {
      eventName: '',
      description: '' as string | null,
      location: createEmptyLocation(),
      date: eventLocalFields(Date.now()).date,
      timeBegin: '',
      timeEnd: '',
      // shifts: [] as Shift[],
    },
    validators: {
      // Validate the local form shape. Conversion to full ISO datetimes
      // happens in onSubmit when date and time fields are combined.
      onSubmit: object({
        eventName: string().min(1, 'Please enter an event name.'),
        description: union([string(), zNull()]),
        location: locationFormSchema,
        date: iso.date(),
        timeBegin: string().min(1, 'Please enter a start time.'),
        timeEnd: string().min(1, 'Please enter an end time.'),
      }),
    },
    onSubmit: async ({ value }) => {
      const parsedLocation = parseLocationInput(value.location);

      if (parsedLocation.isPartial) {
        toast.error('Please complete all required location fields.');
        return;
      }

      try {
        setTimeError('');
        const newEventId = await createEvent({
          createdBy: currentUser.id,
          description: value.description,
          name: value.eventName,
          location: parsedLocation.location,
          timeBegin: eventLocalToInstant(
            value.date,
            value.timeBegin,
            beginOccurrence,
          ),
          timeEnd: eventLocalToInstant(
            value.date,
            value.timeEnd,
            endOccurrence,
          ),
        });

        nav({
          to: '/calendar/events/$eventId',
          params: { eventId: newEventId.id },
        });
      } catch (error) {
        setTimeError(
          error instanceof Error ? error.message : 'Unable to create event',
        );
      }
    },
  });

  // Render
  return (
    <>
      <WorkspaceHeader>New Event</WorkspaceHeader>
      <WorkspaceContent className="gap-16" orientation="horizontal">
        <div className="flex flex-1 flex-col gap-2 lg:max-w-md">
          <span className="text-xl font-semibold">Details</span>
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
            <EventTimeChoiceFieldGroup
              form={form}
              fields={{
                date: 'date',
                timeBegin: 'timeBegin',
                timeEnd: 'timeEnd',
              }}
              beginOccurrence={beginOccurrence}
              endOccurrence={endOccurrence}
              onBeginChange={setBeginOccurrence}
              onEndChange={setEndOccurrence}
            />
            {timeError && <p role="alert">{timeError}</p>}
            <AddressFieldGroup form={form} fields={{ location: 'location' }} />
            <DescriptionFieldGroup
              form={form}
              fields={{ eventName: 'eventName', description: 'description' }}
            />

            <div className="flex items-center justify-end gap-2">
              <Button
                disabled={isCreating}
                type="button"
                onClick={() => nav({ to: '/calendar' })}
              >
                <IconX />
                Cancel
              </Button>
              <Button disabled={isCreating} type="submit" variant="solid">
                <IconCheck />
                Save
              </Button>
            </div>
          </form>
        </div>
      </WorkspaceContent>
    </>
  );
}
