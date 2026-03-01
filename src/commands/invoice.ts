import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

export function registerInvoice(program: Command): void {
  program
    .command("invoice")
    .description("Create a Lightning invoice")
    .requiredOption("--amount <sats>", "Amount in satoshis")
    .option("--memo <text>", "Payment memo/description")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = getClient();
        const spinner = isPretty(opts) ? spin("Creating invoice...") : null;
        const result = await client.lightning.createInvoice({
          amountSats: Number(opts.amount),
          memo: opts.memo ?? "",
        }) as any;
        spinner?.succeed(chalk.green("Invoice created"));

        if (isPretty(opts)) {
          const invoice = result.paymentRequest ?? result.invoice ?? "—";
          header("Lightning Invoice");
          kv("ID:", result.txnId ?? result.id ?? "—");
          kv("Amount:", `${Number(opts.amount).toLocaleString()} sats`);
          kv("Expires:", result.expiresAt ?? result.expires_at ?? "—");
          if (opts.memo) kv("Memo:", opts.memo);
          console.log();
          console.log(chalk.dim("  Invoice:"));
          console.log(chalk.yellow("  " + invoice));
          console.log();
        } else {
          ok(result);
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to create invoice", "INVOICE_ERROR");
      }
    });
}
