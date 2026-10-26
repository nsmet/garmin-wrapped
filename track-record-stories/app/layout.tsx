import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Garmin Wrapped: Your Garmin Connect Year in Review | MINI WATT",
  description: "Create your Garmin Connect year in review with activity totals, running and cycling highlights, and shareable recap cards. Try the demo without a key.",
  metadataBase: new URL("https://garmin-wrapped.miniwatt.app"),
  alternates: { canonical: "/" },
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
