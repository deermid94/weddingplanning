export type SupplierType =
  | "venue"
  | "photographer"
  | "videographer"
  | "band"
  | "dj"
  | "florist"
  | "cake"
  | "hair_makeup"
  | "transport"
  | "stationery"
  | "celebrant"
  | "other";

export const SUPPLIER_TYPES: { value: SupplierType; label: string }[] = [
  { value: "venue", label: "Venue" },
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "band", label: "Band" },
  { value: "dj", label: "DJ" },
  { value: "florist", label: "Florist" },
  { value: "cake", label: "Cake" },
  { value: "hair_makeup", label: "Hair & make-up" },
  { value: "transport", label: "Transport" },
  { value: "stationery", label: "Stationery" },
  { value: "celebrant", label: "Celebrant / ceremony" },
  { value: "other", label: "Other" },
];

export type Category =
  | "venue_hire"
  | "ceremony"
  | "day_food"
  | "evening_food"
  | "drinks"
  | "accommodation"
  | "staff_service"
  | "supplement"
  | "extras"
  | "tax"
  | "supplier_fee"
  | "other";

export type PricingType =
  /** price × day guests */
  | "per_head_day"
  /** price × all evening guests (day + evening-only) */
  | "per_head_evening"
  /** price × evening-only guests */
  | "per_head_evening_only"
  /** flat fee */
  | "fixed"
  /** price × quantity (e.g. rooms × nights, bottles, hours) */
  | "per_unit"
  /** amount is a percentage of a base */
  | "percent"
  /** minimum spend: any shortfall vs the base is charged */
  | "minimum_spend";

export type PercentBase = "food_drink" | "drinks" | "subtotal";

export interface Condition {
  /** 0 = Sunday … 6 = Saturday */
  daysOfWeek?: number[];
  /** 1 = Jan … 12 = Dec */
  months?: number[];
  /** applies on Irish bank-holiday weekends */
  bankHolidayWeekend?: boolean;
  /** human-readable description */
  description?: string;
}

export interface CostLine {
  id: string;
  label: string;
  category: Category;
  pricingType: PricingType;
  /** EUR, or percentage for pricingType "percent" */
  amount: number;
  /** for per_unit */
  quantity?: number;
  unitLabel?: string;
  /** base for percent and minimum_spend lines */
  percentBase?: PercentBase;
  /** heads already covered by a package (only heads above this are charged) */
  freeQuantity?: number;
  /** minimum chargeable heads for per-head lines (e.g. "minimum 120 adults") */
  minQuantity?: number;
  /** true if the stated amount excludes VAT (VAT added via a separate percent line) */
  vatExclusive?: boolean;
  /** stated price is a "from" price */
  isFromPrice?: boolean;
  /** realistic estimate to use instead of a "from" price */
  estimatedAmount?: number;
  /** only applies when condition matches the wedding date */
  condition?: Condition;
  /** optional extra — not in the total unless the user includes it */
  optional?: boolean;
  /** user override: include/exclude regardless of optional flag */
  included?: boolean;
  sourceText?: string;
}

export type FlagType =
  | "from_price"
  | "peak_supplement"
  | "saturday_premium"
  | "bank_holiday"
  | "minimum_numbers"
  | "minimum_spend"
  | "service_charge"
  | "vat_excluded"
  | "corkage"
  | "room_minimum"
  | "price_increase"
  | "mandatory_extra"
  | "non_refundable"
  | "other";

export interface HiddenCostFlag {
  id: string;
  type: FlagType;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  sourceText?: string;
}

export interface PaymentItem {
  label: string;
  /** fixed amount in EUR */
  amount?: number;
  /** percentage of true total */
  percent?: number;
  /** "balance" item takes whatever remains */
  isBalance?: boolean;
  /** months before the wedding the payment is due (0 = on the day / after) */
  monthsBefore?: number;
  /** days before the wedding (used if monthsBefore absent) */
  daysBefore?: number;
  /** due on booking */
  onBooking?: boolean;
  refundable?: boolean;
}

