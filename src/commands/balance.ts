import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, pretty } from "../output.js";

export function registerBalance(program: Command): void {
  program
    .command("balance")
    .description("List all wallets and balances")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const wallets = await client.account.wallets();
        if (isPretty(opts)) {
          const lines = ["✅ Wallets"];
          for (const w of wallets as any[]) {
            const ccy = w.ccy ?? w.currency ?? "?";
            const bal = w.balance ?? w.amount ?? 0;
            const label = w.label ?? w.name ?? "";
            const display =
              ccy === "BTC"
                ? `${Number(bal * 1e8).toLocaleString()} sats`
                : `${ccy} ${Number(bal).toLocaleString()}`;
            lines.push(`  ${ccy.padEnd(6)} ${display.padEnd(20)} ${label}`);
          }
          pretty(lines);
        } else {
          ok({ wallets });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to fetch balance", "BALANCE_ERROR");
      }
    });
}
