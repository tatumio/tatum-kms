#!/usr/bin/env node
import { Currency, generateWallet } from '@tatumio/tatum'
import axios from 'axios'
import dotenv from 'dotenv'
import meow from 'meow'
import { ExternalUrlMethod, PasswordType } from './interfaces'
import {
  checkConfig,
  exportWallets,
  generateManagedPrivateKeyBatch,
  getAddress,
  getPassword,
  getPrivateKey,
  getQuestion,
  getWallet,
  removeWallet,
  report,
  setTatumKey,
  storePrivateKey,
  storeWallet,
} from './management'
import { processSignatures } from './signatures'
import HttpAgent from 'agentkeepalive'
import { existsSync } from 'fs'
import * as process from 'process'
import { homedir } from 'os'
import { utils } from './utils'

dotenv.config()

const httpAgent = new HttpAgent({
  maxSockets: 4,
  maxFreeSockets: 2,
  timeout: 60000, // up to 110000, but I would stay with 60s
  freeSocketTimeout: 30000,
})

const httpsAgent = new HttpAgent.HttpsAgent({
  maxSockets: 4,
  maxFreeSockets: 2,
  timeout: 60000, // up to 110000, but I would stay with 60s
  freeSocketTimeout: 30000,
})

axios.defaults.httpAgent = httpAgent
axios.defaults.httpsAgent = httpsAgent

const axiosInstance = axios.create()

const optionsConst = `
    Usage
        $ tatum-kms <command>

    Commands
        daemon                            		Run as a daemon, which periodically checks for a new transactions to sign.
        generatewallet <chain>            		Generate wallet for a specific blockchain and echo it to the output.
        generatemanagedwallet <chain>     		Generate wallet for a specific blockchain and add it to the managed wallets.
        storemanagedwallet <chain>        		Store mnemonic-based wallet for a specific blockchain and add it to the managed wallets.
        storemanagedprivatekey <chain>    		Store private key of a specific blockchain and add it to the managed wallets.
        generatemanagedprivatekeybatch <chain> <cnt> 	Generate and store "cnt" number of private keys for a specific blockchain. This operation is usefull, if you wanna pregenerate bigger amount of managed private keys for later use.
        getprivatekey <signatureId> <i>   		Obtain managed wallet from wallet store and generate private key for given derivation index.
        getaddress <signatureId> <i>      		Obtain managed wallet from wallet store and generate address for given derivation index.
        getmanagedwallet <signatureId>    		Obtain managed wallet / private key from wallet store.
        removewallet <signatureId>        		Remove managed wallet from wallet store.
        export                          			Export all managed wallets.

    Debugging
        report                          	    Shows report of system and requested wallets (+ warnings if they were found)
        checkconfig                           Shows environment variables for Tatum KMS.

    Options
        --apiKey                          Tatum API Key to communicate with Tatum API. Daemon mode only.
        --testnet                         Indicates testnet version of blockchain. Mainnet by default.
        --path                            Custom path to wallet store file.
        --period                          Period in seconds to check for new transactions to sign, defaults to 5 seconds. Daemon mode only.
        --chain                           Blockchains to check, separated by comma. Daemon mode only.
        --envFile                         Path to .env file to set vars.
        --aws                             Using AWS Secrets Manager (https://aws.amazon.com/secrets-manager/) as a secure storage of the password which unlocks the wallet file.
        --vgs                             Using VGS (https://verygoodsecurity.com) as a secure storage of the password which unlocks the wallet file.
        --azure                           Using Azure Vault (https://azure.microsoft.com/en-us/services/key-vault/) as a secure storage of the password which unlocks the wallet file.
        --gcp                             Using GCP Secret Manager (https://cloud.google.com/security/products/secret-manager) as a secure storage of the password which unlocks the wallet file.
        --externalUrl                     Pass in external url to check valid transaction. This parameter is mandatory for mainnet (if testnet is false).  Daemon mode only.
        --externalUrlMethod               Determine what http method to use when calling the url passed in the --externalUrl option. Accepts GET or POST. Defaults to GET method. Daemon mode only. 
        --runOnce                         Run the daemon command one time. Check for a new transactions to sign once, and then exit the process. Daemon mode only.
        --wallets                         If runOnce enabled, fetch and sign only for these wallet ids.
        --transactionIds                  If runOnce enabled, sign only transactions from defined comma-separated list.
`

