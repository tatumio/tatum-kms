#!/usr/bin/env node

// src/index.ts
import { generateWallet as generateWallet2 } from "@tatumio/tatum";
import axios from "axios";
import dotenv from "dotenv";
import meow from "meow";

// src/management.ts
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { TatumCardanoSDK } from "@tatumio/cardano";
import { TatumCeloSDK } from "@tatumio/celo";
import { TatumSolanaSDK } from "@tatumio/solana";
import { Currency, generateAddressFromXPub, generatePrivateKeyFromMnemonic, generateWallet } from "@tatumio/tatum";
import { generateWallet as generateKcsWallet } from "@tatumio/tatum-kcs";
import { TatumTronSDK } from "@tatumio/tron";
import { TatumXlmSDK } from "@tatumio/xlm";
import { TatumXrpSDK } from "@tatumio/xrp";
import CryptoJS from "crypto-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import _ from "lodash";
import { homedir } from "os";
import { dirname } from "path";
import { question as question2 } from "readline-sync";
import { v4 as uuid } from "uuid";

// src/config.ts
import { question } from "readline-sync";
var Config = class {
  static getValue(what) {
    const config = this._configOptions[what];
    if (process.env[config.environmentKey]) {
      return process.env[config.environmentKey];
    }
    if (what === 14 /* TATUM_KMS_DEBUG_MODE */ && !process.env[config.environmentKey]) {
      return "false";
    }
    if (what === 3 /* TATUM_API_KEY */) {
      throw new Error("Required TATUM_API_KEY is not set. Please set it as env variable or pass it as argument.");
    }
    return question(config.question, {
      hideEchoBack: true
    });
  }
};
Config._configOptions = {
  [1 /* KMS_PASSWORD */]: {
    environmentKey: "TATUM_KMS_PASSWORD",
    question: "Enter password to access wallet store (or set env var TATUM_KMS_PASSWORD):"
  },
  [2 /* VGS_ALIAS */]: {
    environmentKey: "TATUM_KMS_VGS_ALIAS",
    question: "Enter alias to obtain from VGS Vault API (or set env var TATUM_KMS_VGS_ALIAS):"
  },
  [3 /* TATUM_API_KEY */]: {
    environmentKey: "TATUM_API_KEY",
    question: "Enter Tatum Api Key (or set env var TATUM_API_KEY):"
  },
  [4 /* VGS_USERNAME */]: {
    environmentKey: "TATUM_KMS_VGS_USERNAME",
    question: "Enter username to VGS Vault API (or set env var TATUM_KMS_VGS_USERNAME):"
  },
  [5 /* VGS_PASSWORD */]: {
    environmentKey: "TATUM_KMS_VGS_PASSWORD",
    question: "Enter password to VGS Vault API (or set env var TATUM_KMS_VGS_PASSWORD):"
  },
  [6 /* AZURE_SECRETVERSION */]: {
    environmentKey: "TATUM_KMS_AZURE_SECRETVERSION",
    question: "Enter Secret version to obtain secret from Azure Vault API (or set env var TATUM_KMS_AZURE_SECRETVERSION):"
  },
  [7 /* AZURE_SECRETNAME */]: {
    environmentKey: "TATUM_KMS_AZURE_SECRETNAME",
    question: "Enter Secret name to obtain from Azure Vault API (or set env var TATUM_KMS_AZURE_SECRETNAME):"
  },
  [8 /* AZURE_VAULTURL */]: {
    environmentKey: "TATUM_KMS_AZURE_VAULTURL",
    question: "Enter Vault Base URL to obtain secret from Azure Vault API (or set env var TATUM_KMS_AZURE_VAULTURL):"
  },
  [9 /* AWS_REGION */]: {
    environmentKey: "TATUM_KMS_AWS_REGION",
    question: "Enter AWS Region to obtain secret from AWS Secrets Manager (or set env var TATUM_KMS_AWS_REGION):"
  },
  [12 /* AWS_ACCESS_KEY_ID */]: {
    environmentKey: "TATUM_KMS_AWS_ACCESS_KEY_ID",
    question: "Enter AWS Access key ID to obtain secret from AWS Secrets Manager (or set env var TATUM_KMS_AWS_ACCESS_KEY_ID):"
  },
  [13 /* AWS_SECRET_ACCESS_KEY */]: {
    environmentKey: "TATUM_KMS_AWS_SECRET_ACCESS_KEY",
    question: "Enter AWS Secret access key to obtain secret from AWS Secrets Manager (or set env var TATUM_KMS_AWS_SECRET_ACCESS_KEY):"
  },
  [10 /* AWS_SECRET_NAME */]: {
    environmentKey: "TATUM_KMS_AWS_SECRET_NAME",
    question: "Enter AWS Secret name to obtain secret from AWS Secrets Manager (or set env var TATUM_KMS_AWS_SECRET_NAME):"
  },
  [11 /* AWS_SECRET_KEY */]: {
    environmentKey: "TATUM_KMS_AWS_SECRET_KEY",
    question: "Enter AWS Secret key from you stored secret to obtain password from AWS Secrets Manager (or set env var TATUM_KMS_AWS_SECRET_KEYa):"
  },
  [14 /* TATUM_KMS_DEBUG_MODE */]: {
    environmentKey: "TATUM_KMS_DEBUG_MODE",
    question: "Enter debug mode (true/false) (or set env var TATUM_KMS_DEBUG_MODE):"
  }
};

// src/utils.ts
var utils = {
  csvToArray: (csv) => {
    if (!csv) return [];
    return csv.split(",").map((value) => value.trim());
  },
  hideValue: (value, showStart = 6, showEnd = 6) => {
    if (!value) {
      return "";
    }
    const length = value.length;
    if (length <= showStart + showEnd) {
      return "*".repeat(length);
    }
    return value.slice(0, showStart) + "*".repeat(length - showStart - showEnd) + value.slice(length - 1 - showEnd, length - 1);
  },
  hidePassword: (password) => {
    if (!password) {
      return "N/A";
    }
    return utils.hideValue(password, 6, 0);
  },
  hideApiKey: (secretValue) => {
    if (!secretValue) {
      return "N/A";
    }
    return utils.hideValue(secretValue);
  }
};

// src/management.ts
import semver from "semver";

// package.json
var version = "8.0.1";

