# Tatum KMS
Key Management System for Tatum-powered applications.

## Installation
Tatum KMS is shipped via npm. It installs a set of CLI tools and commands to generate and store wallets / private keys in a secure way.  
NodeJS >=14 is required.
```
npm i -g @tatumio/tatum-kms
```

## Usage
To see list of all available commands, please see help.

```
tatum --help
```

### Daemon mode
By default, Tatum KMS runs as a daemon and periodically checks (defaults to once every 15 seconds) any new pending transactions to sign.

```
tatum daemon
```

After a successful startup, daemon will require the password to the wallet store. In wallet store, data are encrypted and password is stored only in memory of the daemon.
```
bash:$ tatum daemon
Enter password to decrypt wallet store:
```
Wallet store is saved in the home folder of the user in .tatumrc folder, e.g. `/home/admin/.tatumrc/wallet.dat`.
To change path to the wallet file, parameter `--path` is used.

```
tatum daemon --path=/path/to/wallet/store/directory/wallet.dat
```

To change periodicity, use `--period` parameter (in seconds).

```
tatum daemon --period=5
```

By default, Tatum KMS checks for pending transaction in every blockchain - BTC, BCH, LTC, ETH, ETH ERC20s, XLM, XRP, VET.
To specify concrete blockchains, parameter `--chain` is used with blockchains separated by `,`.

```
tatum daemon --chain=BTC,LTC,ETH
```

### CLI tools

Tatum KMS is shipped alongside a daemon mode with a set of scripts to communicate with daemon and modify it.

* `generatewallet chain` - generates wallet for a specific blockchain and echos it to the output.
This method does not add wallet to the managed wallets by Tatum KMS. 
 
    ```
    bash:$ tatum generatwallet BTC
    {
      "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
      "xpriv": "xprvA1srLWNaGEkhdSJg6cLTMAziUpQcefpu2ZnKH2PXGiXEPKTdVPHjLFp4aZSSqSsaLMNrWXoj6TsyyUqh18T1hbiQkC42aWjXB9HnpmmqrYr",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid",
      "testnet": false,
      "chain": "BTC"
    }
  ``` 
  
* `generatemanagedwallet chain` - generates wallet for a specific blockchain and adds it to the managed wallets.
 This call echos signatureHash of the wallet to be used in API requests to the Tatum API and Extended Public Key of the wallet to pair with Tatum Ledger accounts.
 
    ```
    bash:$ tatum generatemanagedwallet BTC
    {
        "signatureHash": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```    
  
* `storemanagedprivatekey chain` - store private key of a specific blockchain account and adds it to the managed wallets.
 This call echos signatureHash of the wallet to be used in API requests to the Tatum API.
 
    ```
    bash:$ tatum storemanagedprivatekey BTC
    {
        "signatureHash": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5"
    }
  ```   
  
* `getmanagedwallet signatureHash` - obtain managed wallet / private key from wallet store.
 
    ```
    bash:$ tatum getmanagedwallet e3015fc0-2112-4c8a-b8bf-353b86f63ba5
    {
      "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
      "xpriv": "xprvA1srLWNaGEkhdSJg6cLTMAziUpQcefpu2ZnKH2PXGiXEPKTdVPHjLFp4aZSSqSsaLMNrWXoj6TsyyUqh18T1hbiQkC42aWjXB9HnpmmqrYr",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid",
      "testnet": false,
      "chain": "BTC"
    }
  ```

* `removewallet signatureHash` - remove managed wallet from wallet store.
 
    ```
    bash:$ tatum removewallet e3015fc0-2112-4c8a-b8bf-353b86f63ba5    
  ```     
  
* `getprivatekey signatureHash i` - obtain managed wallet from wallet store and generate private key for given derivation index.
 
    ```
    bash:$ tatum getprivatekey e3015fc0-2112-4c8a-b8bf-353b86f63ba5 3
    {
      "privateKey": "L4TUX4PP4X5R9JqotwmHbEYXz3WLrw4FR7FfVmZJoSdMovCV2mEe"
    }   
  ```    

* `getaddress signatureHash i` - obtain managed wallet from wallet store and generate address for given derivation index.
 
    ```
    bash:$ tatum getaddress e3015fc0-2112-4c8a-b8bf-353b86f63ba5 3
    {
      "address": "13KvuMxDNT7jDffgSp7QtuLJq6fjpq1Ah7"
    }   
  ```   
  
#### Wallet modes
Tatum API accepts 3 representations of signatureHashes in its requests:

* signatureHash represents **mnemonic** type of the wallet. In API calls like /v3/offchain/bitcoin/transfer, signatureHash present in the request should represent mnemonic type of wallet. 
   ```
    bash:$ tatum generatemanagedwallet BTC
    {
        "signatureHash": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```    
* signatureHash represents **privateKey** type of the wallet. In API calls like /v3/bitcoin/transaction, signatureHash present in the request should represent private key type of wallet.
    ```
    bash:$ tatum storemanagedprivatekey BTC
    {
        "signatureHash": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5"
    }
  ```  
* signatureHash represents **mnemonic** and **index** type of the wallet. In API calls like /v3/offchain/ethereum/transfer, alongside signatureHash there should be index of the concrete private key from the mnemonic, which should be used.
   ```
    bash:$ tatum generatemanagedwallet BTC
    {
        "signatureHash": "e3015fc0-2112-4c8a-b8bf-353b86f63ba5",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```    