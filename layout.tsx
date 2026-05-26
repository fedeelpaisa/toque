import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logistica de viajes",
  description: "MVP interno para pendientes operativos de viajes grupales"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
