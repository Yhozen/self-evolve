import { ArchiveIcon, type LucideIcon, ServerIcon } from "lucide-react";

export type ConsoleSectionId = "sandboxes" | "snapshots";

export type ConsoleSection = {
  id: ConsoleSectionId;
  title: string;
  href: string;
  description: string;
  notes: string[];
  icon: LucideIcon;
};

export const consoleSections: ConsoleSection[] = [
  {
    id: "sandboxes",
    title: "Sandboxes",
    href: "/sandboxes",
    description:
      "Create, inspect, stop, and execute commands against live sandbox instances.",
    notes: [
      "Create a fresh sandbox or restore from the latest saved snapshot.",
      "Run ad hoc commands directly from the page and inspect stdout or stderr.",
      "Persist restore points from the Snapshots page when a sandbox is warmed.",
    ],
    icon: ServerIcon,
  },
  {
    id: "snapshots",
    title: "Snapshots",
    href: "/snapshots",
    description:
      "Create restore points from running sandboxes and remove snapshots you no longer need.",
    notes: [
      "Pick a running sandbox to create the next persistent restore base.",
      "Inspect which snapshot is currently used when new sandboxes are created.",
      "Delete stale restore points directly from the snapshot inventory.",
    ],
    icon: ArchiveIcon,
  },
];

export function getConsoleSection(pathname: string) {
  return (
    consoleSections.find(
      (section) =>
        pathname === section.href || pathname.startsWith(`${section.href}/`),
    ) ?? consoleSections[0]
  );
}
