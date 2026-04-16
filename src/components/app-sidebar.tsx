"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { consoleSections, getConsoleSection } from "@/lib/console-navigation";
import type { SandboxListResult } from "@/lib/sandbox";
import { formatTimestamp } from "@/lib/sandbox-format";

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  inventory: Pick<
    SandboxListResult,
    "error" | "latestSnapshot" | "sandboxes" | "snapshots"
  >;
};

export function AppSidebar({ inventory, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const activeSection = getConsoleSection(pathname);
  const { setOpen } = useSidebar();

  const runningSandboxes = inventory.sandboxes.filter(
    (sandbox) => sandbox.status === "running",
  ).length;
  const transitioningSandboxes = inventory.sandboxes.filter((sandbox) =>
    ["pending", "snapshotting", "stopping"].includes(sandbox.status),
  ).length;

  const stats =
    activeSection.id === "sandboxes"
      ? [
          {
            label: "Running",
            value: runningSandboxes,
            description: "Ready for commands",
          },
          {
            label: "Total",
            value: inventory.sandboxes.length,
            description: "Sandboxes in scope",
          },
          {
            label: "Changing",
            value: transitioningSandboxes,
            description: "Pending or stopping",
          },
        ]
      : activeSection.id === "snapshots"
        ? [
            {
              label: "Snapshots",
              value: inventory.snapshots.length,
              description: "Saved restore points",
            },
            {
              label: "Latest",
              value: inventory.latestSnapshot ? "Saved" : "None",
              description: inventory.latestSnapshot
                ? formatTimestamp(inventory.latestSnapshot.createdAt)
                : "No restore base yet",
            },
            {
              label: "Sources",
              value: runningSandboxes,
              description: "Running sandboxes available",
            },
          ]
        : [
            {
              label: "Inputs",
              value: 2,
              description: "Repo URL + installation ID",
            },
            {
              label: "Mode",
              value: "Preview",
              description: "UI-first iteration",
            },
            {
              label: "Baseline",
              value: inventory.latestSnapshot ? "Project" : "Missing",
              description: inventory.latestSnapshot
                ? "Repo mapping still needed"
                : "No restore base saved yet",
            },
          ];

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden border-r border-sidebar-border/70 *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r border-sidebar-border/70"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <Link href="/sandboxes">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <activeSection.icon className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Self Evolve</span>
                    <span className="truncate text-xs">Control plane</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {consoleSections.map((section) => {
                  const Icon = section.icon;

                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        asChild
                        tooltip={{
                          children: section.title,
                          hidden: false,
                        }}
                        isActive={activeSection.id === section.id}
                        className="px-2.5 md:px-2"
                        onClick={() => setOpen(true)}
                      >
                        <Link href={section.href}>
                          <Icon />
                          <span>{section.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="rounded-lg bg-sidebar-accent/60 px-2.5 py-2 text-[11px] leading-4 text-sidebar-foreground/70">
            Active backend
            <div className="font-medium text-sidebar-foreground">
              Vercel Sandbox
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3 border-b border-sidebar-border/70 p-4">
          <div className="space-y-1">
            <div className="text-base font-medium text-foreground">
              {activeSection.title}
            </div>
            <p className="text-sm leading-6 text-sidebar-foreground/70">
              {activeSection.description}
            </p>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Status</SidebarGroupLabel>
            <SidebarGroupContent className="grid gap-3 px-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-sidebar-foreground">
                    {stat.value}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
                    {stat.description}
                  </p>
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Sections</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {consoleSections.map((section) => {
                  const Icon = section.icon;

                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={activeSection.id === section.id}
                      >
                        <Link href={section.href}>
                          <Icon />
                          <span>{section.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Focus</SidebarGroupLabel>
            <SidebarGroupContent className="grid gap-3 px-2 text-sm text-sidebar-foreground/70">
              {activeSection.notes.map((note) => (
                <div
                  key={note}
                  className="rounded-xl bg-sidebar-accent/35 p-3 leading-6"
                >
                  {note}
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/70 p-4">
          {inventory.error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-700">
              {inventory.error}
            </div>
          ) : inventory.latestSnapshot ? (
            <div className="rounded-xl bg-sidebar-accent/35 p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
                Latest Snapshot
              </div>
              <p className="mt-2 break-all font-mono text-xs leading-5 text-sidebar-foreground">
                {inventory.latestSnapshot.snapshotId}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-sidebar-accent/35 p-3 text-xs leading-5 text-sidebar-foreground/70">
              No snapshot has been saved yet. Use the Snapshots page to create
              the first restore base.
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </Sidebar>
  );
}
