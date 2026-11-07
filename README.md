# Wedding Quote Decoder

Reverse-engineer the **true cost** of wedding venues and suppliers. Paste a brochure or quote (or upload a PDF), and the app:

1. Extracts every cost line with an LLM — per-head prices, fixed fees, minimum spends, service charge %, VAT, corkage, room guarantees, evening food, extras, deposit and payment schedule.
2. Flags hidden or conditional costs — "from" prices, peak-season and Saturday supplements, Irish bank-holiday weekends, minimum numbers, minimum spends, VAT-exclusive prices, prices quoted for an earlier year.
3. Calculates the true total for your guest numbers and date, line by line (editable).
4. Compares suppliers on true total, cost per guest and number of hidden costs.
5. Builds a reverse timeline from the wedding date: booking deadlines by supplier type, and a cash-flow-aware monthly savings target for your budget.

Seeded with 3 fictional Co. Wicklow venue brochures (sample PDFs in `public/samples/`).

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add an LLM key
npm run dev
```

## AI extraction

Set **one** of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` (server-side env var; model overridable with `*_MODEL`).
Alternatively paste a key on the Settings page — it's kept in the browser's localStorage and sent with each extraction request.
With no key, a built-in rule-based parser is used (less thorough; review its output).

## Deploy for free (Vercel)

1. Push this repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new) import the repo (framework auto-detected as Next.js).
3. Add your LLM key under **Settings → Environment Variables**, then deploy.

Data is stored per browser (localStorage) — there's no database.

## How the true total is calculated

- Per-head lines × day guests / all evening guests / evening-only guests, with package-included heads (`freeQuantity`) and minimum numbers (`minQuantity`) applied.
- "From" prices use a realistic estimate where the brochure allows it.
- Conditional supplements only apply if the wedding date matches (day of week, month, Irish bank-holiday weekend).
- Minimum spends charge the shortfall; service charges then VAT are applied as percentages of food & drink or subtotal.
- Prices quoted for an earlier year are uplifted by the annual inflation assumption (Settings).
- Optional extras and worst-case risks (e.g. unsold room guarantees) are listed separately and can be ticked into the total.
