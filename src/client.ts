import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Neutron } from "neutron-sdk";
import { chalk } from "./output.js";

const CONFIG_DIR = join(homedir(), ".neutron");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface Config {
  apiKey: string;
  apiSecret: string;
}

function loadConfigFile(): Config | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = readFileSync(CONFIG_PATH, "utf8");
    const cfg = JSON.parse(raw) as Partial<Config>;
    if (cfg.apiKey && cfg.apiSecret) return cfg as Config;
    return null;
  } catch {
    return null;
  }
}

function saveConfigFile(cfg: Config): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
  chmodSync(CONFIG_PATH, 0o600);
  chmodSync(CONFIG_DIR, 0o700);
}

function promptMasked(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    let input = "";
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    function handler(ch: string) {
      if (ch === "\n" || ch === "\r") {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", handler);
        process.stdout.write("\n");
        resolve(input);
      } else if (ch === "\u0003") {
        process.stdout.write("\n");
        process.exit();
      } else if (ch === "\u007f" || ch === "\b") {
        // backspace — silently remove last char, no visual change
        if (input.length > 0) input = input.slice(0, -1);
      } else {
        input += ch;
        process.stdout.write("*");
      }
    }
    process.stdin.on("data", handler);
  });
}

async function runFirstTimeSetup(): Promise<Config> {
  console.log("\n" + chalk.bold.cyan("⚡ Welcome to Neutron CLI"));
  console.log(chalk.dim("  No credentials found. Let's set them up.\n"));
  console.log(chalk.dim("  Get your API key at: ") + chalk.cyan.underline("https://portal.neutron.me") + "\n");

  const apiKey = await promptMasked(chalk.bold("  API Key:    "));
  if (!apiKey) { console.error(chalk.red("  API key is required.")); process.exit(1); }

  const apiSecret = await promptMasked(chalk.bold("  API Secret: "));
  if (!apiSecret) { console.error(chalk.red("  API secret is required.")); process.exit(1); }

  saveConfigFile({ apiKey, apiSecret });

  console.log("\n" + chalk.green("  ✅ Credentials saved to ~/.neutron/config.json"));
  console.log(chalk.dim("  Permissions set to 600 (private to you)\n"));

  return { apiKey, apiSecret };
}

export async function loadConfig(opts?: { json?: boolean }): Promise<Config> {
  // 1. Env vars
  const apiKey = process.env.NEUTRON_API_KEY;
  const apiSecret = process.env.NEUTRON_API_SECRET;
  if (apiKey && apiSecret) return { apiKey, apiSecret };

  // 2. ~/.neutron/config.json
  const cfg = loadConfigFile();
  if (cfg) return cfg;

  // 3. Non-interactive (--json / no TTY): fail with structured error
  if (opts?.json || !process.stdin.isTTY) {
    process.stderr.write(JSON.stringify({ error: "No credentials found. Set NEUTRON_API_KEY and NEUTRON_API_SECRET env vars, or run: neutron-cli config init", code: "AUTH_MISSING" }) + "\n");
    process.exit(1);
  }

  // 4. Interactive TTY: guide the user through setup
  return runFirstTimeSetup();
}

export async function getClient(opts?: { json?: boolean }): Promise<Neutron> {
  const cfg = await loadConfig(opts);
  return new Neutron({ apiKey: cfg.apiKey, apiSecret: cfg.apiSecret });
}


