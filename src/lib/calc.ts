import { bankHolidayWeekend, parseDate } from "./dates";
import type { Category, CostLine, Quote, WeddingSettings } from "./types";

export interface BreakdownRow {
  key: string;
  lineId?: string;
  label: string;
  category: Category | "inflation";
  formula: string;
  amount: number;
  status: "included" | "optional" | "excluded" | "not_applicable";
  /** portion of this row that is a hidden/conditional cost */
  hiddenAmount: number;
  hiddenReason?: string;
  sourceText?: string;
}

export interface QuoteTotal {
  rows: BreakdownRow[];
  total: number;
  advertised: number;
  hiddenAmount: number;
  perDayGuest: number;
  perGuest: number;
  foodDrink: number;
}

const FOOD_DRINK: Category[] = ["day_food", "evening_food", "drinks"];

export const eur = (n: number, dp = 0) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: dp, minimumFractionDigits: dp }).format(n);

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function describeCondition(line: CostLine): string {
  const c = line.condition;
  if (!c) return "";
  if (c.description) return c.description;
  const parts: string[] = [];
  if (c.daysOfWeek?.length) parts.push(c.daysOfWeek.map((d) => DAY_SHORT[d]).join("/"));
  if (c.months?.length) parts.push(c.months.map((m) => MONTH_SHORT[m - 1]).join(", "));
  if (c.bankHolidayWeekend) parts.push("bank holiday weekends");
  return parts.join(" in ");
}

export function conditionApplies(line: CostLine, settings: WeddingSettings): boolean {
  const c = line.condition;
  if (!c) return true;
  const d = parseDate(settings.date);
  if (c.bankHolidayWeekend && !bankHolidayWeekend(d)) return false;
  if (c.daysOfWeek?.length && !c.daysOfWeek.includes(d.getUTCDay())) return false;
  if (c.months?.length && !c.months.includes(d.getUTCMonth() + 1)) return false;
  return true;
}

function isIncluded(line: CostLine): boolean {
  return line.included ?? !line.optional;
}

function hasCondition(line: CostLine) {
  const c = line.condition;
  return !!c && (!!c.daysOfWeek?.length || !!c.months?.length || !!c.bankHolidayWeekend);
}

