"use client";

import { useMemo, useState } from "react";
import { Loading } from "@/components/ui";
import { ROLES, roleLabel } from "@/lib/planning";
import { guestCounts, uid, useStore } from "@/lib/store";
import type { Guest, PartyRole } from "@/lib/types";

const EMPTY = (): Guest => ({ id: uid(), name: "", side: "ours", group: "Friends", invite: "day", rsvp: "pending", plusOne: false });

const EXAMPLE: Omit<Guest, "id">[] = [
  { name: "Ciarán (brother)", side: "partner_a", group: "Family", invite: "day", rsvp: "yes", plusOne: true, role: "best_man", jobs: ["Organise the stag", "Mind the rings", "Give the best man's speech"] },
  { name: "Aoife", side: "partner_b", group: "Friends", invite: "day", rsvp: "yes", plusOne: false, role: "maid_of_honour", jobs: ["Organise the hen", "Emergency kit on the day"], dietary: "Vegetarian" },
  { name: "Niamh", side: "partner_b", group: "Friends", invite: "day", rsvp: "pending", plusOne: true, role: "bridesmaid" },
  { name: "Seán", side: "partner_a", group: "Friends", invite: "day", rsvp: "yes", plusOne: true, role: "usher", jobs: ["Direct cars & parking"] },
  { name: "Auntie Mary", side: "partner_a", group: "Family", invite: "day", rsvp: "yes", plusOne: false, role: "reader", needsRoom: true },
  { name: "Granny Bríd", side: "partner_b", group: "Family", invite: "day", rsvp: "yes", plusOne: false, dietary: "Coeliac", needsRoom: true },
  { name: "Work crew (Dave)", side: "ours", group: "Work", invite: "evening", rsvp: "pending", plusOne: true },
  { name: "Cousin Emma", side: "partner_b", group: "Family", invite: "day", rsvp: "no", plusOne: false },
];

