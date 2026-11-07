import { NextResponse } from "next/server";
import { normalizePlan, parseJsonLoose } from "@/lib/normalize";
import { BUDGET_CATEGORIES, buildPlanPrompt, DEFAULT_SPLIT, heuristicPlan } from "@/lib/planning";
import { completeJson, configFromUserKey, serverConfig } from "@/lib/server/llm";
import { DEFAULT_SETTINGS, type WeddingPlan, type WeddingSettings } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { brief?: string; settings?: Partial<WeddingSettings> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const brief = (body.brief ?? "").trim().slice(0, 8000);
  if (brief.length < 10) return NextResponse.json({ error: "Describe your ideal wedding in a sentence or two." }, { status: 400 });
  const settings: WeddingSettings = { ...DEFAULT_SETTINGS, ...body.settings };

  const userKey = req.headers.get("x-llm-key")?.trim();
  const cfg = serverConfig() ?? (userKey ? configFromUserKey(userKey, req.headers.get("x-llm-provider") ?? undefined) : null);
  if (!cfg) return NextResponse.json({ plan: heuristicPlan(brief, settings) });

  try {
    const raw = normalizePlan(parseJsonLoose(await completeJson(cfg, buildPlanPrompt(settings), `OUR IDEAL WEDDING:\n"""\n${brief}\n"""`)));
    const keys = new Set(BUDGET_CATEGORIES.map((c) => c.key));
    let split = raw.budgetSplit.filter((s) => keys.has(s.key));
    for (const d of DEFAULT_SPLIT) if (!split.some((s) => s.key === d.key)) split.push({ ...d, percent: 0 });
    const sum = split.reduce((a, b) => a + b.percent, 0);
    split = sum > 0 ? split.map((s) => ({ ...s, percent: Math.round((s.percent / sum) * 1000) / 10 })) : DEFAULT_SPLIT;
    const plan: WeddingPlan = { brief, vibes: raw.vibes, summary: raw.summary, priorities: raw.priorities, budgetSplit: split, tips: raw.tips, method: "llm", createdAt: new Date().toISOString() };
    return NextResponse.json({ plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ plan: heuristicPlan(brief, settings), warning: `AI planning failed, used the rule-based planner instead. ${message}` });
  }
}
