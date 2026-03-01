import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, pretty } from "../output.js";

export function registerAuth(program: Command): void {
  program
    .command("auth")
    .description("Verify credentials and print account info")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const account = await client.account.get();
        if (isPretty(opts)) {
          pretty([
            "✅ Authenticated",
            `  Account ID:   ${(account as any).accountId ?? (account as any).id ?? "—"}`,
            `  Name:         ${(account as any).displayName ?? (account as any).name ?? "—"}`,
            `  Status:       ${(account as any).status ?? "—"}`,
            `  Country:      ${(account as any).country ?? "—"}`,
          ]);
        } else {
          ok(account);
        }
      } catch (e: any) {
        fail(e?.message ?? "Auth check failed", "AUTH_ERROR");
      }
    });
}
