import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, pretty } from "../output.js";

export function registerRate(program: Command): void {
  program
    .command("rate")
    .description("Get BTC exchange rate")
    .option("--currency <currency>", "Fiat currency code (usd, thb, sgd, etc)", "usd")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const result = await client.rates.get() as any;
        const pair = `BTC${opts.currency.toUpperCase()}`;
        const rate = result[pair] ?? result[pair.toLowerCase()] ?? null;
        if (isPretty(opts)) {
          pretty([
            `✅ BTC/${opts.currency.toUpperCase()} Rate`,
            rate != null
              ? `  Rate: ${Number(rate).toLocaleString()} ${opts.currency.toUpperCase()} per BTC`
              : `  Available pairs: ${Object.keys(result).join(", ")}`,
          ]);
        } else {
          ok({ pair, rate, all: result });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to get rate", "RATE_ERROR");
      }
    });
}
