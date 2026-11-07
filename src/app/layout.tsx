import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { StoreProvider } from "@/lib/store";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const serif = Playfair_Display({ variable: "--font-serif-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wedding Quote Decoder",
  description: "Reverse-engineer the true cost of wedding venues and suppliers.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#be123c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IE">
      <body className={`${geist.variable} ${serif.variable} font-sans antialiased`}>
        <StoreProvider>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:pb-12">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
