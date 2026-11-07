"use client";

import Link from "next/link";
import { useState } from "react";
import { Loading, supplierLabel } from "@/components/ui";
import { computeTotal, eur } from "@/lib/calc";
import { useStore } from "@/lib/store";
import type { SupplierType } from "@/lib/types";

type SortKey = "total" | "perGuest" | "hidden" | "flags";

export default function Compare() {
  const { quotes, settings, ready, chosen } = useStore();
  const types = [...new Set(quotes.map((q) => q.supplierType))];
  const [type, setType] = useState<SupplierType>("venue");
  const [sort, setSort] = useState<SortKey>("total");
  if (!ready) return <Loading />;
  const activeType = types.includes(type) ? type : (types[0] ?? "venue");

  const rows = quotes
    .filter((q) => q.supplierType === activeType)
    .map((q) => {
      const t = computeTotal(q, settings);
      return { q, t, high: q.flags.filter((f) => f.severity === "high").length };
    })
    .sort((a, b) =>
      sort === "total" ? a.t.total - b.t.total : sort === "perGuest" ? a.t.perDayGuest - b.t.perDayGuest : sort === "hidden" ? a.t.hiddenAmount - b.t.hiddenAmount : a.q.flags.length - b.q.flags.length,
    );
  const max = Math.max(1, ...rows.map((r) => r.t.total));
  const cheapest = rows.length ? Math.min(...rows.map((r) => r.t.total)) : 0;
  const cheapestHeadline = rows.length ? [...rows].sort((a, b) => a.t.advertised - b.t.advertised)[0] : undefined;
  const cheapestTrue = rows.length ? [...rows].sort((a, b) => a.t.total - b.t.total)[0] : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Comparison</h1>
        <p className="text-sm text-stone-600">True totals for {settings.dayGuests} day / {settings.eveningGuests} evening guests on your date.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {types.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${t === activeType ? "bg-rose-700 text-white" : "border border-stone-300 bg-white"}`}>
            {supplierLabel(t)}
          </button>
        ))}
        <select className="input ml-auto w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by">
          <option value="total">Sort: true total</option>
          <option value="perGuest">Sort: cost per guest</option>
          <option value="hidden">Sort: hidden €</option>
          <option value="flags">Sort: hidden costs found</option>
        </select>
      </div>

      {rows.length === 0 && <div className="card text-center text-stone-500">No quotes of this type yet.</div>}

      {cheapestHeadline && cheapestTrue && cheapestHeadline.q.id !== cheapestTrue.q.id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>{cheapestHeadline.q.name}</strong> looks cheapest on paper ({eur(cheapestHeadline.t.advertised)}), but <strong>{cheapestTrue.q.name}</strong> is cheapest once hidden costs are included ({eur(cheapestTrue.t.total)}).
        </div>
      )}

      <section className="card space-y-4">
        <h2 className="font-serif text-lg font-semibold">True total</h2>
        {rows.map(({ q, t }) => (
          <div key={q.id}>
            <div className="mb-1 flex justify-between text-sm">
              <Link href={`/quote/${q.id}`} className="font-medium hover:underline">{q.name}</Link>
              <span className="font-semibold tabular-nums">{eur(t.total)}</span>
            </div>
            <div className="flex h-5 overflow-hidden rounded-md bg-stone-100" title={`Headline ${eur(t.advertised)} + hidden ${eur(t.hiddenAmount)}`}>
              <div className="bg-stone-400" style={{ width: `${(t.advertised / max) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(t.hiddenAmount / max) * 100}%` }} />
            </div>
          </div>
        ))}
        <div className="flex gap-4 text-xs text-stone-500">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-stone-400" />Headline</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />Hidden / conditional</span>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="card overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500 uppercase">
              <tr>
                <th className="sticky left-0 bg-stone-50 p-3">Supplier</th>
                <th className="p-3 text-right">True total</th>
                <th className="p-3 text-right">Headline</th>
                <th className="p-3 text-right">Hidden €</th>
                <th className="p-3 text-right">Per day guest</th>
                <th className="p-3 text-right">Per evening guest</th>
                <th className="p-3 text-right">Hidden costs found</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map(({ q, t, high }) => (
                <tr key={q.id} className={t.total === cheapest ? "bg-emerald-50/50" : ""}>
                  <td className="sticky left-0 bg-white p-3">
                    <Link href={`/quote/${q.id}`} className="font-medium hover:underline">{q.name}</Link>
                    <div className="flex gap-1">
                      {t.total === cheapest && <span className="text-[11px] font-medium text-emerald-700">Cheapest</span>}
                      {chosen[q.supplierType] === q.id && <span className="text-[11px] font-medium text-emerald-700">· Chosen</span>}
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold tabular-nums">{eur(t.total)}</td>
                  <td className="p-3 text-right tabular-nums text-stone-500">{eur(t.advertised)}</td>
                  <td className="p-3 text-right tabular-nums text-red-700">+{eur(t.hiddenAmount)}</td>
                  <td className="p-3 text-right tabular-nums">{eur(t.perDayGuest)}</td>
                  <td className="p-3 text-right tabular-nums">{eur(t.perGuest)}</td>
                  <td className="p-3 text-right">
                    <span className="font-semibold">{q.flags.length}</span>
                    {high > 0 && <span className="ml-1 text-xs text-red-700">({high} high)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {rows.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3">
          {rows.map(({ q }) => (
            <div key={q.id} className="card">
              <p className="mb-2 font-semibold">{q.name}: top flags</p>
              <ul className="space-y-1 text-sm">
                {q.flags.filter((f) => f.severity !== "low").slice(0, 4).map((f) => (
                  <li key={f.id} className="flex gap-2">
                    <span className={f.severity === "high" ? "text-red-600" : "text-amber-600"}>⚑</span>
                    {f.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
