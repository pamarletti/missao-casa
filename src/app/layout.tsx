import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CarregandoProvider } from "@/components/Carregando";

export const metadata: Metadata = {
  title: "Missão Casa",
  description: "Tarefas e mesada da família, sincronizado em tempo real.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CarregandoProvider>{children}</CarregandoProvider>
      </body>
    </html>
  );
}
