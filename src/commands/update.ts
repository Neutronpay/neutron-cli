import { Command } from "commander";
import { execSync } from "child_process";

const { version: current } = require("../../package.json") as { version: string };

export function registerUpdate(program: Command): void {
  program
    .command("update")
    .description("Update neutron-cli to the latest version")
    .action(async () => {
      try {
        // Check latest version
        const res = await fetch("https://registry.npmjs.org/neutron-cli/latest", {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error("Could not reach npm registry");
        const { version: latest } = (await res.json()) as { version: string };

        if (latest === current) {
          console.log(`✅ Already on latest version (${current})`);
          return;
        }

        console.log(`⚡ Updating neutron-cli ${current} → ${latest}...`);

        // Detect how it was installed
        let cmd: string;
        try {
          const which = execSync("which neutron-cli", { encoding: "utf8" }).trim();
          if (which.includes(".npm") || which.includes("npm-global") || which.includes("/bin/neutron-cli")) {
            cmd = "npm install -g neutron-cli@latest";
          } else {
            cmd = "npm install -g neutron-cli@latest";
          }
        } catch {
          cmd = "npm install -g neutron-cli@latest";
        }

        console.log(`Running: ${cmd}`);
        execSync(cmd, { stdio: "inherit" });
        console.log(`\n✅ Updated to neutron-cli@${latest}`);
      } catch (e: any) {
        process.stderr.write(
          JSON.stringify({ error: e?.message ?? "Update failed", code: "UPDATE_ERROR" }) + "\n"
        );
        process.stderr.write(
          "\nTo update manually:\n  npm install -g neutron-cli@latest\n"
        );
        process.exit(1);
      }
    });
}
