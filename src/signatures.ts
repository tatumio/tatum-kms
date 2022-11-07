import { PendingTransaction } from '@tatumio/api-client'
import { TatumSolanaSDK } from '@tatumio/solana'
import { TatumXlmSDK } from '@tatumio/xlm'
import { TatumXrpSDK } from '@tatumio/xrp'
import { TatumCeloSDK } from '@tatumio/celo'
import { TatumTronSDK } from '@tatumio/tron'
import { TatumBscSDK } from '@tatumio/bsc'
import {
  adaBroadcast,
  algorandBroadcast,
  bcashBroadcast,
  bnbBroadcast,
  btcBroadcast,
  Currency,
  dogeBroadcast,
  egldBroadcast,
  generatePrivateKeyFromMnemonic,
  ltcBroadcast,
  offchainBroadcast,
  signAdaKMSTransaction,
  signAdaOffchainKMSTransaction,
  signAlgoKMSTransaction,
  signBitcoinCashKMSTransaction,
  signBitcoinCashOffchainKMSTransaction,
  signBitcoinKMSTransaction,
  signBitcoinOffchainKMSTransaction,
  signBnbKMSTransaction,
  signDogecoinKMSTransaction,
  signDogecoinOffchainKMSTransaction,
  signEgldKMSTransaction,
  signLitecoinKMSTransaction,
  signLitecoinOffchainKMSTransaction,
  signVetKMSTransaction,
  TransactionKMS,
  vetBroadcast,
} from '@tatumio/tatum'
import { AxiosInstance } from 'axios'
import { getManagedWallets, getWallet, getWalletWithMnemonicForChain } from './management'
import { KMS_CONSTANTS, MNEMONIC_BASED_CHAINS } from './constants'
import _ from 'lodash'
import { Signature, Wallet } from './interfaces'
import { TatumFlowSDK } from '@tatumio/flow'
import { TatumPolygonSDK } from '@tatumio/polygon'
import { TatumKcsSDK } from '@tatumio/kcs'
import { TatumXdcSDK } from '@tatumio/xdc'
import { TatumKlaytnSDK } from '@tatumio/klaytn'
import { TatumEthSDK } from '@tatumio/eth'
import { TatumOneSDK } from '@tatumio/one'

const TATUM_URL = process.env.TATUM_API_URL || 'https://api.tatum.io'

const getPrivateKeys = async (wallets: Wallet[], signatures: Signature[], currency: Currency): Promise<string[]> => {
  const keys: string[] = []
  if (!wallets || wallets?.length === 0) {
    return keys
  }
  for (const w of wallets) {
    if (signatures.length > 0) {
      for (const s of signatures) {
        if (!_.isNil(w.mnemonic) && !_.isNil(s.index)) {
          const key = await generatePrivateKeyFromMnemonic(currency, w.testnet, w.mnemonic, s.index)
          if (key) keys.push(key)
        }
      }
    } else {
      keys.push(w.privateKey)
    }
  }

  return keys
}

