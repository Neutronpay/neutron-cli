import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

export function registerSwap(program: Command): void {
  program
    .command("swap")
    .description("Convert between currencies (BTC ↔ USDT)")
    .requiredOption("--from <currency>", "Source currency (e.g., BTC, USDT)")
    .requiredOption("--to <currency>", "Destination currency (e.g., USDT, BTC)")
    .requiredOption("--amount <number>", "Amount in source units (sats for BTC, units for USDT)")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const sourceCcy = opts.from.toUpperCase();
        const destCcy = opts.to.toUpperCase();
        const amount = parseFloat(opts.amount);

        if (sourceCcy === destCcy) {
          fail("Source and destination currencies must be different", "SWAP_ERROR");
        }

        // For BTC, amount is in satoshis; convert to BTC for API
        const sourceAmount = sourceCcy === "BTC" ? amount / 1e8 : amount;

        const client = await getClient();
        const spinner = isPretty(opts) ? spin(`Creating ${sourceCcy} → ${destCcy} swap...`) : null;

        const txn = await client.transactions.create({
          sourceReq: { ccy: sourceCcy, method: "neutronpay", amtRequested: sourceAmount },
          destReq: { ccy: destCcy, method: "neutronpay" },
        }) as any;

        const txnId = txn.txnId ?? txn.id;
        const fxRate = txn.fxRate;

        if (spinner) spinner.text = "Confirming swap...";
        const confirmed = await client.transactions.confirm(txnId) as any;
        spinner?.succeed(chalk.green("Swap completed"));

        if (isPretty(opts)) {
          header("Currency Swap Completed");
          kv("Transaction ID:", chalk.bold(txnId));
          kv("Status:", chalk.green(confirmed.txnState ?? confirmed.status ?? "Completed"));
          
          // Display amounts nicely
          const srcDisplay = sourceCcy === "BTC" 
            ? `${amount.toLocaleString()} sats` 
            : `${amount.toLocaleString()} ${sourceCcy}`;
          kv("Amount Sent:", chalk.yellow(srcDisplay));
          
          if (fxRate) {
            kv("Exchange Rate:", `${fxRate} ${sourceCcy}/${destCcy}`);
          }
          
          // Calculate received amount if we have the rate
          if (fxRate && sourceCcy === "BTC" && destCcy === "USDT") {
            const received = (amount / 1e8) * fxRate;
            kv("Amount Received:", chalk.green(`${received.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${destCcy}`));
          } else if (fxRate && sourceCcy === "USDT" && destCcy === "BTC") {
            const received = (amount / fxRate) * 1e8;
            kv("Amount Received:", chalk.green(`${Math.floor(received).toLocaleString()} sats`));
          }
          
          console.log();
        } else {
          ok({ 
            txnId, 
            status: confirmed.txnState ?? confirmed.status,
            sourceCcy,
            destCcy,
            sourceAmount: amount,
            fxRate,
            transaction: confirmed 
          });
        }
      } catch (e: any) {
        fail(e?.message ?? "Swap failed", "SWAP_ERROR");
      }
    });
}
