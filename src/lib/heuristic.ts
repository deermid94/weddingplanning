import { detectVibes } from "./planning";
import { DEFAULT_SETTINGS, type Category, type CostLine, type Extraction, type HiddenCostFlag, type PaymentItem, type SupplierType, type WeddingSettings } from "./types";

/**
 * Rule-based fallback extractor used when no LLM key is configured.
 * Much less thorough than the LLM, but catches the common patterns.
 */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

function monthIndex(s: string) {
  return MONTHS.indexOf(s.slice(0, 3).toLowerCase()) + 1;
}

function parseMonths(text: string): number[] | undefined {
  const range = new RegExp(`${MONTH_RE}\\s*(?:to|–|-|—|until|through)\\s*${MONTH_RE}`, "i").exec(text);
  if (range) {
    const a = monthIndex(range[1]);
    const b = monthIndex(range[2]);
    const out: number[] = [];
    for (let m = a; ; m = (m % 12) + 1) {
      out.push(m);
      if (m === b || out.length > 12) break;
    }
    return out;
  }
  if (/peak season|high season|summer/i.test(text)) return [5, 6, 7, 8, 9];
  return undefined;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

const EURO_RE = /€\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(k)?/gi;

function guessSupplierType(text: string): SupplierType {
  const t = text.toLowerCase();
  if (/photograph/.test(t)) return "photographer";
  if (/videograph|film/.test(t)) return "videographer";
  if (/\bband\b|musicians/.test(t)) return "band";
  if (/\bdj\b/.test(t) && !/venue|hotel|barn/.test(t)) return "dj";
  if (/florist|bouquet/.test(t) && !/venue|hotel/.test(t)) return "florist";
  if (/\bcake\b/.test(t) && !/venue|hotel/.test(t)) return "cake";
  if (/make-?up|hair/.test(t) && !/venue|hotel/.test(t)) return "hair_makeup";
  return "venue";
}

function categoryFor(text: string): Category {
  const t = text.toLowerCase();
  if (/evening (food|buffet|snack|reception)|pizza|late night food/.test(t)) return "evening_food";
  if (/licen[cs]e|clean|exclusive use|venue hire/.test(t)) return "venue_hire";
  if (/supplement|premium|surcharge/.test(t)) return "supplement";
  if (/ceremony|orangery|chapel/.test(t)) return "ceremony";
  if (/wine|drink|bar|prosecco|champagne|corkage|beer/.test(t)) return "drinks";
  if (/room|accommodation|cottage|bedroom|b&b|night/.test(t)) return "accommodation";
  if (/menu|meal|dinner|banquet|package|catering|course|canap/.test(t)) return "day_food";
  if (/security|staff|service/.test(t)) return "staff_service";
  if (/hire|exclusive use|clean|licen[cs]e/.test(t)) return "venue_hire";
  return "extras";
}

function sentences(text: string): { text: string; section: string }[] {
  const out: { text: string; section: string }[] = [];
  let section = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^[\s•\-*·]+/, "").trim();
    if (!line) continue;
    if (line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line) && !/€/.test(line)) {
      section = line;
      continue;
    }
    for (const s of line.split(/(?<=[.!?])\s+(?=[A-Z(0-9€])/)) out.push({ text: s.trim(), section });
  }
  return out;
}

