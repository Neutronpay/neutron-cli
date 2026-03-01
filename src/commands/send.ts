import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, pretty } from "../output.js";

export function registerSend(program: Command): void {
  program
    .command("send")
    .description("Send a Lightning payment")
    .requiredOption("--to <invoice>", "Lightning invoice (BOLT11)")
    .requiredOption("--amount <sats>", "Amount in satoshis")
    .option("--currency <currency>", "Source wallet currency (btc)", "btc")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const txn = await client.transactions.create({
          sourceReq: { ccy: opts.currency.toUpperCase(), method: "lightning", amtRequested: Number(opts.amount) },
          destReq: { ccy: "BTC", method: "lightning", reqDetails: { paymentRequest: opts.to } },
        }) as any;

        const confirmed = await client.transactions.confirm(txn.txnId ?? txn.id) as any;

        if (isPretty(opts)) {
          pretty([
            "✅ Payment Sent",
            `  ID:      ${confirmed.txnId ?? confirmed.id ?? "—"}`,
            `  Amount:  ${Number(opts.amount).toLocaleString()} sats`,
            `  Status:  ${confirmed.txnState ?? confirmed.status ?? "—"}`,
          ]);
        } else {
          ok(confirmed);
        }
      } catch (e: any) {
        fail(e?.message ?? "Payment failed", "SEND_ERROR");
      }
    });
}
