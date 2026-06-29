import type { Metadata } from "next";
import { Inter, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "$OMNOM DAO — Governance Portal",
  description:
    "Decentralized governance for the OMNOM community. Vote on proposals, shape the future of the OMNOM ecosystem.",
  keywords: ["OMNOM", "DAO", "governance", "deFi", "voting", "proposals", "Dogechain", "QTV", "quadratic token voting"],
  openGraph: {
    title: "$OMNOM DAO — Governance Portal",
    description: "Shape the future of OMNOM. Vote, propose, govern.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-omnom-dark text-omnom-text">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
