import { Button } from '~/components/ui';
import { SYSTEM_ROLES } from '~/features/authz/schema';
import { useId } from 'react';
import type { Explanation } from './evaluate';
import type { EligibilityExpression, Requirement } from './schema';

type Definition = { id: string; display: string };
export function RequirementEditor({
  value,
  onChange,
  certifications,
  disabled = false,
}: {
  value: EligibilityExpression | null;
  onChange: (value: EligibilityExpression | null) => void;
  certifications: Definition[];
  disabled?: boolean;
}) {
  const leaf = (): Requirement =>
    certifications[0]
      ? {
          type: 'certification',
          certificationId: certifications[0].id,
          match: 'exact',
        }
      : { type: 'minimum-role', role: 'User' };
  return (
    <div className="space-y-3">
      <p>
        Use all-of groups for combined requirements and any-of groups for
        alternatives. Only verified certifications qualify.
      </p>
      {value ? (
        <>
          <RequirementNode
            value={value.root}
            onChange={(root) => onChange({ version: 1, root })}
            certifications={certifications}
            disabled={disabled}
            makeLeaf={leaf}
          />
          <Button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Clear requirements
          </Button>
        </>
      ) : (
        <>
          <p>No qualification requirements.</p>
          <Button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ version: 1, root: leaf() })}
          >
            Add requirements
          </Button>
        </>
      )}
    </div>
  );
}
function RequirementNode({
  value,
  onChange,
  certifications,
  disabled,
  makeLeaf,
}: {
  value: Requirement;
  onChange: (value: Requirement) => void;
  certifications: Definition[];
  disabled: boolean;
  makeLeaf: () => Requirement;
}) {
  const id = useId();
  const changeType = (type: string) => {
    if (type === 'and' || type === 'or')
      onChange({
        type,
        children:
          value.type === 'and' || value.type === 'or'
            ? value.children
            : [makeLeaf()],
      });
    else if (type === 'minimum-role') onChange({ type, role: 'User' });
    else onChange(makeLeaf());
  };
  return (
    <div className="space-y-2 rounded border p-3">
      <label htmlFor={`${id}-type`}>Requirement type</label>{' '}
      <select
        id={`${id}-type`}
        disabled={disabled}
        value={value.type}
        onChange={(e) => changeType(e.target.value)}
      >
        <option value="certification" disabled={!certifications.length}>
          Certification
        </option>
        <option value="minimum-role">Minimum system role</option>
        <option value="and">All of these (AND)</option>
        <option value="or">At least one of these (OR)</option>
      </select>
      {value.type === 'certification' && (
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`${id}-cert`}>Certification</label>
          <select
            id={`${id}-cert`}
            disabled={disabled}
            value={value.certificationId}
            onChange={(e) =>
              onChange({ ...value, certificationId: e.target.value })
            }
          >
            {!certifications.some((c) => c.id === value.certificationId) && (
              <option value={value.certificationId}>
                Unavailable certification
              </option>
            )}
            {certifications.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-match`}>Certification match</label>
          <select
            id={`${id}-match`}
            disabled={disabled}
            value={value.match}
            onChange={(e) =>
              onChange({
                ...value,
                match: e.target.value as 'exact' | 'descendants',
              })
            }
          >
            <option value="exact">Exact certification</option>
            <option value="descendants">Certification or any descendant</option>
          </select>
        </div>
      )}
      {value.type === 'minimum-role' && (
        <div>
          <label htmlFor={`${id}-role`}>Minimum system role</label>{' '}
          <select
            id={`${id}-role`}
            disabled={disabled}
            value={value.role}
            onChange={(e) =>
              onChange({ ...value, role: e.target.value as typeof value.role })
            }
          >
            {SYSTEM_ROLES.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </div>
      )}
      {(value.type === 'and' || value.type === 'or') && (
        <>
          <p>
            {value.type === 'and'
              ? 'Every branch must be met.'
              : 'Any one complete branch is enough.'}
          </p>
          {value.children.map((child, index) => (
            <fieldset
              key={index}
              aria-label="Requirement branch"
              className="space-y-2 border-l-2 pl-3"
            >
              <RequirementNode
                value={child}
                onChange={(next) =>
                  onChange({
                    ...value,
                    children: value.children.map((c, i) =>
                      i === index ? next : c,
                    ),
                  })
                }
                certifications={certifications}
                disabled={disabled}
                makeLeaf={makeLeaf}
              />
              {value.children.length > 1 && (
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...value,
                      children: value.children.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove branch {index + 1}
                </Button>
              )}
            </fieldset>
          ))}
          <Button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange({ ...value, children: [...value.children, makeLeaf()] })
            }
          >
            Add branch
          </Button>
        </>
      )}
    </div>
  );
}
export function RequirementExplanation({
  explanation,
}: {
  explanation: Explanation | null;
}) {
  if (!explanation) return <p>No qualification requirements.</p>;
  if (explanation.type === 'and' || explanation.type === 'or')
    return (
      <fieldset
        aria-label={explanation.label}
        className="space-y-2 border-l-2 pl-3"
      >
        <legend>
          {explanation.label} — {explanation.met ? 'met' : 'not met'}
        </legend>
        {explanation.children.map((child, i) => (
          <RequirementExplanation key={i} explanation={child} />
        ))}
      </fieldset>
    );
  return (
    <p>
      {explanation.met ? 'Met: ' : 'Needed: '}
      {explanation.label}
    </p>
  );
}