const getPasswordType = (flags: Partial<{ aws: boolean; azure: boolean; vgs: boolean; gcp: boolean }>): PasswordType => {
  if (flags.aws) {
    return PasswordType.AWS
  }
  if (flags.azure) {
    return PasswordType.AZURE
  }
  if (flags.vgs) {
    return PasswordType.VGS
  }
  if (flags.gcp) {
    return PasswordType.GCP
  }
  return PasswordType.CMD_LINE
}

const startup = async () => {
  const { input: command, flags, help } = meow(optionsConst, {
    importMeta: import.meta,
    flags: {
      path: {
        type: 'string',
      },
      chain: {
        type: 'string',
      },
      apiKey: {
        type: 'string',
      },
      testnet: {
        type: 'boolean',
        isRequired: true,
      },
      vgs: {
        type: 'boolean',
      },
      aws: {
        type: 'boolean',
      },
      azure: {
        type: 'boolean',
      },
      gcp: {
        type: 'boolean',
      },
      period: {
        type: 'number',
        default: 5,
      },
      externalUrl: {
        type: 'string',
        isRequired: (f: any, input: readonly string[]) => input[0] === 'daemon' && !f.testnet,
      },
      envFile: {
        type: 'string',
      },
      externalUrlMethod: {
        type: 'string',
        default: 'GET',
      },
      runOnce: {
        type: 'boolean',
        default: false,
      },
      wallets: {
        type: 'string'
      },
      transactionIds: {
        type: 'string',
      },
    },
  })

  const envFilePath = (flags.envFile) ?? homedir() + '/.tatumrc/.env'
  if (existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath })
  }

  setTatumKey(flags.apiKey as string)

  if (command.length === 0) {
    console.log(help)
    return
  }
  switch (command[0]) {
    case 'daemon': {
      const pwd = await getPassword(getPasswordType(flags), axiosInstance)
      await processSignatures(
        pwd,
        flags.testnet as boolean,
        axiosInstance,
        flags.path as string,
        (flags.chain as string)?.split(',') as Currency[],
        flags.externalUrl as string,
        flags.externalUrlMethod as ExternalUrlMethod,
        flags.period as number,
        flags.runOnce as boolean,
        (flags.wallets as string)?.split(','),
        (flags.transactionIds as string)?.split(','),
      )
      break
    }
    case 'generatewallet':
      console.log(JSON.stringify(await generateWallet(command[1] as Currency, flags.testnet as boolean), null, 2))
      break
    case 'export':
      exportWallets(await getPassword(getPasswordType(flags), axiosInstance), flags.path as string)
      break
    case 'generatemanagedwallet':
      await storeWallet(
        command[1] as Currency,
        flags.testnet as boolean,
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path as string,
      )
      break
    case 'storemanagedwallet':
      await storeWallet(
        command[1] as Currency,
        flags.testnet as boolean,
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path as string,
        getQuestion('Enter mnemonic to store:'),
      )
      break
    case 'storemanagedprivatekey':
      await storePrivateKey(
        command[1] as Currency,
        flags.testnet as boolean,
        getQuestion('Enter private key to store:'),
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path as string,
      )
      break
    case 'generatemanagedprivatekeybatch':
      await generateManagedPrivateKeyBatch(
        command[1] as Currency,
        command[2],
        flags.testnet as boolean,
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path as string,
      )
      break
    case 'getmanagedwallet':
      await getWallet(command[1], await getPassword(getPasswordType(flags), axiosInstance), flags.path as string)
      break
    case 'getprivatekey':
      await getPrivateKey(command[1], command[2], flags.path as string)
      break
    case 'getaddress':
      await getAddress(command[1], command[2], flags.path as string)
      break
    case 'removewallet':
      await removeWallet(command[1], await getPassword(getPasswordType(flags), axiosInstance), flags.path as string)
      break
    case 'checkconfig':
      checkConfig(getPasswordType(flags), envFilePath, flags.path as string)
      break
    case 'report':
      await report(
        utils.csvToArray(command[1]),
        getPasswordType(flags),
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path,
      )
      break
    default:
      console.error('Unsupported command. Use tatum-kms --help for details.')
      process.exit(-1)
  }
}

startup()
