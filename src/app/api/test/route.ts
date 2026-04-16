import { Sandbox } from "@vercel/sandbox";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENCODE_PORT = 4096;
const OPENCODE_BIN = "/home/vercel-sandbox/.opencode/bin/opencode";
const OPENCODE_USERNAME = "opencode";
const SANDBOX_TIMEOUT_MS = 60 * 60 * 1000;
const SERVER_STARTUP_DELAY_MS = 8_000;

const sleep = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

const createSandboxFromSnapshot = async (
  snapshotId: string,
): Promise<Sandbox> => {
  return Sandbox.create({
    source: {
      type: "snapshot",
      snapshotId,
    },
    timeout: SANDBOX_TIMEOUT_MS,
    resources: {
      vcpus: 2,
    },
    ports: [OPENCODE_PORT],
  });
};

const startOpenCodeServer = async (
  sandbox: Sandbox,
): Promise<{ password: string; url: string }> => {
  const password = crypto.randomUUID();

  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      `OPENCODE_SERVER_PASSWORD="${password}" nohup ${OPENCODE_BIN} serve --hostname 0.0.0.0 --port ${OPENCODE_PORT} > /tmp/opencode.log 2>&1 &`,
    ],
  });

  await sleep(SERVER_STARTUP_DELAY_MS);

  return {
    password,
    url: sandbox.domain(OPENCODE_PORT),
  };
};

const checkOpenCodeHealth = async (input: {
  password: string;
  url: string;
}): Promise<unknown> => {
  const auth = Buffer.from(`${OPENCODE_USERNAME}:${input.password}`).toString(
    "base64",
  );

  const response = await fetch(`${input.url}/global/health`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `OpenCode health check failed with status ${response.status}`,
    );
  }

  return response.json();
};

const buildAttachCommand = (input: { password: string; url: string }) => {
  return `OPENCODE_SERVER_PASSWORD=${input.password} opencode attach ${input.url}`;
};

export async function GET(request: NextRequest) {
  const snapshotId = request?.nextUrl?.searchParams.get("snapshotId");
  if (typeof snapshotId !== "string") {
    return NextResponse.json(
      { error: "snapshotId is required" },
      { status: 400 },
    );
  }
  console.log("snapshotId", snapshotId);

  try {
    const sandbox = await createSandboxFromSnapshot(snapshotId);
    const { password, url } = await startOpenCodeServer(sandbox);
    const health = await checkOpenCodeHealth({ password, url });
    const attachCommand = buildAttachCommand({ password, url });

    return NextResponse.json({
      sandboxId: sandbox.sandboxId,
      snapshotId: sandbox.sourceSnapshotId,
      status: sandbox.status,
      url,
      username: OPENCODE_USERNAME,
      password,
      attachCommand,
      health,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start sandbox";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
