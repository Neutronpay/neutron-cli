import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { ok, fail, isPretty, chalk } from "../output.js";
import { Neutron } from "neutron-sdk";

const CONFIG_DIR = join(homedir(), ".neutron");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface Config {
  apiKey: string;
  apiSecret: string;
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "****";
  return secret.slice(0, 4) + "****" + secret.slice(-4);
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
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
  chmodSync(CONFIG_PATH, 0o600);  // owner read/write only
  chmodSync(CONFIG_DIR, 0o700);   // owner access only
}

export function registerConfig(program: Command): void {
  const config = program.command("config").description("Manage CLI configuration");

  config
    .command("init")
    .description("Initialize config from env vars or interactive input")
    .option("--api-key <key>", "API key (or set NEUTRON_API_KEY env)")
    .option("--api-secret <secret>", "API secret (or set NEUTRON_API_SECRET env)")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const apiKey = opts.apiKey ?? process.env.NEUTRON_API_KEY;
        const apiSecret = opts.apiSecret ?? process.env.NEUTRON_API_SECRET;

        if (!apiKey || !apiSecret) {
          fail(
            "Missing credentials. Provide --api-key and --api-secret, or set NEUTRON_API_KEY and NEUTRON_API_SECRET env vars.",
            "CONFIG_MISSING"
          );
        }

        saveConfigFile({ apiKey, apiSecret });

        if (isPretty(opts)) {
                    console.log('✅ Config initialized');
          console.log('`  Path:      ${CONFIG_PATH}`');
          console.log('`  API Key:   ${maskSecret(apiKey)}`');
          console.log('`  API Secret: ${maskSecret(apiSecret)}`');;
        } else {
          ok({ path: CONFIG_PATH, apiKey: maskSecret(apiKey) });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to init config", "CONFIG_INIT_ERROR");
      }
    });

  config
    .command("show")
    .description("Show current config (masked)")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const cfg = loadConfigFile();
        const envKey = process.env.NEUTRON_API_KEY;
        const envSecret = process.env.NEUTRON_API_SECRET;

        const source = envKey && envSecret ? "env" : cfg ? "file" : "none";

        if (source === "none") {
          fail("No config found. Run `neutron-cli config init` first.", "CONFIG_NOT_FOUND");
        }

        const displayKey = envKey ?? cfg?.apiKey ?? "";
        const displaySecret = envSecret ?? cfg?.apiSecret ?? "";

        if (isPretty(opts)) {
                    console.log('✅ Current Config');
          console.log('`  Source:     ${source === "env" ? "Environment variables" : `~/.neutron/config.json`}`');
          console.log('`  API Key:    ${maskSecret(displayKey)}`');
          console.log('`  API Secret: ${maskSecret(displaySecret)}`');;
        } else {
          ok({
            source,
            apiKey: maskSecret(displayKey),
            configPath: source === "file" ? CONFIG_PATH : null,
          });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to show config", "CONFIG_SHOW_ERROR");
      }
    });

  config
    .command("test")
    .description("Test credentials by calling auth endpoint")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const envKey = process.env.NEUTRON_API_KEY;
        const envSecret = process.env.NEUTRON_API_SECRET;
        const cfg = loadConfigFile();

        const apiKey = envKey ?? cfg?.apiKey;
        const apiSecret = envSecret ?? cfg?.apiSecret;

        if (!apiKey || !apiSecret) {
          fail("No credentials found. Run `neutron-cli config init` first.", "CONFIG_NOT_FOUND");
        }

        const client = new Neutron({ apiKey, apiSecret });
        const account = await client.account.get();

        if (isPretty(opts)) {
                    console.log('✅ Credentials valid');
          console.log('`  Account ID:   ${(account as any).accountId ?? (account as any).id ?? "—"}`');
          console.log('`  Name:         ${(account as any).displayName ?? (account as any).name ?? "—"}`');
          console.log('`  Status:       ${(account as any).status ?? "—"}`');;
        } else {
          ok({ valid: true, accountId: (account as any).accountId ?? (account as any).id });
        }
      } catch (e: any) {
        fail(e?.message ?? "Credential test failed", "CONFIG_TEST_ERROR");
      }
    });
}
