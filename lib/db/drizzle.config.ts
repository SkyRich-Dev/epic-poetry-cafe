import { defineConfig } from "drizzle-kit";
import path from "path";

const savedDbUrl = process.env.DATABASE_URL;
try { process.loadEnvFile(path.resolve(__dirname, "../../.env")); } catch {}
if (savedDbUrl) process.env.DATABASE_URL = savedDbUrl;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
