import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

export function registerInvoice(program: Command): void {
  program
    .command("invoice")
    .description("Create a Lightning invoice")
    .requiredOption("--amount <sats>", "Amount in satoshis")
    .option("--memo <text>", "Payment memo/description")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        if (isPretty(opts)) {
          const spinner = spin("Creating invoice...");
          const result = await client.lightning.createInvoice({
            amountSats: Number(opts.amount),
            memo: opts.memo ?? "",
          }) as any;
          spinner.succeed("Invoice created");
          header("Lightning Invoice");
          kv("ID", result.txnId ?? result.id ?? "—");
          kv("Amount", `${Number(opts.amount).toLocaleString()} sats`);
          kv("Memo", opts.memo ?? "—");
          kv("Expires", result.expiresAt ?? result.expires_at ?? "—");
          console.log(`\n  ${chalk.dim("Invoice:")}`);
          console.log(`  ${chalk.yellow(result.paymentRequest ?? result.invoice ?? "—")}\n`);
        } else {
          const result = await client.lightning.createInvoice({
            amountSats: Number(opts.amount),
            memo: opts.memo ?? "",
          });
          ok(result);
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to create invoice", "INVOICE_ERROR");
      }
    });
}
