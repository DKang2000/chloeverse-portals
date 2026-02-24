const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

function exists(p) {
  return fs.existsSync(p);
}

function run(cwd, cmd, args, extraEnv) {
  const executable = process.platform === "win32" && cmd === "npm" ? "npm.cmd" : cmd;
  const isWindowsCmdFile = process.platform === "win32" && executable.toLowerCase().endsWith(".cmd");
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env;
  const result = isWindowsCmdFile
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", executable, ...args], {
        cwd,
        stdio: "inherit",
        shell: false,
        env,
      })
    : spawnSync(executable, args, {
        cwd,
        stdio: "inherit",
        shell: false,
        env,
      });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${executable} ${args.join(" ")}`);
  }
}

function verifySyncedIndex(indexPath) {
  if (!exists(indexPath)) {
    throw new Error(`Synced index not found: ${indexPath}`);
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const forbidden = [
    "My name is Ed",
    "Edward Hinrichsen",
    "Page Buddy",
    "edh.dev",
    '<script id="chloe-menu-and-projects-fixes"',
  ];
  for (const needle of forbidden) {
    if (html.includes(needle)) {
      throw new Error(`Synced index contains forbidden content: ${needle}`);
    }
  }

  const required = [
    "Hi!",
    "Stealth Startup",
    "Adobe",
    "Instagram",
    "Outsmart",
    "<!-- chloe-postpatch-v1 -->",
    "Candy Castle",
    "Chloeverse",
  ];
  for (const needle of required) {
    if (!html.includes(needle)) {
      throw new Error(`Synced index missing required content: ${needle}`);
    }
  }
}

function isRetroRepoDir(dir) {
  return exists(path.join(dir, "package.json")) && exists(path.join(dir, "vite.config.ts"));
}

function failWithLocateError(candidates) {
  console.error("[work:retro:sync] ERROR: Could not locate retro-computer-website.");
  console.error("[work:retro:sync] Checked these locations:");
  for (const candidate of candidates) {
    console.error(`  - ${candidate}`);
  }
  console.error(
    "[work:retro:sync] Set RETRO_WORK_SRC to the retro-computer-website folder path and try again."
  );
  process.exit(1);
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const home = os.homedir();
  const envCandidate = process.env.RETRO_WORK_SRC ? path.resolve(process.env.RETRO_WORK_SRC) : null;

  const candidates = [
    envCandidate,
    path.resolve(repoRoot, "..", "retro-computer-website"),
    path.join(home, "Downloads", "retro-computer-website"),
    path.join(home, "Documents", "retro-computer-website"),
  ].filter(Boolean);

  const retroDir = candidates.find(isRetroRepoDir);
  if (!retroDir) {
    failWithLocateError(candidates);
  }

  console.log(`[work:retro:sync] Using retro repo: ${retroDir}`);
  console.log("[work:retro:sync] Applying Chloe retro patch...");
  run(repoRoot, "node", [path.join("scripts", "apply_work_retro_chloe.cjs")], {
    RETRO_WORK_SRC: retroDir,
  });

  console.log("[work:retro:sync] Installing dependencies...");
  run(retroDir, "npm", ["install"]);

  console.log("[work:retro:sync] Building retro site with base /work-retro/ ...");
  run(retroDir, "npm", ["run", "build", "--", "--base=/work-retro/"]);

  const distDir = path.join(retroDir, "dist");
  const distIndex = path.join(distDir, "index.html");
  if (!exists(distIndex)) {
    throw new Error(`Build output not found: ${distIndex}`);
  }

  const targetDir = path.join(repoRoot, "public", "work-retro");
  if (exists(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(distDir, targetDir, { recursive: true });

  const retroPublic = path.join(retroDir, "public");
  const staticEntries = ["models", "textures", "fonts", "images", "icon", "manifest.json"];
  for (const entry of staticEntries) {
    const src = path.join(retroPublic, entry);
    if (!exists(src)) {
      continue;
    }

    const dest = path.join(targetDir, entry);
    const srcStat = fs.statSync(src);
    if (srcStat.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.cpSync(src, dest);
    }
    console.log(`[work:retro:sync] Copied static asset: ${entry}`);
  }

  run(repoRoot, "node", [path.join("scripts", "postpatch_work_retro.cjs")]);
  console.log("[work:retro:postpatch] applied");

  const syncedIndex = path.join(targetDir, "index.html");
  verifySyncedIndex(syncedIndex);
  console.log("[work:retro:sync] Verified synced index content guards.");

  console.log("[work:retro:sync] Success.");
  console.log(`[work:retro:sync] Copied: ${distDir}`);
  console.log(`[work:retro:sync] To:     ${targetDir}`);
}

try {
  main();
} catch (error) {
  console.error("[work:retro:sync] ERROR:", error instanceof Error ? error.message : error);
  process.exit(1);
}
