#!/usr/bin/env node
import { Currency, generateWallet } from '@tatumio/tatum'
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import axios from 'axios'
import dotenv from 'dotenv'
import http from 'http'
import https from 'https'
import meow from 'meow'
import { Config, ConfigOption } from './config'
import {
  exportWallets,
  generateManagedPrivateKeyBatch,
  getAddress,
  getPrivateKey,
  getQuestion,
  getTatumKey,
  getWallet,
  removeWallet,
  storePrivateKey,
  storeWallet,
} from './management'
import { processSignatures } from './signatures'

dotenv.config()
const config = new Config()

const axiosInstance = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
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
const startup = async () => {
  if (command.length === 0) {
    return
  }
  switch (command[0]) {
    case 'daemon': {
      let pwd = ''
      if (flags.azure) {
        const vaultUrl = config.getValue(ConfigOption.AZURE_VAULTURL)
        const secretName = config.getValue(ConfigOption.AZURE_SECRETNAME)
        const secretVersion = config.getValue(ConfigOption.AZURE_SECRETVERSION)
        pwd = (await axiosInstance.get(`https://${vaultUrl}/secrets/${secretName}/${secretVersion}?api-version=7.1`))
          .data?.data[0]?.value
        if (!pwd) {
          console.error('Azure Vault secret does not exists.')
          process.exit(-1)
          return
        }
      } else if (flags.aws) {
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
        pwd = JSON.parse(result.SecretString)[config.getValue(ConfigOption.AWS_SECRET_KEY)]
      } else if (flags.vgs) {
        const username = config.getValue(ConfigOption.VGS_USERNAME)
        const password = config.getValue(ConfigOption.VGS_PASSWORD)
        const alias = config.getValue(ConfigOption.VGS_ALIAS)
        pwd = (
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
      } else {
        pwd = config.getValue(ConfigOption.KMS_PASSWORD)
      }
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
      exportWallets(flags.path)
      break
    case 'generatemanagedwallet':
      await storeWallet(command[1] as Currency, flags.testnet, flags.path)
      break
    case 'storemanagedwallet':
      await storeWallet(command[1] as Currency, flags.testnet, flags.path, getQuestion('Enter mnemonic to store:'))
      break
    case 'storemanagedprivatekey':
      await storePrivateKey(
        command[1] as Currency,
        flags.testnet,
        getQuestion('Enter private key to store:'),
        flags.path,
      )
      break
    case 'generatemanagedprivatekeybatch':
      await generateManagedPrivateKeyBatch(command[1] as Currency, command[2], flags.testnet, flags.path)
      break
    case 'getmanagedwallet':
      await getWallet(command[1], flags.path)
      break
    case 'getprivatekey':
      await getPrivateKey(command[1], command[2], flags.path)
      break
    case 'getaddress':
      await getAddress(command[1], command[2], flags.path)
      break
    case 'removewallet':
      await removeWallet(command[1], flags.path)
      break
    default:
      console.error('Unsupported command. Use tatum-kms --help for details.')
      process.exit(-1)
  }
}

startup()
