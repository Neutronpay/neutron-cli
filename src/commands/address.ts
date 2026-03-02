import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk } from "../output.js";

export function registerAddress(program: Command): void {
  const addressCmd = program
    .command("address")
    .description("Get deposit addresses for your account");

  addressCmd
    .command("btc")
    .description("Get your Bitcoin on-chain deposit address")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin("Fetching BTC address...") : null;
        const result = await client.account.btcAddress();
        spinner?.succeed(chalk.green("Address loaded"));

        if (isPretty(opts)) {
          header("Bitcoin Deposit Address (On-chain)");
          kv("Address:", chalk.bold.yellow(result.address));
          kv("Network:", "Bitcoin Mainnet");
          console.log();
          console.log(chalk.dim("  💡 This is a static, reusable address for your account."));
          console.log(chalk.dim("     Scan or paste into any Bitcoin wallet to deposit."));
          console.log();
        } else {
          ok({ address: result.address, network: "BTC" });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to fetch BTC address", "ADDRESS_ERROR");
      }
    });

  addressCmd
    .command("usdt")
    .description("Get your USDT deposit address")
    .option("--chain <chain>", "Blockchain network (TRON or ETH)", "TRON")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const chain = opts.chain.toUpperCase();
        if (chain !== "TRON" && chain !== "ETH") {
          fail(`Invalid chain "${opts.chain}". Use TRON or ETH.`, "INVALID_CHAIN");
        }

        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin(`Fetching USDT address (${chain})...`) : null;
        const result = await client.account.usdtAddress(chain as "TRON" | "ETH");
        spinner?.succeed(chalk.green("Address loaded"));

        if (isPretty(opts)) {
          header(`USDT Deposit Address (${result.chain})`);
          kv("Address:", chalk.bold.yellow(result.address));
          kv("Network:", result.chain);
          kv("Currency:", "USDT (Tether)");
          console.log();
          const feeNote = result.chain === "TRON"
            ? "💡 TRON recommended — low fees and fast confirmations."
            : "💡 ETH network — higher gas fees, use for large amounts only.";
          console.log(chalk.dim(`  ${feeNote}`));
          console.log(chalk.dim("     This is a static, reusable address for your account."));
          console.log();
        } else {
          ok({ address: result.address, chain: result.chain, currency: "USDT" });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to fetch USDT address", "ADDRESS_ERROR");
      }
    });

  addressCmd
    .command("ln")
    .alias("lightning")
    .description("Get your Lightning Address (reusable, human-readable)")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin("Fetching Lightning Address...") : null;
        const account = await client.account.get();
        spinner?.succeed(chalk.green("Address loaded"));

        const username = account.extId || account.id;
        const lightningAddress = `${username}@neutron.me`;

        if (isPretty(opts)) {
          header("Lightning Address");
          kv("Address:", chalk.bold.yellow(lightningAddress));
          kv("Protocol:", "Lightning Network (LNURL)");
          console.log();
          console.log(chalk.dim("  💡 This is a permanent, reusable address."));
          console.log(chalk.dim("     Anyone can send you Bitcoin instantly by paying to this address."));
          console.log(chalk.dim("     Works with any wallet that supports Lightning Addresses."));
          console.log();
        } else {
          ok({ address: lightningAddress, protocol: "lightning", network: "LNURL" });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to fetch Lightning Address", "ADDRESS_ERROR");
      }
    });
}
