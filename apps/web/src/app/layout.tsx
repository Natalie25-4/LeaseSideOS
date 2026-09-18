import { Inter } from "next/font/google";
import { LeaseStoreProvider } from "@/lib/leaseStore";
import { CommandPalette } from "@/components/ui/CommandPalette";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <LeaseStoreProvider>
          {children}
          <CommandPalette />
        </LeaseStoreProvider>
      </body>
    </html>
  );
}