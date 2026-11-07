import "server-only";

export type Provider = "openai" | "anthropic" | "gemini";

export interface LlmConfig {
  provider: Provider;
  apiKey: string;
  model: string;
}

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  gemini: process.env.GEMINI_MODEL || "gemini-2.5-flash",
};

export function serverConfig(): LlmConfig | null {
  if (process.env.OPENAI_API_KEY) return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: DEFAULT_MODELS.openai };
  if (process.env.ANTHROPIC_API_KEY) return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY, model: DEFAULT_MODELS.anthropic };
  if (process.env.GEMINI_API_KEY) return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY, model: DEFAULT_MODELS.gemini };
  return null;
}

/** Guess the provider from a user-supplied key. */
export function configFromUserKey(key: string, provider?: string): LlmConfig {
  const p: Provider =
    provider === "openai" || provider === "anthropic" || provider === "gemini"
      ? provider
      : key.startsWith("sk-ant-")
        ? "anthropic"
        : key.startsWith("AIza")
          ? "gemini"
          : "openai";
  return { provider: p, apiKey: key, model: DEFAULT_MODELS[p] };
}

async function check(res: Response, provider: string) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${provider} API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function completeJson(cfg: LlmConfig, system: string, user: string): Promise<string> {
  if (cfg.provider === "openai") {
    const data = await check(
      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model,
          response_format: { type: "json_object" },
          temperature: 0,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      }),
      "OpenAI",
    );
    return data.choices?.[0]?.message?.content ?? "";
  }
  if (cfg.provider === "anthropic") {
    const data = await check(
      await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: 8000,
          temperature: 0,
          system,
          messages: [{ role: "user", content: user }],
        }),
      }),
      "Anthropic",
    );
    return (data.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  }
  const data = await check(
    await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    }),
    "Gemini",
  );
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}
