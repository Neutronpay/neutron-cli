import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, success, chalk } from "../output.js";

export function registerAuth(program: Command): void {
  program
    .command("auth")
    .description("Verify credentials and print account info")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const spinner = isPretty(opts) ? spin("Authenticating...") : null;
        const account = await client.account.get() as any;
        spinner?.succeed(chalk.green("Authenticated"));

        if (isPretty(opts)) {
          header("Account");
          kv("ID:", account.accountId ?? account.id ?? "—");
          kv("Name:", account.displayName ?? account.name ?? "—");
          kv("Status:", account.status ?? "—");
          kv("Country:", account.country ?? "—");
          console.log();
        } else {
          ok(account);
        }
      } catch (e: any) {
        fail(e?.message ?? "Auth check failed", "AUTH_ERROR");
      }
    });
}
