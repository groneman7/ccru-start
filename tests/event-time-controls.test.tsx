// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { EventTimeChoices } from '../src/features/calendar/event-time-choices';
import { PublicEventDetails } from '../src/features/calendar/public-details';

afterEach(cleanup);
test('event time fields explain the timezone and reject a nonexistent spring time', () => {
  render(
    <EventTimeChoices
      date="2030-03-10"
      timeBegin="02:30"
      timeEnd="04:00"
      beginOccurrence="earlier"
      endOccurrence="earlier"
      onBeginChange={() => {}}
      onEndChange={() => {}}
    />,
  );
  expect(
    screen.getByText(/All event dates and times use America\/New_York/),
  ).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toContain(
    'Start time does not exist',
  );
});
test('schedulers can select either occurrence of a repeated fall hour', () => {
  const changes: string[] = [];
  render(
    <EventTimeChoices
      date="2030-11-03"
      timeBegin="01:15"
      timeEnd="01:45"
      beginOccurrence="earlier"
      endOccurrence="earlier"
      onBeginChange={(v) => changes.push(v)}
      onEndChange={(v) => changes.push(v)}
    />,
  );
  fireEvent.change(screen.getByLabelText('Start time occurrence'), {
    target: { value: 'later' },
  });
  expect(changes).toEqual(['later']);
  expect(
    screen.getAllByRole('option').map((option) => option.textContent),
  ).toEqual([
    'First occurrence (EDT)',
    'Second occurrence (EST)',
    'First occurrence (EDT)',
    'Second occurrence (EST)',
  ]);
});

test('an open public event detail disappears at end without another page visit', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2030-01-15T15:59:59Z'));
  try {
    render(
      <PublicEventDetails
        event={{
          id: 'event',
          name: 'Current clinic',
          description: null,
          location: null,
          timeBegin: '2030-01-15T14:00:00Z',
          timeEnd: '2030-01-15T16:00:00Z',
        }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Current clinic' }),
    ).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      screen.queryByRole('heading', { name: 'Current clinic' }),
    ).toBeNull();
    expect(screen.getByText('This event is not available.')).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});
