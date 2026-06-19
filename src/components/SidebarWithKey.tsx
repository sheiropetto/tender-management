"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function SidebarWithKey() {
  const pathname = usePathname();
  return <Sidebar key={pathname} />;
}
