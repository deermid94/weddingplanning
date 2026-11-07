"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Quotes", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/add", label: "Add quote", icon: "M12 5v14M5 12h14" },
  { href: "/compare", label: "Compare", icon: "M6 20V10M12 20V4M18 20v-7" },
  { href: "/timeline", label: "Timeline", icon: "M12 8v4l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/quote") : path.startsWith(href));
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-rose-700 font-serif text-sm font-bold text-white">€</span>
            <span className="font-serif text-lg font-semibold">Wedding Quote Decoder</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} className={`rounded-lg px-3 py-2 text-sm font-medium ${active(t.href) ? "bg-rose-50 text-rose-800" : "text-stone-600 hover:bg-stone-100"}`}>
                {t.label}
              </Link>
            ))}
            <Link href="/settings" className={`rounded-lg px-3 py-2 text-sm font-medium ${active("/settings") ? "bg-rose-50 text-rose-800" : "text-stone-600 hover:bg-stone-100"}`}>
              Settings
            </Link>
          </nav>
          <Link href="/settings" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 sm:hidden" aria-label="Settings">
            <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </Link>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(t.href) ? "text-rose-700" : "text-stone-500"}`}>
              <Icon d={t.icon} />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