export interface Quote {
  id: string;
  name: string;
  supplierType: SupplierType;
  location?: string;
  rawText: string;
  createdAt: string;
  method: "llm" | "heuristic" | "seed";
  /** year the prices are quoted for (used for inflation to wedding year) */
  priceYear?: number;
  lines: CostLine[];
  flags: HiddenCostFlag[];
  payments: PaymentItem[];
  notes: string[];
  vibes?: Vibe[];
}

export type Vibe = "luxury" | "woodland" | "coastal" | "rustic" | "castle" | "lakeside" | "country_house" | "boho" | "city" | "intimate";

export const VIBES: { value: Vibe; label: string; emoji: string }[] = [
  { value: "luxury", label: "Bougie / luxury", emoji: "✨" },
  { value: "woodland", label: "Woodland / natural", emoji: "🌲" },
  { value: "coastal", label: "By the sea", emoji: "🌊" },
  { value: "rustic", label: "Rustic barn", emoji: "🌾" },
  { value: "castle", label: "Castle / historic", emoji: "🏰" },
  { value: "lakeside", label: "Lakeside", emoji: "🛶" },
  { value: "country_house", label: "Country house", emoji: "🏡" },
  { value: "boho", label: "Boho / festival", emoji: "🌼" },
  { value: "city", label: "City / modern", emoji: "🏙️" },
  { value: "intimate", label: "Small & intimate", emoji: "🕯️" },
];

export type PartyRole =
  | "best_man"
  | "maid_of_honour"
  | "bridesmaid"
  | "groomsman"
  | "usher"
  | "flower_girl"
  | "page_boy"
  | "reader"
  | "mc"
  | "witness"
  | "singer"
  | "helper";

export interface Guest {
  id: string;
  name: string;
  side: "ours" | "partner_a" | "partner_b";
  group: string;
  invite: "day" | "evening";
  rsvp: "pending" | "yes" | "no";
  plusOne: boolean;
  child?: boolean;
  dietary?: string;
  needsRoom?: boolean;
  role?: PartyRole;
  jobs?: string[];
  notes?: string;
}

export interface ShortlistItem {
  id: string;
  name: string;
  category: string;
  lat?: number;
  lon?: number;
  distanceKm?: number;
  address?: string;
  website?: string;
  phone?: string;
  instagram?: string;
  osmUrl?: string;
  quotedPrice?: number;
  notes?: string;
  status: "idea" | "contacted" | "quoted" | "booked";
  /** mobile supplier (MUA, hair) who travels to you */
  travels?: boolean;
  calloutFee?: number;
}

export interface BudgetSplitItem {
  key: string;
  percent: number;
  note?: string;
}

export interface WeddingPlan {
  brief: string;
  vibes: Vibe[];
  summary: string;
  priorities: string[];
  budgetSplit: BudgetSplitItem[];
  tips: string[];
  method: "llm" | "heuristic";
  createdAt: string;
}

export interface WeddingSettings {
  date: string; // YYYY-MM-DD
  dayGuests: number;
  eveningGuests: number; // total in the evening, incl. day guests
  budget: number;
  savedSoFar: number;
  inflationPct: number; // annual price increase assumption
  location: string;
}

export const DEFAULT_SETTINGS: WeddingSettings = {
  date: "2028-06-03",
  dayGuests: 100,
  eveningGuests: 130,
  budget: 40000,
  savedSoFar: 8000,
  inflationPct: 4,
  location: "Roundwood, Co. Wicklow",
};

/** Shape the extractor (LLM or heuristic) returns, before ids are assigned */
export interface Extraction {
  name: string;
  supplierType: SupplierType;
  location?: string;
  priceYear?: number;
  lines: Omit<CostLine, "id">[];
  flags: Omit<HiddenCostFlag, "id">[];
  payments: PaymentItem[];
  notes: string[];
  vibes?: Vibe[];
}
