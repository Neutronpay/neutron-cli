/** Output helpers — JSON (default) or pretty human-readable */

export function ok(data: unknown): void {
  process.stdout.write(JSON.stringify({ ok: true, data }) + "\n");
}

export function fail(message: string, code = "ERROR", exitCode = 1): never {
  process.stderr.write(JSON.stringify({ error: message, code }) + "\n");
  process.exit(exitCode);
}

export function isPretty(opts: { pretty?: boolean }): boolean {
  return !!opts.pretty;
}

export function pretty(lines: string[]): void {
  console.log(lines.join("\n"));
}
