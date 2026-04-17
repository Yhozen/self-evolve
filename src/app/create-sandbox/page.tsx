import { CreateSandboxWizard } from "@/components/create-sandbox-wizard";
import { filterManagedInventory } from "@/lib/repo-sandbox";
import { getRepoSandboxInventory } from "@/server/repo-sandbox/service";

export default async function CreateSandboxPage() {
  const inventory = filterManagedInventory(await getRepoSandboxInventory());

  return <CreateSandboxWizard initialInventory={inventory} />;
}
