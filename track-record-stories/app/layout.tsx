import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Garmin Wraped — a MINI WATT product ⚡️",
  description: "Garmin Wraped, a MINI WATT product. Your Garmin year in sport highlights, yearly totals and shareable story cards.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
