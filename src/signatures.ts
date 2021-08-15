import {
    adaBroadcast,
    bcashBroadcast,
    bnbBroadcast,
    bscBroadcast,
    btcBroadcast,
    celoBroadcast,
    Currency,
    dogeBroadcast,
    ethBroadcast,
    flowBroadcast,
    generatePrivateKeyFromMnemonic,
    getPendingTransactionsKMSByChain,
    ltcBroadcast,
    offchainBroadcast,
    oneBroadcast,
    polygonBroadcast,
    signAdaKMSTransaction,
    signAdaOffchainKMSTransaction,
    signBitcoinCashKMSTransaction,
    signBitcoinCashOffchainKMSTransaction,
    signBitcoinKMSTransaction,
    signBitcoinOffchainKMSTransaction,
    signBnbKMSTransaction,
    signBscKMSTransaction,
    signCeloKMSTransaction,
    signDogecoinKMSTransaction,
    signDogecoinOffchainKMSTransaction,
    signEthKMSTransaction,
    signEthOffchainKMSTransaction,
    signLitecoinKMSTransaction,
    signLitecoinOffchainKMSTransaction,
    signOneKMSTransaction,
    signPolygonKMSTransaction,
    signTronKMSTransaction,
    signVetKMSTransaction,
    signXdcKMSTransaction,
    signXlmKMSTransaction,
    signXlmOffchainKMSTransaction,
    signXrpKMSTransaction,
    signXrpOffchainKMSTransaction,
    TransactionKMS,
    tronBroadcast,
    vetBroadcast,
    xdcBroadcast,
    xlmBroadcast,
    xrpBroadcast,
} from '@tatumio/tatum';
import {flowSignKMSTransaction} from '@tatumio/tatum/dist/src/transaction/flow';
import axios from 'axios';
import {getWallet} from './management';

