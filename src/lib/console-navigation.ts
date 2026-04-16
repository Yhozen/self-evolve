import {
  ArchiveIcon,
  GitBranchIcon,
  type LucideIcon,
  ServerIcon,
} from "lucide-react";

export type ConsoleSectionId = "bootstrap" | "sandboxes" | "snapshots";

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
    id: "bootstrap",
    title: "Bootstrap",
    href: "/bootstrap",
    description:
      "Prepare a repository to become a reusable sandbox baseline and preview the attach handoff.",
    notes: [
      "Start with a repository URL and the GitHub App installation that already has access.",
      "The backend slice after this UI should clone the private repo, install opencode, and snapshot the provisioned workspace.",
      "Repo baselines need explicit mapping instead of the current latest-project-snapshot behavior.",
    ],
    icon: GitBranchIcon,
  },
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
