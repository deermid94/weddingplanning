"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { detectVibes } from "./planning";
import { SEED_BROCHURES } from "./seed";
import { DEFAULT_SETTINGS, type Extraction, type Guest, type Quote, type ShortlistItem, type SupplierType, type WeddingPlan, type WeddingSettings } from "./types";

const KEY = "wqd:v1";

export interface LlmPrefs {
  apiKey: string;
  provider: "auto" | "openai" | "anthropic" | "gemini";
}

interface State {
  quotes: Quote[];
  settings: WeddingSettings;
  chosen: Partial<Record<SupplierType, string>>;
  llm: LlmPrefs;
  guests: Guest[];
  shortlist: ShortlistItem[];
  plan: WeddingPlan | null;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function quoteFromExtraction(e: Extraction, rawText: string, method: Quote["method"], id = uid()): Quote {
  return {
    id,
    name: e.name,
    supplierType: e.supplierType,
    location: e.location,
    priceYear: e.priceYear,
    rawText,
    createdAt: new Date().toISOString(),
    method,
    lines: e.lines.map((l) => ({ ...l, id: uid() })),
    flags: e.flags.map((f) => ({ ...f, id: uid() })),
    payments: e.payments,
    notes: e.notes,
    vibes: e.vibes?.length ? e.vibes : detectVibes(rawText),
  };
}

function seedState(): State {
  return {
    quotes: SEED_BROCHURES.map((s) => quoteFromExtraction(s.extraction, s.rawText, "seed", s.id)),
    settings: DEFAULT_SETTINGS,
    chosen: {},
    llm: { apiKey: "", provider: "auto" },
    guests: [],
    shortlist: [],
    plan: null,
  };
}

interface Store extends State {
  ready: boolean;
  addQuote: (q: Quote) => void;
  updateQuote: (id: string, fn: (q: Quote) => Quote) => void;
  removeQuote: (id: string) => void;
  setSettings: (s: Partial<WeddingSettings>) => void;
  choose: (type: SupplierType, id: string | undefined) => void;
  setLlm: (l: Partial<LlmPrefs>) => void;
  resetDemo: () => void;
  upsertGuest: (g: Guest) => void;
  removeGuest: (id: string) => void;
  setGuests: (g: Guest[]) => void;
  upsertShortlist: (i: ShortlistItem) => void;
  removeShortlist: (id: string) => void;
  setPlan: (p: WeddingPlan | null) => void;
  setQuoteVibes: (id: string, vibes: Quote["vibes"]) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(seedState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        if (parsed.quotes) parsed.quotes = parsed.quotes.map((q) => (q.vibes ? q : { ...q, vibes: SEED_BROCHURES.find((b) => b.id === q.id)?.extraction.vibes ?? detectVibes(q.rawText) }));
        setState((s) => ({ ...s, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings }, llm: { ...s.llm, ...parsed.llm } }));
      }
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const addQuote = useCallback((q: Quote) => setState((s) => ({ ...s, quotes: [q, ...s.quotes] })), []);
  const updateQuote = useCallback((id: string, fn: (q: Quote) => Quote) => setState((s) => ({ ...s, quotes: s.quotes.map((q) => (q.id === id ? fn(q) : q)) })), []);
  const removeQuote = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        quotes: s.quotes.filter((q) => q.id !== id),
        chosen: Object.fromEntries(Object.entries(s.chosen).filter(([, v]) => v !== id)),
      })),
    [],
  );
  const setSettings = useCallback((p: Partial<WeddingSettings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } })), []);
  const choose = useCallback((type: SupplierType, id: string | undefined) => setState((s) => ({ ...s, chosen: { ...s.chosen, [type]: id } })), []);
  const setLlm = useCallback((l: Partial<LlmPrefs>) => setState((s) => ({ ...s, llm: { ...s.llm, ...l } })), []);
  const resetDemo = useCallback(() => setState((s) => ({ ...seedState(), llm: s.llm, guests: s.guests, shortlist: s.shortlist, plan: s.plan })), []);
  const upsert = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);
  const upsertGuest = useCallback((g: Guest) => setState((s) => ({ ...s, guests: upsert(s.guests, g) })), []);
  const removeGuest = useCallback((id: string) => setState((s) => ({ ...s, guests: s.guests.filter((g) => g.id !== id) })), []);
  const setGuests = useCallback((guests: Guest[]) => setState((s) => ({ ...s, guests })), []);
  const upsertShortlist = useCallback((i: ShortlistItem) => setState((s) => ({ ...s, shortlist: upsert(s.shortlist, i) })), []);
  const removeShortlist = useCallback((id: string) => setState((s) => ({ ...s, shortlist: s.shortlist.filter((x) => x.id !== id) })), []);
  const setPlan = useCallback((plan: WeddingPlan | null) => setState((s) => ({ ...s, plan })), []);
  const setQuoteVibes = useCallback((id: string, vibes: Quote["vibes"]) => setState((s) => ({ ...s, quotes: s.quotes.map((q) => (q.id === id ? { ...q, vibes } : q)) })), []);

  const value = useMemo(
    () => ({ ...state, ready, addQuote, updateQuote, removeQuote, setSettings, choose, setLlm, resetDemo, upsertGuest, removeGuest, setGuests, upsertShortlist, removeShortlist, setPlan, setQuoteVibes }),
    [state, ready, addQuote, updateQuote, removeQuote, setSettings, choose, setLlm, resetDemo, upsertGuest, removeGuest, setGuests, upsertShortlist, removeShortlist, setPlan, setQuoteVibes],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export async function extractQuote(text: string, settings: WeddingSettings, llm: LlmPrefs): Promise<{ extraction: Extraction; method: Quote["method"]; warning?: string; provider?: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (llm.apiKey) {
    headers["x-llm-key"] = llm.apiKey;
    if (llm.provider !== "auto") headers["x-llm-provider"] = llm.provider;
  }
  const res = await fetch("/api/extract", { method: "POST", headers, body: JSON.stringify({ text, settings }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Extraction failed (${res.status})`);
  return data;
}

function llmHeaders(llm: LlmPrefs) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (llm.apiKey) {
    headers["x-llm-key"] = llm.apiKey;
    if (llm.provider !== "auto") headers["x-llm-provider"] = llm.provider;
  }
  return headers;
}

export async function generatePlan(brief: string, settings: WeddingSettings, llm: LlmPrefs): Promise<{ plan: WeddingPlan; warning?: string }> {
  const res = await fetch("/api/plan", { method: "POST", headers: llmHeaders(llm), body: JSON.stringify({ brief, settings }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Planning failed (${res.status})`);
  return data;
}

export function guestCounts(guests: Guest[]) {
  const coming = guests.filter((g) => g.rsvp !== "no");
  const heads = (g: Guest) => 1 + (g.plusOne ? 1 : 0);
  const day = coming.filter((g) => g.invite === "day").reduce((a, g) => a + heads(g), 0);
  const eveningOnly = coming.filter((g) => g.invite === "evening").reduce((a, g) => a + heads(g), 0);
  const confirmed = guests.filter((g) => g.rsvp === "yes").reduce((a, g) => a + heads(g), 0);
  const declined = guests.filter((g) => g.rsvp === "no").reduce((a, g) => a + heads(g), 0);
  const rooms = coming.filter((g) => g.needsRoom).length;
  return { day, evening: day + eveningOnly, eveningOnly, confirmed, declined, rooms, invited: guests.reduce((a, g) => a + heads(g), 0) };
}
