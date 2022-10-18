import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager';
import {TatumSolanaSDK} from '@tatumio/solana';
import {Currency, generateAddressFromXPub, generatePrivateKeyFromMnemonic, generateWallet} from '@tatumio/tatum'
import {generateWallet as generateKcsWallet} from '@tatumio/tatum-kcs'
import {AxiosInstance} from 'axios';
import {AES, enc} from 'crypto-js'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs'
import _ from 'lodash'
import {homedir} from 'os'
import {dirname} from 'path'
import {question} from 'readline-sync'
import {v4 as uuid} from 'uuid'
import {Config, ConfigOption} from './config'
import {PasswordType, SignedMnemonicWalletForChain, StoreWalletValue, WalletsValidationOptions} from './interfaces'

const config = new Config()
const ensurePathExists = (path: string) => {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export const getPassword = async (pwdType: PasswordType, axiosInstance: AxiosInstance) => {
  if (pwdType === PasswordType.AZURE) {
    const vaultUrl = config.getValue(ConfigOption.AZURE_VAULTURL)
    const secretName = config.getValue(ConfigOption.AZURE_SECRETNAME)
    const secretVersion = config.getValue(ConfigOption.AZURE_SECRETVERSION)
    const pwd = (await axiosInstance.get(`https://${vaultUrl}/secrets/${secretName}/${secretVersion}?api-version=7.1`))
        .data?.data[0]?.value
    if (!pwd) {
      console.error('Azure Vault secret does not exists.')
      process.exit(-1)
      return
    }
    return pwd
  } else if (pwdType === PasswordType.AWS) {
    const client = new SecretsManagerClient({ region: config.getValue(ConfigOption.AWS_REGION), credentials: {
        accessKeyId: config.getValue(ConfigOption.AWS_ACCESS_KEY_ID),
        secretAccessKey: config.getValue(ConfigOption.AWS_SECRET_ACCESS_KEY),
      } })
    const result = await client.send(new GetSecretValueCommand({ SecretId: config.getValue(ConfigOption.AWS_SECRET_NAME) }))
    if (!result.SecretString) {
      console.error('AWS secret does not exists.')
      process.exit(-1)
      return
    }
    return JSON.parse(result.SecretString)[config.getValue(ConfigOption.AWS_SECRET_KEY)]
  } else if (pwdType === PasswordType.VGS) {
    const username = config.getValue(ConfigOption.VGS_USERNAME)
    const password = config.getValue(ConfigOption.VGS_PASSWORD)
    const alias = config.getValue(ConfigOption.VGS_ALIAS)
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
    return config.getValue(ConfigOption.KMS_PASSWORD)
  }
}

export const exportWallets = (pwd: string, path1: string | undefined, path?: string) => {
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
    const sdk = TatumSolanaSDK({apiKey: ''})
    wallet = sdk.wallet.wallet()
  } else if (chain === Currency.KCS) {
    wallet = await generateKcsWallet(mnemonic, { testnet })
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
  config.getValue(ConfigOption.KMS_PASSWORD)
  const cnt = Number(count)
  for (let i = 0; i < cnt; i++) {
    const wallet = await generatePureWallet(chain, testnet)
    const address = wallet.address ? wallet.address : await generateAddressFromXPub(chain, testnet, wallet.xpub, 1)
    const privateKey = wallet.secret
      ? wallet.secret
      : await generatePrivateKeyFromMnemonic(chain, testnet, wallet.mnemonic, 1)
    const { signatureId } = await storePrivateKey(chain, testnet, privateKey as string, pwd, path, false)
    console.log(`{ signatureId: ${signatureId}, address: ${address} }`)
  }
}

export const getWalletFromPath = (errorMessage: string, path?: string, pwd?: string) => {
  if (_.isNil(path) || _.isNil(pwd)) {
    console.error('No path or password entered')
    return
  }
  const password = pwd ?? config.getValue(ConfigOption.KMS_PASSWORD)
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

export const findWalletWithMnemonic = (walletData: Partial<SignedMnemonicWalletForChain>, chain: Currency) => {
  return Object.keys(walletData)
    .filter(k => walletData[k]?.chain === chain && !_.isNil(walletData[k]?.mnemonic))
    .reduce((wallets, k) => ({ ...wallets, [k]: walletData[k] }), {})
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

export const getWalletWithMnemonicForChain = async (chain: Currency, path?: string, pwd?: string, print = true) => {
  try {
    const data = getWalletFromPath(
      JSON.stringify({ error: `No such wallet for chain '${chain}'.` }, null, 2),
      path || homedir() + '/.tatumrc/wallet.dat',
      pwd,
    )
    const wallets = findWalletWithMnemonic(data, chain)
    if (!wallets && !isWalletsValid(wallets, { chain })) {
      return
    }
    if (print) {
      console.log(JSON.stringify(wallets, null, 2))
    }
    return Object.values(wallets)
  } catch (e) {
    console.error(JSON.stringify({ error: `Wrong password.` }, null, 2))
    return
  }
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
  const pwd = password ?? config.getValue(ConfigOption.KMS_PASSWORD)
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
      : await generatePrivateKeyFromMnemonic(
          wallet[id].chain,
          wallet[id].testnet,
          wallet[id].mnemonic,
          parseInt(index),
        ),
  }
  if (print) {
    console.log(JSON.stringify(pk, null, 2))
  }
  return pk.privateKey as string
}

export const getAddress = async (id: string, index: string, path?: string, pwd?: string, print = true) => {
  const password = pwd ?? config.getValue(ConfigOption.KMS_PASSWORD)
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
  const pk = {
    address: wallet[id].address
      ? wallet[id].address
      : await generateAddressFromXPub(wallet[id].chain, wallet[id].testnet, wallet[id].xpub, parseInt(index)),
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

export const getTatumKey = (apiKey: string) => {
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
