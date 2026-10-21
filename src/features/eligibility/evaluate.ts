import { SYSTEM_ROLES } from '~/features/authz/schema';
import type { EligibilityExpression, Requirement } from './schema';

export type Explanation = { met: boolean; label: string } & (
  | { type: 'and' | 'or'; children: Explanation[] }
  | { type: 'certification' | 'minimum-role' }
);
export type CertificationRecord = {
  id: string;
  display: string;
  parent: string | null;
  deletedAt: string | null;
};

// Used by preview operations and future assignment/replacement/recheck commands.
// The caller supplies one authoritative set of current facts; no client claims
// about qualifications, role, or profile status are accepted.
export function evaluateRequirements(
  expression: EligibilityExpression | null,
  facts: {
    role: string;
    verifiedCertificationIds: string[];
    certifications: CertificationRecord[];
  },
): Explanation | null {
  if (!expression) return null;
  const catalog = new Map(facts.certifications.map((c) => [c.id, c]));
  const satisfies = (
    id: string,
    requirement: Extract<Requirement, { type: 'certification' }>,
  ) => {
    const visited = new Set<string>();
    let current: string | null = id;
    while (current && !visited.has(current)) {
      visited.add(current);
      const certification = catalog.get(current);
      if (!certification || certification.deletedAt) return false;
      if (current === requirement.certificationId) return true;
      if (requirement.match === 'exact') return false;
      current = certification.parent;
    }
    return false;
  };
  const visit = (node: Requirement): Explanation => {
    if (node.type === 'and' || node.type === 'or') {
      const children = node.children.map(visit);
      return {
        type: node.type,
        label: node.type === 'and' ? 'All of these' : 'At least one of these',
        met:
          node.type === 'and'
            ? children.every((c) => c.met)
            : children.some((c) => c.met),
        children,
      };
    }
    if (node.type === 'minimum-role')
      return {
        type: node.type,
        label: `${node.role} or higher`,
        met:
          SYSTEM_ROLES.indexOf(facts.role as (typeof SYSTEM_ROLES)[number]) >=
          SYSTEM_ROLES.indexOf(node.role),
      };
    return {
      type: node.type,
      label: `${catalog.get(node.certificationId)?.display ?? 'Unavailable certification'}${node.match === 'descendants' ? ' or any descendant' : ''} (verified)`,
      met: facts.verifiedCertificationIds.some((id) => satisfies(id, node)),
    };
  };
  return visit(expression.root);
}
