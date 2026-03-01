import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, success, chalk, Table } from "../output.js";

export function registerWebhook(program: Command): void {
  const wh = program.command("webhook").description("Webhook management");

  wh.command("create")
    .description("Create a webhook")
    .requiredOption("--url <url>", "Webhook endpoint URL")
    .option("--pretty", "Human-readable output")
    .action(async (opts) => {
      try {
        const client = getClient();
        if (isPretty(opts)) {
          const spinner = spin("Creating webhook...");
          const result = await client.webhooks.create({
            callback: opts.url,
            secret: process.env.NEUTRON_WEBHOOK_SECRET ?? crypto.randomUUID(),
          }) as any;
          spinner.succeed("Webhook created");
          header("Webhook");
          kv("ID", result.webhookId ?? result.id ?? "—");
          kv("URL", opts.url);
          kv("Secret", result.secret ? chalk.dim(result.secret) : "(none returned)");
          console.log();
        } else {
          const result = await client.webhooks.create({
            callback: opts.url,
            secret: process.env.NEUTRON_WEBHOOK_SECRET ?? crypto.randomUUID(),
          });
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
        if (isPretty(opts)) {
          const spinner = spin("Fetching webhooks...");
          const result = await client.webhooks.list() as any;
          const hooks = result.data ?? result.webhooks ?? result ?? [];
          spinner.succeed(`${hooks.length} webhook(s) found`);
          header("Webhooks");
          const table = new Table({
            head: [chalk.cyan("ID"), chalk.cyan("URL")],
            style: { head: [], border: ["dim"] },
          });
          for (const h of hooks) {
            table.push([h.webhookId ?? h.id ?? "—", h.url ?? h.callback ?? "—"]);
          }
          console.log(table.toString());
          console.log();
        } else {
          const result = await client.webhooks.list() as any;
          ok({ webhooks: result.data ?? result.webhooks ?? result });
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
        if (isPretty(opts)) {
          const spinner = spin(`Deleting webhook ${id}...`);
          await client.webhooks.delete(id);
          spinner.succeed(`Webhook ${id} deleted`);
          console.log();
        } else {
          await client.webhooks.delete(id);
          ok({ deleted: id });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to delete webhook", "WEBHOOK_DELETE_ERROR");
      }
    });
}
