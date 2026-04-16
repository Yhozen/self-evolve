import { SandboxesPageClient } from "@/components/sandboxes-page-client";
import { getSandboxInventory } from "@/server/sandbox/runtime";

export default async function SandboxesPage() {
  const initialData = await getSandboxInventory();

  return <SandboxesPageClient initialData={initialData} />;
}
