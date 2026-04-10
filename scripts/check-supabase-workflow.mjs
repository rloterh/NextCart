import { readdirSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const migrationPattern = /^\d{14}_[a-z0-9_]+\.sql$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (migrationFiles.length === 0) {
  fail("No Supabase migration files were found in supabase/migrations.");
}

const invalidFiles = migrationFiles.filter((file) => !migrationPattern.test(file));

if (invalidFiles.length > 0) {
  fail(
    `Invalid Supabase migration filenames:\n${invalidFiles
      .map((file) => `- ${file}`)
      .join("\n")}\nUse the format YYYYMMDDHHMMSS_description.sql`,
  );
}

const duplicatePrefixes = migrationFiles.filter((file, index, files) => {
  const prefix = file.slice(0, 14);
  return files.findIndex((candidate) => candidate.slice(0, 14) === prefix) !== index;
});

if (duplicatePrefixes.length > 0) {
  fail(
    `Duplicate Supabase migration timestamps detected:\n${duplicatePrefixes
      .map((file) => `- ${file}`)
      .join("\n")}`,
  );
}

console.log(`Supabase workflow check passed for ${migrationFiles.length} migration files.`);
