import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk, Table } from "../output.js";

export function registerTx(program: Command): void {
  const tx = program.command("tx").description("Transaction commands");

  tx.command("get <id>")
    .description("Get a transaction by ID")
    .option("--pretty", "Human-readable output")
    .action(async (id, opts) => {
      try {
        const client = getClient();
        if (isPretty(opts)) {
          const spinner = spin(`Fetching transaction ${id}...`);
          const result = await client.transactions.get(id) as any;
          spinner.succeed("Transaction found");
          header("Transaction Details");
          kv("ID", result.txnId ?? result.id ?? "—");
          kv("Status", colorStatus(result.txnState ?? result.status));
          kv("Amount", result.amount ? `${result.amount.toLocaleString()} sats` : "—");
          kv("Type", result.type ?? "—");
          kv("Created", result.createdAt ?? result.created_at ?? "—");
          console.log();
        } else {
          const result = await client.transactions.get(id);
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
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        if (isPretty(opts)) {
          const spinner = spin("Fetching transactions...");
          const params: Record<string, any> = { limit: Number(opts.limit) };
          if (opts.from) params.fromDate = opts.from;
          if (opts.to) params.toDate = opts.to;
          const result = await client.transactions.list(params) as any;
          const txns = result.data ?? result.transactions ?? result ?? [];
          spinner.succeed(`${txns.length} transaction(s) found`);
          header("Transactions");
          const table = new Table({
            head: [chalk.cyan("ID"), chalk.cyan("Status"), chalk.cyan("Amount"), chalk.cyan("Date")],
            style: { head: [], border: ["dim"] },
          });
          for (const t of txns) {
            const id = (t.txnId ?? t.id ?? "—").slice(0, 20);
            const status = colorStatus(t.txnState ?? t.status ?? "—");
            const amt = t.amount ? `${t.amount.toLocaleString()} sats` : "—";
            const date = (t.createdAt ?? "—").slice(0, 10);
            table.push([id, status, amt, date]);
          }
          console.log(table.toString());
          console.log();
        } else {
          const params: Record<string, any> = { limit: Number(opts.limit) };
          if (opts.from) params.fromDate = opts.from;
          if (opts.to) params.toDate = opts.to;
          const result = await client.transactions.list(params) as any;
          ok({ transactions: result.data ?? result.transactions ?? result });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to list transactions", "TX_LIST_ERROR");
      }
    });
}

function colorStatus(status: string): string {
  switch (status) {
    case "completed": return chalk.green(status);
    case "processing": return chalk.yellow(status);
    case "failed": return chalk.red(status);
    case "expired": return chalk.dim(status);
    default: return chalk.white(status ?? "—");
  }
}
