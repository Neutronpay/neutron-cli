// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: current } = require("../package.json") as { version: string };

export async function checkForUpdate(): Promise<void> {
  try {
    const res = await fetch("https://registry.npmjs.org/neutron-cli/latest", {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return;
    const { version: latest } = (await res.json()) as { version: string };
    if (latest && latest !== current) {
      process.stderr.write(
        `\n⚡ Update available: ${current} → ${latest}\n   Run: npm install -g neutron-cli\n\n`
      );
    }
  } catch {
    // silent — never block the CLI for an update check
  }
}
