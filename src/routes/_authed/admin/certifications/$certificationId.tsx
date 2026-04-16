import { IconForms, IconHierarchy2 } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
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
import {
  buildCertificationTree,
  collectCertificationDescendantIds,
} from '~/features/users/certifications';
import { updateCertificationMutation } from '~/features/users/mutations';
import {
  allCertificationsQuery,
  getCertificationByIdQuery,
} from '~/features/users/queries';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { nullable, object, string } from 'zod';

export const Route = createFileRoute(
  '/_authed/admin/certifications/$certificationId',
)({
  loader: async ({ context: { queryClient }, params: { certificationId } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getCertificationByIdQuery(certificationId)),
      queryClient.ensureQueryData(allCertificationsQuery()),
    ]);
  },
  component: CertificationPage,
  preloadGcTime: 1000 * 10,
  head: () => ({
    meta: [{ title: 'CCRU | Certification' }],
  }),
});

function CertificationPage() {
  const { certificationId } = Route.useParams();

  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const { data: certifications } = useQuery(allCertificationsQuery());

  const { data: certification, isLoading } = useQuery(
    getCertificationByIdQuery(certificationId),
  );

  const { mutateAsync: updateCertification, isPending: isSaving } = useMutation(
    {
      ...updateCertificationMutation(),
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getCertificationByIdQuery(certificationId).queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: allCertificationsQuery().queryKey,
          }),
        ]);
      },
      onSuccess: () => {
        toast.success('Certification details saved.');
      },
    },
  );

  const form = useAppForm({
    defaultValues: {
      name: certification?.name ?? '',
      display: certification?.display ?? '',
      parent: certification?.parent ?? null,
    },
    validators: {
      onSubmit: object({
        name: string().min(1, 'Please enter a certification name.'),
        display: string().min(1, 'Please enter a display name.'),
        parent: nullable(string()),
      }),
    },
    onSubmit: async ({ value }) => {
      await updateCertification({
        certificationId,
        data: {
          name: value.name.trim(),
          display: value.display.trim(),
          parent: value.parent,
        },
      });
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (!certification) return;

    form.reset({
      name: certification.name,
      display: certification.display,
      parent: certification.parent ?? null,
    });
    setIsEditing(false);
  }, [certification, form]);

  if (isLoading) {
    return <div>Loading certification</div>;
  }

  if (!certification) {
    return <div>Certification not found</div>;
  }

  const blockedParentIds = collectCertificationDescendantIds(
    certifications,
    certificationId,
  );
  const parentOptions = [
    { id: 'none', display: 'No parent', depth: 0 },
    ...buildCertificationTree(
      certifications.filter(
        (candidate) =>
          candidate.id !== certificationId &&
          !blockedParentIds.has(candidate.id),
      ),
    ).map(({ certification: option, depth }) => ({
      id: option.id,
      display: option.display,
      depth,
    })),
  ];
  const parentCertification =
    certifications.find((candidate) => candidate.id === certification.parent) ??
    null;

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
              <span className="text-lg">{certification.display}</span>
              <span className="text-sm text-muted-foreground">
                {certification.name}
              </span>
            </div>
          </div>
          {parentCertification && (
            <div className="flex items-center gap-2">
              <IconHierarchy2 className="size-4" />
              <div className="flex flex-col">
                <span>{parentCertification.display}</span>
                <span className="text-sm text-muted-foreground">Parent</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
