import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/server/llm";

export async function GET() {
  const cfg = serverConfig();
  return NextResponse.json({ serverProvider: cfg?.provider ?? null, model: cfg?.model ?? null });
}
