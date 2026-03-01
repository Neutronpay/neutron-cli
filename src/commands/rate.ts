import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

export function registerRate(program: Command): void {
  program
    .command("rate")
    .description("Get BTC exchange rate")
    .option("--currency <currency>", "Fiat currency code (usd, thb, sgd, etc)", "usd")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        if (isPretty(opts)) {
          const spinner = spin("Fetching rate...");
          const result = await client.rates.get() as any;
          const pair = `BTC${opts.currency.toUpperCase()}`;
          const rate = result[pair] ?? result[pair.toLowerCase()] ?? null;
          spinner.succeed("Rate fetched");
          header("Exchange Rate");
          if (rate != null) {
            kv("Pair", chalk.bold(pair));
            kv("Rate", chalk.green(`${Number(rate).toLocaleString()} ${opts.currency.toUpperCase()}`));
          } else {
            kv("Available pairs", Object.keys(result).join(", "));
          }
          console.log();
        } else {
          const result = await client.rates.get() as any;
          const pair = `BTC${opts.currency.toUpperCase()}`;
          const rate = result[pair] ?? result[pair.toLowerCase()] ?? null;
          ok({ pair, rate, all: result });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to get rate", "RATE_ERROR");
      }
    });
}
