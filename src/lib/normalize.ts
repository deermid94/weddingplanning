import { z } from "zod";
import type { Extraction } from "./types";

const num = z.preprocess((v) => {
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[€,%\s]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return v === null ? undefined : v;
}, z.number().finite().optional());

const bool = z.preprocess((v) => (v === null ? undefined : v), z.boolean().optional());
const str = z.preprocess((v) => (v === null ? undefined : v), z.string().optional());

const enumOr = <T extends [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.preprocess((v) => (typeof v === "string" && (values as string[]).includes(v) ? v : fallback), z.enum(values));

const Line = z.object({
  label: z.string().default("Unnamed cost"),
  category: enumOr(["venue_hire", "ceremony", "day_food", "evening_food", "drinks", "accommodation", "staff_service", "supplement", "extras", "tax", "supplier_fee", "other"], "other"),
  pricingType: enumOr(["per_head_day", "per_head_evening", "per_head_evening_only", "fixed", "per_unit", "percent", "minimum_spend"], "fixed"),
  amount: num.transform((v) => v ?? 0),
  quantity: num,
  unitLabel: str,
  percentBase: z.preprocess((v) => (v === "food_drink" || v === "drinks" || v === "subtotal" ? v : undefined), z.enum(["food_drink", "drinks", "subtotal"]).optional()),
  freeQuantity: num,
  minQuantity: num,
  vatExclusive: bool,
  isFromPrice: bool,
  estimatedAmount: num,
  optional: bool,
  condition: z
    .preprocess(
      (v) => (v === null ? undefined : v),
      z
        .object({
          daysOfWeek: z.preprocess((v) => (v === null ? undefined : v), z.array(z.number().int().min(0).max(6)).optional()),
          months: z.preprocess((v) => (v === null ? undefined : v), z.array(z.number().int().min(1).max(12)).optional()),
          bankHolidayWeekend: bool,
          description: str,
        })
        .optional(),
    )
    .optional(),
  sourceText: str,
});

const Flag = z.object({
  type: enumOr(["from_price", "peak_supplement", "saturday_premium", "bank_holiday", "minimum_numbers", "minimum_spend", "service_charge", "vat_excluded", "corkage", "room_minimum", "price_increase", "mandatory_extra", "non_refundable", "other"], "other"),
  severity: enumOr(["high", "medium", "low"], "medium"),
  title: z.string().default("Possible hidden cost"),
  detail: z.string().default(""),
  sourceText: str,
});

const Payment = z.object({
  label: z.string().default("Payment"),
  amount: num,
  percent: num,
  isBalance: bool,
  monthsBefore: num,
  daysBefore: num,
  onBooking: bool,
  refundable: bool,
});

const ExtractionSchema = z.object({
  name: z.string().default("Untitled supplier"),
  supplierType: enumOr(["venue", "photographer", "videographer", "band", "dj", "florist", "cake", "hair_makeup", "transport", "stationery", "celebrant", "other"], "venue"),
  location: str,
  priceYear: num,
  lines: z.array(Line).default([]),
  flags: z.array(Flag).default([]),
  payments: z.array(Payment).default([]),
  notes: z.array(z.string()).default([]),
});

function stripUndefined<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export function normalizeExtraction(raw: unknown): Extraction {
  return stripUndefined(ExtractionSchema.parse(raw)) as Extraction;
}

/** Pull the first JSON object out of an LLM response. */
export function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object in model response");
  return JSON.parse(body.slice(start, end + 1));
}
