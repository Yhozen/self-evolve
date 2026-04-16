import { RepoBootstrapPageClient } from "@/components/repo-bootstrap-page-client";
import { getSandboxInventory } from "@/server/sandbox/runtime";

export default async function BootstrapPage() {
  const inventory = await getSandboxInventory();

  return <RepoBootstrapPageClient inventory={inventory} />;
}
