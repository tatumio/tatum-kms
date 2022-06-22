import {Currency, generateAddressFromXPub, generatePrivateKeyFromMnemonic, generateWallet} from '@tatumio/tatum';
import { generateWallet as generateKcsWallet } from '@tatumio/tatum-kcs';
import {generateWallet as generateSolanaWallet} from '@tatumio/tatum-solana';
import {TatumTerraSDK} from '@tatumio/terra'
import {AES, enc} from 'crypto-js';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {homedir} from 'os';
import {dirname} from 'path';
import {question} from 'readline-sync';
import {v4 as uuid} from 'uuid';
import {Config, ConfigOption} from './config';

const config = new Config();
const ensurePathExists = (path: string) => {
    const dir = dirname(path);
    if (!existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
    }
};

export const exportWallets = (path?: string) => {
    const pwd = config.getValue(ConfigOption.KMS_PASSWORD)
    const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat';
    if (!existsSync(pathToWallet)) {
        console.error(JSON.stringify({error: `No such wallet file.`}, null, 2));
        return;
    }
    const data = readFileSync(pathToWallet, {encoding: 'utf8'});
    if (!data?.length) {
        console.error(JSON.stringify({error: `No such wallet file.`}, null, 2));
        return;
    }
    console.log(JSON.stringify(JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8)), null, 2));
};

export const getManagedWallets = (pwd: string, chain: string, testnet: boolean, path?: string) => {
    const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat';
    if (!existsSync(pathToWallet)) {
        console.error(JSON.stringify({error: `No such wallet file.`}, null, 2));
        return [];
    }
    const data = readFileSync(pathToWallet, {encoding: 'utf8'});
    if (!data?.length) {
        return [];
    }
    const wallets = JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8));
    const keys = [];
    for (const walletsKey in wallets) {
        if (chain === wallets[walletsKey].chain && testnet === wallets[walletsKey].testnet) {
            keys.push(walletsKey);
        }
    }
    return keys;
};

const generatePureWallet = async (chain: Currency, testnet: boolean, mnemonic?: string) => {
    let wallet: any;
    if (chain === Currency.SOL) {
        wallet = await generateSolanaWallet();
    } else if (chain === Currency.KCS) {
        wallet = await generateKcsWallet(mnemonic, {testnet});
    } else if (chain === Currency.LUNA) {
        wallet = TatumTerraSDK({apiKey: process.env.TATUM_API_KEY as string}).wallet.wallet();
    } else {
        wallet = await generateWallet(chain, testnet, mnemonic);
    }
    return wallet
}

export const storeWallet = async (chain: Currency, testnet: boolean, path?: string, mnemonic?: string, print = true) => {
    const pwd = config.getValue(ConfigOption.KMS_PASSWORD);
    const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat';
    const wallet = await generatePureWallet(chain, testnet, mnemonic)
    const key = uuid();
    const entry = {[key]: {...wallet, chain, testnet}};
    if (!existsSync(pathToWallet)) {
        ensurePathExists(pathToWallet);
        writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(entry), pwd).toString());
    } else {
        const data = readFileSync(pathToWallet, { encoding: 'utf8' });
        let walletData = entry;
        if (data?.length > 0) {
            walletData = { ...walletData, ...JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8)) };
        }
        writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(walletData), pwd).toString());
    }
    const value: any = { signatureId: key };
    if (wallet.address) {
        value.address = wallet.address;
    }
    if (wallet.xpub) {
        value.xpub = wallet.xpub;
    }
    if (print) {
        console.log(JSON.stringify(value, null, 2));
    }
    return { ...wallet, ...value }
};

export const storePrivateKey = async (chain: Currency, testnet: boolean, privateKey: string, path?: string, print = true) => {
    const pwd = config.getValue(ConfigOption.KMS_PASSWORD)
    const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat';
    const key = uuid();
    const entry = { [key]: { privateKey, chain, testnet } };
    if (!existsSync(pathToWallet)) {
        ensurePathExists(pathToWallet);
        writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(entry), pwd).toString());
    } else {
        const data = readFileSync(pathToWallet, { encoding: 'utf8' });
        let walletData = entry;
        if (data?.length > 0) {
            walletData = { ...walletData, ...JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8)) };
        }
        writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(walletData), pwd).toString());
    }
    if (print) {
        console.log(JSON.stringify({signatureId: key}, null, 2));
    }
    return { signatureId: key }
};

