import type { Extraction } from "./types";

export interface SeedBrochure {
  id: string;
  rawText: string;
  extraction: Extraction;
}

const GLENMACNASS = `GLENMACNASS LODGE HOTEL ★★★★
Roundwood, Co. Wicklow — Weddings 2026 Collection

Nestled in the Wicklow Mountains, 5 minutes from Roundwood village. Exclusive ceremony room overlooking the Vartry Reservoir.

OUR PACKAGES (prices per person)
• Silver Package — from €89 per person
  Tea, coffee & homemade cookies on arrival; 5-course wedding banquet; half bottle of house wine per person; glass of prosecco for the toast.
  (Silver from €89 applies to Sunday–Thursday weddings, November–March. Silver for all other dates: €99 per person.)
• Gold Package — €109 per person (includes Silver plus canapés and wine upgrade)
• Platinum Package — €129 per person

SUPPLEMENTS
Saturday & bank holiday weekend supplement: €15 per person for weddings May to September inclusive.

MINIMUM NUMBERS
A minimum of 120 adults applies to Saturdays from May to September. A minimum of 80 adults applies on all other dates. Where final numbers fall below the minimum, the minimum number will be charged.

EVENING RECEPTION
Evening food (cocktail sausages, cajun wedges, mini sandwiches): €12.50 per evening guest. Evening food must be catered for all guests present in the evening.

CEREMONY
On-site civil ceremony in the Lakeview Room: €950.

ACCOMMODATION
Complimentary bridal suite on the wedding night. The wedding party is required to guarantee 25 bedrooms on the night of the wedding at a preferential rate of €219 B&B per room. Rooms not taken by guests 60 days prior to the wedding will be charged to the wedding account.

EXTRAS
Chair covers & sashes: €3.95 per chair.
Late bar extension to 2am: €400.
Corkage: €15 per bottle of wine; €30 per bottle of champagne or spirits.

TERMS
A discretionary service charge of 10% will be applied to all food and beverage.
All prices include VAT at the prevailing rate. Prices quoted are for 2026; 2027 and 2028 prices are subject to annual review.
A non-refundable deposit of €2,500 is required to secure your date. 30% of the estimated total is due 12 months prior to the wedding, a further 50% 3 months prior, and the balance 14 days before the wedding based on final numbers.`;

const VARTRY = `VARTRY BARN ESTATE
Exclusive-use barn & garden wedding venue — near Roundwood, Co. Wicklow
2026 Price Guide

THE ESTATE IS YOURS
Exclusive use of the Hay Barn, walled garden and courtyard from 11am to 1am.
Venue hire (Friday or Sunday): €8,500
Venue hire (Saturday, April–October): €11,000

CATERING — by our in-house partner Harvest Table
Wedding Feast menu: from €72 per person + VAT (3 courses with choice of two mains: add €12 per person; most of our couples choose this option).
Drinks reception (prosecco, Wicklow craft beer, soft drinks, canapés): €14 per person + VAT.
Wine with dinner (half bottle per person): €19 per person + VAT.
Evening food — wood-fired pizza truck: €11 per person + VAT, minimum 120 evening guests.
A staffing & service charge of 12.5% applies to all catering and drinks.
All catering & drinks prices are exclusive of VAT at 13.5%.

BAR
Fully licensed bar run by the estate. A minimum bar spend of €4,000 applies for exclusive-use weddings; any shortfall is charged to the couple.

MANDATORY CHARGES
Security: two licensed security staff for 6 hours each at €45 per hour (12 staff-hours) — required by our licence.
Cleaning & waste removal: €650.
Late licence (bar until 12.30am): €350.

ON-SITE ACCOMMODATION
The Old Dairy cottages sleep 22 guests. For Saturday weddings the cottages must be booked for a minimum of two nights (Friday & Saturday): €3,200.

OPTIONAL EXTRAS
Shuttle bus to Roundwood/Ashford: €480.
Festoon lighting upgrade: €395.
Fire pits & blankets: €250.

BOOKING
25% of the estimated total is due on booking (non-refundable). A further 25% is due 9 months before your wedding. The balance is due 6 weeks before your wedding.
A refundable damage deposit of €1,000 is due 6 weeks before the wedding.
2026 prices. Weddings in 2027 and beyond will be charged at the prevailing rate (typically +5% per year).`;

