import { z } from "zod";

const envSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  COPILOT_GITHUB_TOKEN: z.string().min(1),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1),
  CHROMADB_URL: z.string().url().default("http://localhost:8000"),
  OPENAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
