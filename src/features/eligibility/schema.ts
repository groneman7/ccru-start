import { SYSTEM_ROLES } from '~/features/authz/schema';
import { z } from 'zod';

export type Requirement =
  | { type: 'and'; children: Requirement[] }
  | { type: 'or'; children: Requirement[] }
  | {
      type: 'certification';
      certificationId: string;
      match: 'exact' | 'descendants';
    }
  | { type: 'minimum-role'; role: (typeof SYSTEM_ROLES)[number] };
export type EligibilityExpression = { version: 1; root: Requirement };
export const requirementSchema: z.ZodType<Requirement> = z.lazy(() =>
  z.union([
    z
      .object({
        type: z.enum(['and', 'or']),
        children: z.array(requirementSchema).min(1),
      })
      .strict(),
    z
      .object({
        type: z.literal('certification'),
        certificationId: z.uuid(),
        match: z.enum(['exact', 'descendants']),
      })
      .strict(),
    z
      .object({ type: z.literal('minimum-role'), role: z.enum(SYSTEM_ROLES) })
      .strict(),
  ]),
);
export const eligibilityExpressionSchema = z
  .object({ version: z.literal(1), root: requirementSchema })
  .strict();