const LOUGH_DAN = `LOUGH DAN HOUSE HOTEL
Laragh Road, near Roundwood, Co. Wicklow — Wedding Brochure 2027

ALL-INCLUSIVE WEDDING PACKAGE — FROM €8,950
Includes 80 day guests and 100 evening guests:
• Red carpet arrival, drinks reception with prosecco & canapés
• 5-course meal, half bottle of wine per person, prosecco toast
• Evening food for 100 guests
• Chair covers, centrepieces, cake stand & knife
• Complimentary bridal suite and anniversary dinner

Additional day guests: €89 per person.
Additional evening guests: €22 per person.

SUPPLEMENTS
Peak Saturday supplement (May–September): €2,000 added to the package price.
June & August bank holiday weekends: an additional supplement of €1,500 applies.

CEREMONY
On-site ceremony in the Orangery: €750.

UPGRADES & EXTRAS
Signature menu upgrade: +€12 per person.
Resident DJ: €650.
Cake cutting service (served as dessert): €2 per person.
Corkage: €12 per bottle.

ACCOMMODATION
For Saturday weddings the wedding party guarantees 20 bedrooms for 2 nights at €185 per room per night. Unsold rooms are charged to the wedding account 8 weeks before the wedding.

TERMS
Minimum 80 adult day guests. No service charge. All prices include VAT.
Prices shown are for 2027 weddings. 2028 dates will be confirmed in January 2027.
Non-refundable booking deposit €1,500. €3,000 due 6 months before the wedding. Balance due 7 days before the wedding.`;

