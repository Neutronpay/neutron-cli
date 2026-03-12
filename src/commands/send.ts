import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";
import { deriveTxnState } from "../tx-format.js";

/** Detect payment type from the destination address/invoice */
function detectPaymentType(to: string): { method: string; ccy: string } {
  const normalized = to.trim().toLowerCase();
  
  // Lightning Address (user@domain.com)
  if (/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(to)) {
    return { method: "lnaddress", ccy: "BTC" };
  }

  // Lightning invoice (BOLT11)
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

const TERMINAL_SEND_STATES = new Set(["completed", "destsent", "failed", "expired", "srcexpired"]);

async function getTxnWithBoundedPoll(client: any, txnId: string, attempts = 4, delayMs = 500): Promise<any> {
  let last: any = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await client.transactions.get(txnId);
    const state = deriveTxnState(last).toLowerCase();
    if (TERMINAL_SEND_STATES.has(state)) return last;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return last;
}

export function registerSend(program: Command): void {
  program
    .command("send")
    .description("Send a payment — auto-detects type from address")
    .requiredOption("--to <address>", "user@domain.com | lnbc... | 1/3/bc1... | T... | 0x...")
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
            `    - Lightning Address: user@domain.com\n` +
            `    - Lightning invoice: lnbc...\n` +
            `    - BTC on-chain: 1..., 3..., bc1...\n` +
            `    - USDT (TRON): T...\n` +
            `    - USDT (ETH): 0x...`,
            "INVALID_ADDRESS"
          );
        }
        
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin(`Preparing ${detected.method} payment...`) : null;
        
        // Build transaction based on payment type
        let sourceCcy = opts.currency.toUpperCase();
        let destReq: any;
        let sourceAmount = amount;
        
        if (detected.method === "lnaddress") {
          // Lightning Address (user@domain.com) — use payAddress SDK method
          if (spinner) spinner.text = "Resolving Lightning address...";
          const txn2 = await client.lightning.payAddress(to, { amountSats: amount }) as any;
          const txnId2 = txn2.txnId ?? txn2.id;
          let finalTxn = txn2;

          try {
            if (spinner) spinner.text = "Checking payment status...";
            finalTxn = await getTxnWithBoundedPoll(client, txnId2);
          } catch (statusErr: any) {
            const message = String(statusErr?.message ?? statusErr ?? "");
            if (/already in progress/i.test(message)) {
              finalTxn = await getTxnWithBoundedPoll(client, txnId2);
            } else {
              throw statusErr;
            }
          }

          const finalState = deriveTxnState(finalTxn);
          const finalStateLower = finalState.toLowerCase();
          const completedLike = finalStateLower === "completed" || finalStateLower === "destsent";
          spinner?.succeed(chalk.green(completedLike ? "Payment sent" : "Payment initiated"));
          if (isPretty(opts)) {
            header(completedLike ? "Payment Sent" : "Payment Initiated");
            kv("ID:", txnId2);
            kv("To:", chalk.yellow(to));
            kv("Amount:", chalk.yellow(`${amount.toLocaleString()} sats`));
            kv("Method:", "Lightning Address");
            kv("Status:", completedLike ? chalk.green(finalState || "Sent") : chalk.yellow(finalState || "Processing"));
            if (!completedLike) {
              kv("Next:", chalk.dim(`Run neutron-cli tx get ${txnId2}`));
            }
            console.log();
          } else {
            ok(finalTxn);
          }
          return;
        } else if (detected.method === "lightning") {
          // Lightning invoice (BOLT11)
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
        let confirmed: any;
        try {
          confirmed = await client.transactions.confirm(txnId) as any;
        } catch (confirmErr: any) {
          const message = String(confirmErr?.message ?? confirmErr ?? "");
          if (/already in progress/i.test(message)) {
            confirmed = await getTxnWithBoundedPoll(client, txnId);
          } else {
            throw confirmErr;
          }
        }
        const confirmedState = deriveTxnState(confirmed);
        const completedLike = ["completed", "destsent"].includes(confirmedState.toLowerCase());
        spinner?.succeed(chalk.green(completedLike ? "Payment sent" : "Payment initiated"));

        if (isPretty(opts)) {
          header(completedLike ? "Payment Sent" : "Payment Initiated");
          kv("ID:", confirmed.txnId ?? confirmed.id ?? txnId);
          
          // Format amount display
          const amtDisplay = detected.ccy === "BTC" 
            ? `${amount.toLocaleString()} sats` 
            : `${amount.toLocaleString()} ${detected.ccy}`;
          kv("Amount:", chalk.yellow(amtDisplay));
          kv("Method:", detected.method);
          kv("To:", to.length > 40 ? to.substring(0, 40) + "..." : to);
          kv("Status:", completedLike ? chalk.green(confirmedState || "Sent") : chalk.yellow(confirmedState || "Processing"));
          if (!completedLike) {
            kv("Next:", chalk.dim(`Run neutron-cli tx get ${confirmed.txnId ?? confirmed.id ?? txnId}`));
          }
          console.log();
        } else {
          ok(confirmed);
        }
      } catch (e: any) {
        fail(e?.message ?? "Payment failed", "SEND_ERROR");
      }
    });
}
