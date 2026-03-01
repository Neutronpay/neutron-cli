import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

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
        if (isPretty(opts)) {
          const spinner = spin("Sending payment...");
          const txn = await client.transactions.create({
            sourceReq: { ccy: opts.currency.toUpperCase(), method: "lightning", amtRequested: Number(opts.amount) },
            destReq: { ccy: "BTC", method: "lightning", reqDetails: { paymentRequest: opts.to } },
          }) as any;
          const confirmed = await client.transactions.confirm(txn.txnId ?? txn.id) as any;
          const status = confirmed.txnState ?? confirmed.status ?? "—";
          spinner.succeed(`Payment ${status}`);
          header("Payment Sent");
          kv("ID", confirmed.txnId ?? confirmed.id ?? "—");
          kv("Amount", `${Number(opts.amount).toLocaleString()} sats`);
          kv("Status", chalk.green(status));
          kv("To", opts.to.slice(0, 40) + "...");
          console.log();
        } else {
          const txn = await client.transactions.create({
            sourceReq: { ccy: opts.currency.toUpperCase(), method: "lightning", amtRequested: Number(opts.amount) },
            destReq: { ccy: "BTC", method: "lightning", reqDetails: { paymentRequest: opts.to } },
          }) as any;
          const confirmed = await client.transactions.confirm(txn.txnId ?? txn.id);
          ok(confirmed);
        }
      } catch (e: any) {
        fail(e?.message ?? "Payment failed", "SEND_ERROR");
      }
    });
}
