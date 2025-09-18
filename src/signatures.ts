import { PendingTransaction } from '@tatumio/api-client'
import { TatumCardanoSDK } from '@tatumio/cardano'
import { TatumCeloSDK } from '@tatumio/celo'
import { TatumSolanaSDK } from '@tatumio/solana'
import {
  algorandBroadcast,
  bcashBroadcast,
  bnbBroadcast,
  bscBroadcast,
  btcBroadcast,
  Currency,
  dogeBroadcast,
  egldBroadcast,
  ethBroadcast,
  generatePrivateKeyFromMnemonic,
  klaytnBroadcast,
  ltcBroadcast,
  offchainBroadcast,
  oneBroadcast,
  polygonBroadcast,
  signAlgoKMSTransaction,
  signBitcoinCashKMSTransaction,
  signBitcoinCashOffchainKMSTransaction,
  signBitcoinKMSTransaction,
  signBitcoinOffchainKMSTransaction,
  signBnbKMSTransaction,
  signBscKMSTransaction,
  signDogecoinKMSTransaction,
  signDogecoinOffchainKMSTransaction,
  signEgldKMSTransaction,
  signEthKMSTransaction,
  signEthOffchainKMSTransaction,
  signKlayKMSTransaction,
  signLitecoinKMSTransaction,
  signLitecoinOffchainKMSTransaction,
  signOneKMSTransaction,
  signPolygonKMSTransaction,
  signVetKMSTransaction,
  signXdcKMSTransaction,
  TransactionKMS,
  vetBroadcast,
  xdcBroadcast,
} from '@tatumio/tatum'
import {
  broadcast as kcsBroadcast,
  generatePrivateKeyFromMnemonic as kcsGeneratePrivateKeyFromMnemonic,
  signKMSTransaction as signKcsKMSTransaction,
} from '@tatumio/tatum-kcs'
import { TatumTronSDK } from '@tatumio/tron'
import { TatumXlmSDK } from '@tatumio/xlm'
import { TatumXrpSDK } from '@tatumio/xrp'
import { AxiosInstance } from 'axios'
import _ from 'lodash'
import { KMS_CONSTANTS } from './constants'
import { ExternalUrlMethod, Wallet } from './interfaces'
import { getManagedWallets, getWallet, getWalletForSignature } from './management'
import semver from 'semver'
import { Config, ConfigOption } from './config'
import { version } from '../package.json'

const TATUM_URL: string = process.env.TATUM_API_URL || 'https://api.tatum.io'

const getPrivateKeys = async (wallets: Wallet[]): Promise<string[]> => {
  const keys: string[] = wallets.filter(wallet => wallet.privateKey).map(wallet => wallet.privateKey)
  if (keys?.length === 0) {
    throw new Error(
      `Wallets with requested private keys were not found. Most likely mnemonic-based wallet was used without index parameter (see docs: https://apidoc.tatum.io/)`,
    )
  }

  const result = [...new Set(keys)]
  if (result.filter(key => !_.isString(key)).length > 0) {
    console.error(`${new Date().toISOString()} - Some of private keys for transaction have incorrect format`)
  }

  return result
}

function validatePrivateKeyWasFound(wallet: any, blockchainSignature: TransactionKMS, privateKey: string | undefined) {
  if (privateKey) return

  const index = blockchainSignature.index
  const signatureIdsLog = getSignatureIdsLog(blockchainSignature)
  if (isValidNumber(index)) {
    if (_.isNil(wallet.mnemonic)) {
      throw new Error(
        `Private key was not found. Wallet ${signatureIdsLog} is private key based, but KMS transaction ${blockchainSignature.id} requires mnemonic based, since tx was requested with index param. Please use mnemonic based wallet and signatureId (see docs: https://apidoc.tatum.io/)`,
      )
    }
  } else {
    if (_.isNil(wallet.privateKey)) {
      throw new Error(
        `Private key was not found. Wallet ${signatureIdsLog} is mnemonic based, but KMS transaction ${blockchainSignature.id} requires private key based, since tx was requested without index param. Please use another private key based wallet id or specify 'index' parameter for this mnemonic based wallet during request call (see docs: https://apidoc.tatum.io/)`,
      )
    }
  }
}

