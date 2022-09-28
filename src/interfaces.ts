import { Currency } from '@tatumio/tatum'

export interface Signature {
  id: string
  index: number
}

export interface ParcialWallet {
  mnemonic: string
  testnet: boolean
  privateKey: any
}

export interface PartialWallet {
  [key: string]: {
    chain?: string | undefined
    mnemonic?: string | undefined
  }
}

export interface WalletsValidationOptions {
  chain?: Currency
  id?: string
}
