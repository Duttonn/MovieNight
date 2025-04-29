import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite", // Changed from postgresql
  dbCredentials: {
    url: "file:./local.db", // Path to your local database file
  },
});