const processTransaction = async (
    transaction: TransactionKMS,
    testnet: boolean,
    pwd: string,
    path?: string,
    externalUrl?: string
) => {

    if (externalUrl) {
        console.log('External url is present, checking against it.');
        try {
            await axios.get(`${externalUrl}/${transaction.id}`);
        } catch (e) {
            console.error(e.response.data);
            console.error('Transaction not found on external system. ID: ' + transaction.id);
        }
    }

    const wallets = [];
    for (const hash of transaction.hashes) {
        wallets.push(await getWallet(hash, pwd, path, false));
    }
    let txData = '';
    console.log(
        `${new Date().toISOString()} - Processing pending transaction - ${JSON.stringify(
            transaction,
            null,
            2
        )}.`
    );
    switch (transaction.chain) {
        case Currency.BCH:
            if (transaction.withdrawalId) {
                txData = await signBitcoinCashOffchainKMSTransaction(
                    transaction,
                    wallets[0].mnemonic,
                    testnet
                );
            } else {
                await bcashBroadcast(
                    await signBitcoinCashKMSTransaction(
                        transaction,
                        wallets.map((w) => w.privateKey),
                        testnet
                    ),
                    transaction.id
                );
                return;
            }
            break;
        case Currency.BNB:
            await bnbBroadcast(
                await signBnbKMSTransaction(
                    transaction,
                    wallets[0].privateKey,
                    testnet
                ),
                transaction.id
            );
            return;
        case Currency.VET:
            const pk =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.BNB,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            await vetBroadcast(
                await signVetKMSTransaction(transaction, pk, testnet),
                transaction.id
            );
            return;
        case Currency.XRP:
            if (transaction.withdrawalId) {
                txData = await signXrpOffchainKMSTransaction(
                    transaction,
                    wallets[0].secret
                );
            } else {
                await xrpBroadcast(
                    await signXrpKMSTransaction(transaction, wallets[0].secret),
                    transaction.id
                );
                return;
            }
            break;
        case Currency.XLM:
            if (transaction.withdrawalId) {
                txData = await signXlmOffchainKMSTransaction(
                    transaction,
                    wallets[0].secret,
                    testnet
                );
            } else {
                await xlmBroadcast(
                    await signXlmKMSTransaction(transaction, wallets[0].secret, testnet),
                    transaction.id
                );
                return;
            }
            break;
        case Currency.ETH:
            const privateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.ETH,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            if (transaction.withdrawalId) {
                txData = await signEthOffchainKMSTransaction(
                    transaction,
                    privateKey,
                    testnet
                );
            } else {
                await ethBroadcast(
                    await signEthKMSTransaction(transaction, privateKey),
                    transaction.id
                );
                return;
            }
            break;
        case Currency.FLOW:
            const secret =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.FLOW,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            await flowBroadcast(
                (
                    await flowSignKMSTransaction(transaction, [secret], testnet)
                )?.txId as string,
                transaction.id
            );
            return;
        case Currency.ONE:
            const onePrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.ONE,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            txData = await signOneKMSTransaction(transaction, onePrivateKey, testnet);
            if (!transaction.withdrawalId) {
                await oneBroadcast(txData, transaction.id);
                return;
            }
            break;
        case Currency.CELO:
            const celoPrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.CELO,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            await celoBroadcast(
                await signCeloKMSTransaction(transaction, celoPrivateKey, testnet),
                transaction.id
            );
            return;
        case Currency.BSC:
            const bscPrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.BSC,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            await bscBroadcast(
                await signBscKMSTransaction(transaction, bscPrivateKey),
                transaction.id
            );
            return;
        case Currency.MATIC:
            const polygonPrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.MATIC,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            await polygonBroadcast(
                await signPolygonKMSTransaction(
                    transaction,
                    polygonPrivateKey,
                    testnet
                ),
                transaction.id
            );
            return;
        case Currency.XDC:
            const xdcPrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.XDC,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            await xdcBroadcast(
                await signXdcKMSTransaction(transaction, xdcPrivateKey),
                transaction.id
            );
            return;
        case Currency.TRON:
            const fromPrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.TRON,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            txData = await signTronKMSTransaction(
                transaction,
                fromPrivateKey,
                testnet
            );
            if (!transaction.withdrawalId) {
                await tronBroadcast(txData, transaction.id);
                return;
            }
            break;
        case Currency.BTC:
            if (transaction.withdrawalId) {
                txData = await signBitcoinOffchainKMSTransaction(
                    transaction,
                    wallets[0].mnemonic,
                    testnet
                );
            } else {
                await btcBroadcast(
                    await signBitcoinKMSTransaction(
                        transaction,
                        wallets.map((w) => w.privateKey)
                    ),
                    transaction.id
                );
                return;
            }
            break;
        case Currency.LTC:
            if (transaction.withdrawalId) {
                txData = await signLitecoinOffchainKMSTransaction(
                    transaction,
                    wallets[0].mnemonic,
                    testnet
                );
            } else {
                await ltcBroadcast(
                    await signLitecoinKMSTransaction(
                        transaction,
                        wallets.map((w) => w.privateKey),
                        testnet
                    ),
                    transaction.id
                );
                return;
            }
            break;
        case Currency.DOGE:
            if (transaction.withdrawalId) {
                txData = await signDogecoinOffchainKMSTransaction(
                    transaction,
                    wallets[0].mnemonic,
                    testnet
                );
            } else {
                await dogeBroadcast(
                    await signDogecoinKMSTransaction(
                        transaction,
                        wallets.map((w) => w.privateKey),
                        testnet
                    ),
                    transaction.id
                );
                return;
            }
            break;
        case Currency.ADA:
            if (transaction.withdrawalId) {
                txData = await signAdaOffchainKMSTransaction(
                    transaction,
                    wallets[0].mnemonic,
                    testnet
                );
            } else {
                await adaBroadcast(
                    await signAdaKMSTransaction(
                        transaction,
                        wallets.map((w) => w.privateKey)
                    ),
                    transaction.id
                );
                return;
            }
    }
    await offchainBroadcast({
        currency: transaction.chain,
        signatureId: transaction.id,
        withdrawalId: transaction.withdrawalId,
        txData,
    });
};

export const processSignatures = async (
    pwd: string,
    testnet: boolean,
    period: number = 5,
    path?: string,
    chains?: Currency[],
    externalUrl?: string
) => {
    let running = false;
    const supportedChains = chains || [
        Currency.BCH,
        Currency.VET,
        Currency.XRP,
        Currency.XLM,
        Currency.ETH,
        Currency.BTC,
        Currency.MATIC,
        Currency.LTC,
        Currency.DOGE,
        Currency.CELO,
        Currency.BSC,
        Currency.TRON,
        Currency.BNB,
        Currency.FLOW,
        Currency.XDC,
        Currency.ONE,
        Currency.ADA,
    ];
    setInterval(async () => {
        if (running) {
            return;
        }
        running = true;

        const transactions = [];
        try {
            for (const supportedChain of supportedChains) {
                console.log(
                    `${new Date().toISOString()} - Getting pending transaction from ${supportedChain}.`
                );
                transactions.push(
                    ...(await getPendingTransactionsKMSByChain(supportedChain))
                );
            }
        } catch (e) {
            console.error(e);
        }
        for (const transaction of transactions) {
            try {
                await processTransaction(transaction, testnet, pwd, path, externalUrl);
            } catch (e) {
                const msg = e.response
                    ? JSON.stringify(e.response.data, null, 2)
                    : `${e}`;
                console.error(e);
                try {
                    await axios.post(
                        (process.env.TATUM_API_URL || 'https://api-eu1.tatum.io') +
                        '/v3/tatum/kms',
                        {
                            signatureId: transaction.id,
                            error: msg,
                        },
                        {headers: {'x-api-key': process.env.TATUM_API_KEY}}
                    );
                } catch (e) {
                    console.error(e);
                }
            }
        }
        running = false;
    }, period * 1000);
};
