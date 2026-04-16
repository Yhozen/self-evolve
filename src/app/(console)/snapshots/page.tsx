import { SnapshotsPageClient } from "@/components/snapshots-page-client";
import { getSandboxInventory } from "@/server/sandbox/runtime";

export default async function SnapshotsPage() {
  const initialData = await getSandboxInventory();

  return <SnapshotsPageClient initialData={initialData} />;
}