const processTransaction = async (
  blockchainSignature: TransactionKMS,
  testnet: boolean,
  pwd: string,
  axios: AxiosInstance,
  path?: string,
  externalUrl?: string,
  externalUrlMethod?: ExternalUrlMethod,
) => {
  if (externalUrl) {
    console.log(`${new Date().toISOString()} - External url '${externalUrl}' is present, checking against it.`)
    try {
      if (externalUrlMethod === 'POST') {
        await axios.post(`${externalUrl}/${blockchainSignature.id}`, blockchainSignature)
      } else {
        await axios.get(`${externalUrl}/${blockchainSignature.id}`)
      }
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
    const wallet = await getWallet(hash, pwd, path, false)
    if (wallet) {
      wallets.push(wallet)
    }
  }

  const signatures = blockchainSignature.signatures ?? []
  for (const signature of signatures) {
    const wallet = await getWalletForSignature(signature, pwd, path, false)
    if (wallet) {
      wallets.push(wallet)
    }
  }

  let txData = ''
  console.log(
    `${new Date().toISOString()} - Processing pending transaction - ${JSON.stringify(blockchainSignature, null, 2)}.`,
  )

  const apiKey = Config.getValue(ConfigOption.TATUM_API_KEY)

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
      const solSDK = TatumSolanaSDK({ apiKey, url: TATUM_URL as any })
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
        const privateKeys = await getPrivateKeys(wallets)
        await bcashBroadcast(
          await signBitcoinCashKMSTransaction(blockchainSignature, privateKeys, testnet),
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
      const wallet = wallets[0]
      const pk =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.BNB,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, pk)
      await vetBroadcast(await signVetKMSTransaction(blockchainSignature, pk, testnet), blockchainSignature.id)
      return
    }
    case Currency.XRP: {
      const xrpSdk = TatumXrpSDK({ apiKey, url: TATUM_URL as any })
      const xrpSecret = wallets[0].secret ? wallets[0].secret : wallets[0].privateKey
      txData = await xrpSdk.kms.sign(blockchainSignature as any, xrpSecret)
      await xrpSdk.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.XLM: {
      const xlmSdk = TatumXlmSDK({ apiKey, url: TATUM_URL as any })
      const xlmSecret = wallets[0].secret ? wallets[0].secret : wallets[0].privateKey
      txData = await xlmSdk.kms.sign(blockchainSignature as any, xlmSecret, testnet)
      await xlmSdk.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.ETH: {
      const wallet = wallets[0]
      const privateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.ETH,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, privateKey)
      if (blockchainSignature.withdrawalId) {
        txData = await signEthOffchainKMSTransaction(blockchainSignature, privateKey, testnet)
      } else {
        const signKMSTransaction = await signEthKMSTransaction(blockchainSignature, privateKey)
        const debugMode = Config.getValue(ConfigOption.TATUM_KMS_DEBUG_MODE) || 0
        if (debugMode === 'true' || debugMode === '1') {
          console.log('signEthKMSTransaction data', signKMSTransaction, blockchainSignature.id)
        }
        await ethBroadcast(signKMSTransaction, blockchainSignature.id)
        return
      }
      break
    }
    case Currency.ONE: {
      const wallet = wallets[0]
      const onePrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.ONE,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, onePrivateKey)
      txData = await signOneKMSTransaction(blockchainSignature, onePrivateKey, testnet)
      if (!blockchainSignature.withdrawalId) {
        await oneBroadcast(txData, blockchainSignature.id)
        return
      }
      break
    }
    case Currency.CELO: {
      const wallet = wallets[0]
      const celoPrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.CELO,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, celoPrivateKey)
      const celoSDK = TatumCeloSDK({ apiKey, url: TATUM_URL as any })
      txData = await celoSDK.kms.sign(blockchainSignature as PendingTransaction, celoPrivateKey)
      await celoSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id })
      return
    }
    case Currency.BSC: {
      const wallet = wallets[0]
      const bscPrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.BSC,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, bscPrivateKey)
      await bscBroadcast(await signBscKMSTransaction(blockchainSignature, bscPrivateKey), blockchainSignature.id)
      return
    }
    case Currency.MATIC: {
      const wallet = wallets[0]
      const polygonPrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.MATIC,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, polygonPrivateKey)
      await polygonBroadcast(
        await signPolygonKMSTransaction(blockchainSignature, polygonPrivateKey, testnet),
        blockchainSignature.id,
      )
      return
    }
    case Currency.KLAY: {
      const wallet = wallets[0]
      const klaytnPrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.KLAY,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, klaytnPrivateKey)
      await klaytnBroadcast(
        await signKlayKMSTransaction(blockchainSignature, klaytnPrivateKey, testnet),
        blockchainSignature.id,
      )
      return
    }
    case Currency.KCS: {
      const wallet = wallets[0]
      const kcsPrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await kcsGeneratePrivateKeyFromMnemonic(wallet.testnet, wallet.mnemonic, blockchainSignature.index)
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, kcsPrivateKey)
      await kcsBroadcast(await signKcsKMSTransaction(blockchainSignature, kcsPrivateKey), blockchainSignature.id)
      return
    }
    case Currency.XDC: {
      const wallet = wallets[0]
      const xdcPrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.XDC,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, xdcPrivateKey)
      await xdcBroadcast(await signXdcKMSTransaction(blockchainSignature, xdcPrivateKey), blockchainSignature.id)
      return
    }
    case Currency.EGLD: {
      const wallet = wallets[0]
      const egldPrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.EGLD,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, egldPrivateKey)
      await egldBroadcast(await signEgldKMSTransaction(blockchainSignature, egldPrivateKey), blockchainSignature.id)
      return
    }
    case Currency.TRON: {
      const wallet = wallets[0]
      const tronPrivateKey =
        wallet.mnemonic && !_.isNil(blockchainSignature.index)
          ? await generatePrivateKeyFromMnemonic(
              Currency.TRON,
              wallet.testnet,
              wallet.mnemonic,
              blockchainSignature.index,
            )
          : wallet.privateKey
      validatePrivateKeyWasFound(wallet, blockchainSignature, tronPrivateKey)
      const tronSDK = TatumTronSDK({ apiKey, url: TATUM_URL as any })
      txData = await tronSDK.kms.sign(blockchainSignature as PendingTransaction, tronPrivateKey)
      await axios.post(
        `${TATUM_URL}/v3/tron/broadcast`,
        { txData, signatureId: blockchainSignature.id },
        { headers: { 'x-api-key': apiKey } },
      )
      return
    }
    case Currency.BTC: {
      if (blockchainSignature.withdrawalId) {
        txData = await signBitcoinOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet)
      } else {
        const privateKeys = await getPrivateKeys(wallets)
        await btcBroadcast(await signBitcoinKMSTransaction(blockchainSignature, privateKeys), blockchainSignature.id)
        return
      }

      break
    }
    case Currency.LTC: {
      if (blockchainSignature.withdrawalId) {
        txData = await signLitecoinOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet)
      } else {
        const privateKeys = await getPrivateKeys(wallets)
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
        const privateKeys = await getPrivateKeys(wallets)
        await dogeBroadcast(
          await signDogecoinKMSTransaction(blockchainSignature, privateKeys, testnet),
          blockchainSignature.id,
        )
        return
      }
      break
    }
    case Currency.ADA: {
      const cardanoSDK = TatumCardanoSDK({ apiKey, url: TATUM_URL as any })
      if (blockchainSignature.withdrawalId) {
        const privateKeys = []
        const w: { [walletId: string]: { mnemonic: string } } = {}
        for (const signature of blockchainSignature.signatures || []) {
          if (signature.id in w) {
            privateKeys.push(
              await cardanoSDK.wallet.generatePrivateKeyFromMnemonic(w[signature.id].mnemonic, signature.index),
            )
          } else {
            w[signature.id] = await getWallet(signature.id, pwd, path, false)
            privateKeys.push(
              await cardanoSDK.wallet.generatePrivateKeyFromMnemonic(w[signature.id].mnemonic, signature.index),
            )
          }
        }
        txData = await cardanoSDK.kms.sign(blockchainSignature as PendingTransaction, privateKeys, { testnet })
      } else {
        await cardanoSDK.blockchain.broadcast({
          txData: await cardanoSDK.kms.sign(
            blockchainSignature as PendingTransaction,
            wallets.map(w => w.privateKey),
            { testnet },
          ),
          signatureId: blockchainSignature.id,
        })
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

const versionUpdateState = {
  lastCheck: Date.now(),
  running: false,
  level: 'WARN',
  message: '',
  latestVersion: '',
  currentVersion: '',
  logFunction: console.log,
}

/**
 * Check for latest version from core api. If there is a new version, log it to console.
 * Check - once per 1 min
 * Log about update - once per 30 sec
 * @param versionUpdateHeader
 */
const processVersionUpdateHeader = (versionUpdateHeader: string) => {
  if (!versionUpdateHeader || versionUpdateState.running || versionUpdateState.lastCheck + 60 * 1000 > Date.now()) {
    return
  }

  versionUpdateState.lastCheck = Date.now()

  const parts = versionUpdateHeader.split(';')
  versionUpdateState.latestVersion = parts[0]?.toLowerCase()?.trim()
  versionUpdateState.level = parts[1]?.toUpperCase()?.trim()
  versionUpdateState.logFunction = versionUpdateState.level === 'ERROR' ? console.error : console.log
  versionUpdateState.message = parts[2]?.trim()
  versionUpdateState.currentVersion = version ?? ''

  if (
    !versionUpdateState.running &&
    versionUpdateState.latestVersion &&
    versionUpdateState.currentVersion &&
    versionUpdateState.level &&
    versionUpdateState.message &&
    semver.gt(versionUpdateState.latestVersion, versionUpdateState.currentVersion)
  ) {
    versionUpdateState.running = true
    setInterval(async () => {
      versionUpdateState.logFunction(
        `${new Date().toISOString()} - ${versionUpdateState.level}: ${versionUpdateState.message}. Current version: ${
          versionUpdateState.currentVersion
        }. Latest version: ${versionUpdateState.latestVersion}`,
      )
    }, 30000)
  }
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
    const response = await axios.post(
      url,
      { signatureIds },
      {
        headers: {
          'x-api-key': Config.getValue(ConfigOption.TATUM_API_KEY),
          'x-ttm-kms-client-version': version ?? '',
        },
      },
    )
    const { data } = response
    processVersionUpdateHeader(response.headers['x-ttm-kms-latest-version'])
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
  externalUrlMethod?: ExternalUrlMethod,
  period = 5,
  runOnce?: boolean,
  wallets?: string[],
  transactionIds?: string[],
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
    Currency.XDC,
    Currency.EGLD,
    Currency.ONE,
    Currency.ADA,
    Currency.ALGO,
    Currency.KCS,
  ]

  if (runOnce) {
    await processPendingTransactions(supportedChains, pwd, testnet, path, axios, externalUrl, externalUrlMethod, wallets, transactionIds)
    return
  }

  setInterval(async () => {
    if (running) {
      return
    }
    running = true

    await processPendingTransactions(supportedChains, pwd, testnet, path, axios, externalUrl, externalUrlMethod)

    running = false
  }, period * 1000)
}

async function processPendingTransactions(
  supportedChains: Currency[],
  pwd: string,
  testnet: boolean,
  path: string | undefined,
  axios: AxiosInstance,
  externalUrl: string | undefined,
  externalUrlMethod: ExternalUrlMethod | undefined,
  wallets?: string[],
  transactionIds?: string[],
) {
  const transactions = []
  try {
    for (const supportedChain of supportedChains) {
      const walletsToProcess = wallets || getManagedWallets(pwd, supportedChain, testnet, path)
      transactions.push(...(await getPendingTransactions(axios, supportedChain, walletsToProcess)))
    }
  } catch (e) {
    console.error(e)
  }
  const data = []
  for (const transaction of transactions) {
    try {
      if (isTransactionIdExcluded(transaction, transactionIds)) {
        console.log(`${new Date().toISOString()} - Tx processing skipped: ${transaction.id}. Expected one of: ${transactionIds?.join(', ')}`);
        continue;
      }
      await processTransaction(transaction, testnet, pwd, axios, path, externalUrl, externalUrlMethod)
      console.log(`${new Date().toISOString()} - Tx was processed: ${transaction.id}`)
    } catch (e) {
      const msg = (<any>e).response ? JSON.stringify((<any>e).response.data, null, 2) : `${e}`
      data.push({ signatureId: transaction.id, error: msg })
      console.error(`${new Date().toISOString()} - Could not process transaction id ${transaction.id}, error: ${msg}`)
    }
  }
  if (data.length > 0) {
    try {
      const url = `${TATUM_URL}/v3/tatum/kms/batch`
      await axios.post(url, { errors: data }, { headers: { 'x-api-key': Config.getValue(ConfigOption.TATUM_API_KEY) } })
      console.log(`${new Date().toISOString()} - Send batch call to url '${url}'.`)
    } catch (e) {
      console.error(
        `${new Date().toISOString()} - Error received from API /v3/tatum/kms/batch - ${(<any>e).config.data}`,
      )
    }
  }
}

function isTransactionIdExcluded(transaction: TransactionKMS, transactionIds?: string[]) {
  return transactionIds && !transactionIds.includes(transaction.id)
}

function isValidNumber(value: number | undefined): boolean {
  return !_.isNil(value) && _.isNumber(value) && _.isFinite(value)
}

function getSignatureIdsLog(blockchainSignature: TransactionKMS): string {
  const signatures = [...blockchainSignature.hashes, ...(blockchainSignature.signatures?.map(value => value.id) ?? [])]
  return signatures ? signatures.join(',') : ''
}
