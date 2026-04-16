import type { certificationSchema } from '~/features/users/schema';
import type { infer as Infer } from 'zod';

type Certification = Infer<typeof certificationSchema>;

export type CertificationTreeItem = {
  certification: Certification;
  depth: number;
};

export function buildCertificationTree(certifications: Certification[]) {
  const byParent = new Map<string | null, Certification[]>();

  for (const certification of certifications) {
    const parentId =
      certification.parent &&
      certifications.some((candidate) => candidate.id === certification.parent)
        ? certification.parent
        : null;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(certification);
    byParent.set(parentId, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  const ordered: CertificationTreeItem[] = [];
  const visited = new Set<string>();

  const visit = (parentId: string | null, depth: number) => {
    for (const certification of byParent.get(parentId) ?? []) {
      if (visited.has(certification.id)) continue;
      visited.add(certification.id);
      ordered.push({ certification, depth });
      visit(certification.id, depth + 1);
    }
  };

  visit(null, 0);

  for (const certification of [...certifications].sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (visited.has(certification.id)) continue;
    ordered.push({ certification, depth: 0 });
    visit(certification.id, 1);
  }

  return ordered;
}

export function collectCertificationDescendantIds(
  certifications: Certification[],
  certificationId: string,
) {
  const descendantIds = new Set<string>();

  const visit = (parentId: string) => {
    for (const certification of certifications) {
      if (certification.parent !== parentId) continue;
      if (descendantIds.has(certification.id)) continue;
      descendantIds.add(certification.id);
      visit(certification.id);
    }
  };

  visit(certificationId);

  return descendantIds;
}