// src/management.ts
var { AES } = CryptoJS;
var ensurePathExists = (path) => {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};
var generatePrivateKey = async (mnemonic, currency, index, testnet) => {
  if (currency === Currency.ADA) {
    const cardanoSDK = TatumCardanoSDK({ apiKey: Config.getValue(3 /* TATUM_API_KEY */) });
    return cardanoSDK.wallet.generatePrivateKeyFromMnemonic(mnemonic, index);
  } else {
    return generatePrivateKeyFromMnemonic(currency, testnet, mnemonic, index);
  }
};
var getPassword = async (pwdType, axiosInstance2) => {
  if (pwdType === 2 /* AZURE */) {
    const vaultUrl = Config.getValue(8 /* AZURE_VAULTURL */);
    const secretName = Config.getValue(7 /* AZURE_SECRETNAME */);
    const secretVersion = Config.getValue(6 /* AZURE_SECRETVERSION */);
    const pwd = (await axiosInstance2.get(`https://${vaultUrl}/secrets/${secretName}/${secretVersion}?api-version=7.1`)).data?.data[0]?.value;
    if (!pwd) {
      console.error("Azure Vault secret does not exists.");
      process.exit(-1);
      return;
    }
    return pwd;
  } else if (pwdType === 1 /* AWS */) {
    const config = {
      region: Config.getValue(9 /* AWS_REGION */),
      credentials: {
        accessKeyId: Config.getValue(12 /* AWS_ACCESS_KEY_ID */),
        secretAccessKey: Config.getValue(13 /* AWS_SECRET_ACCESS_KEY */)
      }
    };
    const client = new SecretsManagerClient([config]);
    const command = new GetSecretValueCommand({ SecretId: Config.getValue(10 /* AWS_SECRET_NAME */) });
    const result = await client.send(command);
    if (!result["SecretString"]) {
      console.error("AWS secret does not exists.");
      process.exit(-1);
      return;
    }
    return JSON.parse(result["SecretString"])[Config.getValue(11 /* AWS_SECRET_KEY */)];
  } else if (pwdType === 3 /* VGS */) {
    const username = Config.getValue(4 /* VGS_USERNAME */);
    const password = Config.getValue(5 /* VGS_PASSWORD */);
    const alias = Config.getValue(2 /* VGS_ALIAS */);
    const pwd = (await axiosInstance2.get(`https://api.live.verygoodvault.com/aliases/${alias}`, {
      auth: {
        username,
        password
      }
    })).data?.data[0]?.value;
    if (!pwd) {
      console.error("VGS Vault alias does not exists.");
      process.exit(-1);
      return;
    }
    return pwd;
  } else {
    return Config.getValue(1 /* KMS_PASSWORD */);
  }
};
var exportWallets = (pwd, path) => {
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet file.` }, null, 2));
    return;
  }
  const data = readFileSync(pathToWallet, { encoding: "utf8" });
  if (!data?.length) {
    console.error(JSON.stringify({ error: `No such wallet file.` }, null, 2));
    return;
  }
  console.log(JSON.stringify(JSON.parse(AES.decrypt(data, pwd).toString(CryptoJS.enc.Utf8)), null, 2));
};
var getManagedWallets = (pwd, chain, testnet, path) => {
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet file.` }, null, 2));
    return [];
  }
  const data = readFileSync(pathToWallet, { encoding: "utf8" });
  if (!data?.length) {
    return [];
  }
  const wallets = JSON.parse(AES.decrypt(data, pwd).toString(CryptoJS.enc.Utf8));
  const keys = [];
  for (const walletsKey in wallets) {
    if (chain === wallets[walletsKey].chain && testnet === wallets[walletsKey].testnet) {
      keys.push(walletsKey);
    }
  }
  return keys;
};
var generatePureWallet = async (chain, testnet, mnemonic) => {
  let wallet;
  if (chain === Currency.SOL) {
    const sdk = TatumSolanaSDK({ apiKey: "" });
    wallet = sdk.wallet.wallet();
  } else if (chain === Currency.XRP) {
    const sdk = TatumXrpSDK({ apiKey: "" });
    wallet = sdk.wallet.wallet();
  } else if (chain === Currency.XLM) {
    const sdk = TatumXlmSDK({ apiKey: "" });
    wallet = sdk.wallet.wallet();
  } else if (chain === Currency.KCS) {
    wallet = await generateKcsWallet(mnemonic, { testnet });
  } else if (chain === Currency.CELO) {
    const sdk = TatumCeloSDK({ apiKey: "" });
    wallet = sdk.wallet.generateWallet(mnemonic, { testnet });
  } else if (chain === Currency.ADA) {
    const cardanoSDK = TatumCardanoSDK({ apiKey: Config.getValue(3 /* TATUM_API_KEY */) });
    wallet = await cardanoSDK.wallet.generateWallet(mnemonic);
  } else if (chain === Currency.TRON) {
    const sdk = TatumTronSDK({ apiKey: "" });
    wallet = sdk.wallet.generateWallet(mnemonic);
  } else {
    wallet = await generateWallet(chain, testnet, mnemonic);
  }
  return wallet;
};
var storeWallet = async (chain, testnet, pwd, path, mnemonic, print = true) => {
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  const wallet = await generatePureWallet(chain, testnet, mnemonic);
  const key = uuid();
  const entry = { [key]: { ...wallet, chain, testnet } };
  if (!existsSync(pathToWallet)) {
    ensurePathExists(pathToWallet);
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(entry), pwd).toString());
  } else {
    const data = readFileSync(pathToWallet, { encoding: "utf8" });
    let walletData = entry;
    if (data?.length > 0) {
      walletData = { ...walletData, ...JSON.parse(AES.decrypt(data, pwd).toString(CryptoJS.enc.Utf8)) };
    }
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(walletData), pwd).toString());
  }
  const value = { signatureId: key };
  if (wallet.address) {
    value.address = wallet.address;
  }
  if (wallet.xpub) {
    value.xpub = wallet.xpub;
  }
  if (print) {
    console.log(JSON.stringify(value, null, 2));
  }
  return { ...wallet, ...value };
};
var storePrivateKey = async (chain, testnet, privateKey, pwd, path, print = true) => {
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  const key = uuid();
  const entry = { [key]: { privateKey, chain, testnet } };
  if (!existsSync(pathToWallet)) {
    ensurePathExists(pathToWallet);
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(entry), pwd).toString());
  } else {
    const data = readFileSync(pathToWallet, { encoding: "utf8" });
    let walletData = entry;
    if (data?.length > 0) {
      walletData = { ...walletData, ...JSON.parse(AES.decrypt(data, pwd).toString(CryptoJS.enc.Utf8)) };
    }
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(walletData), pwd).toString());
  }
  if (print) {
    console.log(JSON.stringify({ signatureId: key }, null, 2));
  }
  return { signatureId: key };
};
var generateManagedPrivateKeyBatch = async (chain, count, testnet, pwd, path) => {
  Config.getValue(1 /* KMS_PASSWORD */);
  const cnt = Number(count);
  for (let i = 0; i < cnt; i++) {
    const wallet = await generatePureWallet(chain, testnet);
    let address;
    if (wallet.address) {
      address = wallet.address;
    } else {
      if (chain === Currency.ADA) {
        const cardanoSDK = TatumCardanoSDK({ apiKey: Config.getValue(3 /* TATUM_API_KEY */) });
        address = await cardanoSDK.wallet.generateAddressFromXPub(wallet.xpub, 1, { testnet });
      } else {
        address = await generateAddressFromXPub(chain, testnet, wallet.xpub, 1);
      }
    }
    const privateKey = wallet.secret ? wallet.secret : await generatePrivateKey(wallet.mnemonic, chain, 1, testnet);
    const { signatureId } = await storePrivateKey(chain, testnet, privateKey, pwd, path, false);
    console.log(JSON.stringify({ signatureId, address }));
  }
};
var getWalletFromPath = (errorMessage, path, pwd) => {
  if (_.isNil(path) || _.isNil(pwd)) {
    console.error("No path or password entered");
    return;
  }
  const password = pwd ?? Config.getValue(1 /* KMS_PASSWORD */);
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  if (!existsSync(pathToWallet)) {
    console.error(errorMessage);
    return;
  }
  const data = readFileSync(pathToWallet, { encoding: "utf8" });
  if (!data?.length) {
    console.error(errorMessage);
    return;
  }
  return JSON.parse(AES.decrypt(data, password).toString(CryptoJS.enc.Utf8));
};
var isWalletsValid = (wallets, options) => {
  if (Object.keys(wallets).length === 0) {
    console.error(JSON.stringify({ error: `No such wallet for chain '${options.chain}'.` }, null, 2));
    return false;
  }
  if (options.id && !wallets[options.id]) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${options.id}'.` }, null, 2));
    return false;
  }
  return true;
};
var getWalletForSignature = async (signature, pwd, path, print = true) => {
  const wallet = await getWallet(signature.id, pwd, path, print);
  if (wallet.mnemonic) {
    if (_.isNil(signature.index)) {
      console.error(`Wrong usage of mnemonic-based signature id. No index provided for ${signature.id}.`);
      return void 0;
    }
    const privateKey = await generatePrivateKey(wallet.mnemonic, wallet.chain, signature.index, wallet.testnet);
    return { ...wallet, privateKey, privateKeyIndex: signature.index };
  } else if (wallet.privateKey) {
    return wallet;
  }
  return void 0;
};
var getWallet = async (id, pwd, path, print = true) => {
  try {
    const data = getWalletFromPath(
      JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2),
      path || homedir() + "/.tatumrc/wallet.dat",
      pwd
    );
    if (!data && !isWalletsValid(data, { id })) {
      return;
    }
    if (print) {
      console.log(JSON.stringify(data[id], null, 2));
    }
    return data[id];
  } catch (e) {
    console.error(JSON.stringify({ error: `Wrong password.` }, null, 2));
    console.debug(e);
    return;
  }
};
var getPrivateKey = async (id, index, path, password, print = true) => {
  const pwd = password ?? Config.getValue(1 /* KMS_PASSWORD */);
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
    return null;
  }
  const data = readFileSync(pathToWallet, { encoding: "utf8" });
  if (!data?.length) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
    return null;
  }
  const wallet = JSON.parse(AES.decrypt(data, pwd).toString(CryptoJS.enc.Utf8));
  if (!wallet[id]) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
    return null;
  }
  const pk = {
    privateKey: wallet[id].secret ? wallet[id].secret : await generatePrivateKey(wallet[id].mnemonic, wallet[id].chain, parseInt(index), wallet[id].testnet)
  };
  if (print) {
    console.log(JSON.stringify(pk, null, 2));
  }
  return pk.privateKey;
};
var getAddress = async (id, index, path, pwd, print = true) => {
  const password = pwd ?? Config.getValue(1 /* KMS_PASSWORD */);
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
    return null;
  }
  const data = readFileSync(pathToWallet, { encoding: "utf8" });
  if (!data?.length) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
    return null;
  }
  const wallet = JSON.parse(AES.decrypt(data, password).toString(CryptoJS.enc.Utf8));
  if (!wallet[id]) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
    return null;
  }
  let pk;
  if (wallet[id].address) {
    pk = {
      address: wallet[id].address
    };
  } else {
    if (wallet[id].chain === Currency.ADA) {
      const cardanoSDK = TatumCardanoSDK({ apiKey: Config.getValue(3 /* TATUM_API_KEY */) });
      pk = {
        address: await cardanoSDK.wallet.generateAddressFromXPub(wallet[id].xpub, parseInt(index), {
          testnet: wallet[id].testnet
        })
      };
    } else {
      pk = {
        address: await generateAddressFromXPub(wallet[id].chain, wallet[id].testnet, wallet[id].xpub, parseInt(index))
      };
    }
  }
  if (print) {
    console.log(JSON.stringify(pk, null, 2));
  }
  return { address: pk.address };
};
var removeWallet = async (id, pwd, path) => {
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  if (!existsSync(pathToWallet)) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
    return;
  }
  const data = readFileSync(pathToWallet, { encoding: "utf8" });
  if (!data?.length) {
    console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
    return;
  }
  const wallet = JSON.parse(AES.decrypt(data, pwd).toString(CryptoJS.enc.Utf8));
  delete wallet[id];
  writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(wallet), pwd).toString());
};
function parseWalletStoreName(pwdType) {
  if (pwdType === 0 /* CMD_LINE */) {
    return "LOCAL" /* LOCAL */;
  } else if (pwdType === 3 /* VGS */) {
    return "VGS" /* VGS */;
  } else if (pwdType === 2 /* AZURE */) {
    return "AZURE" /* AZURE */;
  } else if (pwdType === 1 /* AWS */) {
    return "AWS" /* AWS */;
  }
  return "N/A" /* NA */;
}
var checkConfig = (pwdType, envFile, path) => {
  const pathToWallet = path || homedir() + "/.tatumrc/wallet.dat";
  console.log(`Version                          : ${getKmsVersion()}`);
  console.log(`Wallet file path                 : ${pathToWallet}`);
  console.log(`Wallet exists                    : ${existsSync(pathToWallet)}`);
  console.log(`Wallet store type                : ${parseWalletStoreName(pwdType)}`);
  console.log(`Environment vars file            : ${envFile ?? "N/A"}`);
  console.log(`TATUM_API_KEY                    : ${utils.hideApiKey(process.env.TATUM_API_KEY)}`);
  console.log(`TATUM_KMS_PASSWORD               : ${utils.hidePassword(process.env.TATUM_KMS_PASSWORD)}`);
  console.log(`TATUM_KMS_VGS_ALIAS              : ${utils.hidePassword(process.env.TATUM_KMS_VGS_ALIAS)}`);
  console.log(`TATUM_KMS_VGS_USERNAME           : ${utils.hidePassword(process.env.TATUM_KMS_VGS_USERNAME)}`);
  console.log(`TATUM_KMS_VGS_PASSWORD           : ${utils.hidePassword(process.env.TATUM_KMS_VGS_PASSWORD)}`);
  console.log(`TATUM_KMS_AZURE_SECRETVERSION    : ${utils.hidePassword(process.env.TATUM_KMS_AZURE_SECRETVERSION)}`);
  console.log(`TATUM_KMS_AZURE_SECRETNAME       : ${utils.hidePassword(process.env.TATUM_KMS_AZURE_SECRETNAME)}`);
  console.log(`TATUM_KMS_AZURE_VAULTURL         : ${utils.hidePassword(process.env.TATUM_KMS_AZURE_VAULTURL)}`);
  console.log(`TATUM_KMS_AWS_REGION             : ${process.env.TATUM_KMS_AWS_REGION ?? "N/A"}`);
  console.log(`TATUM_KMS_AWS_ACCESS_KEY_ID      : ${utils.hidePassword(process.env.TATUM_KMS_AWS_ACCESS_KEY_ID)}`);
  console.log(`TATUM_KMS_AWS_SECRET_ACCESS_KEY  : ${utils.hidePassword(process.env.TATUM_KMS_AWS_SECRET_ACCESS_KEY)}`);
  console.log(`TATUM_KMS_AWS_SECRET_NAME        : ${utils.hidePassword(process.env.TATUM_KMS_AWS_SECRET_NAME)}`);
  console.log(`TATUM_KMS_AWS_SECRET_KEY         : ${utils.hidePassword(process.env.TATUM_KMS_AWS_SECRET_KEY)}`);
  console.log(`TATUM_KMS_DEBUG_MODE             : ${process.env.TATUM_KMS_DEBUG_MODE ?? "N/A"}`);
};
var report = async (signatureIds, passwordType, pwd, path) => {
  const systemWarnings = [];
  const walletReports = {};
  for (const signatureId of signatureIds) {
    const wallet = await getWallet(signatureId, pwd, path, false);
    if (!wallet) {
      systemWarnings.push(`No wallet found for signatureId: ${signatureId}`);
      continue;
    }
    if (!_.isObject(wallet)) {
      systemWarnings.push(`Wallet for signatureId: ${signatureId} is not an object. Its type is: ${typeof wallet}`);
      continue;
    }
    const warnings = [];
    const type = validateWallet(wallet, warnings);
    walletReports[signatureId] = {
      type,
      chain: wallet.chain,
      testnet: wallet.testnet,
      warnings: warnings && warnings.length > 0 ? warnings : void 0
    };
  }
  const nodeVersion = validateNodeVersion(systemWarnings);
  const report2 = {
    system: {
      kmsVersion: getKmsVersion(),
      nodeVersion,
      store: {
        type: parseWalletStoreName(passwordType),
        exists: existsSync(getPathToWallet(path))
      }
    },
    wallets: walletReports,
    apiKey: utils.hideApiKey(process.env.TATUM_API_KEY),
    warnings: systemWarnings && systemWarnings.length > 0 ? systemWarnings : void 0
  };
  console.log(JSON.stringify(report2, null, 2));
};
var validateWallet = (wallet, warnings) => {
  if (wallet.mnemonic) {
    validateStringField(warnings, "chain", wallet.chain);
    validateStringField(warnings, "mnemonic", wallet.mnemonic);
    validateStringField(warnings, "xpub", wallet.xpub);
    validateBooleanField(warnings, "testnet", wallet.testnet);
    return "MNEMONIC" /* MNEMONIC */;
  } else if (wallet.privateKey) {
    validateStringField(warnings, "chain", wallet.chain);
    validateStringField(warnings, "privateKey", wallet.privateKey);
    validateBooleanField(warnings, "testnet", wallet.testnet);
    return "PRIVATE_KEY" /* PRIVATE_KEY */;
  } else if (wallet.secret) {
    validateStringField(warnings, "chain", wallet.chain);
    validateStringField(warnings, "secret", wallet.secret);
    validateBooleanField(warnings, "testnet", wallet.testnet);
    return "SECRET" /* SECRET */;
  } else {
    warnings.push("Wallet type is not recognized. Mnemonic, privateKey or secret are absent");
    return "OTHER" /* OTHER */;
  }
};
var validateNodeVersion = (systemWarnings) => {
  const nodeVersion = process.version;
  if (semver.lt(nodeVersion, "18.0.0")) {
    systemWarnings.push(`Node version is lower than v18.x.x. Current version is: ${nodeVersion}`);
  }
  return nodeVersion;
};
var validateStringField = (warnings, fieldName, value) => {
  if (!_.isString(value)) {
    warnings.push(`Field '${fieldName}' is not string. Its type is: ${typeof value}`);
  }
};
var validateBooleanField = (warnings, fieldName, value) => {
  if (!_.isBoolean(value)) {
    warnings.push(`Field '${fieldName}' is not boolean. Its type is: ${typeof value}`);
  }
};
var setTatumKey = (apiKey) => {
  if (apiKey) {
    process.env.TATUM_API_KEY = apiKey;
  }
};
var getQuestion = (q, e) => {
  if (e) {
    return e;
  }
  return question2(q, {
    hideEchoBack: true
  });
};
var getKmsVersion = () => {
  return version || "N/A";
};
var getPathToWallet = (path) => {
  return path || homedir() + "/.tatumrc/wallet.dat";
};

