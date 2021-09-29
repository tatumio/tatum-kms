# Tatum KMS
Key Management System for Tatum-powered applications.

## Security Principals
Tatum KMS is used to store private keys and mnemonics of the blockchain wallets securely. KMS periodically pulls pending
transactions to sign from Tatum Cloud, signs them locally using stored private keys, and broadcasts them to the blockchain.

### Secure storage
Tatum KMS generates and stores the private keys and mnemonic in the local file system's encrypted file.
The wallet file is encrypted using the AES-GCM-256 cipher.

The most sensitive information in this architecture is the password, which is used to encrypt the file. The password is never passed
as a parameter or obtained from the environment variables. 
There are three ways of entering a password to the KMS:
* during the start of the KMS, the password is entered manually and stored in the memory during the daemon's runtime.
* password is stored in the [VGS Vault](https://verygoodsecurity), obtained during startup, and stored in the memory during the daemon's runtime.
* password is stored in the [Azure Vault](https://azure.microsoft.com/en-us/services/key-vault/), obtained during startup, and stored in the memory during the daemon's runtime.

In this architecture, private keys and mnemonics never leave your perimeter, but they are encrypted if anybody gains access to the file system.

## Installation
Tatum KMS is shipped via npm. It installs a set of CLI tools and commands to generate and store wallets / private keys securely.
NodeJS >=14 and npm@6 is required. Not working on npm@7!!!
```
npm i -g @tatumio/tatum-kms
```

## Usage
To see list of all available commands, please see help.

```
tatum-kms --help
```

### Daemon mode
By default, Tatum KMS runs as a daemon and periodically checks (defaults to once every 15 seconds) any new pending transactions to sign.

```
tatum-kms daemon
```

After a successful startup, daemon will require the password to the wallet store. In wallet store, data are encrypted and password is stored only in memory of the daemon.
```
bash:$ tatum-kms daemon
Enter password to decrypt wallet store:
```
Wallet store is saved in the home folder of the user in .tatumrc folder, e.g. `/home/admin/.tatumrc/wallet.dat`.
To change path to the wallet file, parameter `--path` is used.

```
tatum-kms daemon --path=/path/to/wallet/store/directory/wallet.dat
```

Another way how to provide the password is via env variable:

```
TATUM_KMS_PASSWORD=password
```

To change periodicity, use `--period` parameter (in seconds).

```
tatum-kms daemon --period=5
```

By default, Tatum KMS checks for pending transaction in every blockchain - BTC, BCH, BNB, LTC, ETH, ETH ERC20s, XLM,
XRP, VET, DOGE, TRON, BSC, CELO, FLOW, XDC. To specify concrete blockchains, parameter `--chain` is used with
blockchains separated by `,`.

```
tatum-kms daemon --chain=BTC,LTC,ETH
```

If you want to verify, if transaction, which is being signed using KMS is yours, you can enable 4-eye-principle.
Add `externalUrl` parameter, which will point to your application server. This server will hold list of valid
transactions to sign. Every time the tx is fetched from Tatum to be signed, it is validated against the external server
using simple HTTP GET operation `your_external_url/transaction_id`. If response is 2xx, transaction is being signed.
Otherwise transaction is skipped and not signed and you should do the appropriate operations on your end.

```
tatum-kms daemon --external-url=http://192.168.57.63
```

### CLI tools

Tatum KMS is shipped alongside a daemon mode with a set of scripts to communicate with daemon and modify it.

* `generatewallet chain` - generates wallet for a specific blockchain and echos it to the output. This method does not
  add wallet to the managed wallets by Tatum KMS.

    ```
    bash:$ tatum-kms generatewallet BTC
    {
      "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
      "xpriv": "xprvA1srLWNaGEkhdSJg6cLTMAziUpQcefpu2ZnKH2PXGiXEPKTdVPHjLFp4aZSSqSsaLMNrWXoj6TsyyUqh18T1hbiQkC42aWjXB9HnpmmqrYr",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid",
      "testnet": false,
      "chain": "BTC"
    }
  ``` 
  
* `generatemanagedwallet chain` - generates wallet for a specific blockchain and adds it to the managed wallets.
 This call echos signatureId of the wallet to be used in API requests to the Tatum API and Extended Public Key of the wallet to pair with Tatum Ledger accounts.
 
    ```
    bash:$ tatum-kms generatemanagedwallet BTC
    {
        "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```    

* `storemanagedwallet chain` - stores mnemonic-based wallet for a specific blockchain and adds it to the managed wallets.
 This call echos signatureId of the wallet to be used in API requests to the Tatum API and Extended Public Key of the wallet to pair with Tatum Ledger accounts.
 
    ```
    bash:$ tatum-kms storemanagedwallet BTC
    {
        "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```   
  
* `storemanagedprivatekey chain` - store private key of a specific blockchain account and adds it to the managed wallets.
 This call echos signatureId of the wallet to be used in API requests to the Tatum API.
 
    ```
    bash:$ tatum-kms storemanagedprivatekey BTC
    {
        "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5"
    }
  ```   
  
* `getmanagedwallet signatureId` - obtain managed wallet / private key from wallet store.
 
    ```
    bash:$ tatum-kms getmanagedwallet e3015fc0-2112-4c8a-b8bf-353b86f63ba5
    {
      "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
      "xpriv": "xprvA1srLWNaGEkhdSJg6cLTMAziUpQcefpu2ZnKH2PXGiXEPKTdVPHjLFp4aZSSqSsaLMNrWXoj6TsyyUqh18T1hbiQkC42aWjXB9HnpmmqrYr",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid",
      "testnet": false,
      "chain": "BTC"
    }
  ```

* `removewallet signatureId` - remove managed wallet from wallet store.
 
    ```
    bash:$ tatum-kms removewallet e3015fc0-2112-4c8a-b8bf-353b86f63ba5    
  ```     
  
* `getprivatekey signatureId i` - obtain managed wallet from wallet store and generate private key for given derivation index.
 
    ```
    bash:$ tatum-kms getprivatekey e3015fc0-2112-4c8a-b8bf-353b86f63ba5 3
    {
      "privateKey": "L4TUX4PP4X5R9JqotwmHbEYXz3WLrw4FR7FfVmZJoSdMovCV2mEe"
    }   
  ```    

* `getaddress signatureId i` - obtain managed wallet from wallet store and generate address for given derivation index.
 
    ```
    bash:$ tatum-kms getaddress e3015fc0-2112-4c8a-b8bf-353b86f63ba5 3
    {
      "address": "13KvuMxDNT7jDffgSp7QtuLJq6fjpq1Ah7"
    }   
  ```   

* `export` - export all managed wallets
 
    ```
    bash:$ tatum-kms export
    {
      "e3015fc0-2112-4c8a-b8bf-353b86f63ba5": {
           "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
           "xpriv": "xprvA1srLWNaGEkhdSJg6cLTMAziUpQcefpu2ZnKH2PXGiXEPKTdVPHjLFp4aZSSqSsaLMNrWXoj6TsyyUqh18T1hbiQkC42aWjXB9HnpmmqrYr",
           "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid",
           "testnet": false,
           "chain": "BTC"
         }
    }   
  ```     
  
#### Wallet modes
Tatum API accepts 3 representations of signatureIdes in its requests:

* signatureId represents **mnemonic** type of the wallet. In API calls like /v3/offchain/bitcoin/transfer, signatureId present in the request should represent mnemonic type of wallet. 
   ```
    bash:$ tatum-kms generatemanagedwallet BTC
    {
        "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```    
* signatureId represents **privateKey** type of the wallet. In API calls like /v3/bitcoin/transaction, signatureId present in the request should represent private key type of wallet.
    ```
    bash:$ tatum-kms storemanagedprivatekey BTC
    {
        "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5"
    }
  ```  
* signatureId represents **mnemonic** and **index** type of the wallet. In API calls like /v3/offchain/ethereum/transfer, alongside signatureId there should be index of the concrete private key from the mnemonic, which should be used.
   ```
    bash:$ tatum-kms generatemanagedwallet BTC
    {
        "signatureId": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```

## Most common issues / problems
 ```
 error:: TypeError: Cannot read property 'mnemonic' of undefined
 ```
 
 You are using wrong signatureId. There are 2 types of signatureId:
 * mnemonic based - signature ID holds the mnemonic. You need to always pass index: 0-2^31-1 in the API request to specify, which private key the KMS should generate from that mnemonic. 
 * private key based - signature ID holds the specific private key. This type of signatureId won't work for mnemonic based operations like BTC, LTC, BCH, DOGE or ADA transfers, where Tatum is taking care of the UTXO management.

This error occurs when you are using your mnemonic based signatureID in the operation, where private key is expected, or you didnt specify an index of the private key to use from the mnemonic based signature ID.
