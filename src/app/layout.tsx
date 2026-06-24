import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SidebarWithKey from "@/components/SidebarWithKey";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TenderDocs - Document Management",
  description: "Tender document management system for Table of Contents and Dividers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          `
        }} />
      </head>
      <body className="h-full flex items-center justify-center p-6 dark:bg-zinc-900 transition-colors">
        <div className="flex h-full w-full max-w-[1440px] rounded-[32px] bg-zinc-100 dark:bg-zinc-800 overflow-hidden transition-colors">
          <SidebarWithKey />
          <main className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 transition-colors">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
