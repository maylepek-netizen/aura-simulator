import type { Metadata } from "next";
import { Inter, Assistant } from "next/font/google";
import "./globals.css";
import { TransitionProvider } from "./TransitionProvider";
import { BackgroundMusic } from "./BackgroundMusic";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "600", "700"],
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
      className={`${inter.variable} ${assistant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-foreground selection:text-background">
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
