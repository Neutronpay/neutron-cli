#!/usr/bin/env node
import { Command } from "commander";
import { checkForUpdate } from "./update-check.js";
import { registerAuth } from "./commands/auth.js";
import { registerBalance } from "./commands/balance.js";
import { registerInvoice } from "./commands/invoice.js";
import { registerSend } from "./commands/send.js";
import { registerTx } from "./commands/tx.js";
import { registerRate } from "./commands/rate.js";
import { registerWebhook } from "./commands/webhook.js";
import { registerUpdate } from "./commands/update.js";
import { registerConfig } from "./commands/config.js";

const program = new Command();

program
  .name("neutron-cli")
  .description("CLI for Neutron Lightning wallet — for developers and AI agents")
  .version(require("../package.json").version)
  .option("--json", "Output as JSON (default; explicit flag for agent use)")
  .option("--pretty", "Output as human-readable text");

registerConfig(program);
registerAuth(program);
registerBalance(program);
registerInvoice(program);
registerSend(program);
registerTx(program);
registerRate(program);
registerWebhook(program);
registerUpdate(program);

checkForUpdate(); // non-blocking, fires in background

program.parseAsync(process.argv).catch((e) => {
  process.stderr.write(JSON.stringify({ error: e?.message ?? "Unknown error", code: "FATAL" }) + "\n");
  process.exit(1);
});
