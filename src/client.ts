import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Neutron } from "neutron-sdk";
import { fail } from "./output.js";

interface Config {
  apiKey: string;
  apiSecret: string;
}

function loadConfig(): Config {
  // 1. Env vars
  const apiKey = process.env.NEUTRON_API_KEY;
  const apiSecret = process.env.NEUTRON_API_SECRET;
  if (apiKey && apiSecret) return { apiKey, apiSecret };

  // 2. ~/.neutron/config.json
  try {
    const cfgPath = join(homedir(), ".neutron", "config.json");
    const raw = readFileSync(cfgPath, "utf8");
    const cfg = JSON.parse(raw) as Partial<Config>;
    if (cfg.apiKey && cfg.apiSecret) return cfg as Config;
  } catch {
    // file not found or malformed — fall through
  }

  fail(
    "Missing credentials. Set NEUTRON_API_KEY and NEUTRON_API_SECRET env vars, " +
      "or create ~/.neutron/config.json with { \"apiKey\": \"...\", \"apiSecret\": \"...\" }",
    "AUTH_MISSING"
  );
}

let _client: Neutron | null = null;

export function getClient(): Neutron {
  if (!_client) {
    const cfg = loadConfig();
    _client = new Neutron({ apiKey: cfg.apiKey, apiSecret: cfg.apiSecret });
  }
  return _client;
}
