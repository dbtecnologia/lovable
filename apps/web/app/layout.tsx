import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Botzap · Central de atendimento",
  description: "Atendimento WhatsApp para times que precisam de contexto."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
