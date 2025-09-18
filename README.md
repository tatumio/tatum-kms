# Tatum Key Management System (KMS)
**Tatum Key Management System (KMS)** is a comprehensive solution for Tatum-powered applications.

> **Warning**
>
> Important notice about using KMS with ETH and CELO: Please upgrade to version 6.2.3 or newer (all previous versions depend on https://ethgasstation.info which will stop working from 12.12.2022)

KMS securely stores private keys and mnemonics of blockchain wallets. KMS periodically pulls pending
transactions to sign from Tatum, signs them locally using the stored private keys and mnemonics, and broadcasts them to the blockchain.

<img src="src/img/kms_overview.png" width="50%" height="50%"/>

KMS supports the following blockchains:
* Algorand (ALGO)
* Bitcoin (BTC)
* Bitcoin Cash (BCH)
* BNB Beacon Chain (BSC)
* BNB Smart Chain (BNB)
* Celo (CELO)
* Dogecoin (DOGE)
* Elrond (EGLD)
* Ethereum (ETH) including ERC-20 tokens
* Harmony (ONE)
* Klaytn (KLAY)
* KuCoin Community Chain (KCS)
* Litecoin (LTC)
* Polygon (MATIC)
* Solana (SOL)
* Stellar (XLM)
* TRON (TRON)
* VeChain (VET)
* XinFin (XDC)
* XRP (XRP)

For more information about KMS, see our [user documentation](https://docs.tatum.io/docs/tatum-key-management-system-kms).

## Secure storage
KMS generates and stores the private keys and mnemonic in an encrypted file, `wallet.dat`, in the local file system. This wallet storage file is encrypted using the AES-GCM-256 cipher.

The password that is used to encrypt the wallet storage file is the most sensitive asset in this architecture. The password is never passed as a parameter.

You can enter the password into KMS using either of the following methods:
* Enter the password manually at KMS start. The password is stored in the memory only during the daemon runtime.
* Store the password in [VGS Vault](https://www.verygoodsecurity.com/), [Microsoft Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/), or [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/). The password is obtained during KMS start and is stored in the memory only during the daemon runtime.

In this setup, the private keys and mnemonics never leave your perimeter. If someone gains unauthorized access to the file system, they cannot get the private keys and mnemonics because they are encrypted.

## Signature IDs vs. Private keys and mnemonics

Every wallet that is stored inside KMS has a unique identifier called **signature ID**. The signature ID is used in communication with the Tatum API and represents the wallet used by the specific operation.

>**NOTE:** You can have up to 25,000 signature IDs per one blockchain and one Tatum API key. If you exceed this limit,
you get an error message, and KMS stops signing your transactions until you adjust your data to respect the limit.

The Tatum API accepts the following representations of the signature ID in requests:

* A signature ID that represents the **private key** type of a wallet

    In API calls like [/v3/bitcoin/transaction](https://docs.tatum.io/reference/btcgeneratewallet#operation/BtcTransferBlockchain), `signatureId` in the request represents the private key type of the wallet.
    ```
    bash:$ tatum-kms storemanagedprivatekey BTC
    {
      "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5"
    }
  ```
* A signature ID that represents the **mnemonic** type of a wallet
    
    In API calls like [/v3/offchain/bitcoin/transfer](https://docs.tatum.io/reference/btctransfer#operation/BtcTransfer), `signatureId` in the request represents the mnemonic type of the wallet.

   ```
    bash:$ tatum-kms generatemanagedwallet BTC
    {
      "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```
* A signature ID that represents the **mnemonic**/**index** type of a wallet

    In API calls like [/v3/offchain/ethereum/transfer](https://docs.tatum.io/reference/btctransfer#operation/EthTransfer), the index of the specified private key generated from the mnemonic must be used together with `signatureId`.
   ```
    bash:$ tatum-kms generatemanagedwallet BTC
    {
      "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```

## Set up and use KMS on your site
To get KMS up and running on your site on the mainnet, complete the following steps:

1. [Install KMS](#install-kms) on your local environment.
    
    KMS is installed as a set of CLI tools and commands to generate and store wallets and private keys securely.
    You can install KMS from npm or via Docker.
1. Store the existing mnemonics and private keys in KMS, or generate new mnemonics and private keys using KMS.
    
    For more information, see the [KMS commands](#kms-commands).
1. Implement the [four-eye principle](#implement-the-four-eye-principle) by setting up a service to store the IDs of the transactions that need to be signed.

    This is another security level in KMS that verifies that the transactions to sign are yours.
1. [Run KMS in daemon mode](#run-kms-in-daemon-mode) so it can periodically check for transactions to sign.
1. When performing operations that must be signed with the private key or mnemonic (such as transferring funds, minting NFT, and so on), use the KMS schemas to build the body of the API requests as specified in the [API Reference](https://docs.tatum.io/reference/welcome-to-the-tatum-api-reference).
    
    This way, you will be using the signature ID instead of the private key or a combination of the signature ID and the index instead of the mnemonic.

## Install KMS

### Supported operating systems
You can run KMS on the following operating systems:
- **macOS:** Natively or via [Docker](https://hub.docker.com/repository/docker/tatumio/tatum-kms)
- **Unix:** Natively or via [Docker](https://hub.docker.com/repository/docker/tatumio/tatum-kms)
- **MS Windows:** Only via [Docker](https://hub.docker.com/repository/docker/tatumio/tatum-kms)

We recommend that you run KMS from the [Docker image](https://hub.docker.com/repository/docker/tatumio/tatum-kms) regardless of the operating system used.

### Environment variables
Create file `.env` file with the  following parameters and replace the placeholders with your values:  
```
# required
TATUM_API_KEY=XXXXX-YOUR-API-KEY
# one of the following setups is required: password, VGS, Azure, or AWS
# password setup
TATUM_KMS_PASSWORD=XXXXPASSWORD
# VGS setup
TATUM_KMS_VGS_USERNAME=XXXXUSERNAME
TATUM_KMS_VGS_PASSWORD=XXXXPASSWORDVGS
TATUM_KMS_VGS_ALIAS=XXXVSGALIAS
# Azure setup
TATUM_KMS_AZURE_SECRETVERSION=XXVERSION
TATUM_KMS_AZURE_SECRETNAME=XXSECRETNAME
TATUM_KMS_AZURE_VAULTURL=XXXXVAULTURL
# AWS setup
TATUM_KMS_AWS_REGION=us-east-1
TATUM_KMS_AWS_SECRET_NAME=YOUR_KMS_SECRET_NAME
TATUM_KMS_AWS_ACCESS_KEY_ID=AKIAYWGKDBVRGMCASWIE
TATUM_KMS_AWS_SECRET_ACCESS_KEY=ZxDq62BZGyGe2CzwnVjL/IH8NnJG5Fu0isN7wev9
TATUM_KMS_AWS_SECRET_KEY=pwd
# Debug mode. if true/1, it will expose data from signEthKMSTransaction() method to the console
TATUM_KMS_DEBUG_MODE=true/false/1/0
```

### Install KMS from npm
1. Install KMS globally:
   ```
   npm i -g @tatumio/tatum-kms
   ```
   or
   ```
   yarn global add @tatumio/tatum-kms
   ```
1. Use ```.env``` file to configure Tatum KMS   
   1. via ```--envFile=/path/to/.env``` 
      ```
       tatum-kms --envFile=/path/to/.env getaddress 11111111-1111-1111-1111-111111111111 0
      ```  
   1. via environment variables directly
      ```
      TATUM_API_KEY=XXXXX-YOUR-API-KEY tatum-kms --help
      ```
   1. via predefined environment vars on global level
      ```
      export TATUM_API_KEY=XXXXX-YOUR-API-KEY  
      tatum-kms --help
      ```

>**IMPORTANT!** NodeJS >=18.0 are required. KMS does **not** work on older versions.

### Install KMS via Docker
1. Pull the `tatum-kms` image:
    ```
    docker pull tatumio/tatum-kms
    ```
1. Navigate to the home directory:
    ```
    cd $HOME
    ```
1. Use pre-created ```.env``` file to configure Tatum KMS via ```--env-file .env```:
1. Map the Docker volume to the local storage (your home folder).
  
    For more details, refer to the [Docker user documentation](https://docs.docker.com/storage/volumes/).

    Once you have mapped the Docker volume, KMS is ready to be run as a Docker container.

To interactively communicate with KMS and run various [KMS commands](#kms-commands), use the `docker run` command:
```
docker run -it --env-file .env -v $HOME/.tatumrc:/home/node/.tatumrc tatumio/tatum-kms --help
docker run -it --env-file .env -v $HOME/.tatumrc:/home/node/.tatumrc tatumio/tatum-kms generatemanagedwallet BTC
docker run -it --env-file .env -v $HOME/.tatumrc:/home/node/.tatumrc tatumio/tatum-kms storemanagedprivatekey BTC
```

>**NOTE:** You can shorten the command syntax and use it as follows:
```
docker run ${COMMON_PARAMS} tatumio/tatum-kms generatemanagedwallet BTC
```
>where `COMMON_PARAMS` can be exported as all the flags necessary for running the container.

## Implement the four-eye principle
To verify whether a transaction to sign with KMS is indeed yours, implement the **four-eye-principle** (also referred to as "4-eye principle"). This principle ensures that pending transactions are controlled in Tatum and in your system.

Every time a transaction from Tatum is fetched to be signed, it is validated against an external trusted server
using a simple HTTP GET operation:

`your_external_url/transaction_id`

If the response is `2xx`, KMS signs the transaction. Otherwise, the transaction is skipped and is not signed, and you should take the appropriate steps on your end to fix the situation.

>**NOTE:** Implementing the four-eye-principle is mandatory on the mainnet to make the production environment more secure.

<img src="src/img/kms_4eye.png" width="75%" height="75%"/>

To enable the four-eye-principle:
1. Set up an application server that will hold the list of valid transactions to sign.
1. Add the `externalUrl` parameter to KMS and set it to your application server:

    ```
    tatum-kms daemon --externalUrl=http://192.168.57.63
    ```

## Run KMS in daemon mode
```
tatum-kms daemon
```
or
```
docker run -d --env-file .env -v $HOME:/root/.tatumrc tatumio/tatum-kms daemon
```
When KMS runs as a daemon, it periodically checks for any new pending transactions to sign.

After successful startup, the daemon requires the password to the wallet storage file. The file and the data in the file are encrypted, and the password is stored in the memory only during the daemon runtime.
```
bash:$ tatum-kms daemon
Enter password to decrypt wallet store:
```

Alternatively, you can provide the password via an environment variable:
```
TATUM_KMS_PASSWORD=password
```

### Change the frequency of checking for the pending transactions
Checking for the pending transactions consumes credits from the monthly credit allowance associated with your API key: 1 credit for every 500 signature IDs per API call. For more information about the credits, see [Plans and Limits](https://docs.tatum.io/docs/plans-limits).

By default, KMS checks for the pending transactions to sign every 5 seconds.

To change the frequency of the check, use the `--period` parameter and set it the required number of seconds:
```
tatum-kms daemon --period=15
```

### Change the path to the wallet storage file
By default, the [wallet storage file](#secure-storage) is saved under the `.tatumrc` folder in your home directory  (for example, `/home/admin/.tatumrc/wallet.dat`).

To change the path to the wallet storage file, use the `--path` parameter and set it to the new path:
```
tatum-kms daemon --path=/path/to/wallet/storage/file/wallet.dat
```
### Check for the pending transactions only on some blockchains 
By default, KMS checks for the pending transaction on [all supported blockchains](#tatum-key-management-system-kms).

To check for the transactions only on some blockchains, use the `--chain` parameter and set it to the list of the blockchains to check separated with a comma (`,`):
```
tatum-kms daemon --chain=BTC,LTC,ETH
```

## KMS commands
To see all available KMS commands, refer to the KMS help:
```
tatum-kms --help
```

When KMS runs in [daemon mode](#run-kms-in-daemon-mode), use the following commands to communicate with the daemon and modify it:

* `generatewallet chain` generates a wallet on the specified blockchain (`chain`) and echos it to the output.
    
    This command does **not** add the generated wallet to the wallets managed by KMS.
    ```
    bash:$ tatum-kms generatewallet BTC
    {
      "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```

* `generatemanagedwallet chain` generates a wallet on the specified blockchain (`chain`) and adds it to the managed wallets.
    
    This command echos the signature ID of the wallet to be used in requests to the Tatum API and the extended public key of the wallet to pair with [virtual accounts](https://docs.tatum.io/docs/virtual-accounts).

    ```
    bash:$ tatum-kms generatemanagedwallet BTC
    {
      "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```

* `storemanagedwallet chain` stores a mnemonic-based wallet on the specified blockchain (`chain`) and adds it to the managed wallets.
    
    This command echos the signature ID of the wallet to be used in requests to the Tatum API and the extended public key of the wallet to pair with with [virtual accounts](https://docs.tatum.io/docs/virtual-accounts).
    
    ```
    bash:$ tatum-kms storemanagedwallet BTC
    {
      "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```

* `storemanagedprivatekey chain` stores the private key of the wallet on the specified blockchain (`chain`) and adds it to the managed wallets.
    
    This command echos the signature ID of the wallet to be used in requests to the Tatum API.

    ```
    bash:$ tatum-kms storemanagedprivatekey BTC
    {
      "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5"
    }
  ```

* `generatemanagedprivatekeybatch chain count` generates and stores the specified number of private keys (`count`) on the specified blockchain (`chain`).
    
    This command is useful when you want to pre-generate a large amount of managed private keys for later use.

    ```
    bash:$ tatum-kms generatemanagedprivatekeybatch BTC 100
    ```

* `getmanagedwallet signatureId` obtains the mnemonic or the private key from the wallet storage file for the wallet associated with the specified signature ID (`signatureId`).

    ```
    bash:$ tatum-kms getmanagedwallet e3015fc0-2112-4c8a-b8bf-353b86f63ba5
    {
      "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid",
      "testnet": false,
      "chain": "BTC"
    }
    ```

* `removewallet signatureId` removes the managed wallet associated with the specified signature ID (`signatureId`) from the wallet storage file.

    ```
    bash:$ tatum-kms removewallet e3015fc0-2112-4c8a-b8bf-353b86f63ba5
    ```

* `getprivatekey signatureId i` obtains the managed wallet associated with the specified signature ID (`signatureId`) from the wallet storage file and generates a private key for the specified derivation index (`i`).

    ```
    bash:$ tatum-kms getprivatekey e3015fc0-2112-4c8a-b8bf-353b86f63ba5 3
    {
      "privateKey": "L4TUX4PP4X5R9JqotwmHbEYXz3WLrw4FR7FfVmZJoSdMovCV2mEe"
    }
    ```

* `getaddress signatureId i` obtains the managed wallet associated with the specified signature ID (`signatureId`) from the wallet storage file and generates an address for the specified derivation index (`i`).

    ```
    bash:$ tatum-kms getaddress e3015fc0-2112-4c8a-b8bf-353b86f63ba5 3
    {
      "address": "13KvuMxDNT7jDffgSp7QtuLJq6fjpq1Ah7"
    }
    ```

* `export` exports all managed wallets.

    ```
    bash:$ tatum-kms export
    {
      "e3015fc0-2112-4c8a-b8bf-353b86f63ba5": {
        "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid",
        "testnet": false,
        "chain": "BTC"
      }
    }   
    ```  
* `checkconfig`(for debugging) shows environment variables for Tatum KMS.

    ```
    bash:$ tatum-kms checkconfig
    Version                          : 6.4.0
    Wallet file path                 : ~/.tatumrc/wallet.dat
    Wallet exists                    : true
    Wallet store type                : LOCAL
    Env file                         : .env
    TATUM_API_KEY                    : d2eb5c******************************
    ...
    ```  
* `report`(for debugging) shows report of system and requested wallets (+ warnings if they were found)

    ```
    bash:$ tatum-kms report e3015fc0-2112-4c8a-b8bf-353b86f63ba5,11115fc0-2112-4c8a-b8bf-353b86f63111
    {
      "system": {
        "kmsVersion": "7.0.6",
        "nodeVersion": "v18.18.2",
        "store": {
          "type": "LOCAL",
          "exists": true
        }
      },
      "wallets": {
        "e3015fc0-2112-4c8a-b8bf-353b86f63ba5": {
          "type": "PRIVATE_KEY",
          "chain": "BTC",
          "testnet": true
        },
        "11115fc0-2112-4c8a-b8bf-353b86f63111": {
          "type": "MNEMONIC",
          "chain": "ETH",
          "testnet": true,
          "warnings": [
            "No xpub found"
          ]
        }
      },
      "apiKey": "t-6111***************************************222222",
      "warnings": [
        "Wallets file was is not accessible"
      ]
    }
    ```    

## Common issues
### Mnemonic-related error
 ```
 error:: TypeError: Cannot read property 'mnemonic' of undefined
 ```

***Possible reasons:***

* You used a mnemonic-based signature ID but the operation requires a signature ID based on the private key.
* You correctly used the mnemonic-based signature ID but you did not specify the index of the private key.

    KMS generates the private key from the mnemonic that the signature ID holds. To generate the correct private key from the mnemonic, KMS needs to know the [index of the private key](#signature-ids-vs-private-keys-and-mnemonics) to generate (0-2^31-1).

### KMS_FAILED_TX for confirmed transaction

Successful transaction in block returned failed notification in KMS. 

***Possible reason:***

KMS waits for the transaction to be processed on-chain, but a timeout is set on the core API side (usually 10 seconds, though this can vary by chain). If the transaction isn’t confirmed within that window—perhaps due to a high network load—a notification about a failed transaction is issued. 

However, the transaction may still be confirmed later and developers can implement additional logic to detect such delayed confirmations.

