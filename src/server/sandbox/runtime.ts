import { Effect } from "effect";
import { cache } from "react";
import type { SandboxListResult } from "@/lib/sandbox";
import { listSandboxesProgram } from "@/server/sandbox/service";
import { VercelSandboxLive } from "@/server/sandbox/vercel-sandbox-live";

export function runSandboxProgram<T>(program: Effect.Effect<T, never, never>) {
  return Effect.runPromise(program);
}

export const getSandboxInventory = cache(
  async (): Promise<SandboxListResult> =>
    runSandboxProgram(
      listSandboxesProgram.pipe(Effect.provide(VercelSandboxLive)),
    ),
);
