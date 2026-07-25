import { IconCheck, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAppForm } from '~/components/form';
import {
  Button,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  Field,
  FieldLabel,
  Input,
} from '~/components/ui';
import { buildCertificationTree } from '~/features/users/certifications';
import { createCertificationMutation } from '~/features/users/mutations';
import { allCertificationsQuery } from '~/features/users/queries';
import { toast } from 'sonner';
import { nullable, object, string } from 'zod';

export const Route = createFileRoute('/_authed/admin/certifications/new')({
  component: NewCertificationPage,
  head: () => ({
    meta: [{ title: 'CCRU | Create Certification' }],
  }),
});

function NewCertificationPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { data: certifications } = useQuery(allCertificationsQuery());

  const { mutateAsync: createCertification, isPending: isCreating } =
    useMutation({
      ...createCertificationMutation(),
      onSuccess: () => {
        toast.success('Certification created.');
      },
      onSettled: async () => {
        await queryClient.invalidateQueries({
          queryKey: allCertificationsQuery().queryKey,
        });
      },
    });

  const form = useAppForm({
    defaultValues: {
      name: '',
      display: '',
      parent: null as string | null,
    },
    validators: {
      onSubmit: object({
        name: string().min(1, 'Please enter a certification name.'),
        display: string().min(1, 'Please enter a display name.'),
        parent: nullable(string()),
      }),
    },
    onSubmit: async ({ value }) => {
      const created = await createCertification({
        name: value.name.trim(),
        display: value.display.trim(),
        parent: value.parent,
      });

      nav({
        to: '/admin/certifications/$certificationId',
        params: { certificationId: created.id },
      });
    },
  });

  const parentOptions = [
    { id: 'none', display: 'No parent', depth: 0 },
    ...buildCertificationTree(certifications).map(
      ({ certification, depth }) => ({
        id: certification.id,
        display: certification.display,
        depth,
      }),
    ),
  ];

  return (
    <div className="flex flex-1 flex-col gap-2 lg:max-w-md">
      <span className="text-xl font-semibold">New Certification</span>
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
        <form.Field name="parent">
          {(parentField) => {
            const selectedOption =
              parentOptions.find(
                (option) => option.id === parentField.state.value,
              ) ?? parentOptions[0];

            return (
              <Field>
                <FieldLabel htmlFor={parentField.name}>Parent</FieldLabel>
                <Combobox
                  items={parentOptions}
                  value={selectedOption}
                  itemToStringLabel={(option) =>
                    option.depth > 0
                      ? `${'  '.repeat(option.depth)}${option.display}`
                      : option.display
                  }
                  itemToStringValue={(option) => option.id}
                  onValueChange={(value) => {
                    if (!value || value.id === 'none') {
                      parentField.handleChange(null);
                      return;
                    }
                    parentField.handleChange(value.id);
                  }}
                >
                  <ComboboxTrigger
                    render={
                      <Button
                        className="w-full justify-start text-left font-normal"
                        variant="outline"
                      >
                        <ComboboxValue />
                      </Button>
                    }
                  />
                  <ComboboxContent>
                    <ComboboxInput
                      className="mb-1! h-7! text-sm"
                      placeholder="Select a parent..."
                      showTrigger={false}
                    />
                    <ComboboxEmpty>No certifications found.</ComboboxEmpty>
                    <ComboboxList>
                      {(option) => (
                        <ComboboxItem key={option.id} value={option}>
                          <span
                            style={{ paddingLeft: `${option.depth * 1}rem` }}
                          >
                            {option.display}
                          </span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
            );
          }}
        </form.Field>
        <div className="flex items-center justify-end gap-2">
          <Button
            disabled={isCreating}
            type="button"
            onClick={() => nav({ to: '/admin/certifications' })}
          >
            <IconX />
            Cancel
          </Button>
          <Button
            disabled={isCreating}
            type="submit"
            variant="solid"
            onClick={() => form.handleSubmit()}
          >
            <IconCheck />
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}
