import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, pretty } from "../output.js";

export function registerInvoice(program: Command): void {
  program
    .command("invoice")
    .description("Create a Lightning invoice")
    .requiredOption("--amount <sats>", "Amount in satoshis")
    .option("--memo <text>", "Payment memo/description")
    .option("--currency <currency>", "Currency (btc, usd, etc)", "btc")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const result = await client.lightning.createInvoice({
          amountSats: Number(opts.amount),
          memo: opts.memo ?? "",
        }) as any;

        if (isPretty(opts)) {
          pretty([
            "✅ Invoice Created",
            `  ID:         ${result.txnId ?? result.id ?? "—"}`,
            `  Amount:     ${Number(opts.amount).toLocaleString()} sats`,
            `  Invoice:    ${(result.paymentRequest ?? result.invoice ?? "—").slice(0, 60)}...`,
            `  Expires:    ${result.expiresAt ?? result.expires_at ?? "—"}`,
          ]);
        } else {
          ok(result);
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to create invoice", "INVOICE_ERROR");
      }
    });
}
