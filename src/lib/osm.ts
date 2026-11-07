/** OpenStreetMap lookups (Nominatim + Overpass). Runs on the server via /api/places, or in the browser as a fallback. */
import { FINDER_CATEGORIES, haversineKm } from "./planning";

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address?: string;
  website?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  kind?: string;
  osmUrl: string;
}

export type Center = { lat: number; lon: number };

export class NotFoundError extends Error {}

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

type OverpassElement = { type: string; id: number; lat?: number; lon?: number; center?: Center; tags?: Record<string, string> };

/** Query every public Overpass mirror at once and take the first useful answer (they are often slow or overloaded). */
function raceMirrors(query: string, headers: HeadersInit): Promise<OverpassElement[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 45000);
  return new Promise((resolve, reject) => {
    let pending = OVERPASS.length;
    let empty: OverpassElement[] | null = null;
    let lastErr: unknown;
    const settle = () => {
      if (--pending > 0) return;
      clearTimeout(timer);
      if (empty) resolve(empty);
      else reject(lastErr);
    };
    for (const url of OVERPASS) {
      fetch(url, { method: "POST", headers, body: new URLSearchParams({ data: query }), signal: ctl.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          const data = (await res.json()) as { elements: OverpassElement[] };
          if (data.elements.length) {
            clearTimeout(timer);
            ctl.abort();
            resolve(data.elements);
          } else empty = data.elements;
        })
        .catch((e) => (lastErr = e))
        .finally(settle);
    }
  });
}

export async function geocodeOsm(location: string, headers: HeadersInit = {}): Promise<Center & { name: string }> {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ie,gb&q=${encodeURIComponent(location)}`, { headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Couldn't look up "${location}" (${res.status})`);
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!data.length) throw new NotFoundError(`Couldn't find "${location}". Try a town name, e.g. "Roundwood, Wicklow".`);
  return { lat: +data[0].lat, lon: +data[0].lon, name: data[0].display_name };
}

function igHandle(v?: string) {
  if (!v) return undefined;
  const m = v.match(/instagram\.com\/([^/?#]+)/i);
  const handle = (m ? m[1] : v).replace(/^@/, "").trim();
  return handle ? `https://www.instagram.com/${handle}/` : undefined;
}

type NominatimHit = { osm_type: string; osm_id: number; lat: string; lon: string; name: string; type: string; address?: Record<string, string>; extratags?: Record<string, string> };

/** Fast keyword search (1 request/second per Nominatim's usage policy). */
export async function nominatimPlaces(categoryKey: string, center: Center, radiusKm: number, headers: HeadersInit = {}): Promise<Place[]> {
  const terms = FINDER_CATEGORIES.find((c) => c.key === categoryKey)?.terms ?? [];
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180));
  const box = [center.lon - dLon, center.lat + dLat, center.lon + dLon, center.lat - dLat].map((n) => n.toFixed(4)).join(",");
  const out: Place[] = [];
  let failures = 0;
  for (const [i, term] of terms.entries()) {
    if (i) await new Promise((r) => setTimeout(r, 1100));
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&bounded=1&limit=40&addressdetails=1&extratags=1&viewbox=${box}&q=${encodeURIComponent(term)}`, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      failures++;
      continue;
    }
    for (const h of (await res.json()) as NominatimHit[]) {
      if (!h.name) continue;
      const t = h.extratags ?? {};
      const a = h.address ?? {};
      const lat = +h.lat;
      const lon = +h.lon;
      const distanceKm = haversineKm(center, { lat, lon });
      if (distanceKm > radiusKm) continue;
      const type = h.osm_type;
      out.push({
        id: `${type}/${h.osm_id}`,
        name: h.name,
        lat,
        lon,
        distanceKm,
        address: [a.road, a.village ?? a.town ?? a.city].filter(Boolean).join(", ") || undefined,
        website: t.website ?? t["contact:website"],
        phone: t.phone ?? t["contact:phone"],
        instagram: igHandle(t["contact:instagram"]),
        facebook: t["contact:facebook"],
        kind: h.type,
        osmUrl: `https://www.openstreetmap.org/${type}/${h.osm_id}`,
      });
    }
  }
  if (failures === terms.length) throw new Error("Place search unavailable");
  return mergePlaces(out);
}

export function mergePlaces(...lists: Place[][]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of lists.flat()) {
    const k = p.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function overpassPlaces(categoryKey: string, center: Center, radiusKm: number, headers: HeadersInit = {}): Promise<Place[]> {
  const cat = FINDER_CATEGORIES.find((c) => c.key === categoryKey);
  if (!cat) return [];
  if (!cat.osm.length) return [];
  const r = Math.round(radiusKm * 1000);
  const body = cat.osm.map((f) => `nwr${f.startsWith("[") ? f : `[${f}]`}["name"](around:${r},${center.lat},${center.lon});`).join("");
  const query = `[out:json][timeout:40];(${body});out center tags 300;`;
  let elements: OverpassElement[];
  try {
    elements = await raceMirrors(query, headers);
  } catch (e) {
    throw new Error(`Map search is busy right now (${e instanceof Error && e.name !== "AbortError" ? e.message : "timed out"}). Try again in a minute or use the links below.`);
  }
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const el of elements) {
    const t = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!t.name || lat == null || lon == null) continue;
    const dedupe = t.name.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    places.push({
      id: `${el.type}/${el.id}`,
      name: t.name,
      lat,
      lon,
      distanceKm: haversineKm(center, { lat, lon }),
      address: [t["addr:street"], t["addr:city"] ?? t["addr:town"] ?? t["addr:village"]].filter(Boolean).join(", ") || undefined,
      website: t.website ?? t["contact:website"],
      phone: t.phone ?? t["contact:phone"] ?? t.mobile ?? t["contact:mobile"],
      instagram: igHandle(t["contact:instagram"] ?? t.instagram),
      facebook: t["contact:facebook"] ?? t.facebook,
      kind: t.tourism ?? t.shop ?? t.craft ?? t.amenity ?? t.historic ?? t.office,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    });
  }
  places.sort((a, b) => a.distanceKm - b.distanceKm);
  return places;
}
