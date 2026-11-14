import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { ZealoopBubble } from "./_components/zealoop-bubble";
import { TabSessionBootstrap } from "./_components/tab-session-bootstrap";

export const metadata: Metadata = {
  title: "Make My Marriage — Plan your entire wedding. Together.",
  description:
    "One shared space for your Indian wedding. Bring your family, events, tasks, guests and wedding memories together with Make My Marriage.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TabSessionBootstrap />
        {children}
        <ZealoopBubble
          publicKey={process.env.NEXT_PUBLIC_ZEALOOP_PUBLIC_KEY ?? ""}
        />
      </body>
    </html>
  );
}
