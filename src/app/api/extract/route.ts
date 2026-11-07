import { NextResponse } from "next/server";
import { heuristicExtract } from "@/lib/heuristic";
import { normalizeExtraction, parseJsonLoose } from "@/lib/normalize";
import { buildExtractionPrompt } from "@/lib/prompt";
import { completeJson, configFromUserKey, serverConfig } from "@/lib/server/llm";
import { DEFAULT_SETTINGS, type WeddingSettings } from "@/lib/types";

export const maxDuration = 60;

const MAX_CHARS = 60000;

export async function POST(req: Request) {
  let body: { text?: string; settings?: Partial<WeddingSettings> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = (body.text ?? "").trim().slice(0, MAX_CHARS);
  if (text.length < 20) return NextResponse.json({ error: "Paste more of the brochure or quote text." }, { status: 400 });
  const settings: WeddingSettings = { ...DEFAULT_SETTINGS, ...body.settings };

  const userKey = req.headers.get("x-llm-key")?.trim();
  const cfg = serverConfig() ?? (userKey ? configFromUserKey(userKey, req.headers.get("x-llm-provider") ?? undefined) : null);

  if (!cfg) {
    return NextResponse.json({ extraction: heuristicExtract(text), method: "heuristic" });
  }
  try {
    const raw = await completeJson(cfg, buildExtractionPrompt(settings), `BROCHURE / QUOTE TEXT:\n"""\n${text}\n"""`);
    const extraction = normalizeExtraction(parseJsonLoose(raw));
    return NextResponse.json({ extraction, method: "llm", provider: cfg.provider, model: cfg.model });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ extraction: heuristicExtract(text), method: "heuristic", warning: `AI extraction failed, used the rule-based parser instead. ${message}` });
  }
}