// src/signatures.ts
import { TatumCardanoSDK as TatumCardanoSDK2 } from "@tatumio/cardano";
import { TatumCeloSDK as TatumCeloSDK2 } from "@tatumio/celo";
import { TatumSolanaSDK as TatumSolanaSDK2 } from "@tatumio/solana";
import {
  algorandBroadcast,
  bcashBroadcast,
  bnbBroadcast,
  bscBroadcast,
  btcBroadcast,
  Currency as Currency2,
  dogeBroadcast,
  egldBroadcast,
  ethBroadcast,
  flowBroadcastTx,
  flowSignKMSTransaction,
  generatePrivateKeyFromMnemonic as generatePrivateKeyFromMnemonic2,
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
  vetBroadcast,
  xdcBroadcast
} from "@tatumio/tatum";
import {
  broadcast as kcsBroadcast,
  generatePrivateKeyFromMnemonic as kcsGeneratePrivateKeyFromMnemonic,
  signKMSTransaction as signKcsKMSTransaction
} from "@tatumio/tatum-kcs";
import { TatumTronSDK as TatumTronSDK2 } from "@tatumio/tron";
import { TatumXlmSDK as TatumXlmSDK2 } from "@tatumio/xlm";
import { TatumXrpSDK as TatumXrpSDK2 } from "@tatumio/xrp";
import _2 from "lodash";

