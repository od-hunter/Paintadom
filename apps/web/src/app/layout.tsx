import type { Metadata, Viewport } from "next";
import { Fredoka, Baloo_2 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppHeader } from "@/components/layout/app-header";
import { GameBoot } from "@/components/game/game-boot";
import { PikaChrome } from "@/components/layout/pika-chrome";

const display = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const game = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-game",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paintadom — Paint. Relax. Build Your Kingdom.",
  description: "A cozy coloring kingdom Mini App on Celo MiniPay.",
  applicationName: "Paintadom",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2a1f14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${game.variable}`}>
      <body className="font-game">
        <Providers>
          <GameBoot>
            <div className="relative mx-auto min-h-[100dvh] w-full max-w-lg">
              <AppHeader />
              <main>{children}</main>
              <PikaChrome />
            </div>
          </GameBoot>
        </Providers>
      </body>
    </html>
  );
}
