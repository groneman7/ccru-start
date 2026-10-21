// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { CertificationEditor } from '../src/features/users/certification-editor';

afterEach(cleanup);
const parent = {
  id: '01930000-0000-7000-8000-000000000301',
  name: 'training',
  display: 'Training',
  parent: null,
};
const child = {
  id: '01930000-0000-7000-8000-000000000302',
  name: 'specialty',
  display: 'Specialty',
  parent: parent.id,
};
test('a manager can rename while self and descendants are excluded from parent choices', async () => {
  const saved: unknown[] = [];
  render(
    <CertificationEditor
      certification={parent}
      certifications={[parent, child]}
      canManage
      onSave={async (data) => {
        saved.push(data);
      }}
      onRemove={async () => {}}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit certification' }));
  expect(screen.queryByRole('option', { name: 'Training' })).toBeNull();
  expect(screen.queryByRole('option', { name: /Specialty/ })).toBeNull();
  fireEvent.change(screen.getByLabelText('Display name'), {
    target: { value: ' Renamed training ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save certification' }));
  await waitFor(() =>
    expect(saved).toEqual([
      { name: 'training', display: 'Renamed training', parent: null },
    ]),
  );
});
test('read-only viewers see current parent labels and no mutation controls', () => {
  render(
    <CertificationEditor
      certification={child}
      certifications={[parent, child]}
      canManage={false}
      onSave={async () => {
        throw new Error('Denied');
      }}
      onRemove={async () => {
        throw new Error('Denied');
      }}
    />,
  );
  expect(screen.getByText('Specialty')).toBeTruthy();
  expect(screen.getByText('Training')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
test('a blocked deletion is visible and keeps the definition on screen', async () => {
  render(
    <CertificationEditor
      certification={parent}
      certifications={[parent, child]}
      canManage
      onSave={async () => {}}
      onRemove={async () => {
        throw new Error('Certification has non-deleted children');
      }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete certification' }));
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Certification has non-deleted children',
  );
  expect(screen.getByText('Training')).toBeTruthy();
});

test('creating a specialty submits its selected parent once', async () => {
  const saved: unknown[] = [];
  render(
    <CertificationEditor
      certifications={[parent]}
      canManage
      onSave={async (data) => {
        saved.push(data);
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'specialty' },
  });
  fireEvent.change(screen.getByLabelText('Display name'), {
    target: { value: 'Specialty' },
  });
  fireEvent.change(screen.getByLabelText('Parent'), {
    target: { value: parent.id },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save certification' }));
  await waitFor(() =>
    expect(saved).toEqual([
      { name: 'specialty', display: 'Specialty', parent: parent.id },
    ]),
  );
});
test('switching definitions discards unsaved edits to the previous definition', () => {
  const props = {
    certifications: [parent, child],
    canManage: true,
    onSave: async () => {},
  };
  const { rerender } = render(
    <CertificationEditor {...props} certification={parent} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit certification' }));
  fireEvent.change(screen.getByLabelText('Display name'), {
    target: { value: 'Unsaved parent' },
  });
  rerender(<CertificationEditor {...props} certification={child} />);
  expect(screen.getByText('Specialty')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Edit certification' }));
  expect(
    (screen.getByLabelText('Display name') as HTMLInputElement).value,
  ).toBe('Specialty');
});
