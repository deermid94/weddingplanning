"use client";

import Link from "next/link";
import { Loading, supplierLabel } from "@/components/ui";
import { computeTotal, eur } from "@/lib/calc";
import { formatDate, parseDate } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { buildMilestones, savingsPlan, type MilestoneStatus } from "@/lib/timeline";
import type { SupplierType } from "@/lib/types";

const STATUS: Record<MilestoneStatus, [string, string, string]> = {
  done: ["Booked", "bg-emerald-100 text-emerald-800", "bg-emerald-500"],
  overdue: ["Overdue", "bg-red-100 text-red-800", "bg-red-500"],
  now: ["Book now", "bg-amber-100 text-amber-900", "bg-amber-500"],
  upcoming: ["Upcoming", "bg-stone-100 text-stone-600", "bg-stone-300"],
};

export default function Timeline() {
  const { settings, setSettings, quotes, chosen, choose, ready } = useStore();
  if (!ready) return <Loading />;
  const wedding = parseDate(settings.date);
  const milestones = buildMilestones(settings, quotes, chosen);
  const plan = savingsPlan(settings, quotes, chosen);
  const types = [...new Set(quotes.map((q) => q.supplierType))] as SupplierType[];
  const overBudget = plan.committed > settings.budget;
  const maxBar = Math.max(1, ...plan.months.map((m) => Math.max(m.cumulativeDue, m.cumulativeSaved)));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Reverse timeline</h1>
        <p className="text-sm text-stone-600">Working back from {formatDate(wedding, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.</p>
      </div>

      <section className="card space-y-4">
        <h2 className="font-serif text-lg font-semibold">Savings target</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="budget">Total budget (€)</label>
            <input id="budget" type="number" inputMode="numeric" className="input" value={settings.budget} onChange={(e) => setSettings({ budget: Math.max(0, +e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="saved">Saved so far (€)</label>
            <input id="saved" type="number" inputMode="numeric" className="input" value={settings.savedSoFar} onChange={(e) => setSettings({ savedSoFar: Math.max(0, +e.target.value) })} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-rose-50 p-4">
            <p className="text-xs font-medium tracking-wide text-rose-700 uppercase">Save each month</p>
            <p className="font-serif text-3xl font-semibold text-rose-800">{eur(plan.cashflowMonthly)}</p>
            <p className="text-xs text-rose-900/70">
              {plan.bindingPayment
                ? `Paced so you have enough for ${plan.bindingPayment.supplier} — ${plan.bindingPayment.label} — by ${formatDate(plan.bindingPayment.due)}.`
                : `Enough to cover every payment on time.`}
            </p>
          </div>
          <div className="rounded-xl bg-stone-50 p-4">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">If spread evenly</p>
            <p className="font-serif text-3xl font-semibold">{eur(plan.flatMonthly)}</p>
            <p className="text-xs text-stone-500">
              {eur(Math.max(settings.budget, plan.committed) - settings.savedSoFar)} still to save over {plan.monthsLeft} months — ignores when deposits fall due.
            </p>
          </div>
        </div>

        {overBudget && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            Chosen suppliers already total {eur(plan.committed)} — {eur(plan.committed - settings.budget)} over your budget.
          </p>
        )}

        <div>
          <p className="label">Chosen suppliers (drive the payment dates)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {types.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <span className="w-28 shrink-0 text-stone-500">{supplierLabel(t)}</span>
                <select className="input py-1.5" value={chosen[t] ?? ""} onChange={(e) => choose(t, e.target.value || undefined)}>
                  <option value="">Not chosen yet</option>
                  {quotes.filter((q) => q.supplierType === t).map((q) => (
                    <option key={q.id} value={q.id}>{q.name} — {eur(computeTotal(q, settings).total)}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="label">Payments due</p>
          <p className="mb-1 text-xs text-stone-500">Chosen suppliers use their real schedule. The rest of your budget is spread over suppliers not chosen yet, using typical Irish budget shares and deposits at each booking deadline.</p>
          <ul className="divide-y divide-stone-100 text-sm">
            {plan.payments.map((p, i) => (
              <li key={i} className="flex justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{p.supplier}</span> — {p.label}
                  {p.assumed && <span className="ml-1 text-xs text-amber-700">(assumed)</span>}
                  <span className="block text-xs text-stone-500">{formatDate(p.due)}</span>
                </span>
                <span className="font-medium tabular-nums">{eur(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-medium text-rose-700">Month-by-month: saved vs. payments due</summary>
          <div className="mt-3 space-y-1">
            {plan.months.map((m, i) => (
              <div key={i} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-2 text-xs">
                <span className="text-stone-500">{formatDate(m.month, { month: "short", year: "2-digit" })}</span>
                <div className="relative h-3 rounded bg-stone-100">
                  <div className="absolute inset-y-0 left-0 rounded bg-rose-300" style={{ width: `${(m.cumulativeSaved / maxBar) * 100}%` }} />
                  <div className="absolute inset-y-0 border-r-2 border-stone-800" style={{ left: `${(m.cumulativeDue / maxBar) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums">{m.due > 0 ? `pay ${eur(m.due)}` : ""}</span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-stone-500">Pink = cumulative savings at target rate; black line = cumulative payments due.</p>
          </div>
        </details>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold">Booking deadlines</h2>
        <ol className="relative space-y-3 border-l-2 border-stone-200 pl-5">
          {milestones.map((m) => {
            const [label, chip, dot] = STATUS[m.status];
            return (
              <li key={m.key} className="relative">
                <span className={`absolute top-4 -left-[27px] h-3 w-3 rounded-full ring-4 ring-[#faf7f5] ${dot}`} />
                <div className="card py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{m.title}</p>
                      <p className="text-xs text-stone-500">
                        Ideal from {formatDate(m.opensOn, { month: "short", year: "numeric" })} · <strong className="text-stone-700">book by {formatDate(m.dueOn)}</strong> ({m.byMonths >= 1 ? `${m.byMonths} months` : `${Math.round(m.byMonths * 30)} days`} before)
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip}`}>{label}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{m.tip}</p>
                  {m.bookedName && <p className="mt-1 text-xs font-medium text-emerald-700">✓ {m.bookedName}</p>}
                  {m.supplierType && !m.bookedName && quotes.some((q) => q.supplierType === m.supplierType) && (
                    <Link href="/compare" className="mt-1 inline-block text-xs font-medium text-rose-700 hover:underline">Compare {supplierLabel(m.supplierType).toLowerCase()} quotes →</Link>
                  )}
                </div>
              </li>
            );
          })}
          <li className="relative">
            <span className="absolute top-1 -left-[29px] h-4 w-4 rounded-full bg-rose-700 ring-4 ring-[#faf7f5]" />
            <p className="font-serif text-lg font-semibold text-rose-800">Wedding day — {formatDate(wedding, { day: "numeric", month: "long", year: "numeric" })}</p>
          </li>
        </ol>
      </section>
    </div>
  );
}
