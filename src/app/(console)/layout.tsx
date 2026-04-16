import { connection } from "next/server";
import type { CSSProperties, ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ConsoleHeader } from "@/components/console-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSandboxInventory } from "@/server/sandbox/runtime";

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();

  const inventory = await getSandboxInventory();

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "22rem",
        } as CSSProperties
      }
    >
      <AppSidebar inventory={inventory} />
      <SidebarInset className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(41,37,36,0.08),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,246,243,0.96))]">
        <ConsoleHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
