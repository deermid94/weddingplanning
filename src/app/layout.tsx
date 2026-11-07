import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Great_Vibes, Jost } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { StoreProvider } from "@/lib/store";

const body = Jost({ variable: "--font-body", subsets: ["latin"] });
const serif = Cormorant_Garamond({ variable: "--font-serif-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const script = Great_Vibes({ variable: "--font-script", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Wedding Quote Decoder",
  description: "Reverse-engineer the true cost of wedding venues and suppliers.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbf8f3" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IE">
      <body className={`${body.variable} ${serif.variable} ${script.variable} font-sans antialiased`}>
        <StoreProvider>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:pb-16">{children}</main>
          <footer className="hidden pb-10 text-center font-script text-2xl text-stone-400 sm:block">3 June 2028 · with love</footer>
        </StoreProvider>
      </body>
    </html>
  );
}
