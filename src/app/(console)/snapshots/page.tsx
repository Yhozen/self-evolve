import { SnapshotsPageClient } from "@/components/snapshots-page-client";
import { filterManagedInventory } from "@/lib/repo-sandbox";
import { getRepoSandboxInventory } from "@/server/repo-sandbox/service";

export default async function SnapshotsPage() {
  const inventory = filterManagedInventory(await getRepoSandboxInventory());

  return <SnapshotsPageClient initialInventory={inventory} />;
}
