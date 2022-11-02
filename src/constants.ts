import { Currency } from '@tatumio/tatum'

export const KMS_CONSTANTS = {
  SIGNATURE_IDS: 25_000, // Limit of generated signatureId per blockchain
  OUTPUT_WALLETS: 5, // limit of wallets for console output
}

export const MNEMONIC_BASED_CHAINS = [
  Currency.VET,
  Currency.ETH,
  Currency.FLOW,
  Currency.ONE,
  Currency.CELO,
  Currency.BSC,
  Currency.MATIC,
  Currency.KLAY,
  Currency.XDC,
  Currency.KCS,
  Currency.EGLD,
  Currency.TRON,
]
