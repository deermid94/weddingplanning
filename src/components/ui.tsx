"use client";

import type { HiddenCostFlag } from "@/lib/types";
import { SUPPLIER_TYPES, type SupplierType } from "@/lib/types";

export const supplierLabel = (t: SupplierType) => SUPPLIER_TYPES.find((s) => s.value === t)?.label ?? t;

const SEV: Record<HiddenCostFlag["severity"], string> = {
  high: "bg-red-50 text-red-800 border-red-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-stone-50 text-stone-700 border-stone-200",
};

export function SeverityBadge({ severity }: { severity: HiddenCostFlag["severity"] }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${SEV[severity]}`}>{severity}</span>;
}

export function FlagCard({ flag }: { flag: HiddenCostFlag }) {
  return (
    <li className={`rounded-xl border p-3 ${SEV[flag.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{flag.title}</p>
        <SeverityBadge severity={flag.severity} />
      </div>
      {flag.detail && <p className="mt-1 text-sm">{flag.detail}</p>}
      {flag.sourceText && <p className="mt-2 border-l-2 border-current/30 pl-2 text-xs italic opacity-80">&ldquo;{flag.sourceText}&rdquo;</p>}
    </li>
  );
}

export function Stat({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "rose" | "red" }) {
  const color = tone === "rose" ? "text-rose-800" : tone === "red" ? "text-red-700" : "text-stone-900";
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</p>
      <p className={`font-serif text-2xl font-semibold sm:text-3xl ${color}`}>{value}</p>
      {sub && <p className="text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

export function MethodBadge({ method }: { method: "llm" | "heuristic" | "seed" }) {
  const map = { llm: ["AI extracted", "bg-violet-50 text-violet-800"], heuristic: ["Rule-based", "bg-sky-50 text-sky-800"], seed: ["Demo", "bg-stone-100 text-stone-700"] } as const;
  const [label, cls] = map[method];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
}

export function Loading() {
  return <div className="py-20 text-center text-stone-400">Loading…</div>;
}
