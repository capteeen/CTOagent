// TODO(phase-2) Revenue.
// - Creator fees: claim via pump.fun creator fee endpoints where the coin's
//   creator-fee recipient has been reassigned to the CTO vault.
// - Split: Rules.holderSharePct (70%) to the holder pool, the rest to vault.
// - Holder payouts: snapshot CTO holders, SPL/SOL transfers in batches, one
//   Distribution record per epoch with its tx signature.

export interface Fees {
  claimCreatorFees(ca: string): Promise<{ sol: number; txSig: string } | null>;
  distribute(poolSol: number): Promise<{ txSig: string; recipients: number }>;
  claimableFor(wallet: string): Promise<number>;
}
