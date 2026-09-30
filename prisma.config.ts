import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Only for `prisma generate` in CI, when there is no `DATABASE_URL` at build time. */
const prismaDatasourceUrl =
  process.env.DATABASE_URL?.trim() || "postgresql://build:build@127.0.0.1:5432/build?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: prismaDatasourceUrl,
  },
});
