import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, chalk, Table } from "../output.js";

export function registerBalance(program: Command): void {
  program
    .command("balance")
    .description("List all wallets and balances")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = getClient();
        const spinner = isPretty(opts) ? spin("Fetching wallets...") : null;
        const wallets = await client.account.wallets() as any[];
        spinner?.succeed(chalk.green("Wallets loaded"));

        if (isPretty(opts)) {
          header("Wallets");
          const table = new Table({
            head: [chalk.cyan("Currency"), chalk.cyan("Balance"), chalk.cyan("Label")],
            style: { head: [], border: ["dim"] },
          });
          for (const w of wallets) {
            const ccy = w.ccy ?? w.currency ?? "?";
            const bal = w.balance ?? w.amount ?? 0;
            const label = w.label ?? w.name ?? "—";
            const display = ccy === "BTC"
              ? `${Number(bal * 1e8).toLocaleString()} sats`
              : `${ccy} ${Number(bal).toLocaleString()}`;
            table.push([chalk.bold(ccy), chalk.yellow(display), chalk.dim(label)]);
          }
          console.log(table.toString());
          console.log();
        } else {
          ok({ wallets });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to fetch balance", "BALANCE_ERROR");
      }
    });
}