// src/constants.ts
var KMS_CONSTANTS = {
  SIGNATURE_IDS: 25e3,
  // Limit of generated signatureId per blockchain
  OUTPUT_WALLETS: 5
  // limit of wallets for console output
};

// src/signatures.ts
import semver2 from "semver";
var TATUM_URL = process.env.TATUM_API_URL || "https://api.tatum.io";
var getPrivateKeys = async (wallets) => {
  const keys = wallets.filter((wallet) => wallet.privateKey).map((wallet) => wallet.privateKey);
  if (keys?.length === 0) {
    throw new Error(
      `Wallets with requested private keys were not found. Most likely mnemonic-based wallet was used without index parameter (see docs: https://apidoc.tatum.io/)`
    );
  }
  const result = [...new Set(keys)];
  if (result.filter((key) => !_2.isString(key)).length > 0) {
    console.error(`${(/* @__PURE__ */ new Date()).toISOString()} - Some of private keys for transaction have incorrect format`);
  }
  return result;
};
function validatePrivateKeyWasFound(wallet, blockchainSignature, privateKey) {
  if (privateKey) return;
  const index = blockchainSignature.index;
  const signatureIdsLog = getSignatureIdsLog(blockchainSignature);
  if (isValidNumber(index)) {
    if (_2.isNil(wallet.mnemonic)) {
      throw new Error(
        `Private key was not found. Wallet ${signatureIdsLog} is private key based, but KMS transaction ${blockchainSignature.id} requires mnemonic based, since tx was requested with index param. Please use mnemonic based wallet and signatureId (see docs: https://apidoc.tatum.io/)`
      );
    }
  } else {
    if (_2.isNil(wallet.privateKey)) {
      throw new Error(
        `Private key was not found. Wallet ${signatureIdsLog} is mnemonic based, but KMS transaction ${blockchainSignature.id} requires private key based, since tx was requested without index param. Please use another private key based wallet id or specify 'index' parameter for this mnemonic based wallet during request call (see docs: https://apidoc.tatum.io/)`
      );
    }
  }
}
var processTransaction = async (blockchainSignature, testnet, pwd, axios2, path, externalUrl, externalUrlMethod) => {
  if (externalUrl) {
    console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - External url '${externalUrl}' is present, checking against it.`);
    try {
      if (externalUrlMethod === "POST") {
        await axios2.post(`${externalUrl}/${blockchainSignature.id}`, blockchainSignature);
      } else {
        await axios2.get(`${externalUrl}/${blockchainSignature.id}`);
      }
    } catch (e) {
      console.error(e);
      console.error(
        `${(/* @__PURE__ */ new Date()).toISOString()} - Transaction not found on external system. ID: ${blockchainSignature.id}`
      );
      return;
    }
  }
  const wallets = [];
  for (const hash of blockchainSignature.hashes) {
    const wallet = await getWallet(hash, pwd, path, false);
    if (wallet) {
      wallets.push(wallet);
    }
  }
  const signatures = blockchainSignature.signatures ?? [];
  for (const signature of signatures) {
    const wallet = await getWalletForSignature(signature, pwd, path, false);
    if (wallet) {
      wallets.push(wallet);
    }
  }
  let txData = "";
  console.log(
    `${(/* @__PURE__ */ new Date()).toISOString()} - Processing pending transaction - ${JSON.stringify(blockchainSignature, null, 2)}.`
  );
  const apiKey = Config.getValue(3 /* TATUM_API_KEY */);
  switch (blockchainSignature.chain) {
    case Currency2.ALGO: {
      const algoSecret = wallets[0].secret ? wallets[0].secret : wallets[0].privateKey;
      await algorandBroadcast(
        await signAlgoKMSTransaction(blockchainSignature, algoSecret, testnet),
        blockchainSignature.id
      );
      return;
    }
    case Currency2.SOL: {
      const solSDK = TatumSolanaSDK2({ apiKey, url: TATUM_URL });
      txData = await solSDK.kms.sign(
        blockchainSignature,
        wallets.map((w) => w.privateKey)
      );
      await axios2.post(
        `${TATUM_URL}/v3/solana/broadcast`,
        { txData, signatureId: blockchainSignature.id },
        { headers: { "x-api-key": apiKey } }
      );
      return;
    }
    case Currency2.BCH: {
      if (blockchainSignature.withdrawalId) {
        txData = await signBitcoinCashOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet);
      } else {
        const privateKeys = await getPrivateKeys(wallets);
        await bcashBroadcast(
          await signBitcoinCashKMSTransaction(blockchainSignature, privateKeys, testnet),
          blockchainSignature.id
        );
        return;
      }
      break;
    }
    case Currency2.BNB: {
      await bnbBroadcast(
        await signBnbKMSTransaction(blockchainSignature, wallets[0].privateKey, testnet),
        blockchainSignature.id
      );
      return;
    }
    case Currency2.VET: {
      const wallet = wallets[0];
      const pk = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.BNB,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, pk);
      await vetBroadcast(await signVetKMSTransaction(blockchainSignature, pk, testnet), blockchainSignature.id);
      return;
    }
    case Currency2.XRP: {
      const xrpSdk = TatumXrpSDK2({ apiKey, url: TATUM_URL });
      const xrpSecret = wallets[0].secret ? wallets[0].secret : wallets[0].privateKey;
      txData = await xrpSdk.kms.sign(blockchainSignature, xrpSecret);
      await xrpSdk.blockchain.broadcast({ txData, signatureId: blockchainSignature.id });
      return;
    }
    case Currency2.XLM: {
      const xlmSdk = TatumXlmSDK2({ apiKey, url: TATUM_URL });
      const xlmSecret = wallets[0].secret ? wallets[0].secret : wallets[0].privateKey;
      txData = await xlmSdk.kms.sign(blockchainSignature, xlmSecret, testnet);
      await xlmSdk.blockchain.broadcast({ txData, signatureId: blockchainSignature.id });
      return;
    }
    case Currency2.ETH: {
      const wallet = wallets[0];
      const privateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.ETH,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, privateKey);
      if (blockchainSignature.withdrawalId) {
        txData = await signEthOffchainKMSTransaction(blockchainSignature, privateKey, testnet);
      } else {
        const signKMSTransaction = await signEthKMSTransaction(blockchainSignature, privateKey);
        const debugMode = Config.getValue(14 /* TATUM_KMS_DEBUG_MODE */) || 0;
        if (debugMode === "true" || debugMode === "1") {
          console.log("signEthKMSTransaction data", signKMSTransaction, blockchainSignature.id);
        }
        await ethBroadcast(signKMSTransaction, blockchainSignature.id);
        return;
      }
      break;
    }
    case Currency2.FLOW: {
      const wallet = wallets[0];
      const secret = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.FLOW,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, secret);
      const u = blockchainSignature.serializedTransaction;
      const r = JSON.parse(u);
      r.body.privateKey = secret;
      blockchainSignature.serializedTransaction = JSON.stringify(r);
      await flowBroadcastTx(
        (await flowSignKMSTransaction(blockchainSignature, [secret], testnet))?.txId,
        blockchainSignature.id
      );
      return;
    }
    case Currency2.ONE: {
      const wallet = wallets[0];
      const onePrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.ONE,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, onePrivateKey);
      txData = await signOneKMSTransaction(blockchainSignature, onePrivateKey, testnet);
      if (!blockchainSignature.withdrawalId) {
        await oneBroadcast(txData, blockchainSignature.id);
        return;
      }
      break;
    }
    case Currency2.CELO: {
      const wallet = wallets[0];
      const celoPrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.CELO,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, celoPrivateKey);
      const celoSDK = TatumCeloSDK2({ apiKey, url: TATUM_URL });
      txData = await celoSDK.kms.sign(blockchainSignature, celoPrivateKey);
      await celoSDK.blockchain.broadcast({ txData, signatureId: blockchainSignature.id });
      return;
    }
    case Currency2.BSC: {
      const wallet = wallets[0];
      const bscPrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.BSC,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, bscPrivateKey);
      await bscBroadcast(await signBscKMSTransaction(blockchainSignature, bscPrivateKey), blockchainSignature.id);
      return;
    }
    case Currency2.MATIC: {
      const wallet = wallets[0];
      const polygonPrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.MATIC,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, polygonPrivateKey);
      await polygonBroadcast(
        await signPolygonKMSTransaction(blockchainSignature, polygonPrivateKey, testnet),
        blockchainSignature.id
      );
      return;
    }
    case Currency2.KLAY: {
      const wallet = wallets[0];
      const klaytnPrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.KLAY,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, klaytnPrivateKey);
      await klaytnBroadcast(
        await signKlayKMSTransaction(blockchainSignature, klaytnPrivateKey, testnet),
        blockchainSignature.id
      );
      return;
    }
    case Currency2.KCS: {
      const wallet = wallets[0];
      const kcsPrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await kcsGeneratePrivateKeyFromMnemonic(wallet.testnet, wallet.mnemonic, blockchainSignature.index) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, kcsPrivateKey);
      await kcsBroadcast(await signKcsKMSTransaction(blockchainSignature, kcsPrivateKey), blockchainSignature.id);
      return;
    }
    case Currency2.XDC: {
      const wallet = wallets[0];
      const xdcPrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.XDC,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, xdcPrivateKey);
      await xdcBroadcast(await signXdcKMSTransaction(blockchainSignature, xdcPrivateKey), blockchainSignature.id);
      return;
    }
    case Currency2.EGLD: {
      const wallet = wallets[0];
      const egldPrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.EGLD,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, egldPrivateKey);
      await egldBroadcast(await signEgldKMSTransaction(blockchainSignature, egldPrivateKey), blockchainSignature.id);
      return;
    }
    case Currency2.TRON: {
      const wallet = wallets[0];
      const tronPrivateKey = wallet.mnemonic && !_2.isNil(blockchainSignature.index) ? await generatePrivateKeyFromMnemonic2(
        Currency2.TRON,
        wallet.testnet,
        wallet.mnemonic,
        blockchainSignature.index
      ) : wallet.privateKey;
      validatePrivateKeyWasFound(wallet, blockchainSignature, tronPrivateKey);
      const tronSDK = TatumTronSDK2({ apiKey, url: TATUM_URL });
      txData = await tronSDK.kms.sign(blockchainSignature, tronPrivateKey);
      await axios2.post(
        `${TATUM_URL}/v3/tron/broadcast`,
        { txData, signatureId: blockchainSignature.id },
        { headers: { "x-api-key": apiKey } }
      );
      return;
    }
    case Currency2.BTC: {
      if (blockchainSignature.withdrawalId) {
        txData = await signBitcoinOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet);
      } else {
        const privateKeys = await getPrivateKeys(wallets);
        await btcBroadcast(await signBitcoinKMSTransaction(blockchainSignature, privateKeys), blockchainSignature.id);
        return;
      }
      break;
    }
    case Currency2.LTC: {
      if (blockchainSignature.withdrawalId) {
        txData = await signLitecoinOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet);
      } else {
        const privateKeys = await getPrivateKeys(wallets);
        await ltcBroadcast(
          await signLitecoinKMSTransaction(blockchainSignature, privateKeys, testnet),
          blockchainSignature.id
        );
        return;
      }
      break;
    }
    case Currency2.DOGE: {
      if (blockchainSignature.withdrawalId) {
        txData = await signDogecoinOffchainKMSTransaction(blockchainSignature, wallets[0].mnemonic, testnet);
      } else {
        const privateKeys = await getPrivateKeys(wallets);
        await dogeBroadcast(
          await signDogecoinKMSTransaction(blockchainSignature, privateKeys, testnet),
          blockchainSignature.id
        );
        return;
      }
      break;
    }
    case Currency2.ADA: {
      const cardanoSDK = TatumCardanoSDK2({ apiKey, url: TATUM_URL });
      if (blockchainSignature.withdrawalId) {
        const privateKeys = [];
        const w = {};
        for (const signature of blockchainSignature.signatures || []) {
          if (signature.id in w) {
            privateKeys.push(
              await cardanoSDK.wallet.generatePrivateKeyFromMnemonic(w[signature.id].mnemonic, signature.index)
            );
          } else {
            w[signature.id] = await getWallet(signature.id, pwd, path, false);
            privateKeys.push(
              await cardanoSDK.wallet.generatePrivateKeyFromMnemonic(w[signature.id].mnemonic, signature.index)
            );
          }
        }
        txData = await cardanoSDK.kms.sign(blockchainSignature, privateKeys, { testnet });
      } else {
        await cardanoSDK.blockchain.broadcast({
          txData: await cardanoSDK.kms.sign(
            blockchainSignature,
            wallets.map((w) => w.privateKey),
            { testnet }
          ),
          signatureId: blockchainSignature.id
        });
        return;
      }
    }
  }
  await offchainBroadcast({
    currency: blockchainSignature.chain,
    signatureId: blockchainSignature.id,
    withdrawalId: blockchainSignature.withdrawalId,
    txData
  });
};
var versionUpdateState = {
  lastCheck: Date.now(),
  running: false,
  level: "WARN",
  message: "",
  latestVersion: "",
  currentVersion: "",
  logFunction: console.log
};
var processVersionUpdateHeader = (versionUpdateHeader) => {
  if (!versionUpdateHeader || versionUpdateState.running || versionUpdateState.lastCheck + 60 * 1e3 > Date.now()) {
    return;
  }
  versionUpdateState.lastCheck = Date.now();
  const parts = versionUpdateHeader.split(";");
  versionUpdateState.latestVersion = parts[0]?.toLowerCase()?.trim();
  versionUpdateState.level = parts[1]?.toUpperCase()?.trim();
  versionUpdateState.logFunction = versionUpdateState.level === "ERROR" ? console.error : console.log;
  versionUpdateState.message = parts[2]?.trim();
  versionUpdateState.currentVersion = version ?? "";
  if (!versionUpdateState.running && versionUpdateState.latestVersion && versionUpdateState.currentVersion && versionUpdateState.level && versionUpdateState.message && semver2.gt(versionUpdateState.latestVersion, versionUpdateState.currentVersion)) {
    versionUpdateState.running = true;
    setInterval(async () => {
      versionUpdateState.logFunction(
        `${(/* @__PURE__ */ new Date()).toISOString()} - ${versionUpdateState.level}: ${versionUpdateState.message}. Current version: ${versionUpdateState.currentVersion}. Latest version: ${versionUpdateState.latestVersion}`
      );
    }, 3e4);
  }
};
var getPendingTransactions = async (axios2, chain, signatureIds) => {
  if (signatureIds.length > KMS_CONSTANTS.SIGNATURE_IDS) {
    console.error(
      `${(/* @__PURE__ */ new Date()).toISOString()} - Error: Exceeded limit ${KMS_CONSTANTS.SIGNATURE_IDS} wallets for chain ${chain}.`
    );
    return [];
  }
  console.log(
    `${(/* @__PURE__ */ new Date()).toISOString()} - Getting pending transaction from ${chain} for ${signatureIds.length > KMS_CONSTANTS.OUTPUT_WALLETS ? signatureIds.length + " " : ""}wallets${signatureIds.length > KMS_CONSTANTS.OUTPUT_WALLETS ? "" : " " + signatureIds.join(",")}.`
  );
  try {
    const url = `${TATUM_URL}/v3/kms/pending/${chain}`;
    const response = await axios2.post(
      url,
      { signatureIds },
      {
        headers: {
          "x-api-key": Config.getValue(3 /* TATUM_API_KEY */),
          "x-ttm-kms-client-version": version ?? ""
        }
      }
    );
    const { data } = response;
    processVersionUpdateHeader(response.headers["x-ttm-kms-latest-version"]);
    return data;
  } catch (e) {
    console.error(
      `${(/* @__PURE__ */ new Date()).toISOString()} - Error received from API /v3/kms/pending/${chain} - ${e.config.data}: ` + e
    );
  }
  return [];
};
var processSignatures = async (pwd, testnet, axios2, path, chains, externalUrl, externalUrlMethod, period = 5, runOnce, wallet, transactionIds) => {
  let running = false;
  const supportedChains = chains || [
    Currency2.BCH,
    Currency2.VET,
    Currency2.XRP,
    Currency2.XLM,
    Currency2.ETH,
    Currency2.BTC,
    Currency2.MATIC,
    Currency2.KLAY,
    Currency2.LTC,
    Currency2.DOGE,
    Currency2.CELO,
    Currency2.BSC,
    Currency2.SOL,
    Currency2.TRON,
    Currency2.BNB,
    Currency2.FLOW,
    Currency2.XDC,
    Currency2.EGLD,
    Currency2.ONE,
    Currency2.ADA,
    Currency2.ALGO,
    Currency2.KCS
  ];
  if (runOnce) {
    await processPendingTransactions(supportedChains, pwd, testnet, path, axios2, externalUrl, externalUrlMethod, wallet, transactionIds);
    return;
  }
  setInterval(async () => {
    if (running) {
      return;
    }
    running = true;
    await processPendingTransactions(supportedChains, pwd, testnet, path, axios2, externalUrl, externalUrlMethod);
    running = false;
  }, period * 1e3);
};
async function processPendingTransactions(supportedChains, pwd, testnet, path, axios2, externalUrl, externalUrlMethod, wallet, transactionIds) {
  const transactions = [];
  try {
    for (const supportedChain of supportedChains) {
      const wallets = wallet ? [wallet] : getManagedWallets(pwd, supportedChain, testnet, path);
      transactions.push(...await getPendingTransactions(axios2, supportedChain, wallets));
    }
  } catch (e) {
    console.error(e);
  }
  const data = [];
  for (const transaction of transactions) {
    try {
      if (isTransactionIdExcluded(transaction)) {
        console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - Tx was not processed: ${transaction.id} , expected one of : ${transactionIds?.join(" , ")}`);
        continue;
      }
      await processTransaction(transaction, testnet, pwd, axios2, path, externalUrl, externalUrlMethod);
      console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - Tx was processed: ${transaction.id}`);
    } catch (e) {
      const msg = e.response ? JSON.stringify(e.response.data, null, 2) : `${e}`;
      data.push({ signatureId: transaction.id, error: msg });
      console.error(`${(/* @__PURE__ */ new Date()).toISOString()} - Could not process transaction id ${transaction.id}, error: ${msg}`);
    }
  }
  if (data.length > 0) {
    try {
      const url = `${TATUM_URL}/v3/tatum/kms/batch`;
      await axios2.post(url, { errors: data }, { headers: { "x-api-key": Config.getValue(3 /* TATUM_API_KEY */) } });
      console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - Send batch call to url '${url}'.`);
    } catch (e) {
      console.error(
        `${(/* @__PURE__ */ new Date()).toISOString()} - Error received from API /v3/tatum/kms/batch - ${e.config.data}`
      );
    }
  }
  function isTransactionIdExcluded(transaction) {
    return transactionIds && !transactionIds.includes(transaction.id);
  }
}
function isValidNumber(value) {
  return !_2.isNil(value) && _2.isNumber(value) && _2.isFinite(value);
}
function getSignatureIdsLog(blockchainSignature) {
  const signatures = [...blockchainSignature.hashes, ...blockchainSignature.signatures?.map((value) => value.id) ?? []];
  return signatures ? signatures.join(",") : "";
}

