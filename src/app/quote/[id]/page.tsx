"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FlagCard, Loading, MethodBadge, Stat, supplierLabel } from "@/components/ui";
import { computeTotal, describeCondition, eur, type BreakdownRow } from "@/lib/calc";
import { formatDate } from "@/lib/dates";
import { extractQuote, useStore } from "@/lib/store";
import { paymentSchedule } from "@/lib/timeline";
import type { CostLine } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  venue_hire: "Venue",
  ceremony: "Ceremony",
  day_food: "Day food",
  evening_food: "Evening food",
  drinks: "Drinks",
  accommodation: "Accommodation",
  staff_service: "Service & staff",
  supplement: "Supplement",
  extras: "Extras",
  tax: "VAT",
  supplier_fee: "Supplier fee",
  other: "Other",
  inflation: "Inflation",
};

export default function QuotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { quotes, settings, ready, updateQuote, removeQuote, chosen, choose, llm } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [allFlags, setAllFlags] = useState(false);
  if (!ready) return <Loading />;
  const quote = quotes.find((q) => q.id === id);
  if (!quote) {
    return (
      <div className="card text-center">
        Quote not found. <Link href="/" className="text-rose-700 underline">Back to quotes</Link>
      </div>
    );
  }
  const t = computeTotal(quote, settings);
  const schedule = paymentSchedule(quote, settings);
  const isChosen = chosen[quote.supplierType] === quote.id;
  const lineById = (lid?: string) => quote.lines.find((l) => l.id === lid);
  const sortedFlags = [...quote.flags].sort((a, b) => ["high", "medium", "low"].indexOf(a.severity) - ["high", "medium", "low"].indexOf(b.severity));

  const editLine = (lid: string, patch: Partial<CostLine>) => updateQuote(quote.id, (q) => ({ ...q, lines: q.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));

  async function reextract() {
    if (!quote) return;
    setBusy(true);
    setMsg("");
    try {
      const { extraction, method, warning } = await extractQuote(quote.rawText, settings, llm);
      updateQuote(quote.id, (q) => ({
        ...q,
        method,
        priceYear: extraction.priceYear,
        location: extraction.location ?? q.location,
        lines: extraction.lines.map((l) => ({ ...l, id: Math.random().toString(36).slice(2, 10) })),
        flags: extraction.flags.map((f) => ({ ...f, id: Math.random().toString(36).slice(2, 10) })),
        payments: extraction.payments,
        notes: warning ? [warning, ...extraction.notes] : extraction.notes,
      }));
      setMsg(method === "llm" ? "Re-extracted with AI." : warning ?? "No AI key configured — re-extracted with the rule-based parser.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const visible = t.rows.filter((r) => r.status === "included");
  const optional = t.rows.filter((r) => r.status === "optional" || r.status === "excluded");
  const na = t.rows.filter((r) => r.status === "not_applicable");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-stone-500 hover:underline">← Quotes</Link>
          <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{quote.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
            {supplierLabel(quote.supplierType)}
            {quote.location && <span>· {quote.location}</span>}
            {quote.priceYear && <span>· {quote.priceYear} prices</span>}
            <MethodBadge method={quote.method} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={isChosen ? "btn bg-emerald-600 text-white hover:bg-emerald-700" : "btn-secondary"} onClick={() => choose(quote.supplierType, isChosen ? undefined : quote.id)}>
            {isChosen ? "✓ Chosen" : `Choose this ${supplierLabel(quote.supplierType).toLowerCase()}`}
          </button>
          <button className="btn-secondary" onClick={reextract} disabled={busy}>{busy ? "Extracting…" : "Re-extract"}</button>
          <button
            className="btn-secondary text-red-700"
            onClick={() => {
              if (confirm(`Delete ${quote.name}?`)) {
                removeQuote(quote.id);
                router.push("/");
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {msg && <p className="rounded-xl bg-stone-100 p-3 text-sm">{msg}</p>}

      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="True total" value={eur(t.total)} tone="rose" sub={`for ${settings.dayGuests} day / ${settings.eveningGuests} evening`} />
        <Stat label="Headline price" value={eur(t.advertised)} sub="what the brochure implies" />
        <Stat label="Hidden & conditional" value={`+${eur(t.hiddenAmount)}`} tone="red" sub={`${quote.flags.length} flags · ${t.advertised ? Math.round((t.hiddenAmount / t.advertised) * 100) : 0}% extra`} />
        <Stat label="Per day guest" value={eur(t.perDayGuest)} sub={`${eur(t.perGuest)} per evening guest`} />
        <div className="col-span-2 sm:col-span-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
            <div className="bg-stone-400" style={{ width: `${(t.advertised / Math.max(t.total, 1)) * 100}%` }} />
            <div className="bg-red-500" style={{ width: `${(t.hiddenAmount / Math.max(t.total, 1)) * 100}%` }} />
          </div>
          <div className="mt-1 flex gap-4 text-xs text-stone-500">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-stone-400" />Headline</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />Hidden / conditional</span>
          </div>
        </div>
      </section>

      {sortedFlags.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-xl font-semibold">Hidden cost flags ({sortedFlags.length})</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(allFlags ? sortedFlags : sortedFlags.slice(0, 4)).map((f) => <FlagCard key={f.id} flag={f} />)}
          </ul>
          {sortedFlags.length > 4 && (
            <button className="mt-2 text-sm font-medium text-rose-700" onClick={() => setAllFlags((v) => !v)}>
              {allFlags ? "Show fewer" : `Show all ${sortedFlags.length} flags`}
            </button>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="mb-1 font-serif text-xl font-semibold">Line-by-line breakdown</h2>
        <p className="mb-3 text-xs text-stone-500">Tap an amount to correct it. Red rows are hidden or conditional costs that apply to your date.</p>
        <ul className="divide-y divide-stone-100">
          {visible.map((r) => <Row key={r.key} row={r} line={lineById(r.lineId)} onEdit={editLine} />)}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t-2 border-stone-800 pt-3">
          <span className="font-semibold">True total</span>
          <span className="font-serif text-2xl font-semibold">{eur(t.total)}</span>
        </div>
      </section>

      {optional.length > 0 && (
        <section className="card">
          <h2 className="mb-1 font-serif text-lg font-semibold">Optional extras & worst-case risks</h2>
          <p className="mb-3 text-xs text-stone-500">Not in the total. Tick to include.</p>
          <ul className="divide-y divide-stone-100">
            {optional.map((r) => <Row key={r.key} row={r} line={lineById(r.lineId)} onEdit={editLine} />)}
          </ul>
        </section>
      )}

      {na.length > 0 && (
        <section className="card">
          <h2 className="mb-1 font-serif text-lg font-semibold">Doesn&apos;t apply to your date</h2>
          <ul className="divide-y divide-stone-100 text-sm text-stone-500">
            {na.map((r) => {
              const l = lineById(r.lineId);
              return (
                <li key={r.key} className="flex justify-between gap-2 py-2">
                  <span>{r.label} <span className="text-xs">({l ? describeCondition(l) : ""})</span></span>
                  <span className="line-through">{eur(r.amount)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="mb-1 font-serif text-lg font-semibold">Payment schedule</h2>
        {schedule.some((p) => p.assumed) && <p className="mb-2 text-xs text-amber-700">Some payments are assumed — no schedule found in the quote.</p>}
        <ul className="divide-y divide-stone-100 text-sm">
          {schedule.map((p, i) => (
            <li key={i} className="flex justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{p.label}</span>
                <span className="block text-xs text-stone-500">{formatDate(p.due)}</span>
              </span>
              <span className="font-medium">{eur(p.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      {quote.notes.length > 0 && (
        <section className="card">
          <h2 className="mb-1 font-serif text-lg font-semibold">Notes & assumptions</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
            {quote.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </section>
      )}

      <section className="card">
        <button className="text-sm font-medium text-rose-700" onClick={() => setShowRaw((s) => !s)}>{showRaw ? "Hide" : "Show"} original text</button>
        {showRaw && <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-stone-50 p-3 text-xs whitespace-pre-wrap">{quote.rawText}</pre>}
      </section>
    </div>
  );
}

function Row({ row, line, onEdit }: { row: BreakdownRow; line?: CostLine; onEdit: (id: string, p: Partial<CostLine>) => void }) {
  const [editing, setEditing] = useState(false);
  const hidden = row.hiddenAmount > 0;
  const toggleable = !!line && row.status !== "not_applicable";
  const checked = row.status === "included";
  return (
    <li className={`flex gap-3 py-3 ${hidden ? "-mx-2 rounded-lg bg-red-50/60 px-2" : ""}`}>
      {toggleable && line && line.pricingType !== "percent" && line.pricingType !== "minimum_spend" ? (
        <input type="checkbox" className="mt-1 h-4 w-4 accent-rose-700" checked={checked} onChange={(e) => onEdit(line.id, { included: e.target.checked })} aria-label={`Include ${row.label}`} />
      ) : (
        <span className="w-4" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">
            {row.label}
            <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 uppercase">{CATEGORY_LABEL[row.category] ?? row.category}</span>
          </p>
          {editing && line ? (
            <input
              type="number"
              autoFocus
              step="0.01"
              defaultValue={line.isFromPrice && line.estimatedAmount ? line.estimatedAmount : line.amount}
              className="input w-28 py-1 text-right"
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) onEdit(line.id, line.isFromPrice && line.estimatedAmount ? { estimatedAmount: v } : { amount: v });
                setEditing(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <button className={`shrink-0 font-semibold tabular-nums ${hidden ? "text-red-700" : ""} ${line ? "hover:underline" : "cursor-default"}`} onClick={() => line && setEditing(true)} title={line ? "Edit rate" : undefined}>
              {eur(row.amount)}
            </button>
          )}
        </div>
        <p className="text-xs text-stone-500">
          {row.formula}
          {line?.pricingType === "per_unit" && (
            <>
              {" · qty "}
              <input type="number" min={0} className="w-16 rounded border border-stone-300 px-1 text-xs" value={line.quantity ?? 0} onChange={(e) => onEdit(line.id, { quantity: Math.max(0, parseInt(e.target.value || "0", 10)) })} aria-label="Quantity" />
            </>
          )}
        </p>
        {row.hiddenReason && hidden && <p className="mt-0.5 text-xs font-medium text-red-700">⚑ {row.hiddenReason}{row.hiddenAmount < row.amount ? ` (+${eur(row.hiddenAmount)})` : ""}</p>}
        {row.sourceText && <p className="mt-0.5 truncate text-[11px] text-stone-400 italic" title={row.sourceText}>&ldquo;{row.sourceText}&rdquo;</p>}
      </div>
    </li>
  );
}