const processTransaction = async (
  blockchainSignature: TransactionKMS,
  testnet: boolean,
  pwd: string,
  axios: AxiosInstance,
  path?: string,
  externalUrl?: string,
) => {
  if (externalUrl) {
    console.log(`${new Date().toISOString()} - External url '${externalUrl}' is present, checking against it.`)
    try {
      await axios.get(`${externalUrl}/${blockchainSignature.id}`)
    } catch (e) {
      console.error(e)
      console.error(
        `${new Date().toISOString()} - Transaction not found on external system. ID: ${blockchainSignature.id}`,
      )
      return
    }
  }
  const wallets = []
  for (const hash of blockchainSignature.hashes) {
    wallets.push(await getWallet(hash, pwd, path, false))
  }
  const signatures = blockchainSignature.signatures ?? []
  if (signatures.length > 0) {
    wallets.push(...((await getWalletWithMnemonicForChain(blockchainSignature.chain, path, pwd, false)) ?? []))
  }

  if (!wallets.length) {
    console.error(
      `${new Date().toISOString()} - Bad signatureId for signing transaction: not found. ID: ${blockchainSignature.id}`,
    )
    return
  }

  let txData = ''
  console.log(
    `${new Date().toISOString()} - Processing pending transaction - ${JSON.stringify(blockchainSignature, null, 2)}.`,
  )

  if (
    MNEMONIC_BASED_CHAINS.includes(blockchainSignature.chain) &&
    wallets[0].mnemonic &&
    blockchainSignature.index === undefined
  ) {
    console.error(
      `${new Date().toISOString()} - Bad format for mnemonic signing transaction: "index" not found. ID: ${
        blockchainSignature.id
      }`,
    )
    return
  }

  const apiKey = process.env.TATUM_API_KEY as string
  const url = TATUM_URL as any

  switch (blockchainSignature.chain) {
    case Currency.ALGO: {
      const algoSecret = wallets[0].secret ? wallets[0].secret : wallets[0].privateKey
      await algorandBroadcast(
        await signAlgoKMSTransaction(blockchainSignature, algoSecret, testnet),
        blockchainSignature.id,
      )
      return
    }
    case Currency.SOL: {
      const solSDK = TatumSolanaSDK({ apiKey, url })
      txData = await solSDK.kms.sign(
        blockchainSignature as PendingTransaction,
        wallets.map(w => w.privateKey),
      )
      await axios.post(
        `${TATUM_URL}/v3/solana/broadcast`,
        { txData, signatureId: blockchainSignature.id },
        { headers: { 'x-api-key': apiKey } },
      )
      return
    }
    case Currency.BCH: {
      if (blockchainSignature.withdrawalId) {
        txData = await signBitcoinCashOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet)
      } else {
        await bcashBroadcast(
          await signBitcoinCashKMSTransaction(
            blockchainSignature,
            wallets.map(w => w.privateKey),
            testnet,
          ),
          blockchainSignature.id,
        )
        return
      }
      break
    }
    case Currency.BNB: {
      await bnbBroadcast(
        await signBnbKMSTransaction(blockchainSignature, wallets[0].privateKey, testnet),
        blockchainSignature.id,
      )
      return
    }
    case Currency.VET: {
      const pk =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await generatePrivateKeyFromMnemonic(
              Currency.BNB,
              wallets[0].testnet,
              wallets[0].mnemonic,
              blockchainSignature.index,
            )
          : wallets[0].privateKey
      await vetBroadcast(await signVetKMSTransaction(blockchainSignature, pk, testnet), blockchainSignature.id)
      return
    }
    case Currency.XRP: {
      const xrpSdk = TatumXrpSDK({ apiKey, url })
      txData = await xrpSdk.kms.sign(blockchainSignature as PendingTransaction, wallets[0].secret)
      await xrpSdk.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.XLM: {
      const xlmSdk = TatumXlmSDK({ apiKey, url })
      txData = await xlmSdk.kms.sign(blockchainSignature as PendingTransaction, wallets[0].secret, testnet)
      await xlmSdk.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.ETH: {
      const ethSDK = TatumEthSDK({ apiKey, url })
      const ethPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await ethSDK.wallet.generatePrivateKeyFromMnemonic(wallets[0].mnemonic, blockchainSignature.index, {
              testnet: wallets[0].testnet,
            })
          : wallets[0].privateKey

      txData = await ethSDK.kms.sign(blockchainSignature as PendingTransaction, ethPrivateKey)
      if (!blockchainSignature.withdrawalId) {
        await ethSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
        return
      }
      break
    }
    case Currency.FLOW: {
      const flowSdk = TatumFlowSDK({ apiKey, url, testnet })

      const secret =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await flowSdk.wallet.generatePrivateKeyFromMnemonic(wallets[0].mnemonic, blockchainSignature.index)
          : wallets[0].privateKey
      await flowSdk.call.broadcast(
        (await flowSdk.kms.sign(blockchainSignature as PendingTransaction, [secret]))?.txId,
        blockchainSignature.id,
      )
      return
    }
    case Currency.ONE: {
      const oneSDK = TatumOneSDK({ apiKey, url })
      const onePrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await oneSDK.wallet.generatePrivateKeyFromMnemonic(wallets[0].mnemonic, blockchainSignature.index, {
              testnet: wallets[0].testnet,
            })
          : wallets[0].privateKey

      txData = await oneSDK.kms.sign(blockchainSignature as PendingTransaction, onePrivateKey)
      if (!blockchainSignature.withdrawalId) {
        await oneSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
        return
      }
      break
    }
    case Currency.CELO: {
      const celoPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await generatePrivateKeyFromMnemonic(
              Currency.CELO,
              wallets[0].testnet,
              wallets[0].mnemonic,
              blockchainSignature.index,
            )
          : wallets[0].privateKey
      const celoSDK = TatumCeloSDK({ apiKey, url })
      txData = await celoSDK.kms.sign(blockchainSignature as PendingTransaction, celoPrivateKey)
      await celoSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.BSC: {
      const bscSDK = TatumBscSDK({ apiKey, url })
      const bscPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await bscSDK.wallet.generatePrivateKeyFromMnemonic(wallets[0].mnemonic, blockchainSignature.index, {
              testnet: wallets[0].testnet,
            })
          : wallets[0].privateKey
      txData = await bscSDK.kms.sign(blockchainSignature as PendingTransaction, bscPrivateKey)
      await bscSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.MATIC: {
      const polygonSDK = TatumPolygonSDK({ apiKey, url })
      const polygonPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await polygonSDK.wallet.generatePrivateKeyFromMnemonic(wallets[0].mnemonic, blockchainSignature.index, {
              testnet: wallets[0].testnet,
            })
          : wallets[0].privateKey
      txData = await polygonSDK.kms.sign(blockchainSignature as PendingTransaction, polygonPrivateKey)
      await polygonSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.KLAY: {
      const klaytnSDK = TatumKlaytnSDK({ apiKey, url })
      const kcsPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await klaytnSDK.wallet.generatePrivateKeyFromMnemonic(wallets[0].mnemonic, blockchainSignature.index, {
              testnet: wallets[0].testnet,
            })
          : wallets[0].privateKey
      txData = await klaytnSDK.kms.sign(blockchainSignature as PendingTransaction, kcsPrivateKey)
      await klaytnSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.KCS: {
      const kcsSDK = TatumKcsSDK({ apiKey, url })
      const kcsPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await kcsSDK.wallet.generatePrivateKeyFromMnemonic(wallets[0].mnemonic, blockchainSignature.index, {
              testnet: wallets[0].testnet,
            })
          : wallets[0].privateKey
      txData = await kcsSDK.kms.sign(blockchainSignature as PendingTransaction, kcsPrivateKey)
      await kcsSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.XDC: {
      const xdcSDK = TatumXdcSDK({ apiKey, url })
      const xdcPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await xdcSDK.wallet.generatePrivateKeyFromMnemonic(wallets[0].mnemonic, blockchainSignature.index, {
              testnet: wallets[0].testnet,
            })
          : wallets[0].privateKey
      txData = await xdcSDK.kms.sign(blockchainSignature as PendingTransaction, xdcPrivateKey)
      await xdcSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.EGLD: {
      const egldPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await generatePrivateKeyFromMnemonic(
              Currency.EGLD,
              wallets[0].testnet,
              wallets[0].mnemonic,
              blockchainSignature.index,
            )
          : wallets[0].privateKey
      await egldBroadcast(await signEgldKMSTransaction(blockchainSignature, egldPrivateKey), blockchainSignature.id)
      return
    }
    case Currency.TRON: {
      const tronPrivateKey =
        wallets[0].mnemonic && blockchainSignature.index !== undefined
          ? await generatePrivateKeyFromMnemonic(
              Currency.TRON,
              wallets[0].testnet,
              wallets[0].mnemonic,
              blockchainSignature.index,
            )
          : wallets[0].privateKey
      const tronSDK = TatumTronSDK({ apiKey, url })
      txData = await tronSDK.kms.sign(blockchainSignature as PendingTransaction, tronPrivateKey)
      await axios.post(
        `${TATUM_URL}/v3/tron/broadcast`,
        { txData, signatureId: blockchainSignature.id },
        { headers: { 'x-api-key': apiKey } },
      )
      return
    }
    case Currency.BTC: {
      const privateKeys = await getPrivateKeys(wallets, signatures, Currency.BTC)
      if (blockchainSignature.withdrawalId) {
        txData = await signBitcoinOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet)
      } else {
        await btcBroadcast(await signBitcoinKMSTransaction(blockchainSignature, privateKeys), blockchainSignature.id)
      }

      break
    }
    case Currency.LTC: {
      const privateKeys = await getPrivateKeys(wallets, signatures, Currency.LTC)
      if (blockchainSignature.withdrawalId) {
        txData = await signLitecoinOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet)
      } else {
        await ltcBroadcast(
          await signLitecoinKMSTransaction(blockchainSignature, privateKeys, testnet),
          blockchainSignature.id,
        )
        return
      }
      break
    }
    case Currency.DOGE: {
      if (blockchainSignature.withdrawalId) {
        txData = await signDogecoinOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet)
      } else {
        await dogeBroadcast(
          await signDogecoinKMSTransaction(
            blockchainSignature,
            wallets.map(w => w.privateKey),
            testnet,
          ),
          blockchainSignature.id,
        )
        return
      }
      break
    }
    case Currency.ADA: {
      if (blockchainSignature.withdrawalId) {
        txData = await signAdaOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet)
      } else {
        await adaBroadcast(
          await signAdaKMSTransaction(
            blockchainSignature,
            wallets.map(w => w.privateKey),
          ),
          blockchainSignature.id,
        )
        return
      }
    }
  }
  await offchainBroadcast({
    currency: blockchainSignature.chain,
    signatureId: blockchainSignature.id,
    withdrawalId: blockchainSignature.withdrawalId,
    txData,
  })
}

const getPendingTransactions = async (
  axios: AxiosInstance,
  chain: Currency,
  signatureIds: string[],
): Promise<TransactionKMS[]> => {
  if (signatureIds.length > KMS_CONSTANTS.SIGNATURE_IDS) {
    console.error(
      `${new Date().toISOString()} - Error: Exceeded limit ${KMS_CONSTANTS.SIGNATURE_IDS} wallets for chain ${chain}.`,
    )
    return []
  }

  console.log(
    `${new Date().toISOString()} - Getting pending transaction from ${chain} for ${
      signatureIds.length > KMS_CONSTANTS.OUTPUT_WALLETS ? signatureIds.length + ' ' : ''
    }wallets${signatureIds.length > KMS_CONSTANTS.OUTPUT_WALLETS ? '' : ' ' + signatureIds.join(',')}.`,
  )
  try {
    const url = `${TATUM_URL}/v3/kms/pending/${chain}`
    const { data } = await axios.post(
      url,
      { signatureIds },
      { headers: { 'x-api-key': process.env.TATUM_API_KEY as string } },
    )
    return data as TransactionKMS[]
  } catch (e) {
    console.error(
      `${new Date().toISOString()} - Error received from API /v3/kms/pending/${chain} - ${(e as any).config.data}: ` +
        e,
    )
  }
  return []
}

export const processSignatures = async (
  pwd: string,
  testnet: boolean,
  axios: AxiosInstance,
  path?: string,
  chains?: Currency[],
  externalUrl?: string,
  period = 5,
) => {
  let running = false
  const supportedChains = chains || [
    Currency.BCH,
    Currency.VET,
    Currency.XRP,
    Currency.XLM,
    Currency.ETH,
    Currency.BTC,
    Currency.MATIC,
    Currency.KLAY,
    Currency.LTC,
    Currency.DOGE,
    Currency.CELO,
    Currency.BSC,
    Currency.SOL,
    Currency.TRON,
    Currency.BNB,
    Currency.FLOW,
    Currency.XDC,
    Currency.EGLD,
    Currency.ONE,
    Currency.ADA,
    Currency.ALGO,
    Currency.KCS,
  ]
  setInterval(async () => {
    if (running) {
      return
    }
    running = true

    const transactions = []
    try {
      for (const supportedChain of supportedChains) {
        const wallets = getManagedWallets(pwd, supportedChain, testnet, path)
        transactions.push(...(await getPendingTransactions(axios, supportedChain, wallets)))
      }
    } catch (e) {
      console.error(e)
    }
    const data = []
    for (const transaction of transactions) {
      try {
        await processTransaction(transaction, testnet, pwd, axios, path, externalUrl)
      } catch (e) {
        const msg = (<any>e).response ? JSON.stringify((<any>e).response.data, null, 2) : `${e}`
        data.push({ signatureId: transaction.id, error: msg })
        console.error(`${new Date().toISOString()} - Could not process transaction id ${transaction.id}, error: ${msg}`)
      }
    }
    if (data.length > 0) {
      try {
        const url = `${TATUM_URL}/v3/tatum/kms/batch`
        await axios.post(url, { errors: data }, { headers: { 'x-api-key': process.env.TATUM_API_KEY as string } })
        console.log(`${new Date().toISOString()} - Send batch call to url '${url}'.`)
      } catch (e) {
        console.error(
          `${new Date().toISOString()} - Error received from API /v3/tatum/kms/batch - ${(<any>e).config.data}`,
        )
      }
    }
    running = false
  }, period * 1000)
}
