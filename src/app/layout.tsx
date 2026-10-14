import type { Metadata, Viewport } from "next";
import { Libre_Baskerville, Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Sistema de Simulacros · LGV Consultora",
    template: "%s · Sistema de Simulacros",
  },
  description:
    "Programación de simulacros de emergencia y aviso a empleados por mail y SMS.",
};

export const viewport: Viewport = {
  themeColor: "#1b2a4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${openSans.variable} ${libreBaskerville.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
