"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SEED_BROCHURES } from "./seed";
import { DEFAULT_SETTINGS, type Extraction, type Quote, type SupplierType, type WeddingSettings } from "./types";

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
}

const uid = () => Math.random().toString(36).slice(2, 10);

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
  };
}

function seedState(): State {
  return {
    quotes: SEED_BROCHURES.map((s) => quoteFromExtraction(s.extraction, s.rawText, "seed", s.id)),
    settings: DEFAULT_SETTINGS,
    chosen: {},
    llm: { apiKey: "", provider: "auto" },
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
  const resetDemo = useCallback(() => setState((s) => ({ ...seedState(), llm: s.llm })), []);

  const value = useMemo(
    () => ({ ...state, ready, addQuote, updateQuote, removeQuote, setSettings, choose, setLlm, resetDemo }),
    [state, ready, addQuote, updateQuote, removeQuote, setSettings, choose, setLlm, resetDemo],
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
