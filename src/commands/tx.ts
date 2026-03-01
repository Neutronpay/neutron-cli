import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, pretty } from "../output.js";

export function registerTx(program: Command): void {
  const tx = program.command("tx").description("Transaction commands");

  tx.command("get <id>")
    .description("Get a transaction by ID")
    .option("--pretty", "Human-readable output")
    .action(async (id, opts) => {
      try {
        const client = getClient();
        const result = await client.transactions.get(id) as any;
        if (isPretty(opts)) {
          pretty([
            `✅ Transaction ${id}`,
            `  Status:   ${result.txnState ?? result.status ?? "—"}`,
            `  Amount:   ${result.amount?.toLocaleString() ?? "—"} sats`,
            `  Type:     ${result.type ?? "—"}`,
            `  Created:  ${result.createdAt ?? result.created_at ?? "—"}`,
          ]);
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
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const params: Record<string, any> = { limit: Number(opts.limit) };
        if (opts.from) params.fromDate = opts.from;
        if (opts.to) params.toDate = opts.to;
        const result = await client.transactions.list(params) as any;
        const txns = result.data ?? result.transactions ?? result ?? [];
        if (isPretty(opts)) {
          const lines = [`✅ Transactions (${txns.length})`];
          for (const t of txns) {
            const id = (t.txnId ?? t.id ?? "—").slice(0, 20);
            const state = (t.txnState ?? t.status ?? "—").padEnd(12);
            const amt = `${(t.amount ?? 0).toLocaleString()} sats`.padEnd(16);
            lines.push(`  ${id}  ${state}  ${amt}  ${t.createdAt ?? ""}`);
          }
          pretty(lines);
        } else {
          ok({ transactions: txns });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to list transactions", "TX_LIST_ERROR");
      }
    });
}
