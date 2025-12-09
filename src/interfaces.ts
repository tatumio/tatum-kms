import { Currency } from '@tatumio/tatum'

export enum PasswordType {
  CMD_LINE,
  AWS,
  AZURE,
  VGS,
  GCP,
}

export interface Signature {
  id: string
  index: number
}

export interface Wallet {
  mnemonic: string
  xpub: string
  testnet: boolean
  privateKey: string
  secret: string
  chain: Currency
}

export interface WalletsValidationOptions {
  chain?: Currency
  id?: string
}

export interface StoreWalletValue {
  signatureId: string
  address?: string
  xpub?: string
}

export type ExternalUrlMethod = 'GET' | 'POST'

export type Report = {
  system: {
    kmsVersion: string
    nodeVersion: string
    store: {
      type: string
      exists: boolean
    }
  }
  wallets: Record<string, ReportWallet>
  apiKey: string
  warnings?: string[]
}

export type ReportWallet = {
  type: WalletType
  chain: Currency
  testnet: boolean
  warnings?: string[]
}

export enum WalletType {
  MNEMONIC = 'MNEMONIC',
  PRIVATE_KEY = 'PRIVATE_KEY',
  SECRET = 'SECRET',
  OTHER = 'OTHER',
}

export enum WalletStoreType {
  LOCAL = 'LOCAL',
  VGS = 'VGS',
  AZURE = 'AZURE',
  AWS = 'AWS',
  NA = 'N/A',
}
