import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { TatumCardanoSDK } from '@tatumio/cardano'
import { TatumCeloSDK } from '@tatumio/celo'
import { TatumSolanaSDK } from '@tatumio/solana'
import { Currency, generateAddressFromXPub, generatePrivateKeyFromMnemonic, generateWallet } from '@tatumio/tatum'
import { generateWallet as generateKcsWallet } from '@tatumio/tatum-kcs'
import { TatumTronSDK } from '@tatumio/tron'
import { TatumXlmSDK } from '@tatumio/xlm'
import { TatumXrpSDK } from '@tatumio/xrp'
import { AxiosInstance } from 'axios'
import { AES, enc } from 'crypto-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import _ from 'lodash'
import { homedir } from 'os'
import { dirname } from 'path'
import { question } from 'readline-sync'
import { v4 as uuid } from 'uuid'
import { Config, ConfigOption } from './config'
import { PasswordType, Signature, StoreWalletValue, WalletsValidationOptions } from './interfaces'

const ensurePathExists = (path: string) => {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

const generatePrivateKey = async (mnemonic: string, currency: Currency, index: number, testnet: boolean) => {
  if (currency === Currency.ADA) {
    const cardanoSDK = TatumCardanoSDK({ apiKey: Config.getValue(ConfigOption.TATUM_API_KEY) })
    return cardanoSDK.wallet.generatePrivateKeyFromMnemonic(mnemonic, index)
  } else {
    return generatePrivateKeyFromMnemonic(currency, testnet, mnemonic, index)
  }
}

export const getPassword = async (pwdType: PasswordType, axiosInstance: AxiosInstance) => {
  if (pwdType === PasswordType.AZURE) {
    const vaultUrl = Config.getValue(ConfigOption.AZURE_VAULTURL)
    const secretName = Config.getValue(ConfigOption.AZURE_SECRETNAME)
    const secretVersion = Config.getValue(ConfigOption.AZURE_SECRETVERSION)
    const pwd = (await axiosInstance.get(`https://${vaultUrl}/secrets/${secretName}/${secretVersion}?api-version=7.1`))
      .data?.data[0]?.value
    if (!pwd) {
      console.error('Azure Vault secret does not exists.')
      process.exit(-1)
      return
    }
    return pwd
  } else if (pwdType === PasswordType.AWS) {
    const client = new SecretsManagerClient({
      region: Config.getValue(ConfigOption.AWS_REGION),
      credentials: {
        accessKeyId: Config.getValue(ConfigOption.AWS_ACCESS_KEY_ID),
        secretAccessKey: Config.getValue(ConfigOption.AWS_SECRET_ACCESS_KEY),
      },
    })
    const result = await client.send(
      new GetSecretValueCommand({ SecretId: Config.getValue(ConfigOption.AWS_SECRET_NAME) }),
    )
    if (!result.SecretString) {
      console.error('AWS secret does not exists.')
      process.exit(-1)
      return
    }
    return JSON.parse(result.SecretString)[Config.getValue(ConfigOption.AWS_SECRET_KEY)]
  } else if (pwdType === PasswordType.VGS) {
    const username = Config.getValue(ConfigOption.VGS_USERNAME)
    const password = Config.getValue(ConfigOption.VGS_PASSWORD)
    const alias = Config.getValue(ConfigOption.VGS_ALIAS)
    const pwd = (
      await axiosInstance.get(`https://api.live.verygoodvault.com/aliases/${alias}`, {
        auth: {
          username,
          password,
        },
      })
    ).data?.data[0]?.value
    if (!pwd) {
      console.error('VGS Vault alias does not exists.')
      process.exit(-1)
      return
    }
    return pwd
  } else {
    return Config.getValue(ConfigOption.KMS_PASSWORD)
  }
}

export const exportWallets = (pwd: string, path?: string) => {
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet file.` }, null, 2))
    return
  }
  const data = readFileSync(pathToWallet, { encoding: 'utf8' })
  if (!data?.length) {
    console.error(JSON.stringify({ error: `No such wallet file.` }, null, 2))
    return
  }
  console.log(JSON.stringify(JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8)), null, 2))
}

export const getManagedWallets = (pwd: string, chain: string, testnet: boolean, path?: string) => {
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet file.` }, null, 2))
    return []
  }
  const data = readFileSync(pathToWallet, { encoding: 'utf8' })
  if (!data?.length) {
    return []
  }
  const wallets = JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8))
  const keys = []
  for (const walletsKey in wallets) {
    if (chain === wallets[walletsKey].chain && testnet === wallets[walletsKey].testnet) {
      keys.push(walletsKey)
    }
  }
  return keys
}

