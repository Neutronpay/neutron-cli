import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, chalk, Table } from "../output.js";

export function registerBalance(program: Command): void {
  program
    .command("balance")
    .description("List all wallets and balances")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        if (isPretty(opts)) {
          const spinner = spin("Fetching balances...");
          const wallets = await client.account.wallets() as any[];
          spinner.succeed("Wallets loaded");
          header("Balances");
          const table = new Table({
            head: [chalk.cyan("Currency"), chalk.cyan("Balance"), chalk.cyan("Wallet")],
            style: { head: [], border: ["dim"] },
          });
          for (const w of wallets) {
            const ccy = w.ccy ?? w.currency ?? "?";
            const bal = w.balance ?? w.amount ?? 0;
            const label = w.label ?? w.name ?? "—";
            const display = ccy === "BTC"
              ? `${Number(bal * 1e8).toLocaleString()} sats`
              : `${Number(bal).toLocaleString()} ${ccy}`;
            table.push([chalk.bold(ccy), chalk.green(display), label]);
          }
          console.log(table.toString());
          console.log();
        } else {
          const wallets = await client.account.wallets();
          ok({ wallets });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to fetch balance", "BALANCE_ERROR");
      }
    });
}
