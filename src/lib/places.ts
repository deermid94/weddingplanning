import { geocodeOsm, mergePlaces, NotFoundError, nominatimPlaces, overpassPlaces, type Center, type Place } from "./osm";

export type { Place };

export interface PlaceResults {
  places: Place[];
  /** radius actually shown (may be wider than asked) */
  radius: number;
  widened: boolean;
}

export const MIN_OPTIONS = 5;
export const MAX_RADIUS = 60;

/** Server route first (proper User-Agent, caching, not affected by ad-blockers); direct OSM from the browser if that fails. */
async function viaServer<T>(params: Record<string, string | number>, direct: () => Promise<T>, timeoutMs: number, retryDirect = true): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  let res: Response | null = null;
  try {
    res = await fetch(`/api/places?${qs}`, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {}
  if (res?.ok) return (await res.json()) as T;
  if (res?.status === 404) throw new NotFoundError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Not found");
  if (res && !retryDirect) throw new Error(`Map search failed (${res.status})`);
  return direct();
}

export async function geocode(location: string): Promise<Center & { name: string }> {
  const q = location.trim();
  const key = `wqd:geo:${q.toLowerCase()}`;
  const hit = sessionStorage.getItem(key);
  if (hit) return JSON.parse(hit);
  try {
    const out = await viaServer({ op: "geocode", q }, () => geocodeOsm(q), 20000);
    sessionStorage.setItem(key, JSON.stringify(out));
    return out;
  } catch (e) {
    if (e instanceof NotFoundError) throw e;
    throw new Error("Couldn't reach the map service. Check your connection and try again.");
  }
}

/** Show what's within the asked radius, or widen just enough to include MIN_OPTIONS. */
export function fitRadius(list: Place[], asked: number, max = MAX_RADIUS): PlaceResults {
  const all = mergePlaces(list).filter((p) => p.distanceKm <= max);
  const within = all.filter((p) => p.distanceKm <= asked);
  if (within.length >= MIN_OPTIONS || all.length === within.length) return { places: within, radius: asked, widened: false };
  const nth = all[Math.min(MIN_OPTIONS, all.length) - 1].distanceKm;
  const radius = Math.min(max, Math.max(asked, Math.ceil(nth / 5) * 5));
  return { places: all.filter((p) => p.distanceKm <= radius), radius, widened: radius > asked };
}

/**
 * Quick keyword results first (widening to MAX_RADIUS if fewer than MIN_OPTIONS nearby), then
 * onMore with the merged fuller map results once they settle. `travels` includes mobile suppliers up to MAX_RADIUS.
 */
export async function findPlaces(cat: string, center: Center, radiusKm: number, opts: { travels?: boolean } = {}, onMore?: (r: PlaceResults) => void): Promise<PlaceResults> {
  const max = Math.max(radiusKm, MAX_RADIUS);
  const key = `wqd:places5:${cat}:${center.lat.toFixed(3)},${center.lon.toFixed(3)}:${radiusKm}:${opts.travels ? 1 : 0}`;
  const hit = sessionStorage.getItem(key);
  if (hit) return JSON.parse(hit);
  const shape = (list: Place[]): PlaceResults => (opts.travels ? { places: mergePlaces(list).filter((p) => p.distanceKm <= max), radius: max, widened: false } : fitRadius(list, radiusKm, max));
  const quickAt = (r: number) => viaServer<Place[]>({ op: "quick", cat, lat: center.lat, lon: center.lon, r }, () => nominatimPlaces(cat, center, r), 30000).catch(() => [] as Place[]);
  const fullAt = (r: number) => viaServer<Place[]>({ op: "full", cat, lat: center.lat, lon: center.lon, r }, () => overpassPlaces(cat, center, r), 50000, false).catch(() => null);

  let searched = radiusKm;
  let quick = await quickAt(searched);
  if ((opts.travels || quick.filter((p) => p.distanceKm <= searched).length < MIN_OPTIONS) && searched < max) {
    searched = max;
    quick = mergePlaces(quick, await quickAt(max));
  }
  const full = fullAt(searched);
  const first = shape(quick);
  if (first.places.length) {
    full.then((more) => {
      const merged = shape([...quick, ...(more ?? [])]);
      if (more) sessionStorage.setItem(key, JSON.stringify(merged));
      onMore?.(merged);
    });
    return first;
  }
  const more = await full;
  const res = shape(more ?? []);
  if (more) sessionStorage.setItem(key, JSON.stringify(res));
  return res;
}
