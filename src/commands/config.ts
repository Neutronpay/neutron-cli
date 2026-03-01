import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "fs";
import { createInterface } from "readline";
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
  chmodSync(CONFIG_PATH, 0o600);
  chmodSync(CONFIG_DIR, 0o700);
}

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      process.stdout.write(question);
      process.stdin.setRawMode?.(true);
      let input = "";
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", function handler(ch: string) {
        if (ch === "\n" || ch === "\r") {
          process.stdin.setRawMode?.(false);
          process.stdin.removeListener("data", handler);
          process.stdout.write("\n");
          rl.close();
          resolve(input);
        } else if (ch === "\u0003") {
          process.exit();
        } else if (ch === "\u007f") {
          if (input.length > 0) input = input.slice(0, -1);
        } else {
          input += ch;
          process.stdout.write("*");
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export function registerConfig(program: Command): void {
  const config = program.command("config").description("Manage CLI configuration");

  config
    .command("init")
    .description("Set up your Neutron API credentials")
    .option("--api-key <key>", "API key (skip prompt)")
    .option("--api-secret <secret>", "API secret (skip prompt)")
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      try {
        let apiKey = opts.apiKey ?? process.env.NEUTRON_API_KEY ?? "";
        let apiSecret = opts.apiSecret ?? process.env.NEUTRON_API_SECRET ?? "";

        // Interactive prompts if not provided
        if (!apiKey) {
          console.log(chalk.cyan("\n  Get your API key at: https://portal.neutron.me\n"));
          apiKey = await prompt(chalk.bold("  API Key:    "));
        }
        if (!apiSecret) {
          apiSecret = await prompt(chalk.bold("  API Secret: "), true);
        }

        if (!apiKey || !apiSecret) {
          fail("API key and secret are required.", "CONFIG_MISSING");
        }

        saveConfigFile({ apiKey, apiSecret });

        if (isPretty(opts)) {
          console.log("\n" + chalk.green("✅ Config saved to ~/.neutron/config.json"));
          console.log(chalk.dim(`  API Key:    ${maskSecret(apiKey)}`));
          console.log(chalk.dim(`  API Secret: ${maskSecret(apiSecret)}`));
          console.log(chalk.dim(`  File perms: 600 (private)\n`));
        } else {
          ok({ path: CONFIG_PATH, apiKey: maskSecret(apiKey) });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to init config", "CONFIG_INIT_ERROR");
      }
    });

  config
    .command("show")
    .description("Show current credentials (masked)")
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      try {
        const cfg = loadConfigFile();
        const envKey = process.env.NEUTRON_API_KEY;
        const envSecret = process.env.NEUTRON_API_SECRET;
        const source = envKey && envSecret ? "env" : cfg ? "~/.neutron/config.json" : "none";

        if (source === "none") {
          fail("No credentials found. Run `neutron-cli config init` first.", "CONFIG_NOT_FOUND");
        }

        const displayKey = envKey ?? cfg?.apiKey ?? "";
        const displaySecret = envSecret ?? cfg?.apiSecret ?? "";

        if (isPretty(opts)) {
          console.log("\n" + chalk.bold.cyan("  Config"));
          console.log(chalk.dim(`  Source:     ${source}`));
          console.log(chalk.dim(`  API Key:    ${maskSecret(displayKey)}`));
          console.log(chalk.dim(`  API Secret: ${maskSecret(displaySecret)}\n`));
        } else {
          ok({ source, apiKey: maskSecret(displayKey), configPath: cfg ? CONFIG_PATH : null });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to show config", "CONFIG_SHOW_ERROR");
      }
    });

  config
    .command("test")
    .description("Test your credentials against the Neutron API")
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      try {
        const cfg = loadConfigFile();
        const apiKey = process.env.NEUTRON_API_KEY ?? cfg?.apiKey;
        const apiSecret = process.env.NEUTRON_API_SECRET ?? cfg?.apiSecret;

        if (!apiKey || !apiSecret) {
          fail("No credentials found. Run `neutron-cli config init` first.", "CONFIG_NOT_FOUND");
        }

        const client = new Neutron({ apiKey, apiSecret });
        const account = await client.account.get() as any;

        if (isPretty(opts)) {
          console.log("\n" + chalk.green("✅ Credentials valid"));
          console.log(chalk.dim(`  Account ID: ${account.accountId ?? account.id ?? "—"}`));
          console.log(chalk.dim(`  Status:     ${account.accountStatus ?? "—"}\n`));
        } else {
          ok({ valid: true, accountId: account.accountId ?? account.id });
        }
      } catch (e: any) {
        fail(e?.message ?? "Credential test failed", "CONFIG_TEST_ERROR");
      }
    });
}
