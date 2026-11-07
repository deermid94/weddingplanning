"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/ui";
import { eur } from "@/lib/calc";
import { FINDER_CATEGORIES, searchLinks } from "@/lib/planning";
import { findPlaces, geocode, type Place } from "@/lib/places";
import { uid, useStore } from "@/lib/store";
import { VIBES, type ShortlistItem } from "@/lib/types";

const STATUS: ShortlistItem["status"][] = ["idea", "contacted", "quoted", "booked"];

export default function Find() {
  const { settings, shortlist, upsertShortlist, removeShortlist, plan, ready } = useStore();
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(15);
  const [cat, setCat] = useState(FINDER_CATEGORIES[3].key);
  const [vibe, setVibe] = useState("");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [where, setWhere] = useState("");

  useEffect(() => {
    if (ready && !location) setLocation(settings.location);
    if (ready && !vibe && plan?.vibes[0]) setVibe(plan.vibes[0]);
  }, [ready, settings.location, location, plan, vibe]);
  if (!ready) return <Loading />;

  const category = FINDER_CATEGORIES.find((c) => c.key === cat)!;
  const vibeWord = VIBES.find((v) => v.value === vibe)?.label.split(" /")[0].toLowerCase();
  const links = searchLinks(category, location || settings.location, vibeWord);

  async function search(key = cat) {
    setLoading(true);
    setError("");
    setPlaces(null);
    try {
      const c = await geocode(location || settings.location);
      setWhere(c.name.split(",").slice(0, 2).join(","));
      setPlaces(await findPlaces(key, c, radius, (more) => setPlaces((cur) => (cur ? more : cur))));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const saved = new Set(shortlist.map((s) => s.id));
  const save = (p: Place) =>
    upsertShortlist({ id: p.id, name: p.name, category: cat, lat: p.lat, lon: p.lon, distanceKm: p.distanceKm, address: p.address, website: p.website, phone: p.phone, instagram: p.instagram, osmUrl: p.osmUrl, status: "idea" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Find suppliers nearby</h1>
        <p className="text-sm text-stone-600">Real businesses from OpenStreetMap, with a typical Irish price range for each type, plus quick links to search Instagram and Google Maps.</p>
      </div>

      <section className="card space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="label" htmlFor="loc">Location</label>
            <input id="loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
          </div>
          <div>
            <label className="label" htmlFor="rad">Within</label>
            <select id="rad" className="input" value={radius} onChange={(e) => setRadius(+e.target.value)}>
              {[5, 10, 15, 25, 40].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="vibe">Vibe</label>
            <select id="vibe" className="input" value={vibe} onChange={(e) => setVibe(e.target.value)}>
              <option value="">Any</option>
              {VIBES.map((v) => <option key={v.value} value={v.value}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {FINDER_CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => { setCat(c.key); setPlaces(null); setError(""); }} className={`rounded-full px-3 py-1.5 text-sm ${c.key === cat ? "bg-rose-700 text-white" : "border border-stone-300 bg-white"}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <button className="btn-primary w-full sm:w-auto" disabled={loading} onClick={() => search()}>
          {loading ? "Searching the map… (can take ~30s)" : `Find ${category.label.toLowerCase()} near ${location || settings.location}`}
        </button>
      </section>

      <section className="card space-y-2">
        <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{category.emoji} Typical price in Ireland</p>
        <p className="font-semibold">{category.price}</p>
        <div className="flex flex-wrap gap-2 pt-1 text-sm">
          <a className="btn-secondary py-1.5" href={links.instagram} target="_blank" rel="noreferrer">Instagram #{links.instagram.split("/tags/")[1].replace("/", "")}</a>
          <a className="btn-secondary py-1.5" href={links.instagramGeneric} target="_blank" rel="noreferrer">Instagram #{links.instagramGeneric.split("/tags/")[1].replace("/", "")}</a>
          <a className="btn-secondary py-1.5" href={links.maps} target="_blank" rel="noreferrer">Google Maps</a>
          <a className="btn-secondary py-1.5" href={links.google} target="_blank" rel="noreferrer">Google (Instagram profiles)</a>
        </div>
        <p className="text-xs text-stone-500">Wedding suppliers like photographers and make-up artists often work from home and only advertise on Instagram, so check the hashtags too. Found someone? Add them to your shortlist below.</p>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {places && (
        <section className="card">
          <h2 className="mb-2 font-serif text-lg font-semibold">{places.length} {category.label.toLowerCase()} within {radius} km of {where}</h2>
          {places.length === 0 && <p className="text-sm text-stone-500">Nothing on the map here. Try a bigger radius or the Instagram / Google links above.</p>}
          <ul className="divide-y divide-stone-100">
            {places.slice(0, 60).map((p) => (
              <li key={p.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-stone-500">{p.distanceKm.toFixed(1)} km{p.kind ? ` · ${p.kind.replace(/_/g, " ")}` : ""}{p.address ? ` · ${p.address}` : ""}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-rose-700">
                    {p.website && <a href={p.website} target="_blank" rel="noreferrer">Website</a>}
                    {p.instagram && <a href={p.instagram} target="_blank" rel="noreferrer">Instagram</a>}
                    {p.facebook && <a href={p.facebook.startsWith("http") ? p.facebook : `https://facebook.com/${p.facebook}`} target="_blank" rel="noreferrer">Facebook</a>}
                    {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a>}
                    <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${p.name} ${p.address ?? ""}`)}`} target="_blank" rel="noreferrer">Reviews & map</a>
                    {!p.instagram && <a href={`https://www.google.com/search?q=${encodeURIComponent(`${p.name} ${placeName(location)} instagram`)}`} target="_blank" rel="noreferrer">Find Instagram</a>}
                  </div>
                </div>
                <button className={`btn py-1.5 text-sm ${saved.has(p.id) ? "bg-emerald-50 text-emerald-800" : "btn-secondary"}`} onClick={() => (saved.has(p.id) ? removeShortlist(p.id) : save(p))}>
                  {saved.has(p.id) ? "★ Saved" : "☆ Save"}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-stone-400">Data © OpenStreetMap contributors. Listings may be incomplete or out of date.</p>
        </section>
      )}

      <Shortlist items={shortlist} onChange={upsertShortlist} onRemove={removeShortlist} />
    </div>
  );
}

const placeName = (l: string) => l.split(",")[0];

function Shortlist({ items, onChange, onRemove }: { items: ShortlistItem[]; onChange: (i: ShortlistItem) => void; onRemove: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ShortlistItem>({ id: "", name: "", category: "photographer", status: "idea" });
  const byCat = FINDER_CATEGORIES.map((c) => ({ c, list: items.filter((i) => i.category === c.key) })).filter((x) => x.list.length);

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">Your shortlist ({items.length})</h2>
        <button className="btn-secondary py-1.5 text-sm" onClick={() => { setDraft({ id: uid(), name: "", category: "photographer", status: "idea" }); setAdding(true); }}>+ Add manually</button>
      </div>
      {adding && (
        <div className="grid gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-2">
          <input className="input" placeholder="Name, e.g. @wicklowbridalmua" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {FINDER_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input className="input" placeholder="Instagram or website link" value={draft.website ?? ""} onChange={(e) => setDraft({ ...draft, website: e.target.value, instagram: /instagram\.com/.test(e.target.value) ? e.target.value : undefined })} />
          <input className="input" type="number" inputMode="numeric" placeholder="Quoted price € (optional)" value={draft.quotedPrice ?? ""} onChange={(e) => setDraft({ ...draft, quotedPrice: e.target.value ? +e.target.value : undefined, status: e.target.value ? "quoted" : draft.status })} />
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" disabled={!draft.name.trim()} onClick={() => { onChange({ ...draft, name: draft.name.trim() }); setAdding(false); }}>Save</button>
            <button className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
      {items.length === 0 && !adding && <p className="text-sm text-stone-500">Save businesses from the search, or add ones you found on Instagram. Add quoted prices to keep an eye on your budget on the Plan page.</p>}
      {byCat.map(({ c, list }) => (
        <div key={c.key}>
          <p className="mb-1 text-xs font-medium tracking-wide text-stone-500 uppercase">{c.emoji} {c.label}</p>
          <ul className="space-y-2">
            {list.map((i) => (
              <li key={i.id} className="rounded-lg border border-stone-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-stone-500">
                      {i.distanceKm != null && `${i.distanceKm.toFixed(1)} km · `}
                      {(i.website || i.instagram) && <a className="text-rose-700" href={i.instagram ?? i.website} target="_blank" rel="noreferrer">{i.instagram ? "Instagram" : "Website"}</a>}
                      {i.phone && <> · <a className="text-rose-700" href={`tel:${i.phone.replace(/\s/g, "")}`}>{i.phone}</a></>}
                    </p>
                  </div>
                  <button className="text-sm text-stone-400 hover:text-red-700" aria-label={`Remove ${i.name}`} onClick={() => onRemove(i.id)}>✕</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select className="input py-1.5 text-sm" value={i.status} onChange={(e) => onChange({ ...i, status: e.target.value as ShortlistItem["status"] })} aria-label="Status">
                    {STATUS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <input className="input py-1.5 text-sm" type="number" inputMode="numeric" placeholder="Quote €" value={i.quotedPrice ?? ""} onChange={(e) => onChange({ ...i, quotedPrice: e.target.value ? +e.target.value : undefined, status: e.target.value && i.status === "idea" ? "quoted" : i.status })} aria-label="Quoted price" />
                </div>
                {i.quotedPrice != null && (
                  <p className={`mt-1 text-xs ${i.quotedPrice > c.priceHigh ? "text-red-700" : i.quotedPrice < c.priceLow ? "text-emerald-700" : "text-stone-500"}`}>
                    {eur(i.quotedPrice)}: {i.quotedPrice > c.priceHigh ? "above" : i.quotedPrice < c.priceLow ? "below" : "within"} the typical range
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
