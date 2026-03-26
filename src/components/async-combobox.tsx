// @ts-nocheck
// WORK IN PROGRESS - NOT READY FOR USE

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from './ui';

type AsyncComboboxProps<T> = {
  items: T[];
};
/**
 * WORK IN PROGRESS - NOT READY FOR USE
 * WORK IN PROGRESS - NOT READY FOR USE
 * WORK IN PROGRESS - NOT READY FOR USE
 */
export function AsyncCombobox_NOT_READY_FOR_USE<T>({
  items,
}: AsyncComboboxProps<T>) {
  return (
    <Combobox items={items}>
      <ComboboxInput />
      <ComboboxContent>
        <ComboboxEmpty></ComboboxEmpty>
        <ComboboxList>
          {(item: T) => (
            <ComboboxItem key={item.id} value={item}>
              {item.displayName}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
