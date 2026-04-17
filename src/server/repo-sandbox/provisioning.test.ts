import { describe, expect, it } from "vitest";
import { buildRepoProvisionScript } from "./provisioning";

describe("buildRepoProvisionScript", () => {
  it("does not create a root-level workspace symlink anymore", () => {
    const script = buildRepoProvisionScript({
      mode: "fresh",
      opencodeBin: "/home/vercel-sandbox/.opencode/bin/opencode",
    });

    expect(script).not.toContain("REQUESTED_WORKSPACE_PATH");
    expect(script).not.toContain("mkdir -p");
    expect(script).not.toContain("ln -sfn");
    expect(script).not.toContain("/workspace");
  });

  it("bootstraps brew, opencode, worktrunk, and pnpm for fresh repos", () => {
    const script = buildRepoProvisionScript({
      mode: "fresh",
      opencodeBin: "/home/vercel-sandbox/.opencode/bin/opencode",
    });

    expect(script).toContain("NONINTERACTIVE=1 /bin/bash -c");
    expect(script).toContain(
      "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh",
    );
    expect(script).toContain(
      'if ! [ -x "/home/vercel-sandbox/.opencode/bin/opencode" ]; then',
    );
    expect(script).toContain("brew install worktrunk");
    expect(script).toContain("wt config shell install || true");
    expect(script).toContain(
      'wt switch --create "$REQUESTED_BRANCH" --execute "$POST_SWITCH_SCRIPT"',
    );
    expect(script).toContain("pnpm install --frozen-lockfile=false");
  });

  it("keeps restored sandboxes branch-safe", () => {
    const script = buildRepoProvisionScript({
      mode: "restored",
      baselineBranch: "main",
      opencodeBin: "/home/vercel-sandbox/.opencode/bin/opencode",
    });

    expect(script).toContain(
      'wt switch "$REQUESTED_BRANCH" --execute "$POST_SWITCH_SCRIPT"',
    );
    expect(script).toContain("Baseline branch mismatch:");
    expect(script).not.toContain(
      'wt switch --create "$REQUESTED_BRANCH" --execute "$POST_SWITCH_SCRIPT"',
    );
  });
});