export const SEED_BROCHURES: SeedBrochure[] = [
  {
    id: "seed-glenmacnass",
    rawText: GLENMACNASS,
    extraction: {
      name: "Glenmacnass Lodge Hotel",
      supplierType: "venue",
      vibes: ["luxury", "country_house", "woodland"],
      location: "Roundwood, Co. Wicklow",
      priceYear: 2026,
      lines: [
        { label: "Silver package (per person)", category: "day_food", pricingType: "per_head_day", amount: 89, isFromPrice: true, estimatedAmount: 99, minQuantity: 120, sourceText: "Silver Package — from €89 per person … Silver for all other dates: €99 per person." },
        { label: "Saturday & bank holiday supplement", category: "supplement", pricingType: "per_head_day", amount: 15, minQuantity: 120, condition: { daysOfWeek: [6], months: [5, 6, 7, 8, 9], description: "Saturdays & bank holiday weekends, May–Sept" }, sourceText: "Saturday & bank holiday weekend supplement: €15 per person for weddings May to September inclusive." },
        { label: "Evening food", category: "evening_food", pricingType: "per_head_evening", amount: 12.5, sourceText: "Evening food … €12.50 per evening guest. Evening food must be catered for all guests present in the evening." },
        { label: "Civil ceremony (Lakeview Room)", category: "ceremony", pricingType: "fixed", amount: 950, sourceText: "On-site civil ceremony in the Lakeview Room: €950." },
        { label: "Discretionary service charge", category: "staff_service", pricingType: "percent", amount: 10, percentBase: "food_drink", sourceText: "A discretionary service charge of 10% will be applied to all food and beverage." },
        { label: "Unsold room guarantee (worst case: 25 rooms)", category: "accommodation", pricingType: "per_unit", amount: 219, quantity: 25, unitLabel: "rooms", optional: true, sourceText: "required to guarantee 25 bedrooms … Rooms not taken by guests 60 days prior … charged to the wedding account." },
        { label: "Chair covers & sashes", category: "extras", pricingType: "per_unit", amount: 3.95, quantity: 100, unitLabel: "chairs", optional: true, sourceText: "Chair covers & sashes: €3.95 per chair." },
        { label: "Late bar extension to 2am", category: "extras", pricingType: "fixed", amount: 400, optional: true, sourceText: "Late bar extension to 2am: €400." },
        { label: "Corkage (wine, per bottle)", category: "drinks", pricingType: "per_unit", amount: 15, quantity: 0, unitLabel: "bottles", optional: true, sourceText: "Corkage: €15 per bottle of wine; €30 per bottle of champagne or spirits." },
      ],
      flags: [
        { type: "minimum_numbers", severity: "high", title: "Minimum 120 adults on June Saturdays", detail: "You have ~100 day guests, so you'd pay for 20 empty seats (package + supplement).", sourceText: "A minimum of 120 adults applies to Saturdays from May to September." },
        { type: "from_price", severity: "high", title: "\"From €89\" is the off-peak price", detail: "€89 only applies Sun–Thu, Nov–Mar. Your date is €99 per person.", sourceText: "Silver from €89 applies to Sunday–Thursday weddings, November–March." },
        { type: "saturday_premium", severity: "medium", title: "Saturday supplement €15pp", detail: "Applies to Saturdays May–September — 3 June 2028 is a Saturday (and a bank-holiday weekend).", sourceText: "Saturday & bank holiday weekend supplement: €15 per person" },
        { type: "service_charge", severity: "medium", title: "10% \"discretionary\" service charge", detail: "Added to all food and drink — not shown in the per-person prices.", sourceText: "A discretionary service charge of 10% will be applied to all food and beverage." },
        { type: "room_minimum", severity: "high", title: "25-room guarantee", detail: "Unsold rooms 60 days out are charged to you — up to €5,475 exposure.", sourceText: "required to guarantee 25 bedrooms on the night of the wedding at … €219 B&B per room" },
        { type: "price_increase", severity: "medium", title: "Prices are 2026 rates", detail: "2028 prices are \"subject to annual review\" — expect an increase.", sourceText: "Prices quoted are for 2026; 2027 and 2028 prices are subject to annual review." },
        { type: "corkage", severity: "low", title: "Corkage €15–€30 per bottle", detail: "Bringing your own wine or prosecco costs extra per bottle.", sourceText: "Corkage: €15 per bottle of wine; €30 per bottle of champagne or spirits." },
        { type: "non_refundable", severity: "low", title: "€2,500 non-refundable deposit", detail: "Lost if you cancel or change venue.", sourceText: "A non-refundable deposit of €2,500 is required to secure your date." },
      ],
      payments: [
        { label: "Booking deposit (non-refundable)", amount: 2500, onBooking: true, refundable: false },
        { label: "30% of estimated total", percent: 30, monthsBefore: 12 },
        { label: "50% of estimated total", percent: 50, monthsBefore: 3 },
        { label: "Balance on final numbers", isBalance: true, daysBefore: 14 },
      ],
      notes: ["VAT included in all prices.", "Evening food must cover all evening guests (day + evening)."],
    },
  },
  {
    id: "seed-vartry",
    rawText: VARTRY,
    extraction: {
      name: "Vartry Barn Estate",
      supplierType: "venue",
      vibes: ["rustic", "boho", "woodland"],
      location: "Near Roundwood, Co. Wicklow",
      priceYear: 2026,
      lines: [
        { label: "Exclusive-use venue hire", category: "venue_hire", pricingType: "fixed", amount: 8500, sourceText: "Venue hire (Friday or Sunday): €8,500" },
        { label: "Saturday premium (Apr–Oct)", category: "supplement", pricingType: "fixed", amount: 2500, condition: { daysOfWeek: [6], months: [4, 5, 6, 7, 8, 9, 10], description: "Saturdays, April–October" }, sourceText: "Venue hire (Saturday, April–October): €11,000" },
        { label: "Wedding Feast menu (Harvest Table)", category: "day_food", pricingType: "per_head_day", amount: 72, isFromPrice: true, estimatedAmount: 84, vatExclusive: true, sourceText: "Wedding Feast menu: from €72 per person + VAT (… add €12 per person; most of our couples choose this option)." },
        { label: "Drinks reception", category: "drinks", pricingType: "per_head_day", amount: 14, vatExclusive: true, sourceText: "Drinks reception …: €14 per person + VAT." },
        { label: "Wine with dinner (½ bottle pp)", category: "drinks", pricingType: "per_head_day", amount: 19, vatExclusive: true, sourceText: "Wine with dinner (half bottle per person): €19 per person + VAT." },
        { label: "Evening food — pizza truck", category: "evening_food", pricingType: "per_head_evening", amount: 11, minQuantity: 120, vatExclusive: true, sourceText: "Evening food — wood-fired pizza truck: €11 per person + VAT, minimum 120 evening guests." },
        { label: "Minimum bar spend", category: "drinks", pricingType: "minimum_spend", amount: 4000, percentBase: "drinks", sourceText: "A minimum bar spend of €4,000 applies for exclusive-use weddings; any shortfall is charged to the couple." },
        { label: "Staffing & service charge", category: "staff_service", pricingType: "percent", amount: 12.5, percentBase: "food_drink", sourceText: "A staffing & service charge of 12.5% applies to all catering and drinks." },
        { label: "VAT on catering & drinks", category: "tax", pricingType: "percent", amount: 13.5, percentBase: "food_drink", sourceText: "All catering & drinks prices are exclusive of VAT at 13.5%." },
        { label: "Security (mandatory)", category: "staff_service", pricingType: "per_unit", amount: 45, quantity: 12, unitLabel: "staff-hours", sourceText: "Security: two licensed security staff for 6 hours each at €45 per hour (12 staff-hours) — required by our licence." },
        { label: "Cleaning & waste removal", category: "venue_hire", pricingType: "fixed", amount: 650, sourceText: "Cleaning & waste removal: €650." },
        { label: "Late licence", category: "venue_hire", pricingType: "fixed", amount: 350, sourceText: "Late licence (bar until 12.30am): €350." },
        { label: "Cottages — 2-night minimum (Saturdays)", category: "accommodation", pricingType: "fixed", amount: 3200, condition: { daysOfWeek: [6], description: "Saturday weddings" }, sourceText: "For Saturday weddings the cottages must be booked for a minimum of two nights (Friday & Saturday): €3,200." },
        { label: "Shuttle bus to Roundwood/Ashford", category: "extras", pricingType: "fixed", amount: 480, optional: true, sourceText: "Shuttle bus to Roundwood/Ashford: €480." },
        { label: "Festoon lighting upgrade", category: "extras", pricingType: "fixed", amount: 395, optional: true, sourceText: "Festoon lighting upgrade: €395." },
        { label: "Fire pits & blankets", category: "extras", pricingType: "fixed", amount: 250, optional: true, sourceText: "Fire pits & blankets: €250." },
      ],
      flags: [
        { type: "saturday_premium", severity: "high", title: "Saturday venue hire is €2,500 more", detail: "The headline €8,500 is Friday/Sunday. Your Saturday date is €11,000.", sourceText: "Venue hire (Saturday, April–October): €11,000" },
        { type: "vat_excluded", severity: "high", title: "Catering prices exclude 13.5% VAT", detail: "Every food and drink price has VAT added on top.", sourceText: "All catering & drinks prices are exclusive of VAT at 13.5%." },
        { type: "service_charge", severity: "medium", title: "12.5% staffing charge", detail: "Added to all catering and drinks.", sourceText: "A staffing & service charge of 12.5% applies to all catering and drinks." },
        { type: "from_price", severity: "medium", title: "\"From €72\" menu", detail: "Choice of mains adds €12pp and \"most couples choose this\" — realistic price €84pp + VAT.", sourceText: "from €72 per person + VAT (3 courses with choice of two mains: add €12 per person" },
        { type: "minimum_spend", severity: "medium", title: "€4,000 minimum bar spend", detail: "Shortfall is charged to you. Guest bar purchases may count towards it — ask the venue.", sourceText: "A minimum bar spend of €4,000 applies" },
        { type: "room_minimum", severity: "medium", title: "Cottages: 2-night minimum on Saturdays", detail: "€3,200 for the cottages is compulsory with a Saturday wedding (you can recoup by charging guests).", sourceText: "For Saturday weddings the cottages must be booked for a minimum of two nights" },
        { type: "mandatory_extra", severity: "medium", title: "Mandatory security, cleaning & late licence", detail: "€1,540 of compulsory charges not in the headline hire fee.", sourceText: "MANDATORY CHARGES" },
        { type: "minimum_numbers", severity: "low", title: "Pizza truck minimum 120", detail: "Fine with 130 evening guests, but watch it if numbers drop.", sourceText: "minimum 120 evening guests" },
        { type: "price_increase", severity: "medium", title: "2026 prices; +5%/yr typical", detail: "A 2028 wedding will be charged at the prevailing rate.", sourceText: "Weddings in 2027 and beyond will be charged at the prevailing rate (typically +5% per year)." },
      ],
      payments: [
        { label: "25% on booking (non-refundable)", percent: 25, onBooking: true, refundable: false },
        { label: "25% nine months before", percent: 25, monthsBefore: 9 },
        { label: "Balance six weeks before", isBalance: true, daysBefore: 42 },
      ],
      notes: ["Refundable damage deposit of €1,000 due 6 weeks before (not included in total).", "Venue hire includes exclusive use 11am–1am."],
    },
  },
  {
    id: "seed-lough-dan",
    rawText: LOUGH_DAN,
    extraction: {
      name: "Lough Dan House Hotel",
      supplierType: "venue",
      vibes: ["lakeside", "country_house", "intimate"],
      location: "Laragh Road, near Roundwood, Co. Wicklow",
      priceYear: 2027,
      lines: [
        { label: "All-inclusive package (80 day / 100 evening)", category: "day_food", pricingType: "fixed", amount: 8950, isFromPrice: true, sourceText: "ALL-INCLUSIVE WEDDING PACKAGE — FROM €8,950 Includes 80 day guests and 100 evening guests" },
        { label: "Additional day guests", category: "day_food", pricingType: "per_head_day", amount: 89, freeQuantity: 80, sourceText: "Additional day guests: €89 per person." },
        { label: "Additional evening guests", category: "evening_food", pricingType: "per_head_evening", amount: 22, freeQuantity: 100, sourceText: "Additional evening guests: €22 per person." },
        { label: "Peak Saturday supplement", category: "supplement", pricingType: "fixed", amount: 2000, condition: { daysOfWeek: [6], months: [5, 6, 7, 8, 9], description: "Saturdays, May–September" }, sourceText: "Peak Saturday supplement (May–September): €2,000 added to the package price." },
        { label: "Bank holiday weekend supplement", category: "supplement", pricingType: "fixed", amount: 1500, condition: { bankHolidayWeekend: true, months: [6, 8], description: "June & August bank holiday weekends" }, sourceText: "June & August bank holiday weekends: an additional supplement of €1,500 applies." },
        { label: "Ceremony in the Orangery", category: "ceremony", pricingType: "fixed", amount: 750, sourceText: "On-site ceremony in the Orangery: €750." },
        { label: "Unsold room guarantee (worst case: 20 rooms × 2 nights)", category: "accommodation", pricingType: "per_unit", amount: 185, quantity: 40, unitLabel: "room-nights", optional: true, sourceText: "guarantees 20 bedrooms for 2 nights at €185 per room per night. Unsold rooms are charged to the wedding account" },
        { label: "Signature menu upgrade", category: "day_food", pricingType: "per_head_day", amount: 12, optional: true, sourceText: "Signature menu upgrade: +€12 per person." },
        { label: "Resident DJ", category: "extras", pricingType: "fixed", amount: 650, optional: true, sourceText: "Resident DJ: €650." },
        { label: "Cake cutting service", category: "extras", pricingType: "per_head_day", amount: 2, optional: true, sourceText: "Cake cutting service (served as dessert): €2 per person." },
        { label: "Corkage (per bottle)", category: "drinks", pricingType: "per_unit", amount: 12, quantity: 0, unitLabel: "bottles", optional: true, sourceText: "Corkage: €12 per bottle." },
      ],
      flags: [
        { type: "bank_holiday", severity: "high", title: "June bank holiday weekend: +€1,500", detail: "Monday 5 June 2028 is the June bank holiday, so your Saturday triggers this supplement.", sourceText: "June & August bank holiday weekends: an additional supplement of €1,500 applies." },
        { type: "peak_supplement", severity: "high", title: "Peak Saturday supplement +€2,000", detail: "Applies May–September Saturdays.", sourceText: "Peak Saturday supplement (May–September): €2,000" },
        { type: "from_price", severity: "medium", title: "Package \"from €8,950\" covers only 80 guests", detail: "20 extra day guests (€1,780) and 30 extra evening guests (€660) are charged on top.", sourceText: "FROM €8,950 Includes 80 day guests and 100 evening guests" },
        { type: "room_minimum", severity: "high", title: "20 rooms × 2 nights guarantee", detail: "Unsold rooms charged 8 weeks out — up to €7,400 exposure.", sourceText: "guarantees 20 bedrooms for 2 nights at €185 per room per night" },
        { type: "price_increase", severity: "medium", title: "Prices are for 2027", detail: "2028 rates not confirmed until January 2027.", sourceText: "Prices shown are for 2027 weddings. 2028 dates will be confirmed in January 2027." },
        { type: "corkage", severity: "low", title: "Corkage €12 per bottle", detail: "Applies if you bring your own drinks.", sourceText: "Corkage: €12 per bottle." },
      ],
      payments: [
        { label: "Booking deposit (non-refundable)", amount: 1500, onBooking: true, refundable: false },
        { label: "Interim payment", amount: 3000, monthsBefore: 6 },
        { label: "Balance", isBalance: true, daysBefore: 7 },
      ],
      notes: ["No service charge; VAT included.", "Package includes chair covers, centrepieces and evening food for 100."],
    },
  },
];