export function heuristicExtract(text: string, settings: WeddingSettings = DEFAULT_SETTINGS): Extraction {
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "Untitled supplier";
  const name = firstLine
    .replace(/[★*]+/g, "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 60);
  const lines: Omit<CostLine, "id">[] = [];
  const flags: Omit<HiddenCostFlag, "id">[] = [];
  const payments: PaymentItem[] = [];
  const notes: string[] = ["Extracted with the built-in rule-based parser (no AI key configured). Review every line."];
  const flagOnce = (f: Omit<HiddenCostFlag, "id">) => {
    if (!flags.some((x) => x.type === f.type && x.title === f.title)) flags.push(f);
  };

  const yearMatch = /(?:prices?(?: quoted)?(?: are| shown are)? for|(20\d\d)\s+(?:prices|price guide|collection|brochure|rates))\s*(20\d\d)?/i.exec(text);
  const priceYear = yearMatch ? parseInt(yearMatch[2] ?? yearMatch[1] ?? "", 10) || undefined : undefined;
  const vatExclusiveGlobal = /(exclusive of vat|ex\.? vat|\+ ?vat|plus vat)/i.test(text);
  const minNumbers: { n: number; text: string; saturday: boolean }[] = [];
  const pkgDay = /includes? (\d{2,3}) (?:day )?guests/i.exec(text);
  const pkgEvening = /(\d{2,3}) evening guests/i.exec(text);

  for (const { text: s, section } of sentences(text)) {
    const optionalSection = /extra|optional|upgrade/i.test(section);

    // Minimum numbers
    const mn = /minimum (?:of )?(\d{2,3}) (?:adults?|guests?|people|persons?)/i.exec(s);
    if (mn) {
      minNumbers.push({ n: parseInt(mn[1], 10), text: s, saturday: /saturday/i.test(s) });
      flagOnce({ type: "minimum_numbers", severity: "high", title: `Minimum ${mn[1]} guests`, detail: "If your numbers are lower you may pay for empty seats.", sourceText: s });
    }
    if (/subject to (annual )?review|prevailing rate|will be confirmed/i.test(s)) {
      flagOnce({ type: "price_increase", severity: "medium", title: "Prices may rise before your date", detail: "Quoted prices are not fixed for your wedding year.", sourceText: s });
    }
    if (/non-?refundable/i.test(s)) flagOnce({ type: "non_refundable", severity: "low", title: "Non-refundable payment", detail: "Lost if you cancel.", sourceText: s });
    if (/includ\w* vat/i.test(s)) notes.push("Prices stated to include VAT.");

    // Payments
    if (/refundable damage|security deposit|damage deposit/i.test(s) && !/non-?refundable/i.test(s)) {
      notes.push(s);
      continue;
    }
    if (/deposit|due|balance|payable/i.test(s) && /(booking|prior|before|secure)/i.test(s)) {
      const isDeposit = /deposit/i.test(s);
      const clauses = s.split(/,\s+|;\s*|\band\b(?=\s+(?:a further|the balance))/i).filter((c) => /\d|balance|booking/i.test(c));
      let found = false;
      for (const c of clauses) {
        const pct = /(\d{1,2})%/.exec(c);
        const amt = /€\s?([\d,]+)/.exec(c);
        const months = /(\d{1,2}) months? (?:prior|before)/i.exec(c);
        const weeks = /(\d{1,2}) weeks? (?:prior|before)/i.exec(c);
        const days = /(\d{1,3}) days? (?:prior|before)/i.exec(c);
        const timing = { monthsBefore: months ? +months[1] : undefined, daysBefore: weeks ? +weeks[1] * 7 : days ? +days[1] : undefined };
        const onBooking = /on booking|to secure|securing|booking deposit/i.test(c) || (isDeposit && !months && !weeks && !days);
        if (/balance/i.test(c) && !pct && !amt) {
          payments.push({ label: "Balance", isBalance: true, ...timing });
          found = true;
        } else if (pct || amt) {
          payments.push({
            label: isDeposit && onBooking ? "Booking deposit" : "Stage payment",
            percent: pct ? +pct[1] : undefined,
            amount: !pct && amt ? parseAmount(amt[1]) : undefined,
            onBooking: onBooking || undefined,
            ...(onBooking ? {} : timing),
            refundable: /non-?refundable/i.test(c) ? false : undefined,
          });
          found = true;
        }
      }
      if (found) continue;
    }

    // Percentages (service charge / VAT)
    const pctMatch = /(\d{1,2}(?:\.\d)?)\s?%/.exec(s);
    if (pctMatch && !/€/.test(s)) {
      const p = parseFloat(pctMatch[1]);
      if (/service|staff|gratuity/i.test(s)) {
        lines.push({ label: "Service charge", category: "staff_service", pricingType: "percent", amount: p, percentBase: /all|total|bill/i.test(s) && !/food|beverage|catering|drink/i.test(s) ? "subtotal" : "food_drink", sourceText: s });
        flagOnce({ type: "service_charge", severity: "medium", title: `${p}% service charge`, detail: "Added on top of quoted prices.", sourceText: s });
      } else if (/vat/i.test(s) && /exclusive|plus|\+|ex\b|excl/i.test(s)) {
        lines.push({ label: `VAT ${p}%`, category: "tax", pricingType: "percent", amount: p, percentBase: "food_drink", sourceText: s });
        flagOnce({ type: "vat_excluded", severity: "high", title: `Prices exclude ${p}% VAT`, detail: "VAT is added on top.", sourceText: s });
      }
      continue;
    }

    const amounts = [...s.matchAll(EURO_RE)].map((m) => parseAmount(m[1]) * (m[2] ? 1000 : 1));
    if (!amounts.length) continue;

    // Minimum spend
    if (/minimum (?:\w+ )?spend/i.test(s)) {
      lines.push({ label: /bar/i.test(s) ? "Minimum bar spend" : "Minimum spend", category: "drinks", pricingType: "minimum_spend", amount: amounts[0], percentBase: /bar|drink/i.test(s) ? "drinks" : "food_drink", sourceText: s });
      flagOnce({ type: "minimum_spend", severity: "medium", title: `Minimum spend ${"€" + amounts[0].toLocaleString("en-IE")}`, detail: "Any shortfall is charged to you.", sourceText: s });
      continue;
    }

    const label = (s.includes(":") ? s.split(":")[0] : s.split(/[—–]|\s-\s/)[0] || s).replace(/€.*$/, "").replace(/^\(/, "").trim().slice(0, 70) || "Cost";

    // Clarifications of an earlier "from" price, e.g. "(Silver from €89 applies to …) … all other dates: €99 per person."
    const fromLine = lines.find((l) => l.isFromPrice && amounts.includes(l.amount));
    if (fromLine) {
      const other = amounts.find((a) => a !== fromLine.amount);
      if (other) fromLine.estimatedAmount = other;
      continue;
    }
    if (/(all )?other dates|otherwise/i.test(s)) {
      const prev = [...lines].reverse().find((l) => l.isFromPrice);
      if (prev) {
        prev.estimatedAmount = amounts[0];
        continue;
      }
    }
    const isFrom = /\bfrom €/i.test(s);
    const addOn = /\badd €\s?(\d+(?:\.\d+)?)/i.exec(s);
    const perHead = /per (person|head|guest|adult)|\bpp\b|\bp\.p\.|per evening guest/i.test(s);
    const perUnit = /per (room|bottle|chair|hour|night|table|item)/i.exec(s);
    const months = parseMonths(s);
    const saturday = /saturday/i.test(s);
    const bh = /bank holiday/i.test(s);
    const isSupplement = /supplement|premium|surcharge/i.test(s);
    const condition = isSupplement && (saturday || months || bh) ? { daysOfWeek: saturday ? [6] : undefined, months, bankHolidayWeekend: bh && !saturday ? true : undefined, description: s.slice(0, 80) } : undefined;
    const category = categoryFor(label + " " + s);
    const vatExclusive = /\+ ?vat|plus vat|ex\.? vat/i.test(s) || undefined;
    const optional = optionalSection || /optional|upgrade/i.test(s) || /corkage/i.test(s) || undefined;

    if (/corkage/i.test(s)) flagOnce({ type: "corkage", severity: "low", title: "Corkage charged", detail: "Bringing your own drinks costs extra per bottle.", sourceText: s });
    if (isFrom) flagOnce({ type: "from_price", severity: "medium", title: `"From" price: ${label}`, detail: "The headline price is the cheapest option — your date/numbers may cost more.", sourceText: s });
    if (condition) {
      flagOnce({
        type: bh ? "bank_holiday" : saturday ? "saturday_premium" : "peak_supplement",
        severity: "high",
        title: label,
        detail: "Conditional supplement — check whether it applies to your date.",
        sourceText: s,
      });
    }

    if (perUnit) {
      const qtyMatch = /(\d{1,3}) staff-hours/i.exec(s) ?? /(\d{1,3}) (?:bed)?(rooms|bedrooms|hours|staff)/i.exec(s);
      const nights = /(\d) nights/i.exec(s);
      const isRoom = /room/i.test(perUnit[1]);
      const guarantee = /guarantee|charged to|must/i.test(s);
      let quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 0;
      if (isRoom && nights) quantity *= parseInt(nights[1], 10);
      if (/chair/i.test(perUnit[1])) quantity = settings.dayGuests;
      if (isRoom && guarantee) flagOnce({ type: "room_minimum", severity: "high", title: "Room block guarantee", detail: `Unsold rooms may be charged to you — up to €${(quantity * amounts[0]).toLocaleString("en-IE")}.`, sourceText: s });
      lines.push({ label: isRoom && guarantee ? "Unsold room guarantee (worst case)" : label, category, pricingType: "per_unit", amount: amounts[0], quantity, unitLabel: isRoom && nights ? "room-nights" : perUnit[1] + "s", optional: optional || (isRoom && guarantee) || undefined, vatExclusive, sourceText: s });
      continue;
    }

    if (perHead) {
      const evening = /evening/i.test(s);
      const additional = /additional|extra/i.test(s);
      const freeQuantity = additional ? (evening ? (pkgEvening ? +pkgEvening[1] : undefined) : pkgDay ? +pkgDay[1] : undefined) : undefined;
      if (additional && !freeQuantity) notes.push(`"${label}" is charged for guests above the package number — check the line.`);
      lines.push({
        label,
        category: evening ? "evening_food" : category === "extras" ? "day_food" : category,
        pricingType: evening ? "per_head_evening" : "per_head_day",
        amount: amounts[0],
        freeQuantity,
        isFromPrice: isFrom || undefined,
        estimatedAmount: isFrom && addOn ? amounts[0] + parseFloat(addOn[1]) : isFrom && amounts.length > 1 ? Math.max(...amounts) : undefined,
        condition,
        optional,
        vatExclusive: vatExclusive ?? (vatExclusiveGlobal && ["day_food", "evening_food", "drinks"].includes(category) ? true : undefined),
        sourceText: s,
      });
      continue;
    }

    // Two prices in one sentence ("Fri/Sun €8,500; Saturday €11,000") → base + Saturday difference
    lines.push({ label, category, pricingType: "fixed", amount: amounts[0], isFromPrice: isFrom || undefined, condition, optional, sourceText: s });
  }

  // Saturday price stated separately from base (e.g. "Venue hire (Saturday): €11,000") → convert to supplement
  const satIdx = lines.findIndex((l) => l.pricingType === "fixed" && /saturday/i.test(l.sourceText ?? "") && !l.condition);
  if (satIdx >= 0) {
    const sat = lines[satIdx];
    const base = lines.find((l, i) => i !== satIdx && l.pricingType === "fixed" && l.category === sat.category && !/saturday/i.test(l.sourceText ?? ""));
    if (base && sat.amount > base.amount) {
      lines[satIdx] = { ...sat, label: `${sat.label} — Saturday premium`, category: "supplement", amount: sat.amount - base.amount, condition: { daysOfWeek: [6], months: parseMonths(sat.sourceText ?? ""), description: "Saturdays" } };
      flagOnce({ type: "saturday_premium", severity: "high", title: "Higher Saturday price", detail: `Saturday costs ${"€" + (sat.amount - base.amount).toLocaleString("en-IE")} more than the headline price.`, sourceText: sat.sourceText });
    }
  }

  // Several alternative per-head packages → keep the first, others become optional alternatives
  const packages = lines.filter((l) => l.pricingType === "per_head_day" && l.category === "day_food" && !l.optional && !l.freeQuantity && /package|menu/i.test(l.label));
  for (const alt of packages.slice(1)) {
    alt.optional = true;
    alt.label = `${alt.label} (alternative)`;
  }

  // Apply minimum numbers to per-head day lines (prefer the Saturday minimum if there is one — most conservative)
  if (minNumbers.length) {
    const sat = minNumbers.find((m) => m.saturday);
    const min = sat ? sat.n : Math.min(...minNumbers.map((m) => m.n));
    for (const l of lines) if (l.pricingType === "per_head_day" && !l.optional && !l.freeQuantity) l.minQuantity = min;
    if (sat) notes.push(`Applied the Saturday minimum of ${sat.n} — check it applies to your date.`);
  }

  if (vatExclusiveGlobal && !lines.some((l) => l.category === "tax")) {
    const rate = /(\d{1,2}(?:\.\d)?)\s?%\s*vat|vat (?:at )?(\d{1,2}(?:\.\d)?)\s?%/i.exec(text);
    const p = rate ? parseFloat(rate[1] ?? rate[2]) : 13.5;
    lines.push({ label: `VAT ${p}%`, category: "tax", pricingType: "percent", amount: p, percentBase: "food_drink", sourceText: "Prices exclusive of VAT" });
    flagOnce({ type: "vat_excluded", severity: "high", title: `Prices exclude VAT`, detail: `Assumed ${p}% on food & drink.` });
  }
  if (priceYear) notes.push(`Prices appear to be for ${priceYear}.`);

  return { name, supplierType: guessSupplierType(text), priceYear, vibes: detectVibes(text), lines, flags, payments, notes: [...new Set(notes)] };
}
