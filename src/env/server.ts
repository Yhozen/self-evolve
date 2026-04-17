import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    GITHUB_APP_ID: z.string().trim().min(1),
    GITHUB_APP_PRIVATE_KEY: z.string().trim().min(1),
    GITHUB_APP_INSTALLATION_ID: z.string().trim().optional(),
  },
  experimental__runtimeEnv: true,
});
