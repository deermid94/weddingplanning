"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loading } from "@/components/ui";
import { SEED_BROCHURES } from "@/lib/seed";
import { extractQuote, quoteFromExtraction, useStore } from "@/lib/store";
import { SUPPLIER_TYPES, type SupplierType } from "@/lib/types";

export default function AddQuote() {
  const { settings, llm, addQuote, ready } = useStore();
  const router = useRouter();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<SupplierType | "">("");
  const [busy, setBusy] = useState<"" | "pdf" | "extract">("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setStatus(s.serverProvider ? `AI extraction on (${s.serverProvider})` : null))
      .catch(() => setStatus(null));
  }, []);

  if (!ready) return <Loading />;
  const aiLabel = status ?? (llm.apiKey ? "AI extraction on (your key)" : "No AI key — using the rule-based parser. Add a key in Settings for much better results.");

  async function onPdf(file: File) {
    setError("");
    setBusy("pdf");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setText(data.text);
      if (!name) setName(file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " "));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function decode() {
    setError("");
    setBusy("extract");
    try {
      const { extraction, method, warning } = await extractQuote(text, settings, llm);
      if (name.trim()) extraction.name = name.trim();
      if (type) extraction.supplierType = type;
      if (warning) extraction.notes = [warning, ...extraction.notes];
      const q = quoteFromExtraction(extraction, text, method);
      addQuote(q);
      router.push(`/quote/${q.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Add a quote</h1>
        <p className="text-sm text-stone-600">Paste a venue brochure or supplier quote. Every cost line gets extracted, hidden charges flagged and a true total calculated for your date and numbers.</p>
      </div>

      <div className={`rounded-xl px-3 py-2 text-xs ${status || llm.apiKey ? "bg-violet-50 text-violet-800" : "bg-sky-50 text-sky-800"}`}>{aiLabel}</div>

      <div className="card space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name (optional)</label>
            <input id="name" className="input" placeholder="Detected automatically" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="type">Supplier type</label>
            <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value as SupplierType | "")}>
              <option value="">Detect automatically</option>
              {SUPPLIER_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0" htmlFor="text">Brochure / quote text</label>
            <button type="button" className="text-sm font-medium text-rose-700 hover:underline disabled:opacity-50" onClick={() => fileRef.current?.click()} disabled={!!busy}>
              {busy === "pdf" ? "Reading PDF…" : "Upload PDF"}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onPdf(e.target.files[0])} />
          </div>
          <textarea id="text" className="input min-h-72 font-mono text-xs leading-relaxed sm:text-xs" placeholder="Paste the full brochure, price list or email quote here…" value={text} onChange={(e) => setText(e.target.value)} />
          <p className="mt-1 text-xs text-stone-500">{text.length.toLocaleString()} characters</p>
        </div>

        <div>
          <p className="label">Or try a sample brochure</p>
          <div className="flex flex-wrap gap-2">
            {SEED_BROCHURES.map((s) => (
              <button key={s.id} type="button" className="rounded-full border border-stone-300 px-3 py-1 text-xs hover:bg-stone-50" onClick={() => { setText(s.rawText); setName(""); }}>
                {s.extraction.name}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <button className="btn-primary w-full sm:w-auto" disabled={text.trim().length < 20 || !!busy} onClick={decode}>
          {busy === "extract" ? "Decoding… (can take ~20s)" : "Decode true cost"}
        </button>
      </div>
    </div>
  );
}
