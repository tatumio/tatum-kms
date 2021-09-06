import { question } from 'readline-sync'
export enum ConfigOption {
    KMS_PASSWORD = 1,
    VGS_ALIAS,
    TATUM_API_KEY,
    VGS_USERNAME,
    VGS_PASSWORD,
    KMS_MNEMONIC,
    KMS_PRIVATE_KEY,
    AZURE_SECRETVERSION,
    AZURE_SECRETNAME,
    AZURE_VAULTURL,
}

export class Config {
    private _configOptions = {
        [ConfigOption.KMS_PASSWORD]: {
            environmentKey: "TATUM_KMS_PASSWORD",
            question: "Enter password to access wallet store:"
        },
        [ConfigOption.VGS_ALIAS]: {
            environmentKey: "TATUM_KMS_VGS_ALIAS",
            question: "Enter alias to obtain from VGS Vault API:"
        },
        [ConfigOption.TATUM_API_KEY]: {
            environmentKey: "TATUM_KMS_TATUM_API_KEY",
            question: "Enter alias to obtain from VGS Vault API:"
        },
        [ConfigOption.VGS_USERNAME]: {
            environmentKey: "TATUM_KMS_VGS_USERNAME",
            question: "Enter username to VGS Vault API:"
        },
        [ConfigOption.VGS_PASSWORD]: {
            environmentKey: "TATUM_KMS_VGS_PASSWORD",
            question: "Enter password to VGS Vault API:"
        },
        [ConfigOption.KMS_MNEMONIC]: {
            environmentKey: "TATUM_KMS_MNEMONIC",
            question: "Enter mnemonic to store:"
        },
        [ConfigOption.KMS_PRIVATE_KEY]: {
            environmentKey: "TATUM_KMS_PRIVATE_KEY",
            question: "Enter private key to store:"
        },
        [ConfigOption.AZURE_SECRETVERSION]: {
            environmentKey: "TATUM_KMS_VGS_ALIAS",
            question: "Enter Secret version to obtain secret from Azure Vault API:"
        },
        [ConfigOption.AZURE_SECRETNAME]: {
            environmentKey: "TATUM_KMS_AZURE_SECRETNAME",
            question: "Enter Secret name to obtain from Azure Vault API:"
        },
        [ConfigOption.AZURE_VAULTURL]: {
            environmentKey: "TATUM_KMS_AZURE_VAULTURL",
            question: "Enter Vault Base URL to obtain secret from Azure Vault API:"
        }
    }

    public getValue(what: ConfigOption): string {
        let config = this._configOptions[what]
        if (process.env[config.environmentKey]) {
            return process.env[config.environmentKey] as string
        }
        return process.env[config.environmentKey] ? process.env[config.environmentKey] as string : question(config.question, {
            hideEchoBack: true,
        });
    }
}