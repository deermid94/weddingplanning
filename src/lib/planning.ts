import type { BudgetSplitItem, PartyRole, Vibe, WeddingPlan, WeddingSettings } from "./types";

const VIBE_WORDS: Record<Vibe, RegExp> = {
  luxury: /\b(luxur\w*|5[- ]star|five[- ]star|bougie|glam\w*|black[- ]tie|champagne|opulent|elegan\w*|chandelier|ballroom|spa)\b/i,
  woodland: /\b(wood(?:s|land|ed)?|forest|trees|natur\w*|wild\w*|meadow|mountain|glen|outdoor|garden)\b/i,
  coastal: /\b(sea|beach|coast\w*|ocean|harbour|cliff\w*|seaside|shore)\b/i,
  rustic: /\b(barn|rustic|farm\w*|hay|stable\w*|courtyard|cottage\w*)\b/i,
  castle: /\b(castle|historic|georgian|victorian|medieval|manor|abbey|estate)\b/i,
  lakeside: /\b(lake|lough|lakeside|river\w*|reservoir|waterside)\b/i,
  country_house: /\b(country house|period house|walled garden|manor house|country hotel)\b/i,
  boho: /\b(boho|festival|tipi|tepee|marquee|fairy lights|pizza truck|food truck|fire pits?|relaxed)\b/i,
  city: /\b(city|urban|industrial|rooftop|modern|minimal\w*|dublin city)\b/i,
  intimate: /\b(intimate|small wedding|elope\w*|micro|exclusive use|cosy|cozy)\b/i,
};

