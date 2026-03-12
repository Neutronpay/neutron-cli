import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk, Table } from "../output.js";
import { deriveTxnState, deriveTxnType, formatTxnAmount, deriveTxnDate, deriveTxnUpdatedDate, deriveTxnCurrency, deriveTxnAmountRaw } from "../tx-format.js";

const STATE_COLOR: Record<string, (s: string) => string> = {
  completed:   (s) => chalk.green(s),
  processing:  (s) => chalk.cyan(s),
  quoted:      (s) => chalk.yellow(s),
  failed:      (s) => chalk.red(s),
  expired:     (s) => chalk.dim(s),
};

function colorState(state: string): string {
  const fn = STATE_COLOR[state?.toLowerCase()] ?? ((s: string) => s);
  return fn(state);
}

export function registerTx(program: Command): void {
  const tx = program.command("tx").description("Transaction commands");

  tx.command("get <id>")
    .description("Get a transaction by ID")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (id, opts) => {
      try {
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin("Fetching transaction...") : null;
        const result = await client.transactions.get(id) as any;
        spinner?.succeed(chalk.green("Transaction found"));

        if (isPretty(opts)) {
          header(`Transaction ${chalk.dim(id)}`);
          kv("Status:", colorState(deriveTxnState(result)));
          kv("Amount:", chalk.yellow(formatTxnAmount(result)));
          kv("Currency:", deriveTxnCurrency(result));
          kv("Type:", deriveTxnType(result));
          kv("Created:", deriveTxnDate(result));
          kv("Updated:", deriveTxnUpdatedDate(result));
          if (result?.sourceReq?.method) kv("Source Method:", result.sourceReq.method);
          if (result?.destReq?.method) kv("Dest Method:", result.destReq.method);
          if (typeof result?.sourceReq?.amtRequested === "number") kv("Source Requested:", String(result.sourceReq.amtRequested));
          if (typeof result?.sourceReq?.amtSettled === "number") kv("Source Settled:", String(result.sourceReq.amtSettled));
          if (typeof result?.destReq?.amtRequested === "number") kv("Dest Requested:", String(result.destReq.amtRequested));
          if (typeof result?.destReq?.amtSettled === "number") kv("Dest Settled:", String(result.destReq.amtSettled));
          console.log();
        } else {
          ok(result);
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to get transaction", "TX_GET_ERROR");
      }
    });

  tx.command("list")
    .description("List recent transactions")
    .option("--limit <n>", "Number of results", "10")
    .option("--from <date>", "From date (YYYY-MM-DD)")
    .option("--to <date>", "To date (YYYY-MM-DD)")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin("Fetching transactions...") : null;
        const params: Record<string, any> = { limit: Number(opts.limit) };
        if (opts.from) params.fromDate = opts.from;
        if (opts.to) params.toDate = opts.to;
        const result = await client.transactions.list(params) as any;
        const txns = result.data ?? result.transactions ?? result ?? [];
        spinner?.succeed(chalk.green(`${txns.length} transactions`));

        if (isPretty(opts)) {
          header("Transactions");
          const table = new Table({
            head: [chalk.cyan("ID"), chalk.cyan("Status"), chalk.cyan("Amount"), chalk.cyan("Date")],
            style: { head: [], border: ["dim"] },
            colWidths: [28, 14, 16, 22],
          });
          for (const t of txns) {
            table.push([
              chalk.dim(t.txnId ?? t.id ?? "—"),
              colorState(deriveTxnState(t)),
              chalk.yellow(formatTxnAmount(t)),
              chalk.dim(deriveTxnDate(t)),
            ]);
          }
          console.log(table.toString());
          console.log();
        } else {
          ok({ transactions: txns });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to list transactions", "TX_LIST_ERROR");
      }
    });
}
