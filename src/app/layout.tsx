import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
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
      </body>
    </html>
  );
}