const generatePureWallet = async (chain: Currency, testnet: boolean, mnemonic?: string) => {
  let wallet: any
  if (chain === Currency.SOL) {
    const sdk = TatumSolanaSDK({ apiKey: '' })
    wallet = sdk.wallet.wallet()
  } else if (chain === Currency.XRP) {
    const sdk = TatumXrpSDK({ apiKey: '' })
    wallet = sdk.wallet.wallet()
  } else if (chain === Currency.XLM) {
    const sdk = TatumXlmSDK({ apiKey: '' })
    wallet = sdk.wallet.wallet()
  } else if (chain === Currency.KCS) {
    wallet = await generateKcsWallet(mnemonic, { testnet })
  } else if (chain === Currency.CELO) {
    const sdk = TatumCeloSDK({ apiKey: '' })
    wallet = sdk.wallet.generateWallet(mnemonic, { testnet })
  } else if (chain === Currency.ADA) {
    const cardanoSDK = TatumCardanoSDK({ apiKey: Config.getValue(ConfigOption.TATUM_API_KEY) })
    wallet = await cardanoSDK.wallet.generateWallet(mnemonic)
  } else if (chain === Currency.TRON) {
    const sdk = TatumTronSDK({ apiKey: '' })
    wallet = sdk.wallet.generateWallet(mnemonic)
  } else {
    wallet = await generateWallet(chain, testnet, mnemonic)
  }
  return wallet
}

export const storeWallet = async (
  chain: Currency,
  testnet: boolean,
  pwd: string,
  path?: string,
  mnemonic?: string,
  print = true,
) => {
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  const wallet = await generatePureWallet(chain, testnet, mnemonic)
  const key = uuid()
  const entry = { [key]: { ...wallet, chain, testnet } }
  if (!existsSync(pathToWallet)) {
    ensurePathExists(pathToWallet)
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(entry), pwd).toString())
  } else {
    const data = readFileSync(pathToWallet, { encoding: 'utf8' })
    let walletData = entry
    if (data?.length > 0) {
      walletData = { ...walletData, ...JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8)) }
    }
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(walletData), pwd).toString())
  }
  const value: StoreWalletValue = { signatureId: key }
  if (wallet.address) {
    value.address = wallet.address
  }
  if (wallet.xpub) {
    value.xpub = wallet.xpub
  }
  if (print) {
    console.log(JSON.stringify(value, null, 2))
  }
  return { ...wallet, ...value }
}

export const storePrivateKey = async (
  chain: Currency,
  testnet: boolean,
  privateKey: string,
  pwd: string,
  path?: string,
  print = true,
) => {
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  const key = uuid()
  const entry = { [key]: { privateKey, chain, testnet } }
  if (!existsSync(pathToWallet)) {
    ensurePathExists(pathToWallet)
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(entry), pwd).toString())
  } else {
    const data = readFileSync(pathToWallet, { encoding: 'utf8' })
    let walletData = entry
    if (data?.length > 0) {
      walletData = { ...walletData, ...JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8)) }
    }
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(walletData), pwd).toString())
  }
  if (print) {
    console.log(JSON.stringify({ signatureId: key }, null, 2))
  }
  return { signatureId: key }
}

export const generateManagedPrivateKeyBatch = async (
  chain: Currency,
  count: string,
  testnet: boolean,
  pwd: string,
  path?: string,
) => {
  Config.getValue(ConfigOption.KMS_PASSWORD)
  const cnt = Number(count)
  for (let i = 0; i < cnt; i++) {
    const wallet = await generatePureWallet(chain, testnet)
    let address: any
    if (wallet.address) {
      address = wallet.address
    } else {
      if (chain === Currency.ADA) {
        const cardanoSDK = TatumCardanoSDK({ apiKey: Config.getValue(ConfigOption.TATUM_API_KEY) })
        address = await cardanoSDK.wallet.generateAddressFromXPub(wallet.xpub, 1, { testnet })
      } else {
        address = await generateAddressFromXPub(chain, testnet, wallet.xpub, 1)
      }
    }
    const privateKey = wallet.secret ? wallet.secret : await generatePrivateKey(wallet.mnemonic, chain, 1, testnet)
    const { signatureId } = await storePrivateKey(chain, testnet, privateKey as string, pwd, path, false)
    console.log(JSON.stringify({ signatureId, address }))
  }
}

