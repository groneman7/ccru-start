import { subject } from '@casl/ability';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Button } from '~/components/ui';
import { authSessionQueryKey } from '~/features/auth/queries';
import { allUserTypesQuery } from '~/features/authz/queries';
import { userServerFns } from '~/features/users/functions';
import { ProfileEditor } from '~/features/users/profile-editor';
import { allUsersQuery, userByIdQuery } from '~/features/users/queries';
import { getUserPermissions } from '~/server/permissions';

export const Route = createFileRoute('/_authed/admin/users/$userId/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { currentUser } = Route.useRouteContext();
  const { userId } = Route.useParams();
  const queryClient = useQueryClient();
  const router = useRouter();
  async function refreshProfile() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: userByIdQuery(userId).queryKey,
      }),
      queryClient.invalidateQueries({ queryKey: allUsersQuery().queryKey }),
      queryClient.invalidateQueries({ queryKey: authSessionQueryKey }),
    ]);
    await router.invalidate();
  }
  const { mutateAsync: save } = useMutation({
    mutationFn: (
      data: Parameters<typeof userServerFns.updateProfile>[0]['data'],
    ) => userServerFns.updateProfile({ data }),
    onSuccess: refreshProfile,
  });
  const { data: types = [] } = useQuery(allUserTypesQuery());
  const {
    mutate: assignType,
    error: typeError,
    isPending: assigning,
  } = useMutation({
    mutationFn: (userTypeId: string | null) =>
      userServerFns.updateUserType({ data: { userId, userTypeId } }),
    onSuccess: refreshProfile,
  });
  const { data: user } = useQuery(userByIdQuery(userId));
  if (!user) return null;
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-xl font-semibold">Profile and contact information</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
        <dt>First name</dt>
        <dd>{user.nameFirst ?? 'Not provided'}</dd>
        <dt>Middle name</dt>
        <dd>{user.nameMiddle || 'Not provided'}</dd>
        <dt>Last name</dt>
        <dd>{user.nameLast ?? 'Not provided'}</dd>
        <dt>Post-nominals</dt>
        <dd>{user.postNominals || 'Not provided'}</dd>
        <dt>Email</dt>
        <dd>
          <a href={`mailto:${user.email}`}>{user.email}</a> (
          {user.emailVerified ? 'Verified' : 'Unverified'})
        </dd>
        <dt>Phone</dt>
        <dd>
          {user.phoneNumber ? (
            <a href={`tel:${user.phoneNumber}`}>{user.phoneNumber}</a>
          ) : (
            'Not provided'
          )}
        </dd>
        <dt>System role</dt>
        <dd>{user.role}</dd>
        <dt>User type</dt>
        <dd>{user.userTypeDisplay ?? 'No user type'}</dd>
        <dt>Status</dt>
        <dd>{user.status ?? 'Not provided'}</dd>
      </dl>
      {getUserPermissions(currentUser).can('update-type', 'User') && (
        <form
          className="flex flex-wrap items-end gap-2"
          key={user.userTypeId ?? 'none'}
          onSubmit={(event) => {
            event.preventDefault();
            assignType(
              String(
                new FormData(event.currentTarget).get('userTypeId') ?? '',
              ) || null,
            );
          }}
        >
          <label htmlFor="profile-user-type" className="flex flex-col gap-1">
            User type
            <select
              id="profile-user-type"
              name="userTypeId"
              defaultValue={user.userTypeId ?? ''}
              disabled={assigning}
              className="rounded-md border p-2"
            >
              <option value="">No user type</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.display}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={assigning}>
            Assign user type
          </Button>
        </form>
      )}
      {typeError && <p role="alert">{typeError.message}</p>}
      <ProfileEditor
        key={user.timestampUpdatedAt}
        profile={user}
        canEdit={getUserPermissions(currentUser).can(
          'update',
          subject('User', { id: user.id }),
        )}
        onSave={(data) => save({ userId: user.id, data })}
      />
    </section>
  );
}
