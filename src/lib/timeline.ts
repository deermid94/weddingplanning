import { computeTotal } from "./calc";
import { addDays, addMonths, monthsBetween, parseDate, today } from "./dates";
import type { PaymentItem, Quote, SupplierType, WeddingSettings } from "./types";

export interface Milestone {
  key: string;
  title: string;
  supplierType?: SupplierType;
  /** ideal window opens (months before) */
  fromMonths: number;
  /** book by (months before) */
  byMonths: number;
  tip: string;
}

/** Typical Irish booking lead times (months before the wedding). */
export const MILESTONES: Milestone[] = [
  { key: "venue", title: "Book venue", supplierType: "venue", fromMonths: 24, byMonths: 18, tip: "June Saturdays in Wicklow go 18–24 months out. Lock the date first — every other supplier depends on it." },
  { key: "celebrant", title: "Book church / solemniser", supplierType: "celebrant", fromMonths: 20, byMonths: 12, tip: "Civil, humanist and spiritual solemnisers book up for peak Saturdays." },
  { key: "photographer", title: "Book photographer", supplierType: "photographer", fromMonths: 18, byMonths: 12, tip: "Top photographers take one wedding per day — book as soon as the venue is confirmed." },
  { key: "band", title: "Book band", supplierType: "band", fromMonths: 18, byMonths: 12, tip: "Check whether the price includes a DJ set, travel to Wicklow and a late-night slot." },
  { key: "videographer", title: "Book videographer", supplierType: "videographer", fromMonths: 15, byMonths: 10, tip: "Often bundled with photographers for a discount." },
  { key: "save_the_date", title: "Send save-the-dates", fromMonths: 12, byMonths: 9, tip: "Important with a bank-holiday weekend date — guests book holidays early." },
  { key: "dress", title: "Order dress", fromMonths: 12, byMonths: 9, tip: "Made-to-order dresses typically take 6–9 months plus alterations." },
  { key: "hair_makeup", title: "Book hair & make-up", supplierType: "hair_makeup", fromMonths: 12, byMonths: 9, tip: "Ask about travel/call-out fees to Roundwood and early-start surcharges." },
  { key: "florist", title: "Book florist", supplierType: "florist", fromMonths: 12, byMonths: 8, tip: "June is peony season — popular, but prices can be higher." },
  { key: "dj", title: "Book DJ", supplierType: "dj", fromMonths: 12, byMonths: 8, tip: "Confirm venue power, sound limiters and finish time." },
  { key: "transport", title: "Book transport", supplierType: "transport", fromMonths: 9, byMonths: 6, tip: "Coach for guests from Dublin/Bray is worth pricing — rural Wicklow taxis are scarce late at night." },
  { key: "cake", title: "Book cake", supplierType: "cake", fromMonths: 9, byMonths: 6, tip: "Ask the venue about cake-cutting fees." },
  { key: "stationery", title: "Order invitations", supplierType: "stationery", fromMonths: 7, byMonths: 5, tip: "Invitations go out ~3 months before; order 2 months before that." },
  { key: "marriage_notification", title: "HSE marriage notification", fromMonths: 6, byMonths: 3, tip: "Legal requirement in Ireland: in-person notification to a registrar at least 3 months before. Appointments book up — schedule it 6 months out." },
  { key: "rings", title: "Buy rings", fromMonths: 6, byMonths: 3, tip: "Allow time for sizing and engraving." },
  { key: "invites_out", title: "Send invitations", fromMonths: 4, byMonths: 3, tip: "RSVP deadline ~6 weeks before, to give the venue final numbers." },
  { key: "suits", title: "Book suits", fromMonths: 4, byMonths: 2, tip: "Hire suits need fittings around 4–6 weeks before." },
  { key: "final_numbers", title: "Final numbers to venue", fromMonths: 1, byMonths: 0.5, tip: "Usually 14–21 days before. After this you pay for the numbers you gave." },
];

