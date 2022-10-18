import { Currency } from '@tatumio/tatum'

export enum PasswordType {
  CMD_LINE,
  AWS,
  AZURE,
  VGS,
}

export interface Signature {
  id: string
  index: number
}

export interface Wallet {
  mnemonic: string
  testnet: boolean
  privateKey: string
}

export interface SignedMnemonicWalletForChain {
  [key: string]: {
    chain?: string | undefined
    mnemonic?: string | undefined
  }
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
