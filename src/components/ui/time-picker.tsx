import { parseAndFormatTime } from '~/lib/utils';
import dayjs from 'dayjs';
import {
  useEffect,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FocusEvent,
} from 'react';
import { Input } from './input';

// TODO: This has the option of being uncontrolled, which I might not want to keep.

type TimePickerProps = Omit<
  ComponentProps<'input'>,
  'defaultValue' | 'size' | 'value' | 'onChange'
> & {
  value?: string;
  defaultValue?: string;
  format?: string;
  onChange?: (value: string) => void;
};

export function TimePicker({
  value: valueProp,
  defaultValue = '',
  format = 'h:mm A',
  onChange,
  onBlur,
  ...props
}: TimePickerProps) {
  const isoPattern = /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
  const normalizeToIso = (raw: string | undefined) => {
    if (!raw) return '';
    const trimmed = raw.trim();
    const parsed = parseAndFormatTime(trimmed);
    if (parsed) return parsed.iso;
    if (isoPattern.test(trimmed)) return trimmed;
    return '';
  };

  const formatIsoForDisplay = (isoValue: string) => {
    if (!isoValue) return '';
    const formatted = dayjs(`1970-01-01T${isoValue}`);
    return formatted.isValid() ? formatted.format(format) : isoValue;
  };

  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    normalizeToIso(defaultValue),
  );
  const [inputValue, setInputValue] = useState(
    formatIsoForDisplay(
      isControlled ? normalizeToIso(valueProp) : normalizeToIso(defaultValue),
    ),
  );

  useEffect(() => {
    if (isControlled) {
      const normalized = normalizeToIso(valueProp);
      setUncontrolledValue(normalized);
      setInputValue(formatIsoForDisplay(normalized));
    }
  }, [valueProp, isControlled, format]);

  const value = isControlled ? normalizeToIso(valueProp) : uncontrolledValue;

  useEffect(() => {
    setInputValue(formatIsoForDisplay(value));
  }, [format, value]);

  function updateValue(nextValue: string) {
    if (isControlled) {
      onChange?.(nextValue);
    } else {
      setUncontrolledValue(nextValue);
      onChange?.(nextValue);
    }
  }

  function handleInternalBlur(e: FocusEvent<HTMLInputElement>) {
    const rawInput = e.target.value.trim();
    const parsed = parseAndFormatTime(rawInput);

    // Always sync to ISO or revert to the last known ISO value.
    const finalValue =
      rawInput === ''
        ? ''
        : parsed
          ? parsed.iso
          : isoPattern.test(rawInput)
            ? rawInput
            : value;
    setInputValue(formatIsoForDisplay(finalValue));
    updateValue(finalValue);

    onBlur?.(e);
  }

  function handleInternalChange(e: ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }

  return (
    <Input
      value={inputValue}
      onBlur={handleInternalBlur}
      onChange={handleInternalChange}
      {...props}
    />
  );
}