export type MilestoneStatus = "done" | "overdue" | "now" | "upcoming";

export interface MilestoneView extends Milestone {
  opensOn: Date;
  dueOn: Date;
  status: MilestoneStatus;
  bookedName?: string;
}

function monthsBefore(wedding: Date, months: number): Date {
  const whole = Math.floor(months);
  const days = Math.round((months - whole) * 30);
  return addDays(addMonths(wedding, -whole), -days);
}

export function buildMilestones(settings: WeddingSettings, quotes: Quote[], chosen: Partial<Record<SupplierType, string>>): MilestoneView[] {
  const wedding = parseDate(settings.date);
  const now = today();
  return MILESTONES.map((m) => {
    const opensOn = monthsBefore(wedding, m.fromMonths);
    const dueOn = monthsBefore(wedding, m.byMonths);
    const chosenId = m.supplierType ? chosen[m.supplierType] : undefined;
    const booked = chosenId ? quotes.find((q) => q.id === chosenId) : undefined;
    const status: MilestoneStatus = booked ? "done" : now > dueOn ? "overdue" : now >= opensOn ? "now" : "upcoming";
    return { ...m, opensOn, dueOn, status, bookedName: booked?.name };
  }).sort((a, b) => a.dueOn.getTime() - b.dueOn.getTime());
}

export interface PaymentDue {
  quoteId?: string;
  supplier: string;
  label: string;
  due: Date;
  amount: number;
  assumed?: boolean;
}

const DEFAULT_PAYMENTS: PaymentItem[] = [
  { label: "Booking deposit (assumed 20%)", percent: 20, onBooking: true },
  { label: "Balance (assumed)", isBalance: true, monthsBefore: 1 },
];

export function paymentSchedule(quote: Quote, settings: WeddingSettings): PaymentDue[] {
  const wedding = parseDate(settings.date);
  const now = today();
  const total = computeTotal(quote, settings).total;
  const assumed = quote.payments.length === 0;
  const items = assumed ? DEFAULT_PAYMENTS : quote.payments;
  const dueOf = (p: PaymentItem): Date => {
    let d: Date;
    if (p.onBooking) d = now;
    else if (p.monthsBefore !== undefined) d = monthsBefore(wedding, p.monthsBefore);
    else if (p.daysBefore !== undefined) d = addDays(wedding, -p.daysBefore);
    else d = monthsBefore(wedding, 1);
    return d < now ? now : d;
  };
  const out: PaymentDue[] = [];
  let paid = 0;
  for (const p of items.filter((i) => !i.isBalance)) {
    const amount = p.amount ?? ((p.percent ?? 0) / 100) * total;
    paid += amount;
    out.push({ quoteId: quote.id, supplier: quote.name, label: p.label, due: dueOf(p), amount, assumed });
  }
  const bal = items.find((i) => i.isBalance);
  const remaining = Math.max(0, total - paid);
  if (remaining > 0.5) {
    out.push({ quoteId: quote.id, supplier: quote.name, label: bal?.label ?? "Balance", due: dueOf(bal ?? { label: "", monthsBefore: 1 }), amount: remaining, assumed: assumed || !bal });
  }
  return out.sort((a, b) => a.due.getTime() - b.due.getTime());
}

/** Typical share of an Irish wedding budget by supplier type (rest = dress, rings, suits, stationery etc.). */
const TYPICAL_SHARE: Partial<Record<SupplierType, number>> = {
  venue: 0.5,
  photographer: 0.08,
  band: 0.07,
  videographer: 0.05,
  florist: 0.04,
  celebrant: 0.02,
  hair_makeup: 0.03,
  transport: 0.02,
  cake: 0.02,
  stationery: 0.02,
};

