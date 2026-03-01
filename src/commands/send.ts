import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

export function registerSend(program: Command): void {
  program
    .command("send")
    .description("Send a Lightning payment")
    .requiredOption("--to <invoice>", "Lightning invoice (BOLT11)")
    .requiredOption("--amount <sats>", "Amount in satoshis")
    .option("--currency <currency>", "Source wallet currency", "btc")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = getClient();
        const spinner = isPretty(opts) ? spin("Sending payment...") : null;
        const txn = await client.transactions.create({
          sourceReq: { ccy: opts.currency.toUpperCase(), method: "lightning", amtRequested: Number(opts.amount) },
          destReq: { ccy: "BTC", method: "lightning", reqDetails: { paymentRequest: opts.to } },
        }) as any;

        if (spinner) spinner.text = "Confirming payment...";
        const confirmed = await client.transactions.confirm(txn.txnId ?? txn.id) as any;
        spinner?.succeed(chalk.green("Payment sent"));

        if (isPretty(opts)) {
          header("Payment Sent");
          kv("ID:", confirmed.txnId ?? confirmed.id ?? "—");
          kv("Amount:", chalk.yellow(`${Number(opts.amount).toLocaleString()} sats`));
          kv("Status:", chalk.green(confirmed.txnState ?? confirmed.status ?? "—"));
          console.log();
        } else {
          ok(confirmed);
        }
      } catch (e: any) {
        fail(e?.message ?? "Payment failed", "SEND_ERROR");
      }
    });
}
