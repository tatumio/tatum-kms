#!/usr/bin/env node
import {Currency, generateWallet} from '@tatumio/tatum'
import axios from 'axios'
import dotenv from 'dotenv'
import http from 'http'
import https from 'https'
import meow from 'meow'
import {Config} from './config'
import {PasswordType} from './interfaces';
import {
  exportWallets,
  generateManagedPrivateKeyBatch,
  getAddress,
  getPassword,
  getPrivateKey,
  getQuestion,
  getTatumKey,
  getWallet,
  removeWallet,
  storePrivateKey,
  storeWallet,
} from './management'
import {processSignatures} from './signatures'
import HttpAgent from 'agentkeepalive'

dotenv.config()
const config = new Config()

const axiosInstance = axios.create({
  httpAgent: new HttpAgent({
    maxSockets: 4,
    maxFreeSockets: 2,
    timeout: 60000, // up to 110000, but I would stay with 60s
    freeSocketTimeout: 30000,
  }),
  httpsAgent: new HttpAgent.HttpsAgent({
    maxSockets: 4,
    maxFreeSockets: 2,
    timeout: 60000, // up to 110000, but I would stay with 60s
    freeSocketTimeout: 30000,
  }),
})

const { input: command, flags } = meow(
  `
    Usage
        $ tatum-kms command

    Commands
        daemon                            		Run as a daemon, which periodically checks for a new transactions to sign.
        generatewallet <chain>            		Generate wallet for a specific blockchain and echo it to the output.
        generatemanagedwallet <chain>     		Generate wallet for a specific blockchain and add it to the managed wallets.
        storemanagedwallet <chain>        		Store mnemonic-based wallet for a specific blockchain and add it to the managed wallets.
        storemanagedprivatekey <chain>    		Store private key of a specific blockchain and add it to the managed wallets.
        generatemanagedprivatekeybatch <chain> <cnt> 	generate and store "cnt" number of private keys for a specific blockchain. This operation is usefull, if you wanna pregenerate bigger amount of managed private keys for later use.
        getprivatekey <signatureId> <i>   		Obtain managed wallet from wallet store and generate private key for given derivation index.
        getaddress <signatureId> <i>      		Obtain managed wallet from wallet store and generate address for given derivation index.
        getmanagedwallet <signatureId>    		Obtain managed wallet / private key from wallet store.
        removewallet <signatureId>        		Remove managed wallet from wallet store.
        export                          			Export all managed wallets.

    Options
        --api-key                         Tatum API Key to communicate with Tatum API. Daemon mode only.
        --testnet                         Indicates testnet version of blockchain. Mainnet by default.
        --path                            Custom path to wallet store file.
        --period                          Period in seconds to check for new transactions to sign, defaults to 5 seconds. Daemon mode only.
        --chain                           Blockchains to check, separated by comma. Daemon mode only.
	    --aws                             Using AWS Secrets Manager (https://aws.amazon.com/secrets-manager/) as a secure storage of the password which unlocks the wallet file.
	    --vgs                             Using VGS (https://verygoodsecurity.com) as a secure storage of the password which unlocks the wallet file.
        --azure                           Using Azure Vault (https://azure.microsoft.com/en-us/services/key-vault/) as a secure storage of the password which unlocks the wallet file.
        --externalUrl                     Pass in external url to check valid transaction. This parameter is mandatory for mainnet (if testnet is false).  Daemon mode only.
`,
  {
    flags: {
      path: {
        type: 'string',
      },
      chain: {
        type: 'string',
      },
      'api-key': {
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
      period: {
        type: 'number',
        default: 5,
      },
      externalUrl: {
        type: 'string',
        isRequired: (f, input) => input[0] === 'daemon' && !f.testnet,
      },
    },
  },
)

const getPasswordType = (): PasswordType => {
  if (flags.aws) {
    return PasswordType.AWS
  }
  if (flags.azure) {
    return PasswordType.AZURE
  }
  if (flags.vgs) {
    return PasswordType.VGS
  }
  return PasswordType.CMD_LINE
}

const startup = async () => {
  if (command.length === 0) {
    return
  }
  switch (command[0]) {
    case 'daemon': {
      const pwd = await getPassword(getPasswordType(), axiosInstance)
      getTatumKey(flags.apiKey as string)
      await processSignatures(
        pwd,
        flags.testnet,
        axiosInstance,
        flags.path,
        flags.chain?.split(',') as Currency[],
        flags.externalUrl,
        flags.period,
      )
      break
    }
    case 'generatewallet':
      console.log(JSON.stringify(await generateWallet(command[1] as Currency, flags.testnet), null, 2))
      break
    case 'export':
      exportWallets(await getPassword(getPasswordType(), axiosInstance), flags.path)
      break
    case 'generatemanagedwallet':
      await storeWallet(command[1] as Currency, flags.testnet, await getPassword(getPasswordType(), axiosInstance), flags.path)
      break
    case 'storemanagedwallet':
      await storeWallet(command[1] as Currency, flags.testnet, await getPassword(getPasswordType(), axiosInstance), flags.path, getQuestion('Enter mnemonic to store:'))
      break
    case 'storemanagedprivatekey':
      await storePrivateKey(
        command[1] as Currency,
        flags.testnet,
        getQuestion('Enter private key to store:'),
        await getPassword(getPasswordType(), axiosInstance),
        flags.path,
      )
      break
    case 'generatemanagedprivatekeybatch':
      await generateManagedPrivateKeyBatch(command[1] as Currency, command[2], flags.testnet, await getPassword(getPasswordType(), axiosInstance), flags.path)
      break
    case 'getmanagedwallet':
      await getWallet(command[1], await getPassword(getPasswordType(), axiosInstance), flags.path)
      break
    case 'getprivatekey':
      await getPrivateKey(command[1], command[2], flags.path)
      break
    case 'getaddress':
      await getAddress(command[1], command[2], flags.path)
      break
    case 'removewallet':
      await removeWallet(command[1], await getPassword(getPasswordType(), axiosInstance), flags.path)
      break
    default:
      console.error('Unsupported command. Use tatum-kms --help for details.')
      process.exit(-1)
  }
}

startup()
