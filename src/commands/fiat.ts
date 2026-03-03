import { Command } from "commander";
import { getClient } from "../client.js";
import { ok, fail, isPretty, spin, header, kv, chalk, Table, warn } from "../output.js";

const KYC_PORTAL_URL = "https://portal.neutron.me";

export function registerFiat(program: Command): void {
  const fiatCmd = program
    .command("fiat")
    .description("Fiat payout operations");

  fiatCmd
    .command("institutions")
    .description("List banks and financial institutions for a country")
    .requiredOption("--country <code>", "Country code (e.g., VN, PH, TH)")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const country = opts.country.toUpperCase();
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin(`Fetching banks for ${country}...`) : null;
        const institutions = await client.fiat.institutions(country);
        spinner?.succeed(chalk.green(`Found ${institutions.length} institutions`));

        if (isPretty(opts)) {
          header(`Banks & Institutions (${country})`);
          if (institutions.length === 0) {
            console.log(chalk.dim("  No institutions found for this country."));
            console.log();
            return;
          }
          const table = new Table({
            head: [chalk.cyan("Code"), chalk.cyan("Name")],
            style: { head: [], border: ["dim"] },
          });
          for (const inst of institutions) {
            table.push([chalk.bold(inst.code), inst.name]);
          }
          console.log(table.toString());
          console.log(chalk.dim(`\n  Use the code with: neutron-cli fiat payout --bank-code <code>\n`));
        } else {
          ok({ country, institutions });
        }
      } catch (e: any) {
        fail(e?.message ?? "Failed to fetch institutions", "FIAT_ERROR");
      }
    });

  fiatCmd
    .command("payout")
    .description("Create a fiat payout to a bank account")
    .requiredOption("--amount <btc>", "Amount in BTC (e.g., 0.001)")
    .requiredOption("--from <currency>", "Source currency (e.g., BTC)")
    .requiredOption("--to <currency>", "Destination fiat currency (e.g., VND)")
    .requiredOption("--method <method>", "Payment method (e.g., vnd-instant)")
    .requiredOption("--bank-account <number>", "Bank account number")
    .requiredOption("--bank-code <code>", "Bank/institution code")
    .requiredOption("--recipient <name>", "Recipient legal full name")
    .requiredOption("--country <code>", "Recipient country code (e.g., VN)")
    .option("--sender-name <name>", "Sender legal full name (defaults to account display name)")
    .option("--sender-country <code>", "Sender country code (defaults to account country)")
    .option("--json", "Output raw JSON (for scripts/agents)")
    .action(async (opts) => {
      try {
        const client = await getClient(opts);
        const spinner = isPretty(opts) ? spin("Checking account...") : null;

        // KYC check — fiat payouts require verification
        const account = await client.account.get() as any;
        const kycStatus = account.kycStatus ?? account.accountStatus ?? account.kycVerified ?? account.status;
        const ruleGroup = account.txnLegPairRuleGroup?.name ?? '';

        // KYC verified if: status is active/verified AND rule group is NOT non-kyb
        const isKycVerified = (
          kycStatus === "verified" || kycStatus === "kyc_verified" ||
          kycStatus === "active" || kycStatus === "ACTIVE"
        ) && !ruleGroup.includes('non-kyb');
        
        if (!isKycVerified) {
          spinner?.stop();
          console.log();
          warn("Fiat payouts require KYC verification.");
          console.log(chalk.dim("   Please complete KYC at: ") + chalk.cyan.underline(KYC_PORTAL_URL));
          console.log(chalk.dim("   (Bitcoin, USDT, and Lightning payments don't require KYC)"));
          console.log();
          process.exit(1);
        }

        if (spinner) spinner.text = "Creating payout...";
        const sourceAmount = parseFloat(opts.amount);
        const sourceCcy = opts.from.toUpperCase();
        const destCcy = opts.to.toUpperCase();
        const destMethod = opts.method.toLowerCase();
        const countryCode = opts.country.toUpperCase();

        // Sender KYC — use provided values or fall back to account KYC info
        const kycDetails = account.kyc?.details ?? account.kycDetails ?? {};
        const senderName = opts.senderName || kycDetails.legalFullName || account.beneficialAccountName || account.displayName || account.extId || "Account Holder";
        const senderCountryCode = (opts.senderCountry || kycDetails.countryCode || account.countryCode || "VN").toUpperCase();
        const senderAddress = kycDetails.address1 || kycDetails.address || "N/A";
        const senderPhone = kycDetails.contactNumber || kycDetails.phone || "N/A";

        const txn = await client.fiat.payout({
          sourceCcy,
          sourceAmount,
          destCcy,
          destMethod,
          bankAcctNum: opts.bankAccount,
          institutionCode: opts.bankCode,
          recipientName: opts.recipient,
          countryCode,
          senderName,
          senderCountryCode,
          senderAddress,
          senderPhone,
        }) as any;

        const txnId = txn.txnId ?? txn.id;

        if (spinner) spinner.text = "Confirming payout...";
        const confirmed = await client.transactions.confirm(txnId) as any;
        spinner?.succeed(chalk.green("Payout submitted"));

        if (isPretty(opts)) {
          header("Fiat Payout Submitted");
          kv("Transaction ID:", chalk.bold(txnId));
          kv("Status:", chalk.green(confirmed.txnState ?? confirmed.status ?? "Processing"));
          kv("Amount Sent:", chalk.yellow(`${sourceAmount} ${sourceCcy}`));
          if (txn.fxRate) {
            kv("Exchange Rate:", txn.fxRate.toString());
          }
          kv("Destination:", `${destCcy} → ${opts.recipient}`);
          kv("Bank:", opts.bankCode);
          console.log();
        } else {
          ok({ txnId, status: confirmed.txnState ?? confirmed.status, transaction: confirmed });
        }
      } catch (e: any) {
        fail(e?.message ?? "Fiat payout failed", "PAYOUT_ERROR");
      }
    });
}