export function detectVibes(text: string, max = 3): Vibe[] {
  const scores = (Object.keys(VIBE_WORDS) as Vibe[])
    .map((v) => ({ v, n: (text.match(new RegExp(VIBE_WORDS[v].source, "gi")) ?? []).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return scores.slice(0, max).map((x) => x.v);
}

export const BUDGET_CATEGORIES: { key: string; label: string; supplierTypes?: string[]; finder?: string[] }[] = [
  { key: "venue", label: "Venue, food & drink", supplierTypes: ["venue"], finder: ["venue", "catering"] },
  { key: "photo_video", label: "Photo & video", supplierTypes: ["photographer", "videographer"], finder: ["photographer"] },
  { key: "music", label: "Band / DJ", supplierTypes: ["band", "dj"] },
  { key: "attire", label: "Dress, suits & rings", finder: ["bridal"] },
  { key: "flowers_decor", label: "Flowers & decor", supplierTypes: ["florist"], finder: ["florist"] },
  { key: "hair_makeup", label: "Hair & make-up", supplierTypes: ["hair_makeup"], finder: ["hair", "makeup"] },
  { key: "ceremony", label: "Ceremony & celebrant", supplierTypes: ["celebrant"], finder: ["ceremony"] },
  { key: "transport", label: "Transport", supplierTypes: ["transport"], finder: ["transport"] },
  { key: "cake_stationery", label: "Cake, stationery & favours", supplierTypes: ["cake", "stationery"], finder: ["cake"] },
  { key: "accommodation", label: "Your accommodation", finder: ["accommodation"] },
  { key: "contingency", label: "Contingency (hidden costs!)" },
];

export const DEFAULT_SPLIT: BudgetSplitItem[] = [
  { key: "venue", percent: 50 },
  { key: "photo_video", percent: 10 },
  { key: "music", percent: 7 },
  { key: "attire", percent: 9 },
  { key: "flowers_decor", percent: 5 },
  { key: "hair_makeup", percent: 3 },
  { key: "ceremony", percent: 2 },
  { key: "transport", percent: 2 },
  { key: "cake_stationery", percent: 3 },
  { key: "accommodation", percent: 1 },
  { key: "contingency", percent: 8 },
];

export const budgetLabel = (key: string) => BUDGET_CATEGORIES.find((c) => c.key === key)?.label ?? key;

function rebalance(split: BudgetSplitItem[]): BudgetSplitItem[] {
  const total = split.reduce((a, b) => a + b.percent, 0) || 1;
  return split.map((s) => ({ ...s, percent: Math.round((s.percent / total) * 1000) / 10 }));
}

/** Rule-based fallback for the dream-wedding planner. */
export function heuristicPlan(brief: string, settings: WeddingSettings): WeddingPlan {
  const vibes = detectVibes(brief, 3);
  const t = brief.toLowerCase();
  const split = DEFAULT_SPLIT.map((s) => ({ ...s }));
  const bump = (key: string, by: number, note: string) => {
    const s = split.find((x) => x.key === key);
    if (s) {
      s.percent += by;
      s.note = note;
    }
  };
  const priorities: string[] = [];
  if (/photo|pictures|video/.test(t)) { bump("photo_video", 4, "You said photos matter, so this gets a bigger share"); priorities.push("Great photography"); }
  if (/band|music|dance|party|session/.test(t)) { bump("music", 3, "Music and the party are a priority"); priorities.push("Music & party"); }
  if (/flower|floral|wild ?flowers?|decor|styling/.test(t)) { bump("flowers_decor", 3, "Flowers and styling are a priority"); priorities.push("Flowers & styling"); }
  if (/food|menu|feast|bbq|pizza|street food/.test(t)) { bump("venue", 3, "Food is a priority"); priorities.push("Food"); }
  if (/dress|designer|gown/.test(t)) { bump("attire", 3, "Dress is a priority"); priorities.push("The dress"); }
  if (/budget|cheap|afford|save|frugal|simple|low[- ]key/.test(t)) { bump("contingency", 2, "Keep a buffer because quotes always creep up"); priorities.push("Stay on budget"); }
  if (vibes.includes("luxury")) bump("flowers_decor", 2, "Luxury styling costs more");
  if (vibes.includes("woodland") || vibes.includes("boho") || vibes.includes("rustic")) bump("flowers_decor", 1, "Outdoor and barn venues need more decor and hire items");
  if (/marquee|tipi|field/.test(t)) bump("venue", 4, "Marquee weddings: hire, toilets, power and catering add up");

  const tips = [
    `${settings.date.slice(0, 4)} peak Saturdays near ${settings.location} book out 18–24 months ahead, so lock in the venue first.`,
    "Get every venue quote in writing for your exact date and numbers. 'From' prices almost never apply to June Saturdays.",
    "Keep 8–10% as contingency. Service charges, VAT and minimum numbers routinely add 20–40% to venue quotes.",
  ];
  if (vibes.includes("woodland") || vibes.includes("boho")) tips.push("Outdoor ceremonies in Wicklow need a wet-weather plan: ask what the indoor fallback costs.");
  if (vibes.includes("coastal")) tips.push("Coastal venues are a drive from Roundwood, so budget for guest transport or a coach.");
  if (vibes.includes("luxury")) tips.push("Luxury hotels often have higher minimum spends and room guarantees. Check the decoded hidden costs.");
  if (vibes.includes("rustic")) tips.push("Barn venues are often 'dry hire': catering, staff, furniture, bar and toilets can each be extra.");

  return {
    brief,
    vibes,
    summary: vibes.length
      ? `A ${vibes.map((v) => VIBE_LABEL[v]).join(" / ").toLowerCase()} wedding for ${settings.dayGuests} day guests (${settings.eveningGuests} in the evening) near ${settings.location}.`
      : `A wedding for ${settings.dayGuests} day guests (${settings.eveningGuests} in the evening) near ${settings.location}.`,
    priorities: priorities.length ? priorities : ["Venue that fits the vibe", "Stay on budget"],
    budgetSplit: rebalance(split),
    tips,
    method: "heuristic",
    createdAt: new Date().toISOString(),
  };
}

const VIBE_LABEL: Record<Vibe, string> = {
  luxury: "Luxury",
  woodland: "Woodland",
  coastal: "Coastal",
  rustic: "Rustic",
  castle: "Historic",
  lakeside: "Lakeside",
  country_house: "Country house",
  boho: "Boho",
  city: "City",
  intimate: "Intimate",
};

export function buildPlanPrompt(settings: WeddingSettings): string {
  return `You are an experienced Irish wedding planner. The couple describes their ideal wedding. Wedding: ${settings.date}, ${settings.dayGuests} day guests, ${settings.eveningGuests} total evening guests, near ${settings.location}, total budget €${settings.budget}.

Return ONLY JSON:
{
  "vibes": up to 3 of ["luxury","woodland","coastal","rustic","castle","lakeside","country_house","boho","city","intimate"],
  "summary": string,               // one or two sentences describing their wedding back to them
  "priorities": string[],          // 2–5 short things they care most about
  "budgetSplit": [{ "key": one of ${JSON.stringify(BUDGET_CATEGORIES.map((c) => c.key))}, "percent": number, "note": string }],  // must sum to 100; include every key; keep 6–10% contingency
  "tips": string[]                 // 4–6 specific, practical tips for THIS wedding in Ireland (cost traps, booking order, local logistics)
}
Use realistic Irish wedding cost proportions (venue incl. food & drink is usually 45–55%). Output JSON only.`;
}

export const ROLES: { value: PartyRole; label: string; jobs: string[] }[] = [
  { value: "best_man", label: "Best man", jobs: ["Organise the stag", "Mind the rings", "Give the best man's speech", "Settle supplier envelopes on the day", "Look after the groomsmen"] },
  { value: "maid_of_honour", label: "Maid / matron of honour", jobs: ["Organise the hen", "Help with dress fittings", "Hold the bouquet at the ceremony", "Emergency kit on the day", "Give a speech"] },
  { value: "bridesmaid", label: "Bridesmaid", jobs: ["Help with the hen", "Help get ready on the morning", "Help with DIY decor"] },
  { value: "groomsman", label: "Groomsman", jobs: ["Help with the stag", "Set up / take down decor", "Look after older guests"] },
  { value: "usher", label: "Usher", jobs: ["Seat guests at the ceremony", "Hand out booklets", "Direct cars & parking"] },
  { value: "flower_girl", label: "Flower girl", jobs: ["Walk down the aisle with petals"] },
  { value: "page_boy", label: "Page boy / ring bearer", jobs: ["Carry the (decoy) rings"] },
  { value: "reader", label: "Reader", jobs: ["Do a reading at the ceremony"] },
  { value: "mc", label: "MC", jobs: ["Run the speeches", "Make announcements", "Keep the timings on track"] },
  { value: "witness", label: "Witness", jobs: ["Sign the marriage registration form", "Bring photo ID"] },
  { value: "singer", label: "Singer / musician", jobs: ["Perform at the ceremony"] },
  { value: "helper", label: "Helper", jobs: ["Collect the cake", "Mind the guestbook & cards box", "Return hired items on Monday"] },
];

export const roleLabel = (r?: PartyRole) => ROLES.find((x) => x.value === r)?.label ?? "";

export interface FinderCategory {
  key: string;
  label: string;
  emoji: string;
  /** Overpass tag filters, e.g. ['"shop"="hairdresser"'] */
  osm: string[];
  /** free-text Nominatim searches (fast fallback when Overpass is slow) */
  terms: string[];
  /** typical Irish price guide */
  price: string;
  priceLow: number;
  priceHigh: number;
  search: string;
  hashtag: string;
}

export const FINDER_CATEGORIES: FinderCategory[] = [
  { key: "venue", terms: ["wedding venue", "hotel", "castle", "events venue"], label: "Venues & hotels", emoji: "🏰", osm: ['"amenity"="events_venue"', '"tourism"="hotel"', '"historic"="castle"["tourism"]', '"building"="barn"["tourism"]'], price: "€12k–€30k for 100 guests (food & drink incl.)", priceLow: 12000, priceHigh: 30000, search: "wedding venue", hashtag: "weddingvenue" },
  { key: "catering", terms: ["caterer", "catering"], label: "Catering", emoji: "🍽️", osm: ['"craft"="caterer"', '"shop"="deli"', '"amenity"="restaurant"["cuisine"~"pizza|bbq|burger"]'], price: "€45–€95 per head; food trucks €12–€20pp evening", priceLow: 4500, priceHigh: 9500, search: "wedding caterer", hashtag: "weddingcatering" },
  { key: "photographer", terms: ["photographer", "photography"], label: "Photographers", emoji: "📷", osm: ['"craft"="photographer"', '"shop"="photo"', '"office"="photographer"'], price: "€2,000–€4,000 full day; video €1,800–€3,500", priceLow: 2000, priceHigh: 4000, search: "wedding photographer", hashtag: "weddingphotographer" },
  { key: "hair", terms: ["hairdresser", "hair salon"], label: "Hairdressers", emoji: "💇", osm: ['"shop"="hairdresser"'], price: "Bride €150–€250 + €60–€90 per bridesmaid; call-out €50–€150", priceLow: 400, priceHigh: 800, search: "bridal hair", hashtag: "bridalhair" },
  { key: "makeup", terms: ["beauty salon", "make up artist"], label: "Make-up & beauty", emoji: "💄", osm: ['"shop"="beauty"', '"shop"="cosmetics"'], price: "Bride €150–€300 + €70–€100 per person; trial €80–€120", priceLow: 400, priceHigh: 900, search: "bridal makeup artist", hashtag: "bridalmakeup" },
  { key: "accommodation", terms: ["hotel", "guest house", "bed and breakfast"], label: "Guest accommodation", emoji: "🛏️", osm: ['"tourism"="hotel"', '"tourism"="guest_house"', '"tourism"="chalet"', '"tourism"="apartment"', '"tourism"="hostel"'], price: "€120–€250 per room per night on a June Saturday", priceLow: 120, priceHigh: 250, search: "accommodation", hashtag: "wicklow" },
  { key: "florist", terms: ["florist"], label: "Florists", emoji: "💐", osm: ['"shop"="florist"', '"shop"="garden_centre"'], price: "€1,000–€3,500 (bouquets, buttonholes, tables)", priceLow: 1000, priceHigh: 3500, search: "wedding florist", hashtag: "weddingflowers" },
  { key: "cake", terms: ["bakery", "cake"], label: "Cake & bakers", emoji: "🎂", osm: ['"shop"="bakery"', '"shop"="pastry"', '"shop"="confectionery"'], price: "€400–€900 for 100–130 portions", priceLow: 400, priceHigh: 900, search: "wedding cake", hashtag: "weddingcake" },
  { key: "bridal", terms: ["bridal", "wedding dress", "jeweller"], label: "Bridal & suits", emoji: "👗", osm: ['"shop"="wedding"', '"shop"="clothes"["clothes"~"wedding|suits"]', '"shop"="jewelry"'], price: "Dress €1,200–€3,500; suit hire €100–€180 each; rings €1,500–€4,000", priceLow: 1500, priceHigh: 5000, search: "bridal shop", hashtag: "irishbride" },
  { key: "transport", terms: ["taxi", "car hire", "coach hire"], label: "Transport", emoji: "🚐", osm: ['"amenity"="taxi"', '"shop"="car_rental"', '"amenity"="car_rental"', '"office"="travel_agent"'], price: "Wedding car €400–€800; guest coach €400–€700", priceLow: 400, priceHigh: 1500, search: "wedding car hire", hashtag: "weddingcar" },
  { key: "ceremony", terms: ["church"], label: "Churches & ceremony spots", emoji: "⛪", osm: ['"amenity"="place_of_worship"'], price: "Church donation €200–€500; solemniser €350–€600", priceLow: 200, priceHigh: 600, search: "wedding celebrant", hashtag: "irishwedding" },
];

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function placeSlug(location: string) {
  return location.split(",").map((s) => s.trim()).filter(Boolean).pop()?.replace(/^co\.?\s*/i, "").replace(/[^a-z]/gi, "").toLowerCase() ?? "";
}

export function searchLinks(cat: FinderCategory, location: string, vibe?: string) {
  const area = location.replace(/,?\s*co\.?\s*/i, " ").trim();
  const county = placeSlug(location);
  const q = `${vibe ? vibe + " " : ""}${cat.search} near ${area}`;
  return {
    instagram: `https://www.instagram.com/explore/tags/${county}${cat.hashtag}/`,
    instagramGeneric: `https://www.instagram.com/explore/tags/${cat.hashtag}ireland/`,
    maps: `https://www.google.com/maps/search/${encodeURIComponent(q)}`,
    google: `https://www.google.com/search?q=${encodeURIComponent(q + " instagram")}`,
  };
}
