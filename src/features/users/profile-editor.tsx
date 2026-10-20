import { Button, Input } from '~/components/ui';
import { profileFieldsSchema } from '~/features/users/schema';
import { useState } from 'react';
import type { infer as Infer } from 'zod';

type ProfileFields = Infer<typeof profileFieldsSchema>;
type EditableProfile = { [Key in keyof ProfileFields]: string | null };
const fields = [
  ['nameFirst', 'First name'],
  ['nameMiddle', 'Middle name'],
  ['nameLast', 'Last name'],
  ['phoneNumber', 'Phone (with country code)'],
  ['postNominals', 'Post-nominals'],
  ['image', 'Photo URL'],
] as const;

type ProfileEditorProps = {
  profile: EditableProfile & { id: string; timestampUpdatedAt: string };
  canEdit: boolean;
  onSave: (data: ProfileFields) => Promise<unknown>;
};

export function ProfileEditor(props: ProfileEditorProps) {
  return (
    <ProfileEditorForm
      key={`${props.profile.id}:${props.profile.timestampUpdatedAt}`}
      {...props}
    />
  );
}

function ProfileEditorForm({ profile, canEdit, onSave }: ProfileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    () =>
      Object.fromEntries(
        fields.map(([key]) => [key, profile[key] ?? '']),
      ) as Record<keyof ProfileFields, string>,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!canEdit) return null;
  if (!editing)
    return (
      <Button className="self-start" onClick={() => setEditing(true)}>
        Edit profile
      </Button>
    );
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError('');
        const parsed = profileFieldsSchema.safeParse({
          ...draft,
          image: draft.image || null,
        });
        if (!parsed.success) {
          setError(
            parsed.error.issues.map((issue) => issue.message).join('. '),
          );
          return;
        }
        setSaving(true);
        try {
          await onSave(parsed.data);
          setEditing(false);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : 'Could not save profile',
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      <fieldset disabled={saving} className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">Edit basic profile</legend>
        {fields.map(([key, label]) => (
          <label
            key={key}
            htmlFor={`profile-${key}`}
            className="flex flex-col gap-1"
          >
            {label}
            <Input
              id={`profile-${key}`}
              name={key}
              type={
                key === 'image' ? 'url' : key === 'phoneNumber' ? 'tel' : 'text'
              }
              required={key === 'nameFirst' || key === 'nameLast'}
              value={draft[key]}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
            />
          </label>
        ))}
        <p className="text-sm text-muted-foreground">
          Display name is generated from the first, middle and last name. Email
          changes require verification.
        </p>
        <div className="flex gap-2">
          <Button type="submit">{saving ? 'Saving…' : 'Save profile'}</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditing(false);
              setError('');
            }}
          >
            Cancel
          </Button>
        </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
