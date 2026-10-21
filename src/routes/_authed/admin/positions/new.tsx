import { IconCheck, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAppForm } from '~/components/form';
import { Button, Field, FieldLabel, Input, Textarea } from '~/components/ui';
import { createPositionMutation } from '~/features/calendar/mutations';
import { allPositionsQuery } from '~/features/calendar/queries';
import { RequirementEditor } from '~/features/eligibility/controls';
import type { EligibilityExpression } from '~/features/eligibility/schema';
import { allCertificationsQuery } from '~/features/users/queries';
import { useState } from 'react';
import { toast } from 'sonner';
import { object, string } from 'zod';

export const Route = createFileRoute('/_authed/admin/positions/new')({
  component: NewPositionPage,
  head: () => ({
    meta: [{ title: 'CCRU | Create Position' }],
  }),
});

function NewPositionPage() {
  const nav = useNavigate();
  const [expression, setExpression] = useState<EligibilityExpression | null>(
    null,
  );
  const { data: certifications = [], error: catalogError } = useQuery(
    allCertificationsQuery(),
  );
  const queryClient = useQueryClient();

  const {
    mutateAsync: createPosition,
    isPending: isCreating,
    error: saveError,
  } = useMutation({
    ...createPositionMutation(),
    onSuccess: () => {
      toast.success('Position created.');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: allPositionsQuery().queryKey,
      });
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: '',
      display: '',
      description: '',
    },
    validators: {
      onSubmit: object({
        name: string().min(1, 'Please enter a position name.'),
        display: string().min(1, 'Please enter a display name.'),
        description: string(),
      }),
    },
    onSubmit: async ({ value }) => {
      const created = await createPosition({
        name: value.name.trim(),
        display: value.display.trim(),
        description: value.description || null,
        eligibilityExpression: expression,
      });

      nav({
        to: '/admin/positions/$positionId',
        params: { positionId: created.id },
      });
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-2 lg:max-w-md">
      <span className="text-xl font-semibold">New Position</span>
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
              <FieldLabel htmlFor={displayField.name}>Display name</FieldLabel>
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
                onChange={(e) => descriptionField.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>
        <h2>Eligibility requirements</h2>
        <RequirementEditor
          value={expression}
          onChange={setExpression}
          certifications={certifications}
          disabled={isCreating}
        />
        {(saveError || catalogError) && (
          <p role="alert">{(saveError || catalogError)?.message}</p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button
            disabled={isCreating}
            type="button"
            onClick={() => nav({ to: '/admin/positions' })}
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
  );
}
