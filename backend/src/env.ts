import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // We make this optional for now so the server can start without keys, 
  // but the ticket endpoint will fail or we can throw during usage if missing.
  // Ideally, fail fast on startup:
  SIGNING_PRIVATE_KEY: z.string().describe("Base64 encoded Ed25519 private key"),
});

// parsing logic that handles "process.env"
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
