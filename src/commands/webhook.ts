import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, success, chalk, Table } from "../output.js";

export function registerWebhook(program: Command): void {
  const wh = program.command("webhook").description("Webhook management");

  wh.command("create")
    .description("Create a webhook")
    .requiredOption("--url <url>", "Webhook endpoint URL")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin("Creating webhook...") : null;
        const result = await client.webhooks.create({
          callback: opts.url,
          secret: process.env.NEUTRON_WEBHOOK_SECRET ?? crypto.randomUUID(),
        }) as any;
        spinner?.succeed(chalk.green("Webhook created"));

        if (isPretty(opts)) {
          header("Webhook Created");
          kv("ID:", result.webhookId ?? result.id ?? "—");
          kv("URL:", opts.url);
          kv("Secret:", result.secret ?? chalk.dim("(use NEUTRON_WEBHOOK_SECRET env)"));
          console.log();
        } else {
          ok(result);
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to create webhook", "WEBHOOK_CREATE_ERROR");
      }
    });

  wh.command("list")
    .description("List all webhooks")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin("Fetching webhooks...") : null;
        const result = await client.webhooks.list() as any;
        const hooks = result.data ?? result.webhooks ?? result ?? [];
        spinner?.succeed(chalk.green(`${hooks.length} webhooks`));

        if (isPretty(opts)) {
          header("Webhooks");
          const table = new Table({
            head: [chalk.cyan("ID"), chalk.cyan("URL")],
            style: { head: [], border: ["dim"] },
          });
          for (const h of hooks) {
            table.push([chalk.dim(h.webhookId ?? h.id ?? "—"), h.url ?? h.callback ?? "—"]);
          }
          console.log(table.toString());
          console.log();
        } else {
          ok({ webhooks: hooks });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to list webhooks", "WEBHOOK_LIST_ERROR");
      }
    });

  wh.command("delete <id>")
    .description("Delete a webhook by ID")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (id, opts) => {
      try {
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin(`Deleting ${id}...`) : null;
        await client.webhooks.delete(id);
        spinner?.succeed(chalk.green("Webhook deleted"));

        if (isPretty(opts)) {
          success(`Webhook ${chalk.dim(id)} deleted`);
          console.log();
        } else {
          ok({ deleted: id });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to delete webhook", "WEBHOOK_DELETE_ERROR");
      }
    });
}
