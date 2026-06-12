import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TransitionProvider } from "./TransitionProvider";
import { BackgroundMusic } from "./BackgroundMusic";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Aura",
  description: "Aura — minimalist, technical interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-mono selection:bg-foreground selection:text-background">
        <TransitionProvider>
          <BackgroundMusic />
          <div className="page-fade" style={{ display: "contents" }}>
            {children}
          </div>
        </TransitionProvider>
      </body>
    </html>
  );
}
