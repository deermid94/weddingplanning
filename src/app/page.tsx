"use client";

import Link from "next/link";
import { Loading, MethodBadge, supplierLabel, VibeChips } from "@/components/ui";
import { computeTotal, eur } from "@/lib/calc";
import { bankHolidayWeekend, dayName, formatDate, monthsBetween, parseDate, today } from "@/lib/dates";
import { useStore } from "@/lib/store";

export default function Home() {
  const { quotes, settings, ready, chosen, plan } = useStore();
  if (!ready) return <Loading />;
  const d = parseDate(settings.date);
  const bh = bankHolidayWeekend(d);
  const months = Math.max(0, Math.floor(monthsBetween(today(), d)));
  const chosenIds = new Set(Object.values(chosen));

  return (
    <div className="space-y-5">
      <section className="card bg-gradient-to-br from-rose-50 to-white">
        <p className="text-xs font-medium tracking-wide text-rose-700 uppercase">Your wedding</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">
          {dayName(d)} {formatDate(d, { day: "numeric", month: "long", year: "numeric" })}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {settings.dayGuests} day guests · {settings.eveningGuests} in the evening · {settings.location} · {months} months to go
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {d.getUTCDay() === 6 && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900">Saturday — premiums likely</span>}
          {[5, 6, 7, 8, 9].includes(d.getUTCMonth() + 1) && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900">Peak season</span>}
          {bh && <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-900">{bh} weekend</span>}
          <Link href="/settings" className="rounded-full border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700">
            Edit details
          </Link>
        </div>
      </section>

      {!plan && (
        <Link href="/plan" className="card block border-rose-200 bg-white hover:border-rose-300">
          <p className="font-semibold">✨ Describe your dream wedding</p>
          <p className="text-sm text-stone-600">Get your vibe, a budget split, venues ranked by fit and a running budget check.</p>
        </Link>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold">Quotes ({quotes.length})</h2>
        <Link href="/add" className="btn-primary">
          + Add quote
        </Link>
      </div>

      {quotes.length === 0 && (
        <div className="card text-center text-stone-500">
          No quotes yet. <Link href="/add" className="text-rose-700 underline">Paste a brochure</Link> to decode it.
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {quotes.map((q) => {
          const t = computeTotal(q, settings);
          const pct = t.advertised > 0 ? Math.round((t.hiddenAmount / t.advertised) * 100) : 0;
          return (
            <li key={q.id}>
              <Link href={`/quote/${q.id}`} className="card block transition hover:border-rose-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{q.name}</p>
                    <p className="text-xs text-stone-500">
                      {supplierLabel(q.supplierType)}
                      {q.location ? ` · ${q.location}` : ""}
                    </p>
                    <div className="mt-1"><VibeChips vibes={q.vibes} highlight={plan?.vibes} /></div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <MethodBadge method={q.method} />
                    {chosenIds.has(q.id) && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">Chosen</span>}
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-stone-500">True total</p>
                    <p className="font-serif text-2xl font-semibold">{eur(t.total)}</p>
                    <p className="text-xs text-stone-500">{eur(t.perDayGuest)} per day guest</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-700">+{eur(t.hiddenAmount)} hidden</p>
                    <p className="text-xs text-stone-500">
                      {q.flags.length} flags · {pct}% over headline
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
