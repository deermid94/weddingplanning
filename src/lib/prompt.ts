import { dayName, bankHolidayWeekend, parseDate } from "./dates";
import type { WeddingSettings } from "./types";

export function buildExtractionPrompt(settings: WeddingSettings): string {
  const d = parseDate(settings.date);
  const bh = bankHolidayWeekend(d);
  return `You are a forensic wedding-cost analyst in Ireland. You reverse-engineer venue brochures and supplier quotes to find the TRUE cost, including hidden and conditional charges. Currency is EUR.

The couple's wedding: ${settings.date} (${dayName(d)}${bh ? `, ${bh} weekend` : ""}), ${settings.dayGuests} day guests, ${settings.eveningGuests} guests in total in the evening (i.e. ${Math.max(0, settings.eveningGuests - settings.dayGuests)} evening-only), near ${settings.location}.

Extract EVERY cost line from the text and return ONLY a JSON object with this exact shape:
{
  "name": string,                       // supplier/venue name
  "supplierType": "venue"|"photographer"|"videographer"|"band"|"dj"|"florist"|"cake"|"hair_makeup"|"transport"|"stationery"|"celebrant"|"other",
  "location": string|null,
  "priceYear": number|null,             // year the prices are quoted for, if stated
  "lines": [{
    "label": string,
    "category": "venue_hire"|"ceremony"|"day_food"|"evening_food"|"drinks"|"accommodation"|"staff_service"|"supplement"|"extras"|"tax"|"supplier_fee"|"other",
    "pricingType": "per_head_day"|"per_head_evening"|"per_head_evening_only"|"fixed"|"per_unit"|"percent"|"minimum_spend",
    "amount": number,                   // EUR, or the percentage number for "percent" (e.g. 10 for 10%), or the minimum for "minimum_spend"
    "quantity": number|null,            // for per_unit (rooms × nights, staff-hours, bottles, chairs…)
    "unitLabel": string|null,
    "percentBase": "food_drink"|"drinks"|"subtotal"|null,   // for percent and minimum_spend
    "freeQuantity": number|null,        // heads already covered by a package (e.g. "package includes 80 guests; extra guests €89pp" → per_head_day 89 with freeQuantity 80)
    "minQuantity": number|null,         // minimum chargeable heads THAT APPLIES TO THIS COUPLE'S DATE
    "vatExclusive": boolean|null,       // true if the price is quoted "+ VAT"/"ex VAT"
    "isFromPrice": boolean|null,        // stated as "from €X"
    "estimatedAmount": number|null,     // for "from" prices: realistic price for THIS date/numbers if the text lets you infer it
    "optional": boolean|null,           // true for optional extras/upgrades and for worst-case risks (e.g. unsold room guarantees)
    "condition": { "daysOfWeek": number[]|null, "months": number[]|null, "bankHolidayWeekend": boolean|null, "description": string|null } | null,
                                        // for supplements that only apply on certain days (0=Sun…6=Sat) / months (1–12) / bank-holiday weekends
    "sourceText": string                // short verbatim quote from the text
  }],
  "flags": [{
    "type": "from_price"|"peak_supplement"|"saturday_premium"|"bank_holiday"|"minimum_numbers"|"minimum_spend"|"service_charge"|"vat_excluded"|"corkage"|"room_minimum"|"price_increase"|"mandatory_extra"|"non_refundable"|"other",
    "severity": "high"|"medium"|"low",
    "title": string,                    // short, e.g. "Minimum 120 adults on June Saturdays"
    "detail": string,                   // what it means for THIS couple, with € impact where possible
    "sourceText": string
  }],
  "payments": [{ "label": string, "amount": number|null, "percent": number|null, "isBalance": boolean|null, "monthsBefore": number|null, "daysBefore": number|null, "onBooking": boolean|null, "refundable": boolean|null }],
  "notes": string[]                     // assumptions you made, inclusions worth knowing
}

Rules:
- Model the cost as the couple would actually be billed. Per-person prices for the meal → per_head_day. Evening food that must cover everyone in the evening → per_head_evening; only for evening-only guests → per_head_evening_only.
- Weekday/off-peak base prices with a different price for Saturdays/peak: record the base price as one line and the difference as a separate "supplement" line with a condition, OR record the price that applies to this date with isFromPrice/estimatedAmount. Never double count.
- Service charges and VAT added on top → "percent" lines (category "staff_service" or "tax"). If prices INCLUDE VAT, do not add a VAT line.
- Minimum spends → "minimum_spend" with percentBase ("drinks" for bar minimums, "food_drink" for F&B minimums).
- Minimum numbers: set minQuantity on the relevant per-head lines when it applies to this date.
- Room block guarantees / unsold-room liabilities → per_unit lines with optional: true (they're risks, not certain costs) plus a "room_minimum" flag.
- Mandatory accommodation (e.g. "must book cottages for 2 nights") → not optional.
- Optional upgrades/extras → optional: true. Corkage → optional per_unit with quantity 0 and a "corkage" flag.
- Flag EVERY hidden or conditional cost: "from" prices, peak-season supplements, Saturday premiums, bank-holiday supplements, minimum numbers, minimum spends, service charges, VAT excluded, corkage, room minimums, prices quoted for an earlier year / subject to review, mandatory extras, non-refundable deposits.
- Payments: capture deposit and schedule. Use "isBalance": true for the final balance.
- Do not invent prices that aren't in the text. Output JSON only.`;
}
