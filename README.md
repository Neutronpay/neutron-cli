# neutron-cli

CLI for [Neutron](https://neutron.me) Lightning wallet services — for developers and AI agents.

## Install

```bash
npm install -g neutron-cli
```

Then use it from anywhere:

```bash
neutron-cli auth
neutron-cli balance
neutron-cli rate
```

> **Note:** If you just want to try it without installing, use `npx neutron-cli --help`. But for regular use, global install is recommended.

## Setup

First time you run any command, you'll be prompted for your credentials:

```
⚡ Welcome to Neutron CLI
  Get your API key at: https://portal.neutron.me

  API Key:    ****************
  API Secret: ****************

  ✅ Credentials saved to ~/.neutron/config.json
```

Credentials are stored in `~/.neutron/config.json` with `600` permissions (private to you). You'll never be prompted again.

## Commands

### Verify credentials
```bash
neutron-cli auth
```

### Check balances
```bash
neutron-cli balance
```

### Create a Lightning invoice
```bash
neutron-cli invoice --amount 5000
neutron-cli invoice --amount 5000 --memo "order #123"
```

### Send a payment — auto-detects payment type
```bash
# Lightning (BOLT11 invoice)
neutron-cli send --to lnbc50u1p... --amount 5000

# Bitcoin on-chain (auto-detected from address format)
neutron-cli send --to 1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf... --amount 5000

# USDT on TRON (auto-detected from T... address)
neutron-cli send --to TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE --amount 10 --currency USDT

# USDT on ETH (auto-detected from 0x... address)
neutron-cli send --to 0xAbC123... --amount 10 --currency USDT
```

> `send` automatically detects the payment type from the destination address — no flags needed:
> - `lnbc...` → Lightning
> - `1...`, `3...`, `bc1...` → Bitcoin on-chain
> - `T...` → USDT on TRON
> - `0x...` → USDT on Ethereum

### Get deposit addresses
```bash
neutron-cli address ln                   # Lightning Address (user@neutron.me)
neutron-cli address btc                  # Bitcoin on-chain deposit address
neutron-cli address usdt                 # USDT on TRON (default)
neutron-cli address usdt --chain ETH     # USDT on Ethereum
```

### Swap currencies
```bash
neutron-cli swap --from BTC --to USDT --amount 1000   # BTC → USDT (amount in sats)
neutron-cli swap --from USDT --to BTC --amount 10     # USDT → BTC
```

### Fiat payouts
```bash
# List banks for a country
neutron-cli fiat institutions --country VN

# Send fiat payout (KYC required)
neutron-cli fiat payout \
  --amount 0.001 \
  --from BTC \
  --to VND \
  --method vnd-instant \
  --bank-account 0123456789 \
  --bank-code 970422 \
  --recipient "LE VAN A" \
  --country VN
```

> Fiat payouts require KYC verification. If not verified, you'll see:
> ```
> ⚠️  Fiat payouts require KYC verification.
>    Complete KYC at: https://portal.neutron.me
>    (Bitcoin, USDT, and Lightning don't require KYC)
> ```

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

### Manage config
```bash
neutron-cli config init    # set up credentials
neutron-cli config show    # show current credentials (masked)
neutron-cli config test    # test credentials against API
```

### Update
```bash
neutron-cli update         # update to latest version
```

## Output

TUI (colored, human-readable) is the default. Add `--json` for machine-readable output:

```bash
neutron-cli balance --json
# {"ok":true,"data":{"wallets":[...]}}
```

Errors go to stderr with exit code 1:
```json
{"error":"Missing credentials","code":"AUTH_MISSING"}
```

## For AI Agents

Any AI agent with bash/exec access can use Neutron immediately — no MCP setup required:

```bash
export NEUTRON_API_KEY=...
export NEUTRON_API_SECRET=...

neutron-cli invoice --amount 1000 --memo "agent payment" --json
neutron-cli tx list --limit 5 --json
neutron-cli rate --currency usd --json
neutron-cli send --to lnbc... --amount 1000 --json
```

Works with Claude Code, Codex, and any agent that can run shell commands.

## Links

- Docs: [docs.neutron.me](https://docs.neutron.me)
- Portal: [portal.neutron.me](https://portal.neutron.me)
- MCP package: [neutron-mcp](https://npmjs.com/package/neutron-mcp)
- SDK: [neutron-sdk](https://npmjs.com/package/neutron-sdk)