export function computeTotal(quote: Quote, settings: WeddingSettings): QuoteTotal {
  const day = settings.dayGuests;
  const evening = Math.max(settings.eveningGuests, day);
  const eveningOnly = evening - day;
  const rows: BreakdownRow[] = [];

  const pushRow = (line: CostLine, amount: number, formula: string, hiddenAmount = 0, hiddenReason?: string) => {
    const applies = conditionApplies(line, settings);
    const included = isIncluded(line);
    const status: BreakdownRow["status"] = !applies ? "not_applicable" : included ? "included" : line.optional && line.included === undefined ? "optional" : "excluded";
    const conditional = applies && hasCondition(line);
    rows.push({
      key: line.id,
      lineId: line.id,
      label: line.label,
      category: line.category,
      formula,
      amount,
      status,
      hiddenAmount: status === "included" ? (conditional ? amount : hiddenAmount) : 0,
      hiddenReason: conditional ? `Applies to your date: ${describeCondition(line)}` : hiddenReason,
      sourceText: line.sourceText,
    });
  };

  // 1. Direct cost lines
  for (const line of quote.lines) {
    if (line.pricingType === "percent" || line.pricingType === "minimum_spend") continue;
    const price = line.isFromPrice && line.estimatedAmount ? line.estimatedAmount : line.amount;
    const fromUplift = line.isFromPrice && line.estimatedAmount ? line.estimatedAmount - line.amount : 0;
    let heads = 1;
    let actualHeads = 1;
    let unit = "";
    switch (line.pricingType) {
      case "per_head_day":
        actualHeads = day;
        unit = "day guests";
        break;
      case "per_head_evening":
        actualHeads = evening;
        unit = "evening guests";
        break;
      case "per_head_evening_only":
        actualHeads = eveningOnly;
        unit = "evening-only guests";
        break;
      case "per_unit":
        actualHeads = line.quantity ?? 1;
        unit = line.unitLabel ?? "units";
        break;
      case "fixed":
        actualHeads = 1;
        break;
    }
    if (line.freeQuantity) {
      actualHeads = Math.max(0, actualHeads - line.freeQuantity);
      unit = `extra ${unit} (above ${line.freeQuantity} in package)`;
    }
    heads = Math.max(actualHeads, line.minQuantity ?? 0);
    const amount = price * heads;
    let formula = line.pricingType === "fixed" ? `${eur(price, 2)} flat` : `${heads} ${unit} × ${eur(price, 2)}`;
    let hidden = 0;
    const reasons: string[] = [];
    if (heads > actualHeads) {
      hidden += (heads - actualHeads) * price;
      formula += ` (minimum ${heads}; you have ${actualHeads})`;
      reasons.push(`Minimum ${heads} charged — ${heads - actualHeads} empty seats`);
    }
    if (fromUplift > 0) {
      hidden += fromUplift * actualHeads;
      formula += ` (brochure says "from ${eur(line.amount, 2)}")`;
      reasons.push(`"From" price — realistic estimate used`);
    }
    if (line.vatExclusive) formula += " + VAT";
    pushRow(line, amount, formula, hidden, reasons.join("; ") || undefined);
  }

  const sumWhere = (pred: (r: BreakdownRow) => boolean) => rows.filter((r) => r.status === "included" && pred(r)).reduce((s, r) => s + r.amount, 0);
  const isFoodDrinkRow = (r: BreakdownRow) => {
    if (FOOD_DRINK.includes(r.category as Category)) return true;
    const l = quote.lines.find((x) => x.id === r.lineId);
    return r.category === "supplement" && !!l && l.pricingType.startsWith("per_head");
  };
  const baseFor = (b: string | undefined) =>
    b === "drinks" ? sumWhere((r) => r.category === "drinks") : b === "subtotal" ? sumWhere(() => true) : sumWhere(isFoodDrinkRow);
  const baseLabel = (b: string | undefined) => (b === "drinks" ? "bar spend" : b === "subtotal" ? "subtotal" : "food & drink");

  // 2. Minimum spends (shortfall charged)
  for (const line of quote.lines.filter((l) => l.pricingType === "minimum_spend")) {
    const base = baseFor(line.percentBase);
    const shortfall = Math.max(0, line.amount - base);
    pushRow(
      line,
      shortfall,
      shortfall > 0 ? `Minimum ${eur(line.amount)} vs your ${baseLabel(line.percentBase)} ${eur(base)} → shortfall` : `Minimum ${eur(line.amount)} met (${baseLabel(line.percentBase)} ${eur(base)})`,
      shortfall,
      shortfall > 0 ? "Minimum spend shortfall" : undefined,
    );
  }

  // 3. Percentages: non-tax first (service charges), then tax
  const percents = quote.lines.filter((l) => l.pricingType === "percent");
  const ordered = [...percents.filter((l) => l.category !== "tax"), ...percents.filter((l) => l.category === "tax")];
  for (const line of ordered) {
    const base = baseFor(line.percentBase);
    const amount = (base * line.amount) / 100;
    const reason = line.category === "tax" ? "VAT not included in quoted prices" : line.category === "staff_service" ? "Service charge on top of quoted prices" : undefined;
    pushRow(line, amount, `${line.amount}% of ${baseLabel(line.percentBase)} ${eur(base)}`, reason ? amount : 0, reason);
  }

  // 4. Inflation to the wedding year
  const weddingYear = parseDate(settings.date).getUTCFullYear();
  if (quote.priceYear && quote.priceYear < weddingYear && settings.inflationPct > 0) {
    const years = weddingYear - quote.priceYear;
    const base = sumWhere(() => true);
    const factor = Math.pow(1 + settings.inflationPct / 100, years) - 1;
    const amount = base * factor;
    rows.push({
      key: "inflation",
      label: `Estimated price increase ${quote.priceYear} → ${weddingYear}`,
      category: "inflation",
      formula: `${settings.inflationPct}%/yr × ${years} yr on ${eur(base)}`,
      amount,
      status: "included",
      hiddenAmount: amount,
      hiddenReason: `Prices quoted for ${quote.priceYear}, not ${weddingYear}`,
    });
  }

  const total = sumWhere(() => true);
  const hiddenAmount = rows.filter((r) => r.status === "included").reduce((s, r) => s + r.hiddenAmount, 0);
  return {
    rows,
    total,
    hiddenAmount,
    advertised: total - hiddenAmount,
    perDayGuest: day ? total / day : 0,
    perGuest: evening ? total / evening : 0,
    foodDrink: baseFor("food_drink"),
  };
}