export default function Guests() {
  const { guests, upsertGuest, removeGuest, setGuests, settings, setSettings, ready } = useStore();
  const [editing, setEditing] = useState<Guest | null>(null);
  const [filter, setFilter] = useState<"all" | "party" | "day" | "evening" | "pending">("all");
  const [q, setQ] = useState("");
  const counts = useMemo(() => guestCounts(guests), [guests]);
  if (!ready) return <Loading />;

  const party = guests.filter((g) => g.role);
  const shown = guests
    .filter((g) => (filter === "party" ? g.role : filter === "day" ? g.invite === "day" : filter === "evening" ? g.invite === "evening" : filter === "pending" ? g.rsvp === "pending" : true))
    .filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));
  const synced = counts.day === settings.dayGuests && counts.evening === settings.eveningGuests;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Guests & wedding party</h1>
          <p className="text-sm text-stone-600">{counts.invited} invited · {counts.confirmed} confirmed · {counts.declined} declined</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing(EMPTY())}>+ Guest</button>
      </div>

      <section className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center"><p className="text-xs text-stone-500">Day</p><p className="font-serif text-2xl font-semibold">{counts.day}</p></div>
        <div className="card p-3 text-center"><p className="text-xs text-stone-500">Evening total</p><p className="font-serif text-2xl font-semibold">{counts.evening}</p></div>
        <div className="card p-3 text-center"><p className="text-xs text-stone-500">Need rooms</p><p className="font-serif text-2xl font-semibold">{counts.rooms}</p></div>
      </section>
      {guests.length > 0 && !synced && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span>Your quotes are costed for {settings.dayGuests} day / {settings.eveningGuests} evening guests. Your list says {counts.day} / {counts.evening}.</span>
          <button className="btn-secondary py-1.5" onClick={() => setSettings({ dayGuests: counts.day, eveningGuests: counts.evening })}>Use list numbers</button>
        </div>
      )}

      {party.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-serif text-lg font-semibold">Wedding party & jobs</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {party.map((g) => (
              <li key={g.id} className="rounded-lg border border-stone-200 p-3">
                <button className="w-full text-left" onClick={() => setEditing(g)}>
                  <p className="text-xs font-medium tracking-wide text-rose-700 uppercase">{roleLabel(g.role)}</p>
                  <p className="font-semibold">{g.name}</p>
                  {g.jobs?.length ? <ul className="mt-1 list-disc pl-4 text-sm text-stone-600">{g.jobs.map((j) => <li key={j}>{j}</li>)}</ul> : <p className="text-sm text-stone-400">No jobs yet. Tap to assign.</p>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {guests.length === 0 ? (
        <div className="card space-y-3 text-center">
          <p className="text-stone-600">No guests yet. Add people one by one or paste a list.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <BulkAdd onAdd={(names) => setGuests(names.map((name) => ({ ...EMPTY(), name })))} />
            <button className="btn-secondary" onClick={() => setGuests(EXAMPLE.map((g) => ({ ...g, id: uid() })))}>Load example list</button>
          </div>
        </div>
      ) : (
        <section className="card space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "party", "day", "evening", "pending"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-sm ${filter === f ? "bg-rose-700 text-white" : "border border-stone-300 bg-white"}`}>
                {{ all: "All", party: "Wedding party", day: "Day", evening: "Evening only", pending: "Awaiting RSVP" }[f]}
              </button>
            ))}
            <input className="input ml-auto w-full py-1.5 sm:w-48" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <ul className="divide-y divide-stone-100">
            {shown.map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-2">
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(g)}>
                  <p className="truncate font-medium">{g.name}{g.plusOne && <span className="text-stone-400"> +1</span>}</p>
                  <p className="truncate text-xs text-stone-500">
                    {g.invite === "day" ? "Day" : "Evening"} · {g.group}
                    {g.role && <span className="text-rose-700"> · {roleLabel(g.role)}</span>}
                    {g.dietary && ` · ${g.dietary}`}
                    {g.needsRoom && " · needs room"}
                  </p>
                </button>
                <select
                  aria-label={`RSVP for ${g.name}`}
                  className={`rounded-full border px-2 py-1 text-xs font-medium ${g.rsvp === "yes" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : g.rsvp === "no" ? "border-stone-200 bg-stone-100 text-stone-500" : "border-amber-200 bg-amber-50 text-amber-800"}`}
                  value={g.rsvp}
                  onChange={(e) => upsertGuest({ ...g, rsvp: e.target.value as Guest["rsvp"] })}
                >
                  <option value="pending">Pending</option>
                  <option value="yes">Coming</option>
                  <option value="no">Can&apos;t come</option>
                </select>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <BulkAdd onAdd={(names) => setGuests([...guests, ...names.map((name) => ({ ...EMPTY(), name }))])} />
            <button className="btn-secondary" onClick={() => exportCsv(guests)}>Export CSV</button>
          </div>
        </section>
      )}

      {editing && (
        <GuestEditor
          guest={editing}
          onClose={() => setEditing(null)}
          onSave={(g) => { upsertGuest(g); setEditing(null); }}
          onDelete={guests.some((x) => x.id === editing.id) ? () => { removeGuest(editing.id); setEditing(null); } : undefined}
        />
      )}
    </div>
  );
}

