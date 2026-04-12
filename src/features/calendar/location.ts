import type { Location } from '~/features/calendar/schema';

type LocationLike = Partial<Location> | string | null | undefined;

function trimValue(value: string | null | undefined) {
  return value?.trim() ?? '';
}

export function createEmptyLocation(): Location {
  return {
    name: '',
    line1: '',
    line2: null,
    city: '',
    state: '',
    zip: '',
  };
}

export function normalizeLocation(
  location: Partial<Location> | null | undefined,
) {
  return {
    name: trimValue(location?.name),
    line1: trimValue(location?.line1),
    line2: trimValue(location?.line2) || null,
    city: trimValue(location?.city),
    state: trimValue(location?.state),
    zip: trimValue(location?.zip),
  } satisfies Location;
}

export function hasLocationValue(location: LocationLike) {
  if (typeof location === 'string') {
    return trimValue(location).length > 0;
  }

  const normalized = normalizeLocation(location);
  return Boolean(
    normalized.name ||
    normalized.line1 ||
    normalized.line2 ||
    normalized.city ||
    normalized.state ||
    normalized.zip,
  );
}

export function isLocationComplete(
  location: Partial<Location> | null | undefined,
) {
  const normalized = normalizeLocation(location);

  return Boolean(
    normalized.name &&
    normalized.line1 &&
    normalized.city &&
    normalized.state &&
    normalized.zip,
  );
}

export function parseLocationInput(
  location: Partial<Location> | null | undefined,
) {
  const normalized = normalizeLocation(location);

  if (!hasLocationValue(normalized)) {
    return {
      isPartial: false,
      location: null,
    };
  }

  return {
    isPartial: !isLocationComplete(normalized),
    location: isLocationComplete(normalized) ? normalized : null,
  };
}

export function formatLocationLines(location: LocationLike) {
  if (typeof location === 'string') {
    const line = trimValue(location);
    return line ? [line] : [];
  }

  const normalized = normalizeLocation(location);

  if (!hasLocationValue(normalized)) {
    return [];
  }

  const region = [normalized.state, normalized.zip].filter(Boolean).join(' ');
  const cityRegion = [normalized.city, region].filter(Boolean);
  const cityRegionLine =
    cityRegion.length > 1
      ? `${cityRegion[0]}, ${cityRegion[1]}`
      : cityRegion[0];

  return [
    normalized.name,
    normalized.line1,
    normalized.line2,
    cityRegionLine,
  ].filter((line): line is string => Boolean(line));
}

export function formatLocationInline(location: LocationLike) {
  return formatLocationLines(location).join(', ');
}
