import {
    bcashBroadcast,
    btcBroadcast,
    Currency,
    ethBroadcast,
    getPendingTransactionsKMSByChain,
    ltcBroadcast,
    offchainBroadcast,
    signBitcoinCashKMSTransaction,
    signBitcoinCashOffchainKMSTransaction,
    signBitcoinKMSTransaction,
    signBitcoinOffchainKMSTransaction,
    signEthKMSTransaction,
    signEthOffchainKMSTransaction,
    signLitecoinKMSTransaction,
    signLitecoinOffchainKMSTransaction,
    signVetKMSTransaction,
    signXlmKMSTransaction,
    signXlmOffchainKMSTransaction,
    signXrpKMSTransaction,
    signXrpOffchainKMSTransaction,
    TransactionKMS,
    vetBroadcast,
    xlmBroadcast,
    xrpBroadcast
} from '@tatumio/tatum';
import {getWallet} from './management';

const processTransaction = async (transaction: TransactionKMS, testnet: boolean, pwd: string, path?: string) => {
    const wallets = [];
    for (const hash of transaction.hashes) {
        wallets.push(await getWallet(hash, pwd, path));
    }
    let txData = '';
    console.log(`${new Date().toISOString()} - Processing pending transaction - ${JSON.stringify(transaction, null, 2)}.`);
    switch (transaction.chain) {
        case Currency.BCH:
            if (transaction.withdrawalResponses) {
                txData = await signBitcoinCashOffchainKMSTransaction(transaction, wallets[0], testnet);
            } else {
                await bcashBroadcast(await signBitcoinCashKMSTransaction(transaction, wallets, testnet), transaction.id);
                return;
            }
            break;
        case Currency.VET:
            await vetBroadcast(await signVetKMSTransaction(transaction, wallets[0], testnet), transaction.id);
            return;
        case Currency.XRP:
            if (transaction.withdrawalResponses) {
                txData = await signXrpOffchainKMSTransaction(transaction, wallets[0]);
            } else {
                await xrpBroadcast(await signXrpKMSTransaction(transaction, wallets[0]), transaction.id);
                return;
            }
            break;
        case Currency.XLM:
            if (transaction.withdrawalResponses) {
                txData = await signXlmOffchainKMSTransaction(transaction, wallets[0], testnet);
            } else {
                await xlmBroadcast(await signXlmKMSTransaction(transaction, wallets[0], testnet), transaction.id);
                return;
            }
            break;
        case Currency.ETH:
            if (transaction.withdrawalResponses) {
                txData = await signEthOffchainKMSTransaction(transaction, wallets[0], testnet);
            } else {
                await ethBroadcast(await signEthKMSTransaction(transaction, wallets[0], testnet), transaction.id);
                return;
            }
            break;
        case Currency.BTC:
            if (transaction.withdrawalResponses) {
                txData = await signBitcoinOffchainKMSTransaction(transaction, wallets[0], testnet);
            } else {
                await btcBroadcast(await signBitcoinKMSTransaction(transaction, wallets, testnet), transaction.id);
                return;
            }
            break;
        case Currency.LTC:
            if (transaction.withdrawalResponses) {
                txData = await signLitecoinOffchainKMSTransaction(transaction, wallets[0], testnet);
            } else {
                await ltcBroadcast(await signLitecoinKMSTransaction(transaction, wallets, testnet), transaction.id);
                return;
            }
            break;
    }
    await offchainBroadcast({currency: transaction.chain, signatureId: transaction.id, txData});
};

export const processSignatures = async (pwd: string, testnet: boolean, period: number = 5, path?: string, chains?: Currency[]) => {
    let running = false;
    const supportedChains = chains || [Currency.BCH, Currency.VET, Currency.XRP, Currency.XLM, Currency.ETH, Currency.BTC, Currency.LTC];
    setInterval(async () => {
        if (running) {
            return;
        }
        running = true;

        const transactions = [];
        try {
            for (const supportedChain of supportedChains) {
                console.log(`${new Date().toISOString()} - Getting pending transaction from ${supportedChain}.`);
                transactions.push(...(await getPendingTransactionsKMSByChain(supportedChain)));
            }
        } catch (e) {
            console.error(e);
        }
        for (const transaction of transactions) {
            await processTransaction(transaction, testnet, pwd, path);
        }
        running = false;
    }, period * 1000);
};