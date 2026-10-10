import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brito · Central de atendimento",
  description: "Central de atendimento WhatsApp da Brito."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
