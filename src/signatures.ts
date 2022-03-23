import {
    adaBroadcast,
    algorandBroadcast,
    bcashBroadcast,
    bnbBroadcast,
    bscBroadcast,
    btcBroadcast,
    celoBroadcast,
    Currency,
    dogeBroadcast,
    egldBroadcast,
    ethBroadcast,
    flowBroadcastTx,
    flowSignKMSTransaction,
    generatePrivateKeyFromMnemonic,
    getPendingTransactionsKMSByChain, klaytnBroadcast,
    ltcBroadcast,
    offchainBroadcast,
    oneBroadcast,
    polygonBroadcast,
    signAdaKMSTransaction,
    signAdaOffchainKMSTransaction,
    signAlgoKMSTransaction,
    signBitcoinCashKMSTransaction,
    signBitcoinCashOffchainKMSTransaction,
    signBitcoinKMSTransaction,
    signBitcoinOffchainKMSTransaction,
    signBnbKMSTransaction,
    signBscKMSTransaction,
    signCeloKMSTransaction,
    signDogecoinKMSTransaction,
    signDogecoinOffchainKMSTransaction,
    signEgldKMSTransaction,
    signEthKMSTransaction,
    signEthOffchainKMSTransaction, signKlayKMSTransaction,
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
import { broadcast as kcsBroadcast, generatePrivateKeyFromMnemonic as kcsGeneratePrivateKeyFromMnemonic, signKMSTransaction as signKcsKMSTransaction } from '@tatumio/tatum-kcs'
import { broadcast as solanaBroadcast, signKMSTransaction as signSolanaKMSTransaction } from '@tatumio/tatum-solana';
import { TatumTerraSDK } from '@tatumio/terra'
import { AxiosInstance } from 'axios';
import { getManagedWallets, getWallet } from './management';

const processTransaction = async (
    transaction: TransactionKMS,
    testnet: boolean,
    pwd: string,
    axios: AxiosInstance,
    path?: string,
    externalUrl?: string
) => {

    if (externalUrl) {
        console.log(`${new Date().toISOString()} - External url '${externalUrl}' is present, checking against it.`);
        try {
            await axios.get(`${externalUrl}/${transaction.id}`);
        } catch (e) {
            console.error(e);
            console.error(`${new Date().toISOString()} - Transaction not found on external system. ID: ${transaction.id}`);
            return
        }
    }

    const wallets = [];
    for (const hash of transaction.hashes) {
        wallets.push(await getWallet(hash, path, pwd, false));
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
        case Currency.ALGO:
            const algoSecret = wallets[0].secret ? wallets[0].secret : wallets[0].privateKey;
            await algorandBroadcast(
                (
                    await signAlgoKMSTransaction(transaction, algoSecret, testnet)
                )?.txId as string,
                transaction.id
            );
            return;
        case Currency.SOL:
            await solanaBroadcast(await signSolanaKMSTransaction(transaction, wallets[0].privateKey), transaction.id);
            return;
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
        case Currency.LUNA:
            const sdk = TatumTerraSDK({ apiKey: process.env.TATUM_API_KEY as string })
            await sdk.blockchain.broadcast(
                {
                    txData: await sdk.kms.sign(
                        transaction,
                        wallets[0].privateKey,
                        testnet
                    ),
                    signatureId: transaction.id
                });
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
            const u = transaction.serializedTransaction;
            const r = JSON.parse(u)
            r.body.privateKey = secret;
            transaction.serializedTransaction = JSON.stringify(r)
            await flowBroadcastTx(
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
        case Currency.KLAY:
            const klaytnPrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.KLAY,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            await klaytnBroadcast(
                await signKlayKMSTransaction(
                    transaction,
                    klaytnPrivateKey,
                    testnet
                ),
                transaction.id
            );
            return;
        case Currency.KCS:
            const kcsPrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await kcsGeneratePrivateKeyFromMnemonic(wallets[0].testnet, wallets[0].mnemonic, transaction.index)
                    : wallets[0].privateKey;
            await kcsBroadcast(
                await signKcsKMSTransaction(
                    transaction,
                    kcsPrivateKey
                ),
                transaction.id
            )
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
        case Currency.EGLD:
            const egldPrivateKey =
                wallets[0].mnemonic && transaction.index !== undefined
                    ? await generatePrivateKeyFromMnemonic(
                        Currency.EGLD,
                        wallets[0].testnet,
                        wallets[0].mnemonic,
                        transaction.index
                    )
                    : wallets[0].privateKey;
            await egldBroadcast(
                await signEgldKMSTransaction(transaction, egldPrivateKey),
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

export const processSignaturesAsDaemon = (
    pwd: string,
    testnet: boolean,
    period: number = 5,
    axios: AxiosInstance,
    path?: string,
    chains?: Currency[],
    externalUrl?: string
) => {
    return new Promise(function () {
        let running = false;
        setInterval(async () => {
            if (running) {
                return;
            }
            running = true;
            await processSignatures(pwd, testnet, axios, path, chains, externalUrl)
            running = false;
        }, period * 1000);
    })

}

export const processSignatures = async (
    pwd: string,
    testnet: boolean,
    axios: AxiosInstance,
    path?: string,
    chains?: Currency[],
    externalUrl?: string
) => {

    const supportedChains = chains || [
        Currency.BCH,
        Currency.VET,
        Currency.XRP,
        Currency.XLM,
        Currency.ETH,
        Currency.BTC,
        Currency.MATIC,
        Currency.KLAY,
        Currency.LTC,
        Currency.DOGE,
        Currency.CELO,
        Currency.BSC,
        Currency.SOL,
        Currency.TRON,
        Currency.BNB,
        Currency.LUNA,
        Currency.FLOW,
        Currency.XDC,
        Currency.EGLD,
        Currency.ONE,
        Currency.ADA,
        Currency.ALGO,
        Currency.KCS,
    ];

    const transactions = [];

    for (const supportedChain of supportedChains) {
        try {
            const wallets = getManagedWallets(pwd, supportedChain, testnet, path).join(',');
            console.log(
                `${new Date().toISOString()} - Getting pending transaction from ${supportedChain} for wallets ${wallets}.`
            );
            transactions.push(
                ...(await getPendingTransactionsKMSByChain(supportedChain, wallets))
            );
        } catch (e) {
            console.error(e);
        }
    }

    const data = [];
    for (const transaction of transactions) {
        try {
            await processTransaction(transaction, testnet, pwd, axios, path, externalUrl);
        } catch (e) {
            const msg = e.response
                ? JSON.stringify(e.response.data, null, 2)
                : `${e}`;
            data.push({ signatureId: transaction.id, error: msg });
            console.error(`${new Date().toISOString()} - Could not process transaction id ${transaction.id}, error: ${msg}`);
        }
    }
    if (data.length > 0) {
        try {
            const url = (process.env.TATUM_API_URL || 'https://api-eu1.tatum.io') +
                '/v3/tatum/kms/batch';
            await axios.post(
                url,
                { errors: data },
                { headers: { 'x-api-key': process.env.TATUM_API_KEY as string } }
            );
            console.log(`${new Date().toISOString()} - Send batch call to url '${url}'.`);
        } catch (e) {
            console.error(`${new Date().toISOString()} - Error received from API /v3/tatum/kms/batch - ${e.config.data}`);
        }
    }


    return {
        transactions
    }

};
