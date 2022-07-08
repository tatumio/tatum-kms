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
}

export class Config {
  private _configOptions = {
    [ConfigOption.KMS_PASSWORD]: {
      environmentKey: 'TATUM_KMS_PASSWORD',
      question: 'Enter password to access wallet store:',
    },
    [ConfigOption.VGS_ALIAS]: {
      environmentKey: 'TATUM_KMS_VGS_ALIAS',
      question: 'Enter alias to obtain from VGS Vault API:',
    },
    [ConfigOption.TATUM_API_KEY]: {
      environmentKey: 'TATUM_KMS_TATUM_API_KEY',
      question: 'Enter alias to obtain from VGS Vault API:',
    },
    [ConfigOption.VGS_USERNAME]: {
      environmentKey: 'TATUM_KMS_VGS_USERNAME',
      question: 'Enter username to VGS Vault API:',
    },
    [ConfigOption.VGS_PASSWORD]: {
      environmentKey: 'TATUM_KMS_VGS_PASSWORD',
      question: 'Enter password to VGS Vault API:',
    },
    [ConfigOption.AZURE_SECRETVERSION]: {
      environmentKey: 'TATUM_KMS_VGS_ALIAS',
      question: 'Enter Secret version to obtain secret from Azure Vault API:',
    },
    [ConfigOption.AZURE_SECRETNAME]: {
      environmentKey: 'TATUM_KMS_AZURE_SECRETNAME',
      question: 'Enter Secret name to obtain from Azure Vault API:',
    },
    [ConfigOption.AZURE_VAULTURL]: {
      environmentKey: 'TATUM_KMS_AZURE_VAULTURL',
      question: 'Enter Vault Base URL to obtain secret from Azure Vault API:',
    },
  }

  public getValue(what: ConfigOption): string {
    const config = this._configOptions[what]
    if (process.env[config.environmentKey]) {
      return process.env[config.environmentKey] as string
    }
    return question(config.question, {
      hideEchoBack: true,
    })
  }
}
