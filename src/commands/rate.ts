import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

export function registerRate(program: Command): void {
  program
    .command("rate")
    .description("Get BTC exchange rate")
    .option("--currency <currency>", "Fiat currency code (usd, thb, sgd, etc)", "usd")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = await getClient();
        const spinner = isPretty(opts) ? spin("Fetching rate...") : null;
        const result = await client.rates.get() as any;
        const pair = `BTC${opts.currency.toUpperCase()}`;
        const rate = result[pair] ?? result[pair.toLowerCase()] ?? null;
        spinner?.succeed(chalk.green("Rate fetched"));

        if (isPretty(opts)) {
          header("Exchange Rate");
          kv("Pair:", chalk.bold(pair));
          kv("Rate:", rate != null
            ? chalk.yellow(`${Number(rate).toLocaleString()} ${opts.currency.toUpperCase()} / BTC`)
            : chalk.dim("Not available"));
          if (rate == null) {
            kv("Available:", Object.keys(result).join(", "));
          }
          console.log();
        } else {
          ok({ pair, rate, all: result });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to get rate", "RATE_ERROR");
      }
    });
}
