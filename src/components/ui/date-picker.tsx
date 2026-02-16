import {
  Button,
  DaypickerCalendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

function isValidISOString(value: string) {
  return dayjs(value, 'YYYY-MM-DD', true).isValid();
}

export type DatePickerProps = {
  /**
   * @param value - The value of the date picker in ISO format (e.g., "2023-01-01")
   */
  value?: string | null;
  format?: string;
  onSelect?: (value?: string) => void;
  placeholder?: string;
};

export function DatePicker({
  value,
  format,
  placeholder,
  onSelect,
}: DatePickerProps) {
  const [selected, setSelected] = useState<string | null>(() => {
    if (!value || value === '') return null;
    if (!isValidISOString(value)) {
      console.error(
        "The value passed to DatePicker is not a valid ISO string. Falling back to today's date.",
      );
      return dayjs().format('YYYY-MM-DD');
    }
    return dayjs(value).format('YYYY-MM-DD');
  });
  const [open, setOpen] = useState(false);

  function handleSelection(date: Date | undefined) {
    if (onSelect) {
      if (!date) return;
      onSelect(dayjs(date).format('YYYY-MM-DD'));
      setSelected(dayjs(date).format('YYYY-MM-DD'));
    } else {
      if (!date) return;
      setSelected(dayjs(date).format('YYYY-MM-DD'));
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button>
            {selected ? (
              dayjs(selected).format(format || 'dddd, MMMM D, YYYY')
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        }
      />
      <PopoverContent align="start" className="flex w-auto p-1" sideOffset={8}>
        <DaypickerCalendar
          mode="single"
          selected={selected ? new Date(selected) : undefined} // does this work?
          onSelect={handleSelection}
          // disabled={(date) => date < new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}