export const getWalletFromPath = (errorMessage: string, path?: string, pwd?: string) => {
  if (_.isNil(path) || _.isNil(pwd)) {
    console.error('No path or password entered')
    return
  }
  const password = pwd ?? Config.getValue(ConfigOption.KMS_PASSWORD)
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  if (!existsSync(pathToWallet)) {
    console.error(errorMessage)
    return
  }
  const data = readFileSync(pathToWallet, { encoding: 'utf8' })
  if (!data?.length) {
    console.error(errorMessage)
    return
  }
  return JSON.parse(AES.decrypt(data, password).toString(enc.Utf8))
}

// TODO: validate all properties from wallet and create a type or interface to replace any bellow
export const isWalletsValid = (wallets: any, options: WalletsValidationOptions) => {
  if (Object.keys(wallets).length === 0) {
    console.error(JSON.stringify({ error: `No such wallet for chain '${options.chain}'.` }, null, 2))
    return false
  }
  if (options.id && !wallets[options.id]) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${options.id}'.` }, null, 2))
    return false
  }

  return true
}

export const getWalletForSignature = async (signature: Signature, pwd: string, path?: string, print = true) => {
  const wallet = await getWallet(signature.id, pwd, path, print)
  if (wallet.mnemonic) {
    if (_.isNil(signature.index)) {
      console.error(`Wrong usage of mnemonic-based signature id. No index provided for ${signature.id}.`)
      return undefined
    }
    const privateKey = await generatePrivateKey(wallet.mnemonic, wallet.chain, signature.index, wallet.testnet)
    return { ...wallet, privateKey, privateKeyIndex: signature.index }
  } else if (wallet.privateKey) {
    return wallet
  }
  return undefined
}

export const getWallet = async (id: string, pwd: string, path?: string, print = true) => {
  try {
    const data = getWalletFromPath(
      JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2),
      path || homedir() + '/.tatumrc/wallet.dat',
      pwd,
    )
    if (!data && !isWalletsValid(data, { id })) {
      return
    }
    if (print) {
      console.log(JSON.stringify(data[id], null, 2))
    }
    return data[id]
  } catch (e) {
    console.error(JSON.stringify({ error: `Wrong password.` }, null, 2))
    return
  }
}

export const getPrivateKey = async (id: string, index: string, path?: string, password?: string, print = true) => {
  const pwd = password ?? Config.getValue(ConfigOption.KMS_PASSWORD)
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2))
    return null
  }
  const data = readFileSync(pathToWallet, { encoding: 'utf8' })
  if (!data?.length) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2))
    return null
  }
  const wallet = JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8))
  if (!wallet[id]) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2))
    return null
  }
  const pk = {
    privateKey: wallet[id].secret
      ? wallet[id].secret
      : await generatePrivateKey(wallet[id].mnemonic, wallet[id].chain, parseInt(index), wallet[id].testnet),
  }
  if (print) {
    console.log(JSON.stringify(pk, null, 2))
  }
  return pk.privateKey as string
}

export const getAddress = async (id: string, index: string, path?: string, pwd?: string, print = true) => {
  const password = pwd ?? Config.getValue(ConfigOption.KMS_PASSWORD)
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2))
    return null
  }
  const data = readFileSync(pathToWallet, { encoding: 'utf8' })
  if (!data?.length) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2))
    return null
  }
  const wallet = JSON.parse(AES.decrypt(data, password).toString(enc.Utf8))
  if (!wallet[id]) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2))
    return null
  }
  let pk: { address: any }
  if (wallet[id].address) {
    pk = {
      address: wallet[id].address,
    }
  } else {
    if (wallet[id].chain === Currency.ADA) {
      const cardanoSDK = TatumCardanoSDK({ apiKey: Config.getValue(ConfigOption.TATUM_API_KEY) })
      pk = {
        address: await cardanoSDK.wallet.generateAddressFromXPub(wallet[id].xpub, parseInt(index), {
          testnet: wallet[id].testnet,
        }),
      }
    } else {
      pk = {
        address: await generateAddressFromXPub(wallet[id].chain, wallet[id].testnet, wallet[id].xpub, parseInt(index)),
      }
    }
  }
  if (print) {
    console.log(JSON.stringify(pk, null, 2))
  }
  return { address: pk.address }
}

