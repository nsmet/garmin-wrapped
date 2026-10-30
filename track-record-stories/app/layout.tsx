import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Garmin Wrapped: Your Garmin Connect Year in Review | MINI WATT",
  description: "Create your Garmin Connect year in review with activity totals, running and cycling highlights, and shareable recap cards.",
  metadataBase: new URL("https://garmin-wrapped.miniwatt.app"),
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
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
