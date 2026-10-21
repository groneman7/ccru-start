import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '~/components/ui';
import { positionServerFns } from '~/features/calendar/functions';
import {
  allPositionsQuery,
  getPositionByIdQuery,
} from '~/features/calendar/queries';
import { allCertificationsQuery } from '~/features/users/queries';
import type { CurrentUser } from '~/server/auth';
import { getUserPermissions } from '~/server/permissions';
import { useState } from 'react';
import { RequirementEditor, RequirementExplanation } from './controls';
import { positionEligibilityQuery } from './queries';
import type { EligibilityExpression } from './schema';

export function PositionRequirements({
  positionId,
  expression,
  currentUser,
}: {
  positionId: string;
  expression: EligibilityExpression | null;
  currentUser: CurrentUser;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(expression);
  const { data: catalog = [], error: catalogError } = useQuery(
    allCertificationsQuery(),
  );
  const { data: result, error } = useQuery(
    positionEligibilityQuery(positionId, currentUser.id),
  );
  const {
    mutate: save,
    isPending,
    error: saveError,
  } = useMutation({
    mutationFn: () =>
      positionServerFns.update({
        data: { positionId, data: { eligibilityExpression: draft } },
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: getPositionByIdQuery(positionId).queryKey,
        }),
        client.invalidateQueries({ queryKey: allPositionsQuery().queryKey }),
        client.invalidateQueries({
          queryKey: ['positionEligibility', positionId],
        }),
      ]);
      setEditing(false);
    },
  });
  return (
    <section className="space-y-3 border-t pt-4">
      <h2 className="text-xl font-semibold">Eligibility requirements</h2>
      <p>
        Requirements apply to this position in every event and template. Saving
        does not scan current assignments or preview conflicts.
      </p>
      {error && <p role="alert">{error.message}</p>}
      {result && (
        <>
          <p>
            {result.eligible
              ? 'You meet this position’s eligibility requirements.'
              : 'You do not currently meet this position’s eligibility requirements.'}
          </p>
          {result.reason && <p>{result.reason}</p>}
          <RequirementExplanation explanation={result.explanation} />
        </>
      )}
      {getUserPermissions(currentUser).can('update', 'Position') && (
        <>
          {editing ? (
            <>
              <RequirementEditor
                value={draft}
                onChange={setDraft}
                certifications={catalog}
                disabled={isPending}
              />
              {(saveError || catalogError) && (
                <p role="alert">{(saveError || catalogError)?.message}</p>
              )}
              <Button
                type="button"
                disabled={isPending || !!catalogError}
                onClick={() => save()}
              >
                Save requirements
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => setEditing(false)}
              >
                Cancel requirements
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => {
                setDraft(expression);
                setEditing(true);
              }}
            >
              Edit requirements
            </Button>
          )}
        </>
      )}
    </section>
  );
}