function BulkAdd({ onAdd }: { onAdd: (names: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) return <button className="btn-secondary" onClick={() => setOpen(true)}>Paste names</button>;
  return (
    <div className="w-full space-y-2 text-left">
      <textarea className="input h-32" placeholder="One name per line" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => { onAdd(text.split(/\n|,/).map((s) => s.trim()).filter(Boolean)); setText(""); setOpen(false); }}>Add names</button>
        <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function exportCsv(guests: Guest[]) {
  const head = ["Name", "Invite", "RSVP", "Plus one", "Group", "Side", "Role", "Jobs", "Dietary", "Needs room"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = guests.map((g) => [g.name, g.invite, g.rsvp, g.plusOne ? "yes" : "", g.group, g.side, roleLabel(g.role), (g.jobs ?? []).join("; "), g.dietary, g.needsRoom ? "yes" : ""].map(esc).join(","));
  const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "guest-list.csv";
  a.click();
}

function GuestEditor({ guest, onSave, onClose, onDelete }: { guest: Guest; onSave: (g: Guest) => void; onClose: () => void; onDelete?: () => void }) {
  const [g, setG] = useState<Guest>(guest);
  const [job, setJob] = useState("");
  const role = ROLES.find((r) => r.value === g.role);
  const set = (p: Partial<Guest>) => setG((x) => ({ ...x, ...p }));
  const addJob = (j: string) => j.trim() && !g.jobs?.includes(j.trim()) && set({ jobs: [...(g.jobs ?? []), j.trim()] });

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 font-serif text-xl font-semibold">{guest.name ? "Edit guest" : "Add guest"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="gname">Name</label>
            <input id="gname" className="input" autoFocus value={g.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="ginv">Invited to</label>
            <select id="ginv" className="input" value={g.invite} onChange={(e) => set({ invite: e.target.value as Guest["invite"] })}>
              <option value="day">Day (ceremony + meal)</option>
              <option value="evening">Evening only</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="grsvp">RSVP</label>
            <select id="grsvp" className="input" value={g.rsvp} onChange={(e) => set({ rsvp: e.target.value as Guest["rsvp"] })}>
              <option value="pending">Pending</option>
              <option value="yes">Coming</option>
              <option value="no">Can&apos;t come</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ggroup">Group</label>
            <input id="ggroup" className="input" list="groups" value={g.group} onChange={(e) => set({ group: e.target.value })} />
            <datalist id="groups"><option value="Family" /><option value="Friends" /><option value="Work" /><option value="Neighbours" /></datalist>
          </div>
          <div>
            <label className="label" htmlFor="gside">Side</label>
            <select id="gside" className="input" value={g.side} onChange={(e) => set({ side: e.target.value as Guest["side"] })}>
              <option value="ours">Both of us</option>
              <option value="partner_a">Partner A&apos;s side</option>
              <option value="partner_b">Partner B&apos;s side</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="gdiet">Dietary needs</label>
            <input id="gdiet" className="input" value={g.dietary ?? ""} onChange={(e) => set({ dietary: e.target.value })} />
          </div>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={g.plusOne} onChange={(e) => set({ plusOne: e.target.checked })} /> Plus one</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!g.needsRoom} onChange={(e) => set({ needsRoom: e.target.checked })} /> Needs a room</label>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="grole">Role in the wedding</label>
            <select id="grole" className="input" value={g.role ?? ""} onChange={(e) => set({ role: (e.target.value || undefined) as PartyRole | undefined })}>
              <option value="">Guest</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {g.role && (
            <div className="sm:col-span-2">
              <p className="label">Jobs</p>
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {(g.jobs ?? []).map((j) => (
                  <li key={j} className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-sm text-rose-900">
                    {j}
                    <button aria-label={`Remove ${j}`} onClick={() => set({ jobs: g.jobs?.filter((x) => x !== j) })}>×</button>
                  </li>
                ))}
              </ul>
              {role && role.jobs.filter((j) => !g.jobs?.includes(j)).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {role.jobs.filter((j) => !g.jobs?.includes(j)).map((j) => (
                    <button key={j} className="rounded-full border border-dashed border-stone-300 px-2.5 py-1 text-sm text-stone-600" onClick={() => addJob(j)}>+ {j}</button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input className="input" placeholder="Custom job, e.g. Collect the cake" value={job} onChange={(e) => setJob(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addJob(job); setJob(""); } }} />
                <button className="btn-secondary" onClick={() => { addJob(job); setJob(""); }}>Add</button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" disabled={!g.name.trim()} onClick={() => onSave({ ...g, name: g.name.trim() })}>Save</button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          {onDelete && <button className="btn-secondary text-red-700" onClick={onDelete}>Delete</button>}
        </div>
      </div>
    </div>
  );
}
