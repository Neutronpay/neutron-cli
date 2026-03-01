import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

/** Detect payment type from the destination address/invoice */
function detectPaymentType(to: string): { method: string; ccy: string } {
  const normalized = to.trim().toLowerCase();
  
  // Lightning invoice
  if (normalized.startsWith("lnbc") || normalized.startsWith("lntb")) {
    return { method: "lightning", ccy: "BTC" };
  }
  
  // Bitcoin on-chain addresses
  // Legacy (1...), P2SH (3...), Bech32/Bech32m (bc1...)
  if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(to) ||
      /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(to) ||
      /^bc1[ac-hj-np-zAC-HJ-NP-Z02-9]{8,87}$/i.test(to)) {
    return { method: "on-chain", ccy: "BTC" };
  }
  
  // USDT on TRON (T...) or ETH (0x...) - will be validated by currency flag
  if (/^T[A-Za-z1-9]{33}$/.test(to)) {
    return { method: "tron", ccy: "USDT" };
  }
  
  if (/^0x[a-fA-F0-9]{40}$/.test(to)) {
    return { method: "eth", ccy: "USDT" };
  }
  
  // Unknown format
  return { method: "unknown", ccy: "UNKNOWN" };
}

export function registerSend(program: Command): void {
  program
    .command("send")
    .description("Send a payment (Lightning, BTC on-chain, or USDT)")
    .requiredOption("--to <address>", "Destination address or Lightning invoice")
    .requiredOption("--amount <number>", "Amount (sats for BTC/ Lightning, units for USDT)")
    .option("--currency <currency>", "Source wallet currency (default: auto-detect)", "btc")
    .option("--chain <chain>", "Chain for USDT (TRON or ETH)", "TRON")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const to = opts.to.trim();
        const amount = parseFloat(opts.amount);
        const detected = detectPaymentType(to);
        
        // Validate detection
        if (detected.method === "unknown") {
          fail(
            `Unrecognized address format: "${to.substring(0, 20)}..."\n` +
            `  Supported formats:\n` +
            `    - Lightning: lnbc...\n` +
            `    - BTC on-chain: 1..., 3..., bc1...\n` +
            `    - USDT (TRON): T...\n` +
            `    - USDT (ETH): 0x...`,
            "INVALID_ADDRESS"
          );
        }
        
        const client = await getClient();
        const spinner = isPretty(opts) ? spin(`Preparing ${detected.method} payment...`) : null;
        
        // Build transaction based on payment type
        let sourceCcy = opts.currency.toUpperCase();
        let destReq: any;
        let sourceAmount = amount;
        
        if (detected.method === "lightning") {
          // Lightning payment
          sourceAmount = sourceCcy === "BTC" ? amount / 1e8 : amount;
          destReq = { 
            ccy: "BTC", 
            method: "lightning", 
            reqDetails: { paymentRequest: to } 
          };
        } else if (detected.method === "on-chain") {
          // BTC on-chain
          sourceCcy = "BTC";
          sourceAmount = amount / 1e8; // Convert sats to BTC
          destReq = { 
            ccy: "BTC", 
            method: "on-chain", 
            reqDetails: { address: to } 
          };
        } else if (detected.method === "tron" || detected.method === "eth") {
          // USDT on TRON or ETH
          sourceCcy = "USDT";
          destReq = { 
            ccy: "USDT", 
            method: detected.method, 
            reqDetails: { address: to } 
          };
        }
        
        const txn = await client.transactions.create({
          sourceReq: { ccy: sourceCcy, method: "neutronpay", amtRequested: sourceAmount },
          destReq,
        }) as any;

        const txnId = txn.txnId ?? txn.id;

        if (spinner) spinner.text = "Confirming payment...";
        const confirmed = await client.transactions.confirm(txnId) as any;
        spinner?.succeed(chalk.green("Payment sent"));

        if (isPretty(opts)) {
          header("Payment Sent");
          kv("ID:", confirmed.txnId ?? confirmed.id ?? txnId);
          
          // Format amount display
          const amtDisplay = detected.ccy === "BTC" 
            ? `${amount.toLocaleString()} sats` 
            : `${amount.toLocaleString()} ${detected.ccy}`;
          kv("Amount:", chalk.yellow(amtDisplay));
          kv("Method:", detected.method);
          kv("To:", to.length > 40 ? to.substring(0, 40) + "..." : to);
          kv("Status:", chalk.green(confirmed.txnState ?? confirmed.status ?? "Sent"));
          console.log();
        } else {
          ok(confirmed);
        }
      } catch (e: any) {
        fail(e?.message ?? "Payment failed", "SEND_ERROR");
      }
    });
}
