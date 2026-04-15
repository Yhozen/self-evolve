import { connection } from "next/server";

import { listSandboxes } from "./_actions/sandbox";
import { SandboxConsole } from "./sandbox-console";

export default async function Home() {
  await connection();
  const initialData = await listSandboxes();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(24,24,27,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,244,245,0.94))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Sandbox Control
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Inspect active sandboxes and run commands against them.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              The index page reads the current sandbox inventory through the
              active backend, currently Vercel, and lets you execute commands
              per sandbox with stdout, stderr, and exit status visible in place.
            </p>
          </div>
        </header>

        <SandboxConsole initialData={initialData} />
      </div>
    </main>
  );
}
