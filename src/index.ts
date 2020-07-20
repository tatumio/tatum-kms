#!/usr/bin/env node
import {generateWallet} from '@tatumio/tatum';
import {getWallet, removeWallet, storeWallet} from './management';
import {processSignatures} from './signatures';

const meow = require('meow');
const {question} = require('readline-sync');

const {input: command, flags} = meow(`
    Usage
        $ tatum command

    Commands
        daemon                            Run as a daemon, which periodically checks for a new transactions to sign.
        generatewallet <chain>            Generates wallet for a specific blockchain and echos it to the output.
        generatemanagedwallet <chain>     Generates wallet for a specific blockchain and adds it to the managed wallets.
        getmanagedwallet <signatureId>    Obtain managed wallet from wallet store.
        removewallet <signatureId>        Remove managed wallet from wallet store.

	Options
        --api-key                         Tatum API Key to communicate with Tatum API. Daemon mode only.
        --testnet                         True/False to indicate testnet or mainnet version of blockchain.
        --path                            Custom path to wallet store file.
        --period                          Period in seconds to check for new transactions to sign, defaults to 5 seconds. Daemon mode only.
        --chain                           Blockchains to check, separated by comma. Daemon mode only.
	  
`, {
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
        period: {
            type: 'number',
            default: 15,
        }
    }
});

const startup = async () => {
    switch (command[0]) {
        case 'daemon':
            const pwd = question('Enter password to access wallet store:', {
                hideEchoBack: true,
            });
            process.env.TATUM_API_KEY = flags.apiKey;
            await processSignatures(pwd, flags.testnet, flags.period, flags.path, flags.chain);
            break;
        case 'generatewallet':
            console.log(JSON.stringify(await generateWallet(command[1], flags.testnet), null, 2));
            break;
        case 'generatemanagedwallet':
            await storeWallet(command[1], flags.testnet,
                question('Enter password to access wallet store:', {
                    hideEchoBack: true,
                }), flags.path);
            break;
        case 'getmanagedwallet':
            await getWallet(command[1],
                question('Enter password to access wallet store:', {
                    hideEchoBack: true,
                }), flags.path);
            break;
        case 'removewallet':
            await removeWallet(command[1],
                question('Enter password to access wallet store:', {
                    hideEchoBack: true,
                }), flags.path);
            break;
        default:
            console.error('Unsupported command. Use tatum --help for details.');
            process.exit(-1);
    }
};

startup();
