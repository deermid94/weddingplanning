"use client";

import Link from "next/link";
import { useState } from "react";
import { Loading, VibeChips } from "@/components/ui";
import { computeTotal, eur } from "@/lib/calc";
import { BUDGET_CATEGORIES, budgetLabel, DEFAULT_SPLIT } from "@/lib/planning";
import { generatePlan, guestCounts, useStore } from "@/lib/store";
import { buildMilestones } from "@/lib/timeline";
import { formatDate } from "@/lib/dates";
import type { Vibe } from "@/lib/types";

const EXAMPLES = [
  "Relaxed, natural wedding in the woods near Roundwood. Wildflowers, long tables, fairy lights, great food, a trad session then a band. Photos matter most. Don't want anything stuffy.",
  "Elegant, a bit bougie: country house hotel, champagne reception, black tie, string quartet for the ceremony, amazing dress. Want guests to stay on site.",
  "By the sea on the Wicklow coast, small-ish ceremony, seafood, boho styling, festival vibe in the evening with a food truck. Keep costs sensible.",
];

export default function Plan() {
  const { plan, setPlan, settings, setSettings, quotes, chosen, choose, shortlist, guests, llm, ready } = useStore();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!ready) return <Loading />;

  async function run() {
    const text = brief || plan?.brief || "";
    if (!text.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      const { plan: p, warning } = await generatePlan(text, settings, llm);
      setPlan(p);
      setBrief("");
      setMsg(warning ?? (p.method === "heuristic" ? "Planned with the built-in rules. Add an AI key in Settings for a more personal plan." : ""));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const split = plan?.budgetSplit ?? DEFAULT_SPLIT;
  const vibes: Vibe[] = plan?.vibes ?? [];
  const venueBudget = (settings.budget * (split.find((s) => s.key === "venue")?.percent ?? 50)) / 100;

  const venues = quotes
    .filter((q) => q.supplierType === "venue")
    .map((q) => {
      const t = computeTotal(q, settings);
      const overlap = vibes.filter((v) => q.vibes?.includes(v)).length;
      const vibeScore = vibes.length ? overlap / vibes.length : 0.5;
      const budgetScore = Math.max(0, Math.min(1, 1 - (t.total - venueBudget) / venueBudget));
      return { q, t, overlap, score: Math.round((vibeScore * 0.5 + budgetScore * 0.4 + Math.max(0, 1 - q.flags.length / 15) * 0.1) * 100) };
    })
    .sort((a, b) => b.score - a.score);

  const rows = BUDGET_CATEGORIES.map((c) => {
    const planned = (settings.budget * (split.find((s) => s.key === c.key)?.percent ?? 0)) / 100;
    const chosenQuotes = (c.supplierTypes ?? []).map((t) => quotes.find((q) => q.id === chosen[t as keyof typeof chosen])).filter(Boolean);
    const chosenTotal = chosenQuotes.reduce((a, q) => a + computeTotal(q!, settings).total, 0);
    const sl = shortlist.filter((s) => c.finder?.includes(s.category) && s.quotedPrice != null);
    const booked = sl.filter((s) => s.status === "booked").reduce((a, s) => a + (s.quotedPrice ?? 0), 0);
    const committed = chosenTotal + booked;
    const options = [...(c.supplierTypes ?? []).flatMap((t) => quotes.filter((q) => q.supplierType === t).map((q) => computeTotal(q, settings).total)), ...sl.filter((s) => s.status !== "booked").map((s) => s.quotedPrice!)];
    const cheapest = options.length ? Math.min(...options) : undefined;
    const forecast = committed > 0 ? committed : cheapest ?? planned;
    return { c, planned, committed, cheapest, forecast, source: committed > 0 ? "committed" : cheapest != null ? "cheapest quote" : "plan" };
  });
  const forecastTotal = rows.reduce((a, r) => a + r.forecast, 0);
  const committedTotal = rows.reduce((a, r) => a + r.committed, 0);
  const over = forecastTotal - settings.budget;
  const next = buildMilestones(settings, quotes, chosen).filter((m) => m.status === "overdue" || m.status === "now").slice(0, 4);
  const gc = guestCounts(guests);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Plan your dream wedding</h1>
        <p className="text-sm text-stone-600">Describe the wedding you want. You get your vibe, a budget split, venues ranked by fit, and a running budget check.</p>
      </div>

      <section className="card space-y-3">
        {plan && !brief ? (
          <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
            <p className="label">Your brief</p>
            <p className="italic">“{plan.brief}”</p>
            <button className="mt-2 text-sm font-medium text-rose-700" onClick={() => setBrief(plan.brief)}>Edit brief</button>
          </div>
        ) : (
          <>
            <label className="label" htmlFor="brief">Your ideal wedding</label>
            <textarea id="brief" className="input h-36" placeholder="e.g. Natural, in the woods, wildflowers, great food and a mad band. Photos matter most…" value={brief} onChange={(e) => setBrief(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((e, i) => (
                <button key={i} className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-600" onClick={() => setBrief(e)}>
                  {["🌲 Woodland & relaxed", "✨ Bougie country house", "🌊 Seaside boho"][i]}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="budget">Total budget (€)</label>
            <input id="budget" type="number" inputMode="numeric" className="input" value={settings.budget} onChange={(e) => setSettings({ budget: Math.max(0, +e.target.value || 0) })} />
          </div>
          <div>
            <label className="label" htmlFor="pday">Day guests</label>
            <input id="pday" type="number" inputMode="numeric" className="input" value={settings.dayGuests} onChange={(e) => setSettings({ dayGuests: Math.max(0, +e.target.value || 0) })} />
          </div>
        </div>
        {(brief || !plan) && (
          <button className="btn-primary w-full sm:w-auto" disabled={busy || !brief.trim()} onClick={run}>{busy ? "Planning…" : "Plan it"}</button>
        )}
        {msg && <p className="text-sm text-amber-800">{msg}</p>}
      </section>

      {plan && (
        <section className="card space-y-3 bg-gradient-to-br from-rose-50 to-white">
          <VibeChips vibes={plan.vibes} />
          <p className="font-serif text-lg">{plan.summary}</p>
          {plan.priorities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plan.priorities.map((p) => <span key={p} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-rose-900 ring-1 ring-rose-200">♥ {p}</span>)}
            </div>
          )}
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
            {plan.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-semibold">Budget watch</h2>
          <span className="text-xs text-stone-500">{eur(committedTotal)} committed</span>
        </div>
        <div className={`rounded-lg p-3 text-sm ${over > 0 ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>
          Forecast <strong>{eur(forecastTotal)}</strong> against your budget of {eur(settings.budget)}:{" "}
          {over > 0 ? <strong>{eur(over)} over</strong> : <strong>{eur(-over)} to spare</strong>}.
          <span className="block text-xs opacity-80">The forecast uses what you&apos;ve chosen or booked, otherwise your cheapest quote, otherwise the plan.</span>
        </div>
        <ul className="space-y-3">
          {rows.map((r) => {
            const pct = r.planned > 0 ? Math.min(150, (r.forecast / r.planned) * 100) : r.forecast > 0 ? 150 : 0;
            const bad = r.forecast > r.planned * 1.05;
            return (
              <li key={r.c.key}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium">{r.c.label}</span>
                  <span className="tabular-nums">
                    <span className={bad ? "font-semibold text-red-700" : ""}>{eur(r.forecast)}</span>
                    <span className="text-stone-400"> / {eur(r.planned)}</span>
                  </span>
                </div>
                <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className={`h-full ${bad ? "bg-red-500" : r.source === "committed" ? "bg-emerald-500" : r.source === "cheapest quote" ? "bg-amber-400" : "bg-stone-300"}`} style={{ width: `${(pct / 150) * 100}%` }} />
                  <div className="absolute inset-y-0 w-px bg-stone-500" style={{ left: `${(100 / 150) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  {r.source === "committed" ? "Chosen / booked" : r.source === "cheapest quote" ? "Cheapest quote so far" : "Planned allowance, nothing quoted yet"}
                  {split.find((s) => s.key === r.c.key)?.note && ` · ${split.find((s) => s.key === r.c.key)?.note}`}
                  {r.c.finder && r.source === "plan" && <> · <Link className="text-rose-700" href="/find">find suppliers</Link></>}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-semibold">Venues ranked for you</h2>
          <Link href="/add" className="text-sm font-medium text-rose-700">+ Add venue</Link>
        </div>
        <p className="text-xs text-stone-500">Scored on how well the vibe matches{vibes.length ? "" : " (describe your wedding above first)"}, the true total against your venue allowance of {eur(venueBudget)}, and the number of hidden costs.</p>
        <ul className="space-y-2">
          {venues.map(({ q, t, overlap, score }, i) => (
            <li key={q.id} className="rounded-lg border border-stone-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/quote/${q.id}`} className="font-semibold hover:underline">{i === 0 && "🏆 "}{q.name}</Link>
                  <div className="mt-1"><VibeChips vibes={q.vibes} highlight={vibes} /></div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold ${score >= 70 ? "bg-emerald-100 text-emerald-900" : score >= 45 ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-600"}`}>{score}% fit</span>
              </div>
              <p className="mt-2 text-sm text-stone-600">
                {eur(t.total)} true total ·{" "}
                <span className={t.total > venueBudget ? "text-red-700" : "text-emerald-700"}>{t.total > venueBudget ? `${eur(t.total - venueBudget)} over` : `${eur(venueBudget - t.total)} under`} allowance</span>
                {vibes.length > 0 && ` · ${overlap}/${vibes.length} vibes`} · {q.flags.length} hidden costs
              </p>
              <button className="mt-2 text-sm font-medium text-rose-700" onClick={() => choose("venue", chosen.venue === q.id ? undefined : q.id)}>
                {chosen.venue === q.id ? "✓ Chosen venue" : "Choose this venue"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-serif text-lg font-semibold">Do next</h2>
          {next.length === 0 ? <p className="text-sm text-stone-500">Nothing urgent. 🎉</p> : (
            <ul className="space-y-2 text-sm">
              {next.map((m) => (
                <li key={m.key} className="flex justify-between gap-2">
                  <span>{m.status === "overdue" ? "⚠️" : "•"} {m.title}</span>
                  <span className="text-stone-500">by {formatDate(m.dueOn, { month: "short", year: "numeric" })}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/timeline" className="mt-2 inline-block text-sm font-medium text-rose-700">Full timeline →</Link>
        </div>
        <div className="card">
          <h2 className="mb-2 font-serif text-lg font-semibold">Guests</h2>
          {guests.length ? (
            <p className="text-sm text-stone-600">{gc.invited} invited · {gc.confirmed} confirmed · {guests.filter((g) => g.role).length} in the wedding party</p>
          ) : (
            <p className="text-sm text-stone-500">No guest list yet.</p>
          )}
          <Link href="/guests" className="mt-2 inline-block text-sm font-medium text-rose-700">Guests & wedding party →</Link>
        </div>
      </section>
      <p className="text-center text-xs text-stone-400">{budgetLabel("contingency")}: hidden costs found so far across your quotes total {eur(quotes.reduce((a, q) => a + computeTotal(q, settings).hiddenAmount, 0))}.</p>
    </div>
  );
}
