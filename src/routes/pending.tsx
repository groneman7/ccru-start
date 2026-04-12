import { createFileRoute } from '@tanstack/react-router';
import { NotFound, Pending } from '~/components';

export const Route = createFileRoute('/pending')({
  component: process.env.NODE_ENV === 'development' ? Pending : NotFound,
});
