// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import {
  RequirementEditor,
  RequirementExplanation,
} from '../src/features/eligibility/controls';
import type { EligibilityExpression } from '../src/features/eligibility/schema';

afterEach(cleanup);
test('scheduler constructs alternatives with a nested group and certification match', () => {
  let saved: EligibilityExpression | null = null;
  function Harness() {
    const [value, setValue] = useState<EligibilityExpression | null>(null);
    return (
      <>
        <RequirementEditor
          value={value}
          onChange={(v) => {
            saved = v;
            setValue(v);
          }}
          certifications={[{ id: 'cert', display: 'Clinical' }]}
        />
      </>
    );
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Add requirements' }));
  fireEvent.change(screen.getByLabelText('Requirement type'), {
    target: { value: 'or' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add branch' }));
  const branches = screen.getAllByRole('group', { name: 'Requirement branch' });
  fireEvent.change(within(branches[1]).getByLabelText('Requirement type'), {
    target: { value: 'and' },
  });
  expect(saved).toMatchObject({
    version: 1,
    root: {
      type: 'or',
      children: [
        { type: 'certification', certificationId: 'cert' },
        { type: 'and', children: [{ type: 'certification' }] },
      ],
    },
  });
  fireEvent.change(screen.getAllByLabelText('Certification match')[0], {
    target: { value: 'descendants' },
  });
  expect(saved).toMatchObject({
    root: { children: [{ match: 'descendants' }, {}] },
  });
  fireEvent.change(screen.getAllByLabelText('Requirement type')[0], {
    target: { value: 'and' },
  });
  expect(saved).toMatchObject({
    root: {
      type: 'and',
      children: [
        { match: 'descendants' },
        { type: 'and', children: [{ type: 'certification' }] },
      ],
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Clear requirements' }));
  expect(saved).toBeNull();
});
test('explanations retain OR branches rather than declaring every leaf mandatory', () => {
  render(
    <RequirementExplanation
      explanation={{
        type: 'or',
        label: 'At least one of these',
        met: false,
        children: [
          { type: 'certification', label: 'Clinical (verified)', met: false },
          {
            type: 'and',
            label: 'All of these',
            met: false,
            children: [
              { type: 'minimum-role', label: 'Officer or higher', met: true },
              {
                type: 'certification',
                label: 'Specialty (verified)',
                met: false,
              },
            ],
          },
        ],
      }}
    />,
  );
  const alternatives = screen.getByRole('group', {
    name: 'At least one of these',
  });
  expect(
    within(alternatives).getByText('Needed: Clinical (verified)'),
  ).toBeTruthy();
  const combined = within(alternatives).getByRole('group', {
    name: 'All of these',
  });
  expect(
    within(combined).getByText('Needed: Specialty (verified)'),
  ).toBeTruthy();
  expect(within(combined).getByText('Met: Officer or higher')).toBeTruthy();
});
