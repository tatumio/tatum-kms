import { question } from 'readline-sync'

export enum ConfigOption {
  KMS_PASSWORD = 1,
  VGS_ALIAS,
  TATUM_API_KEY,
  VGS_USERNAME,
  VGS_PASSWORD,
  AZURE_SECRETVERSION,
  AZURE_SECRETNAME,
  AZURE_VAULTURL,
  AWS_REGION,
  AWS_SECRET_NAME,
  AWS_SECRET_KEY,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  GCP_PROJECT_ID,
  GCP_SECRET_NAME,
  GCP_SECRET_VERSION,
  TATUM_KMS_DEBUG_MODE,
}

export class Config {
  private static _configOptions = {
    [ConfigOption.KMS_PASSWORD]: {
      environmentKey: 'TATUM_KMS_PASSWORD',
      question: 'Enter password to access wallet store (or set env var TATUM_KMS_PASSWORD):',
    },
    [ConfigOption.VGS_ALIAS]: {
      environmentKey: 'TATUM_KMS_VGS_ALIAS',
      question: 'Enter alias to obtain from VGS Vault API (or set env var TATUM_KMS_VGS_ALIAS):',
    },
    [ConfigOption.TATUM_API_KEY]: {
      environmentKey: 'TATUM_API_KEY',
      question: 'Enter Tatum Api Key (or set env var TATUM_API_KEY):',
    },
    [ConfigOption.VGS_USERNAME]: {
      environmentKey: 'TATUM_KMS_VGS_USERNAME',
      question: 'Enter username to VGS Vault API (or set env var TATUM_KMS_VGS_USERNAME):',
    },
    [ConfigOption.VGS_PASSWORD]: {
      environmentKey: 'TATUM_KMS_VGS_PASSWORD',
      question: 'Enter password to VGS Vault API (or set env var TATUM_KMS_VGS_PASSWORD):',
    },
    [ConfigOption.AZURE_SECRETVERSION]: {
      environmentKey: 'TATUM_KMS_AZURE_SECRETVERSION',
      question:
        'Enter Secret version to obtain secret from Azure Vault API (or set env var TATUM_KMS_AZURE_SECRETVERSION):',
    },
    [ConfigOption.AZURE_SECRETNAME]: {
      environmentKey: 'TATUM_KMS_AZURE_SECRETNAME',
      question: 'Enter Secret name to obtain from Azure Vault API (or set env var TATUM_KMS_AZURE_SECRETNAME):',
    },
    [ConfigOption.AZURE_VAULTURL]: {
      environmentKey: 'TATUM_KMS_AZURE_VAULTURL',
      question: 'Enter Vault Base URL to obtain secret from Azure Vault API (or set env var TATUM_KMS_AZURE_VAULTURL):',
    },
    [ConfigOption.AWS_REGION]: {
      environmentKey: 'TATUM_KMS_AWS_REGION',
      question: 'Enter AWS Region to obtain secret from AWS Secrets Manager (or set env var TATUM_KMS_AWS_REGION):',
    },
    [ConfigOption.AWS_ACCESS_KEY_ID]: {
      environmentKey: 'TATUM_KMS_AWS_ACCESS_KEY_ID',
      question:
        'Enter AWS Access key ID to obtain secret from AWS Secrets Manager (or set env var TATUM_KMS_AWS_ACCESS_KEY_ID):',
    },
    [ConfigOption.AWS_SECRET_ACCESS_KEY]: {
      environmentKey: 'TATUM_KMS_AWS_SECRET_ACCESS_KEY',
      question:
        'Enter AWS Secret access key to obtain secret from AWS Secrets Manager (or set env var TATUM_KMS_AWS_SECRET_ACCESS_KEY):',
    },
    [ConfigOption.AWS_SECRET_NAME]: {
      environmentKey: 'TATUM_KMS_AWS_SECRET_NAME',
      question:
        'Enter AWS Secret name to obtain secret from AWS Secrets Manager (or set env var TATUM_KMS_AWS_SECRET_NAME):',
    },
    [ConfigOption.AWS_SECRET_KEY]: {
      environmentKey: 'TATUM_KMS_AWS_SECRET_KEY',
      question:
        'Enter AWS Secret key from you stored secret to obtain password from AWS Secrets Manager (or set env var TATUM_KMS_AWS_SECRET_KEYa):',
    },
    [ConfigOption.GCP_PROJECT_ID]: {
      environmentKey: 'TATUM_KMS_GCP_PROJECT_ID',
      question: 'Enter GCP Project ID to obtain secret from GCP Secret Manager (or set env var TATUM_KMS_GCP_PROJECT_ID):',
    },
    [ConfigOption.GCP_SECRET_NAME]: {
      environmentKey: 'TATUM_KMS_GCP_SECRET_NAME',
      question: 'Enter Secret name to obtain from GCP Secret Manager (or set env var TATUM_KMS_GCP_SECRET_NAME):',
    },
    [ConfigOption.GCP_SECRET_VERSION]: {
      environmentKey: 'TATUM_KMS_GCP_SECRET_VERSION',
      question:
        'Enter Secret version to obtain secret from GCP Secret Manager (or set env var TATUM_KMS_GCP_SECRET_VERSION):',
    },
    [ConfigOption.TATUM_KMS_DEBUG_MODE]: {
      environmentKey: 'TATUM_KMS_DEBUG_MODE',
      question: 'Enter debug mode (true/false) (or set env var TATUM_KMS_DEBUG_MODE):',
    },
  }

  public static getValue(what: ConfigOption): string {
    const config = this._configOptions[what]
    if (process.env[config.environmentKey]) {
      return process.env[config.environmentKey] as string
    }
    if (what === ConfigOption.TATUM_KMS_DEBUG_MODE && !process.env[config.environmentKey]) {
      return 'false'
    }
    if (what === ConfigOption.TATUM_API_KEY) {
      throw new Error('Required TATUM_API_KEY is not set. Please set it as env variable or pass it as argument.')
    }
    return question(config.question, {
      hideEchoBack: true,
    })
  }
}
