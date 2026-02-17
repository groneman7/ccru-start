import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import {
  DateField,
  InputField,
  TextareaField,
  TimeField,
} from '~/components/form/fields';
import type { ReactNode } from 'react';

export interface CommonFieldProps {
  description?: ReactNode;
  label?: ReactNode;
  placeholder?: string;
}

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    DateField,
    InputField,
    TextareaField,
    TimeField,
  },
  formComponents: {},
});

export {
  fieldContext,
  formContext,
  withForm,
  withFieldGroup,
  useAppForm,
  useFieldContext,
  useFormContext,
};
