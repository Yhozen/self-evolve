import { App } from "@octokit/app";
import { Sandbox } from "@vercel/sandbox";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";
import { env } from "@/env/server";

const app = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY,
});

const validInstallationAuthSchema = z
  .object({
    token: z.string(),
  })
  .loose();

const createSandbox = async (
  installationId: number,
  repoUrl: string,
): Promise<Sandbox> => {
  const octokit = await app.getInstallationOctokit(installationId);

  const installationAuth = validInstallationAuthSchema.parse(
    await octokit.auth({
      type: "installation",
      installationId,
    }),
  );

  const sandbox = await Sandbox.create({
    source: {
      url: repoUrl,
      type: "git",
      username: "x-access-token",
      password: installationAuth.token,
    },
    timeout: 5 * 60 * 1000,
    ports: [3000],
  });
  return sandbox;
};

const searchParamsSchema = z.object({
  installationId: z.coerce.number().positive(),
  repoUrl: z.url(),
});

export async function GET(request: NextRequest) {
  const result = searchParamsSchema.safeParse({
    installationId: request?.nextUrl?.searchParams.get("installationId"),
    repoUrl: request?.nextUrl?.searchParams.get("repoUrl"),
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }
  const { installationId, repoUrl } = result.data;

  const sandbox = await createSandbox(installationId, repoUrl);
  return NextResponse.json({ sandbox });
}