export const generateManagedPrivateKeyBatch = async (chain: Currency, count: string, testnet: boolean, path?: string) => {
    config.getValue(ConfigOption.KMS_PASSWORD);
    const cnt = Number(count)
    for (let i = 0; i < cnt; i++) {
        const wallet = await generatePureWallet(chain, testnet)
        const address = wallet.address ? wallet.address : await generateAddressFromXPub(chain, testnet, wallet.xpub, 1)
        const privateKey = wallet.secret ? wallet.secret
          : await generatePrivateKeyFromMnemonic(chain, testnet, wallet.mnemonic, 1)
        const { signatureId } = await storePrivateKey(chain, testnet, privateKey as string, path, false)
        console.log(`{ signatureId: ${signatureId}, address: ${address} }`)
    }
};

export const getWallet = async (id: string, path?: string, pwd?: string, print = true) => {
    const password = pwd ?? config.getValue(ConfigOption.KMS_PASSWORD);
    const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat';
    if (!existsSync(pathToWallet)) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return;
    }
    const data = readFileSync(pathToWallet, { encoding: 'utf8' });
    if (!data?.length) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return;
    }
    try {
        const wallet = JSON.parse(AES.decrypt(data, password).toString(enc.Utf8));
        if (!wallet[id]) {
            console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
            return;
        }
        if (print) {
            console.log(JSON.stringify(wallet[id], null, 2));
        }
        return wallet[id];
    } catch (e) {
        console.error(JSON.stringify({ error: `Wrong password.` }, null, 2));
        return;
    }
};

export const getPrivateKey = async (id: string, index: string, path?: string, password?: string, print = true) => {
    const pwd = password ?? config.getValue(ConfigOption.KMS_PASSWORD)
    const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat';
    if (!existsSync(pathToWallet)) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return null;
    }
    const data = readFileSync(pathToWallet, { encoding: 'utf8' });
    if (!data?.length) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return null;
    }
    const wallet = JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8));
    if (!wallet[id]) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return null;
    }
    const pk = { privateKey: (wallet[id].secret
            ? wallet[id].secret
            : await generatePrivateKeyFromMnemonic(wallet[id].chain, wallet[id].testnet, wallet[id].mnemonic, parseInt(index))) };
    if (print) {
        console.log(JSON.stringify(pk, null, 2));
    }
    return pk.privateKey as string;
};

export const getAddress = async (id: string, index: string, path?: string, pwd?: string, print = true) => {
    const password = pwd ?? config.getValue(ConfigOption.KMS_PASSWORD)
    const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat';
    if (!existsSync(pathToWallet)) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return null;
    }
    const data = readFileSync(pathToWallet, { encoding: 'utf8' });
    if (!data?.length) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return null;
    }
    const wallet = JSON.parse(AES.decrypt(data, password).toString(enc.Utf8));
    if (!wallet[id]) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return null;
    }
    const pk = { address: (wallet[id].address ? wallet[id].address : await generateAddressFromXPub(wallet[id].chain, wallet[id].testnet, wallet[id].xpub, parseInt(index))) };
    if (print) {
        console.log(JSON.stringify(pk, null, 2));
    }
    return { address: pk.address }
};

export const removeWallet = async (id: string, path?: string) => {
    const pwd = config.getValue(ConfigOption.KMS_PASSWORD)
    const pathToWallet = path || homedir() + '/.tatumrc/wallet.dat';
    if (!existsSync(pathToWallet)) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return;
    }
    const data = readFileSync(pathToWallet, { encoding: 'utf8' });
    if (!data?.length) {
        console.error(JSON.stringify({ error: `No such wallet for signatureId '${id}'.` }, null, 2));
        return;
    }
    const wallet = JSON.parse(AES.decrypt(data, pwd).toString(enc.Utf8));
    delete wallet[id];
    writeFileSync(pathToWallet, AES.encrypt(JSON.stringify(wallet), pwd).toString());
};

export const getTatumKey = (apiKey: string) => {
    if (apiKey) {
        process.env.TATUM_API_KEY = apiKey;
        return;
    }
}
export const getQuestion = (q: string, e?: string) => {
    if (e) {
        return e
    }
    return question(q, {
        hideEchoBack: true,
    });
}
