import { NextResponse } from "next/server";
import { FINDER_CATEGORIES } from "@/lib/planning";
import { geocodeOsm, NotFoundError, nominatimPlaces, overpassPlaces } from "@/lib/osm";

export const maxDuration = 60;

// Nominatim/Overpass usage policies ask for an identifying User-Agent.
const HEADERS = { "User-Agent": "WeddingQuoteDecoder/1.0 (+https://github.com/deermid94/weddingplanning)", Referer: "https://github.com/deermid94/weddingplanning" };
const TTL = 24 * 3600 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

async function remember<T>(key: string, load: () => Promise<T>, keep: (v: T) => boolean = () => true): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await load();
  if (keep(value)) {
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), value });
  }
  return value;
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const op = u.get("op");
  try {
    if (op === "geocode") {
      const q = (u.get("q") ?? "").trim().slice(0, 200);
      if (!q) return NextResponse.json({ error: "Enter a location" }, { status: 400 });
      return NextResponse.json(await remember(`g:${q.toLowerCase()}`, () => geocodeOsm(q, HEADERS)));
    }
    const cat = u.get("cat") ?? "";
    const lat = Number(u.get("lat"));
    const lon = Number(u.get("lon"));
    const r = Math.min(80, Math.max(1, Number(u.get("r")) || 15));
    if (!FINDER_CATEGORIES.some((c) => c.key === cat) || !Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const center = { lat, lon };
    const key = `${op}:${cat}:${lat.toFixed(3)},${lon.toFixed(3)}:${r}`;
    if (op === "quick") return NextResponse.json(await remember(key, () => nominatimPlaces(cat, center, r, HEADERS), (v) => v.length > 0));
    if (op === "full") return NextResponse.json(await remember(key, () => overpassPlaces(cat, center, r, HEADERS)));
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: e instanceof NotFoundError ? 404 : 502 });
  }
}
