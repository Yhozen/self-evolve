import { ArchiveIcon, type LucideIcon, ServerIcon } from "lucide-react";

export type ConsoleSectionId = "sandboxes" | "snapshots";

export type ConsoleSection = {
  id: ConsoleSectionId;
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const consoleSections: ConsoleSection[] = [
  {
    id: "sandboxes",
    title: "Sandboxes",
    href: "/sandboxes",
    description: "Your live development environments.",
    icon: ServerIcon,
  },
  {
    id: "snapshots",
    title: "Snapshots",
    href: "/snapshots",
    description: "Reusable restore points.",
    icon: ArchiveIcon,
  },
];

export function getConsoleSection(pathname: string) {
  const fallbackSection =
    consoleSections.find((section) => section.id === "sandboxes") ??
    consoleSections[0];

  return (
    consoleSections.find(
      (section) =>
        pathname === section.href || pathname.startsWith(`${section.href}/`),
    ) ?? fallbackSection
  );
}
