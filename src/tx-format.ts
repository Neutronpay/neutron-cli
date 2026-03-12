export type TxLike = Record<string, any>;

function pickFirstNumber(values: Array<unknown>): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function toSatsFromBtc(value: number): number {
  return Math.round(value * 1e8);
}

export function deriveTxnState(tx: TxLike): string {
  return String(tx?.txnState ?? tx?.status ?? "—");
}

export function deriveTxnType(tx: TxLike): string {
  return String(tx?.txnType ?? tx?.type ?? "—");
}

export function deriveTxnCurrency(tx: TxLike): string {
  return String(tx?.destReq?.ccy ?? tx?.sourceReq?.ccy ?? tx?.currency ?? "BTC").toUpperCase();
}

export function deriveTxnAmountRaw(tx: TxLike): number | null {
  const type = deriveTxnType(tx).toLowerCase();
  const isPayoutLike = ["payout", "send", "withdrawal"].includes(type);

  const payoutCandidates = [
    tx?.destReq?.amtSettled,
    tx?.destReq?.amtRequested,
    tx?.sourceReq?.amtSettled,
    tx?.sourceReq?.amtRequested,
    tx?.amount,
  ];

  const receiveCandidates = [
    tx?.sourceReq?.amtSettled,
    tx?.sourceReq?.amtRequested,
    tx?.destReq?.amtSettled,
    tx?.destReq?.amtRequested,
    tx?.amount,
  ];

  return pickFirstNumber(isPayoutLike ? payoutCandidates : receiveCandidates);
}

export function formatTxnAmount(tx: TxLike): string {
  const amount = deriveTxnAmountRaw(tx);
  if (amount === null) return "—";

  const currency = deriveTxnCurrency(tx);
  if (currency === "BTC") {
    const sats = amount <= 1 ? toSatsFromBtc(amount) : Math.round(amount);
    return `${sats.toLocaleString()} sats`;
  }

  return `${amount.toLocaleString()} ${currency}`;
}

export function deriveTxnDate(tx: TxLike): string {
  return String(tx?.createdAt ?? tx?.createAt ?? tx?.created_at ?? "—");
}

export function deriveTxnUpdatedDate(tx: TxLike): string {
  return String(tx?.updatedAt ?? tx?.updateAt ?? tx?.updated_at ?? "—");
}