// src/index.ts
import HttpAgent from "agentkeepalive";
import { existsSync as existsSync2 } from "fs";
import * as process2 from "process";
import { homedir as homedir2 } from "os";
dotenv.config();
var httpAgent = new HttpAgent({
  maxSockets: 4,
  maxFreeSockets: 2,
  timeout: 6e4,
  // up to 110000, but I would stay with 60s
  freeSocketTimeout: 3e4
});
var httpsAgent = new HttpAgent.HttpsAgent({
  maxSockets: 4,
  maxFreeSockets: 2,
  timeout: 6e4,
  // up to 110000, but I would stay with 60s
  freeSocketTimeout: 3e4
});
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;
var axiosInstance = axios.create();
var optionsConst = `
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
        --externalUrl                     Pass in external url to check valid transaction. This parameter is mandatory for mainnet (if testnet is false).  Daemon mode only.
        --externalUrlMethod               Determine what http method to use when calling the url passed in the --externalUrl option. Accepts GET or POST. Defaults to GET method. Daemon mode only. 
        --runOnce                         Run the daemon command one time. Check for a new transactions to sign once, and then exit the process. Daemon mode only.
`;
var getPasswordType = (flags) => {
  if (flags.aws) {
    return 1 /* AWS */;
  }
  if (flags.azure) {
    return 2 /* AZURE */;
  }
  if (flags.vgs) {
    return 3 /* VGS */;
  }
  return 0 /* CMD_LINE */;
};
var startup = async () => {
  const { input: command, flags, help } = meow(optionsConst, {
    importMeta: import.meta,
    flags: {
      path: {
        type: "string"
      },
      chain: {
        type: "string"
      },
      apiKey: {
        type: "string"
      },
      testnet: {
        type: "boolean",
        isRequired: true
      },
      vgs: {
        type: "boolean"
      },
      aws: {
        type: "boolean"
      },
      azure: {
        type: "boolean"
      },
      period: {
        type: "number",
        default: 5
      },
      externalUrl: {
        type: "string",
        isRequired: (f, input) => input[0] === "daemon" && !f.testnet
      },
      envFile: {
        type: "string"
      },
      externalUrlMethod: {
        type: "string",
        default: "GET"
      },
      runOnce: {
        type: "boolean",
        default: false
      }
    }
  });
  const envFilePath = flags.envFile ?? homedir2() + "/.tatumrc/.env";
  if (existsSync2(envFilePath)) {
    dotenv.config({ path: envFilePath });
  }
  setTatumKey(flags.apiKey);
  if (command.length === 0) {
    console.log(help);
    return;
  }
  switch (command[0]) {
    case "daemon": {
      const pwd = await getPassword(getPasswordType(flags), axiosInstance);
      await processSignatures(
        pwd,
        flags.testnet,
        axiosInstance,
        flags.path,
        flags.chain?.split(","),
        flags.externalUrl,
        flags.externalUrlMethod,
        flags.period,
        flags.runOnce,
        flags.wallet,
        flags.transactionIds?.split(",")
      );
      break;
    }
    case "generatewallet":
      console.log(JSON.stringify(await generateWallet2(command[1], flags.testnet), null, 2));
      break;
    case "export":
      exportWallets(await getPassword(getPasswordType(flags), axiosInstance), flags.path);
      break;
    case "generatemanagedwallet":
      await storeWallet(
        command[1],
        flags.testnet,
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path
      );
      break;
    case "storemanagedwallet":
      await storeWallet(
        command[1],
        flags.testnet,
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path,
        getQuestion("Enter mnemonic to store:")
      );
      break;
    case "storemanagedprivatekey":
      await storePrivateKey(
        command[1],
        flags.testnet,
        getQuestion("Enter private key to store:"),
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path
      );
      break;
    case "generatemanagedprivatekeybatch":
      await generateManagedPrivateKeyBatch(
        command[1],
        command[2],
        flags.testnet,
        await getPassword(getPasswordType(flags), axiosInstance),
        flags.path
      );
      break;
    case "getmanagedwallet":
      await getWallet(command[1], await getPassword(getPasswordType(flags), axiosInstance), flags.path);
      break;
    case "getprivatekey":
      await getPrivateKey(command[1], command[2], flags.path);
      break;
    case "getaddress":
      await getAddress(command[1], command[2], flags.path);
      break;
    case "removewallet":
      await removeWallet(command[1], await getPassword(getPasswordType(flags), axiosInstance), flags.path);
      break;
    case "checkconfig":
      checkConfig(getPasswordType(flags), envFilePath, flags.path);
      break;
    case "report":
      await report(
        utils.csvToArray(command[1]),
        getPasswordType(),
        await getPassword(getPasswordType(), axiosInstance),
        flags.path
      );
      break;
    default:
      console.error("Unsupported command. Use tatum-kms --help for details.");
      process2.exit(-1);
  }
};
startup();
