"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

const AUTH_PAGES = ["/login"];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Auth pages (login, signup) get a clean layout without sidebar
  if (AUTH_PAGES.includes(pathname)) {
    return (
      <AuthProvider>
        <div className="flex h-full w-full max-w-[1440px] rounded-[32px] bg-zinc-100 dark:bg-zinc-800 overflow-hidden transition-colors">
          <main className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 transition-colors">
            {children}
          </main>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="flex h-full w-full max-w-[1440px] rounded-[32px] bg-zinc-100 dark:bg-zinc-800 overflow-hidden transition-colors">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 transition-colors">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
