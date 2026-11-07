"use client";

import { useEffect, useState } from "react";
import { Loading } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function Settings() {
  const { settings, setSettings, llm, setLlm, resetDemo, ready } = useStore();
  const [server, setServer] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((s) => setServer(s.serverProvider ? `${s.serverProvider} (${s.model})` : null)).catch(() => {});
  }, []);
  if (!ready) return <Loading />;
  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-2xl font-semibold">Settings</h1>

      <section className="card grid gap-3 sm:grid-cols-2">
        <h2 className="font-serif text-lg font-semibold sm:col-span-2">Wedding details</h2>
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" type="date" className="input" value={settings.date} onChange={(e) => e.target.value && setSettings({ date: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="loc">Location</label>
          <input id="loc" className="input" value={settings.location} onChange={(e) => setSettings({ location: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="day">Day guests</label>
          <input id="day" type="number" inputMode="numeric" className="input" value={settings.dayGuests} onChange={(e) => setSettings({ dayGuests: num(e.target.value) })} />
        </div>
        <div>
          <label className="label" htmlFor="eve">Total evening guests (incl. day guests)</label>
          <input id="eve" type="number" inputMode="numeric" className="input" value={settings.eveningGuests} onChange={(e) => setSettings({ eveningGuests: num(e.target.value) })} />
        </div>
        <div>
          <label className="label" htmlFor="inf">Annual price increase assumption (%)</label>
          <input id="inf" type="number" step="0.5" className="input" value={settings.inflationPct} onChange={(e) => setSettings({ inflationPct: num(e.target.value) })} />
          <p className="mt-1 text-xs text-stone-500">Applied when a brochure quotes prices for an earlier year.</p>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-serif text-lg font-semibold">AI extraction</h2>
        {server ? (
          <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-800">Server key configured: {server}. Your own key below is only used if the server has none.</p>
        ) : (
          <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">No server key configured. Paste an OpenAI, Anthropic or Gemini key to enable AI extraction — otherwise the rule-based parser is used.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <div>
            <label className="label" htmlFor="key">API key</label>
            <input id="key" type="password" autoComplete="off" className="input" placeholder="sk-… / sk-ant-… / AIza…" value={llm.apiKey} onChange={(e) => setLlm({ apiKey: e.target.value.trim() })} />
          </div>
          <div>
            <label className="label" htmlFor="prov">Provider</label>
            <select id="prov" className="input" value={llm.provider} onChange={(e) => setLlm({ provider: e.target.value as typeof llm.provider })}>
              <option value="auto">Detect from key</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-stone-500">Stored only in this browser (localStorage) and sent to this app&apos;s server per request; never saved server-side. For a shared deployment, set the key as an environment variable instead.</p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-serif text-lg font-semibold">Data</h2>
        <p className="text-sm text-stone-600">Quotes are saved in this browser only.</p>
        <button className="btn-secondary text-red-700" onClick={() => confirm("Replace all quotes with the 3 demo venues?") && resetDemo()}>Reset to demo data</button>
      </section>
    </div>
  );
}
