import { IconAlignLeft, IconForms } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useAppForm } from '~/components/form';
import { Button, Field, FieldLabel, Input, Textarea } from '~/components/ui';
import { updatePositionMutation } from '~/features/calendar/mutations';
import {
  allPositionsQuery,
  getPositionByIdQuery,
} from '~/features/calendar/queries';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { object, string } from 'zod';

export const Route = createFileRoute('/_authed/admin/positions/$positionId')({
  loader: async ({ context: { queryClient }, params: { positionId } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getPositionByIdQuery(positionId)),
      queryClient.ensureQueryData(allPositionsQuery()),
    ]);
  },
  component: PositionPage,
  preloadGcTime: 1000 * 10,
  head: () => ({
    meta: [{ title: 'CCRU | Position' }],
  }),
});

function PositionPage() {
  const { positionId } = Route.useParams();

  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: position, isLoading } = useQuery(
    getPositionByIdQuery(positionId),
  );

  const { mutateAsync: updatePosition, isPending: isSaving } = useMutation({
    ...updatePositionMutation(),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getPositionByIdQuery(positionId).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: allPositionsQuery().queryKey,
        }),
      ]);
    },
    onSuccess: () => {
      toast.success('Position details saved.');
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: position?.name ?? '',
      display: position?.display ?? '',
      description: position?.description ?? '',
    },
    validators: {
      onSubmit: object({
        name: string().min(1, 'Please enter a position name.'),
        display: string().min(1, 'Please enter a display name.'),
        description: string(),
      }),
    },
    onSubmit: async ({ value }) => {
      await updatePosition({
        positionId,
        data: {
          name: value.name.trim(),
          display: value.display.trim(),
          description: value.description || null,
        },
      });
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (!position) return;

    form.reset({
      name: position.name,
      display: position.display,
      description: position.description ?? '',
    });
    setIsEditing(false);
  }, [form, position]);

  if (isLoading) {
    return <div>Loading position</div>;
  }

  if (!position) {
    return <div>Position not found</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-2 lg:max-w-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xl font-semibold">Details</span>
        {!isEditing && (
          <Button size="sm" onClick={() => setIsEditing(true)} type="button">
            <PencilIcon />
            Edit
          </Button>
        )}
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
                  Display name
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
          <form.Field name="description">
            {(descriptionField) => (
              <Field>
                <FieldLabel htmlFor={descriptionField.name}>
                  Description
                </FieldLabel>
                <Textarea
                  id={descriptionField.name}
                  name={descriptionField.name}
                  placeholder="Describe this position"
                  value={descriptionField.state.value}
                  onBlur={descriptionField.handleBlur}
                  onChange={(e) =>
                    descriptionField.handleChange(e.target.value)
                  }
                />
              </Field>
            )}
          </form.Field>
          <div className="flex items-center justify-end gap-2">
            <Button
              disabled={isSaving}
              onClick={() => {
                form.reset();
                setIsEditing(false);
              }}
              type="button"
            >
              <XIcon />
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit" variant="solid">
              <CheckIcon />
              Save
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <IconForms className="size-4" />
            <div className="flex flex-col">
              <span className="text-lg">{position.display}</span>
              <span className="text-sm text-muted-foreground">
                {position.name}
              </span>
            </div>
          </div>
          {position.description && (
            <div className="flex items-start gap-2">
              <IconAlignLeft className="mt-1 size-3" />
              <span className="flex-1 whitespace-pre-wrap">
                {position.description}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
