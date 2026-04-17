import type { CSSProperties, ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ConsoleHeader } from "@/components/console-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "16rem",
        } as CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="min-h-screen bg-background">
        <ConsoleHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
