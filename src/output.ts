import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";

export { chalk, Table, ora };

export function ok(data: unknown): void {
  process.stdout.write(JSON.stringify({ ok: true, data }) + "\n");
}

export function fail(message: string, code = "ERROR", exitCode = 1): never {
  process.stderr.write(JSON.stringify({ error: message, code }) + "\n");
  process.exit(exitCode);
}

/** TUI is default. Only raw JSON when --json is explicitly passed. */
export function isPretty(opts: { pretty?: boolean; json?: boolean }): boolean {
  return !opts.json;
}

/** Spinner — returns ora instance so caller can .succeed()/.fail() it */
export function spin(text: string) {
  return ora({ text, color: "cyan" }).start();
}

/** Print a header line */
export function header(text: string): void {
  console.log("\n" + chalk.bold.cyan(text));
}

/** Print a key-value line */
export function kv(key: string, value: string): void {
  console.log(`  ${chalk.dim(key.padEnd(14))} ${chalk.white(value)}`);
}

/** Print a success line */
export function success(text: string): void {
  console.log(chalk.green("✅ " + text));
}

/** Print a warning line */
export function warn(text: string): void {
  console.log(chalk.yellow("⚠️  " + text));
}