export const removeWallet = async (id: string, pwd: string, path?: string) => {
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2))
    return
  }
  const data = readFileSync(pathToWallet, { encoding: 'utf8' })
  if (!data?.length) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2))
    return
  }
  const wallet = JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8))
  delete wallet[id]
  writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(wallet), pwd).toString())
}

function parseWalletStoreName(pwdType: PasswordType): string {
  if (pwdType === PasswordType.CMD_LINE) {
    return 'LOCAL'
  } else if (pwdType === PasswordType.VGS) {
    return 'VGS'
  } else if (pwdType === PasswordType.AZURE) {
    return 'AZURE'
  } else if (pwdType === PasswordType.AWS) {
    return 'AWS'
  }
  return 'N/A'
}

function hidePassword(password: string | undefined, showSymbols = 6): string {
  if (!password) {
    return ''
  }
  if (password.length <= showSymbols) {
    return '*'.repeat(password.length)
  }
  return password.slice(0, showSymbols) + '*'.repeat(password.length - showSymbols)
}

function secretValue(secretValue: string | undefined): string {
  if (!secretValue) {
    return 'N/A'
  }
  return hidePassword(secretValue)
}

export const checkConfig = (pwdType: PasswordType, envFile?: string, path?: string) => {
  const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat'
  console.log(`Version                          : ${process.env.npm_package_version ?? 'N/A'}`)
  console.log(`Wallet file path                 : ${pathToWallet}`)
  console.log(`Wallet exists                    : ${existsSync(pathToWallet)}`)
  console.log(`Wallet store type                : ${parseWalletStoreName(pwdType)}`)
  console.log(`Environment vars file            : ${envFile ?? 'N/A'}`)
  console.log(`TATUM_API_KEY                    : ${secretValue(process.env.TATUM_API_KEY)}`)
  console.log(`TATUM_KMS_PASSWORD               : ${secretValue(process.env.TATUM_KMS_PASSWORD)}`)
  console.log(`TATUM_KMS_VGS_ALIAS              : ${secretValue(process.env.TATUM_KMS_VGS_ALIAS)}`)
  console.log(`TATUM_KMS_VGS_USERNAME           : ${secretValue(process.env.TATUM_KMS_VGS_USERNAME)}`)
  console.log(`TATUM_KMS_VGS_PASSWORD           : ${secretValue(process.env.TATUM_KMS_VGS_PASSWORD)}`)
  console.log(`TATUM_KMS_AZURE_SECRETVERSION    : ${secretValue(process.env.TATUM_KMS_AZURE_SECRETVERSION)}`)
  console.log(`TATUM_KMS_AZURE_SECRETNAME       : ${secretValue(process.env.TATUM_KMS_AZURE_SECRETNAME)}`)
  console.log(`TATUM_KMS_AZURE_VAULTURL         : ${secretValue(process.env.TATUM_KMS_AZURE_VAULTURL)}`)
  console.log(`TATUM_KMS_AWS_REGION             : ${process.env.TATUM_KMS_AWS_REGION ?? 'N/A'}`)
  console.log(`TATUM_KMS_AWS_ACCESS_KEY_ID      : ${secretValue(process.env.TATUM_KMS_AWS_ACCESS_KEY_ID)}`)
  console.log(`TATUM_KMS_AWS_SECRET_ACCESS_KEY  : ${secretValue(process.env.TATUM_KMS_AWS_SECRET_ACCESS_KEY)}`)
  console.log(`TATUM_KMS_AWS_SECRET_NAME        : ${secretValue(process.env.TATUM_KMS_AWS_SECRET_NAME)}`)
  console.log(`TATUM_KMS_AWS_SECRET_KEY         : ${secretValue(process.env.TATUM_KMS_AWS_SECRET_KEY)}`)
  console.log(`TATUM_KMS_DEBUG_MODE             : ${process.env.TATUM_KMS_DEBUG_MODE ?? 'N/A'}`)    
}

export const setTatumKey = (apiKey: string) => {
  if (apiKey) {
    process.env.TATUM_API_KEY = apiKey
  }
}

export const getQuestion = (q: string, e?: string) => {
  if (e) {
    return e
  }
  return question(q, {
    hideEchoBack: true,
  })
}
