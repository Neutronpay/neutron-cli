# neutron-cli

CLI for [Neutron](https://neutron.me) Lightning wallet services — for developers and AI agents.

## Install

```bash
# Run without installing
npx neutron-cli --help

# Or install globally
npm install -g neutron-cli
```

## Auth

Set your credentials as environment variables:

```bash
export NEUTRON_API_KEY=your_api_key
export NEUTRON_API_SECRET=your_api_secret
```

Or create `~/.neutron/config.json`:

```json
{
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret"
}
```

Get your API key at [portal.neutron.me](https://portal.neutron.me).

## Commands

### Verify credentials
```bash
neutron-cli auth
neutron-cli auth --pretty
```

### Check balances
```bash
neutron-cli balance
neutron-cli balance --pretty
```

### Create a Lightning invoice
```bash
neutron-cli invoice --amount 5000
neutron-cli invoice --amount 5000 --memo "order #123"
```

### Send a payment
```bash
neutron-cli send --to lnbc50u1p... --amount 5000
```

### Transactions
```bash
neutron-cli tx get txn_abc123
neutron-cli tx list
neutron-cli tx list --limit 20 --from 2026-01-01 --to 2026-03-01
```

### Exchange rate
```bash
neutron-cli rate
neutron-cli rate --currency thb
```

### Webhooks
```bash
neutron-cli webhook create --url https://example.com/webhook
neutron-cli webhook list
neutron-cli webhook delete wh_abc123
```

## Output

All commands output JSON by default (machine-readable):

```json
{"ok":true,"data":{...}}
```

Add `--pretty` for human-readable output:

```bash
neutron-cli balance --pretty
# ✅ Wallets
#   BTC    50,000 sats   (Main)
```

Errors go to stderr with exit code 1:

```json
{"error":"Missing credentials","code":"AUTH_MISSING"}
```

## For AI Agents

Any AI agent with bash/exec access can use Neutron immediately:

```bash
# Set credentials once
export NEUTRON_API_KEY=...
export NEUTRON_API_SECRET=...

# Then use in any bash tool
neutron-cli invoice --amount 1000 --memo "agent payment"
neutron-cli tx list --limit 5
neutron-cli rate --currency usd
```

No MCP setup required. Works with Claude Code, Codex, and any agent that can run shell commands.

## Links

- Docs: [docs.neutron.me](https://docs.neutron.me)
- Portal: [portal.neutron.me](https://portal.neutron.me)
- MCP package: [neutron-mcp](https://npmjs.com/package/neutron-mcp)
- SDK: [neutron-sdk](https://npmjs.com/package/neutron-sdk)
