/**
 * Import this before any app module: imports are evaluated before the script body, so a plain
 * `dotenv.config()` would run after `server/db/prisma.ts` has already read `DATABASE_URL`.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });
