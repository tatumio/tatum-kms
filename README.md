# Tatum KMS
Key Management System for Tatum-powered applications.

## Installation
Tatum KMS is shipped via npm. It installs a set of CLI tools and commands to generate and store wallets / private keys in a secure way.  

```
npm i -g @tatumio/tatum-kms
```

## Usage
To see list of all available commands, please see help.

```
tatum --help
```

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
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ``` 
  
* `generatemanagedwallet chain` - generates wallet for a specific blockchain and adds it to the managed wallets.
 This call echos signatureHash of the wallet to be used in API requests to the Tatum API and Extended Public Key of the wallet to pair with Tatum Ledger accounts.
 
    ```
    bash:$ tatum generatemanagedwallet BTC
    {
        "signatureHash": "asklfnqo3i478fnkjwefnioasf9qp34fnq8q398fnqjfbao4q3io4bo83g",
        "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```   
  
* `getmanagedwallet signatureHash` - obtain managed wallet from wallet store.
 
    ```
    bash:$ tatum getmanagedwallet asklfnqo3i478fnkjwefnioasf9qp34fnq8q398fnqjfbao4q3io4bo83g
    {
      "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
      "xpriv": "xprvA1srLWNaGEkhdSJg6cLTMAziUpQcefpu2ZnKH2PXGiXEPKTdVPHjLFp4aZSSqSsaLMNrWXoj6TsyyUqh18T1hbiQkC42aWjXB9HnpmmqrYr",
      "xpub": "xpub6EsCk1uU6cJzqvP9CdsTiJwT2rF748YkPnhv5Qo8q44DG7nn2vbyt48YRsNSUYS44jFCW9gwvD9kLQu9AuqXpTpM1c5hgg9PsuBLdeNncid"
    }
  ```

* `removewallet signatureHash` - remove managed wallet from wallet store.
 
    ```
    bash:$ tatum getmanagedwallet asklfnqo3i478fnkjwefnioasf9qp34fnq8q398fnqjfbao4q3io4bo83g    
  ```      