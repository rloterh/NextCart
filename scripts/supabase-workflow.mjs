import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const supabaseDir = path.join(rootDir, "supabase");
const linkedProjectRefPath = path.join(supabaseDir, ".temp", "project-ref");
const prodConfirmationFlag = "--confirm-prod";
const supabaseCommand = process.platform === "win32" ? "supabase.cmd" : "supabase";

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function loadWorkflowEnv() {
  return {
    ...readEnvFile(path.join(rootDir, ".env.supabase.example")),
    ...readEnvFile(path.join(rootDir, ".env.supabase.local")),
    ...process.env,
  };
}

function getTarget(env) {
  return {
    label: "Production",
    projectRef: env.SUPABASE_PROD_PROJECT_REF ?? "",
    dbPassword: env.SUPABASE_PROD_DB_PASSWORD ?? "",
  };
}

function getLinkedProjectRef() {
  if (!existsSync(linkedProjectRefPath)) {
    return null;
  }

  return readFileSync(linkedProjectRefPath, "utf8").trim() || null;
}

function runSupabase(args) {
  const result = spawnSync(supabaseCommand, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function requireTarget(target) {
  if (!target.projectRef) {
    console.error(
      "Missing SUPABASE_PROD_PROJECT_REF. Add it to .env.supabase.local before running this command.",
    );
    process.exit(1);
  }

  if (!target.dbPassword) {
    console.error(
      "Missing SUPABASE_PROD_DB_PASSWORD. Add it to .env.supabase.local before running this command.",
    );
    process.exit(1);
  }

  return target;
}

function ensureProdConfirmation(args) {
  const hasConfirmation = args.includes(prodConfirmationFlag);

  if (!hasConfirmation) {
    console.error(
      `Production commands require ${prodConfirmationFlag}. Example: npm run supabase:push -- ${prodConfirmationFlag}`,
    );
    process.exit(1);
  }

  if (process.env.CI === "true" && process.env.SUPABASE_ALLOW_PROD !== "true") {
    console.error(
      "Production mutation commands are blocked in CI unless SUPABASE_ALLOW_PROD=true is set explicitly.",
    );
    process.exit(1);
  }

  return args.filter((arg) => arg !== prodConfirmationFlag);
}

function linkTarget(target) {
  runSupabase([
    "link",
    "--project-ref",
    target.projectRef,
    "--password",
    target.dbPassword,
  ]);
}

function printStatus(target) {
  const linkedProjectRef = getLinkedProjectRef() ?? "none";

  console.log(`Linked project ref: ${linkedProjectRef}`);
  const refStatus = target.projectRef ? target.projectRef : "not configured";
  const passwordStatus = target.dbPassword ? "configured" : "missing";
  console.log(`prod: ref=${refStatus}; db_password=${passwordStatus}`);
}

function printHelp() {
  console.log(`Usage:
  node scripts/supabase-workflow.mjs status
  node scripts/supabase-workflow.mjs new <migration_name>
  node scripts/supabase-workflow.mjs link
  node scripts/supabase-workflow.mjs push [${prodConfirmationFlag}] [extra supabase args...]
  node scripts/supabase-workflow.mjs pull <migration_name> [extra supabase args...]
`);
}

const env = loadWorkflowEnv();
const target = getTarget(env);
const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "status":
    printStatus(target);
    break;
  case "new":
    if (!rest[0]) {
      console.error("Missing migration name. Example: npm run supabase:new -- add_vendor_limits");
      process.exit(1);
    }
    runSupabase(["migration", "new", ...rest]);
    break;
  case "link":
    linkTarget(requireTarget(target));
    break;
  case "push": {
    const extraArgs = ensureProdConfirmation(rest);
    const requiredTarget = requireTarget(target);
    linkTarget(requiredTarget);
    runSupabase(["db", "push", "--linked", "--password", requiredTarget.dbPassword, ...extraArgs]);
    break;
  }
  case "pull": {
    const [migrationName, ...extraArgs] = rest;

    if (!migrationName) {
      console.error(
        "Missing migration name. Example: npm run supabase:pull -- sync_manual_prod_change",
      );
      process.exit(1);
    }

    const requiredTarget = requireTarget(target);
    linkTarget(requiredTarget);
    runSupabase(["db", "pull", migrationName, "--linked", "--password", requiredTarget.dbPassword, ...extraArgs]);
    break;
  }
  default:
    printHelp();
    if (command) {
      process.exit(1);
    }
}
