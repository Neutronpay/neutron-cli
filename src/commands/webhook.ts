import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, pretty } from "../output.js";

export function registerWebhook(program: Command): void {
  const wh = program.command("webhook").description("Webhook management");

  wh.command("create")
    .description("Create a webhook")
    .requiredOption("--url <url>", "Webhook endpoint URL")
    .option("--events <events>", "Comma-separated event types (default: all)", "")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const result = await client.webhooks.create({
          callback: opts.url,
          secret: process.env.NEUTRON_WEBHOOK_SECRET ?? crypto.randomUUID(),
        }) as any;
        if (isPretty(opts)) {
          pretty([
            "✅ Webhook Created",
            `  ID:     ${result.webhookId ?? result.id ?? "—"}`,
            `  URL:    ${opts.url}`,
            `  Secret: ${result.secret ?? "(none)"}`,
          ]);
        } else {
          ok(result);
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to create webhook", "WEBHOOK_CREATE_ERROR");
      }
    });

  wh.command("list")
    .description("List all webhooks")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        const result = await client.webhooks.list() as any;
        const hooks = result.data ?? result.webhooks ?? result ?? [];
        if (isPretty(opts)) {
          const lines = [`✅ Webhooks (${hooks.length})`];
          for (const h of hooks) {
            lines.push(`  ${(h.webhookId ?? h.id ?? "—").padEnd(24)}  ${h.url ?? "—"}`);
          }
          pretty(lines);
        } else {
          ok({ webhooks: hooks });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to list webhooks", "WEBHOOK_LIST_ERROR");
      }
    });

  wh.command("delete <id>")
    .description("Delete a webhook by ID")
    .option("--pretty", "Human-readable output")
    .action(async (id, opts) => {
      try {
        const client = getClient();
        await client.webhooks.delete(id);
        if (isPretty(opts)) {
          pretty([`✅ Webhook ${id} deleted`]);
        } else {
          ok({ deleted: id });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to delete webhook", "WEBHOOK_DELETE_ERROR");
      }
    });
}