/** Spread the not-yet-allocated budget over suppliers not chosen yet: 25% deposit at the book-by date, balance a month before. */
function estimateUnchosen(settings: WeddingSettings, chosen: Partial<Record<SupplierType, string>>, unallocated: number): PaymentDue[] {
  const wedding = parseDate(settings.date);
  const now = today();
  const open = MILESTONES.filter((m) => m.supplierType && TYPICAL_SHARE[m.supplierType] && !chosen[m.supplierType]);
  const shares = open.map((m) => TYPICAL_SHARE[m.supplierType!]!);
  const otherShare = 1 - Object.values(TYPICAL_SHARE).reduce((a, b) => a + (b ?? 0), 0);
  const totalShare = shares.reduce((a, b) => a + b, 0) + otherShare;
  const out: PaymentDue[] = [];
  open.forEach((m, i) => {
    const amount = (unallocated * shares[i]) / totalShare;
    const bookBy = monthsBefore(wedding, m.byMonths);
    out.push({ supplier: `${m.title.replace(/^Book /, "")} (est.)`, label: "Deposit ~25% on booking", due: bookBy < now ? now : bookBy, amount: amount * 0.25, assumed: true });
    out.push({ supplier: `${m.title.replace(/^Book /, "")} (est.)`, label: "Balance", due: monthsBefore(wedding, 1), amount: amount * 0.75, assumed: true });
  });
  out.push({ supplier: "Dress, rings, suits & other (est.)", label: "Spread before the day", due: monthsBefore(wedding, 2), amount: (unallocated * otherShare) / totalShare, assumed: true });
  return out;
}

export interface SavingsPlan {
  monthsLeft: number;
  flatMonthly: number;
  cashflowMonthly: number;
  bindingPayment?: PaymentDue;
  payments: PaymentDue[];
  committed: number;
  unallocated: number;
  months: { month: Date; target: number; due: number; cumulativeDue: number; cumulativeSaved: number }[];
}

export function savingsPlan(settings: WeddingSettings, quotes: Quote[], chosen: Partial<Record<SupplierType, string>>): SavingsPlan {
  const wedding = parseDate(settings.date);
  const now = today();
  const monthsLeft = Math.max(1, Math.ceil(monthsBetween(now, wedding)));
  const chosenQuotes = Object.values(chosen)
    .map((id) => quotes.find((q) => q.id === id))
    .filter((q): q is Quote => !!q);
  const payments = chosenQuotes.flatMap((q) => paymentSchedule(q, settings));
  const committed = payments.reduce((s, p) => s + p.amount, 0);
  const unallocated = Math.max(0, settings.budget - committed);
  if (unallocated > 0) payments.push(...estimateUnchosen(settings, chosen, unallocated));
  payments.sort((a, b) => a.due.getTime() - b.due.getTime());

  const needed = Math.max(settings.budget, committed);
  const flatMonthly = Math.max(0, (needed - settings.savedSoFar) / monthsLeft);

  // Cash-flow aware: you must have saved enough by each payment date.
  let cum = 0;
  let cashflowMonthly = flatMonthly;
  let binding: PaymentDue | undefined;
  for (const p of payments) {
    cum += p.amount;
    const m = Math.max(1, monthsBetween(now, p.due));
    const required = (cum - settings.savedSoFar) / m;
    if (required > cashflowMonthly) {
      cashflowMonthly = required;
      binding = p;
    }
  }

  const months: SavingsPlan["months"] = [];
  let saved = settings.savedSoFar;
  let cumDue = 0;
  for (let i = 0; i <= monthsLeft; i++) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
    const due = payments.filter((p) => p.due >= month && p.due < next).reduce((s, p) => s + p.amount, 0);
    if (i > 0) saved += cashflowMonthly;
    cumDue += due;
    months.push({ month, target: i === 0 ? 0 : cashflowMonthly, due, cumulativeDue: cumDue, cumulativeSaved: saved });
  }
  return {
    monthsLeft,
    flatMonthly,
    cashflowMonthly,
    bindingPayment: binding,
    payments,
    committed,
    unallocated,
    months,
  };
}
