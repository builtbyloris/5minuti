import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountProvider } from "@/auth/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "5 Minuti",
  description:
    "Un mystery thriller sci-fi italiano costruito intorno a loop temporali di cinque minuti.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <AccountProvider>{children}</AccountProvider>
      </body>
    </html>
  );
}
