# Tatum KMS
Key Management System for Tatum-powered applications.

## Security Principles
Tatum KMS is used to store private keys and mnemonics of the blockchain wallets securely. KMS periodically pulls pending
transactions to sign from Tatum Cloud, signs them locally using stored private keys, and broadcasts them to the blockchain.

### Secure storage
Tatum KMS generates and stores the private keys and mnemonic in the local file system's encrypted file.
The wallet file is encrypted using the AES-GCM-256 cipher.

You can use max 25k signatureIds per one blockchain and one Tatum API key. If you overreach this limit,
system will inform you by error message and stop signing your transactions until your data fulfill this limit.

The most sensitive information in this architecture is the password, which is used to encrypt the file. The password is never passed
as a parameter or obtained from the environment variables. 
There are 4 ways of entering a password to the KMS:
* during the start of the KMS, the password is entered manually and stored in the memory during the daemon's runtime.
* password is stored in the [VGS Vault](https://www.verygoodsecurity.com/), obtained during startup, and stored in the memory during the daemon's runtime.
* password is stored in the [Azure Vault](https://azure.microsoft.com/en-us/services/key-vault/), obtained during startup, and stored in the memory during the daemon's runtime.
* password is stored in the [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/), obtained during startup, and stored in the memory during the daemon's runtime.

In this architecture, private keys and mnemonics never leave your perimeter, but they are encrypted if anybody gains access to the file system.

## Installation

### Supported operating systems
You can run KMS on the following operating systems:
- **macOS:** Natively or via [Docker](https://hub.docker.com/repository/docker/tatumio/tatum-kms)
- **Unix:** Natively or via [Docker](https://hub.docker.com/repository/docker/tatumio/tatum-kms)
- **MS Windows:** Only via [Docker](https://hub.docker.com/repository/docker/tatumio/tatum-kms)

We recommend that you run KMS from the [Docker image](https://hub.docker.com/repository/docker/tatumio/tatum-kms) regardless of the operating system used.

### Installing from npm
Tatum KMS is shipped via npm. It installs a set of CLI tools and commands to generate and store wallets / private keys securely.
NodeJS >=14 and npm@6 is required. Not working on npm@7!!!
```
npm i -g @tatumio/tatum-kms
```

## Usage
To see list of all available commands, please see the help.

```
tatum-kms --help
```

### Daemon mode
By default, Tatum KMS runs as a daemon and periodically checks for any new pending transactions to sign.

```
tatum-kms daemon
```

Tatum KMS checks for the pending transactions every 5 seconds by default. Retrieving the pending transactions consumes credits from the monthly credit allowance of your API key, 1 credit for every 500 signature IDs per API call.

To change the frequency of the check, use the `--period` parameter and set it the number of seconds.

```
tatum-kms daemon --period=15
```

After successful startup, the daemon requires the password to the wallet store. In the wallet store, the data is encrypted and the password is stored only in the daemon memory.
```
bash:$ tatum-kms daemon
Enter password to decrypt wallet store:
```
The wallet store is saved in the user's home folder, under the `.tatumrc` folder; for example, `/home/admin/.tatumrc/wallet.dat`.
To change the path to the wallet file, use the `--path` parameter.

```
tatum-kms daemon --path=/path/to/wallet/store/directory/wallet.dat
```

Alternatively, you can provide the password via the environment variable:

```
TATUM_KMS_PASSWORD=password
```

By default, Tatum KMS checks for pending transaction in all the supported blockchains: BTC, BCH, BNB, LTC, ETH, ETH ERC20s, XLM,
XRP, VET, DOGE, TRON, BSC, CELO, FLOW, XDC, EGLD. To check for the transactions only in some blockchains, use the `--chain` parameter and list the blockchains to check separated with a comma (`,`).

```
tatum-kms daemon --chain=BTC,LTC,ETH
```

#### 4-eye principle
To verify whether the transaction to sign with KMS is yours, enable the 4-eye-principle.

To do so, add the `external-url` parameter and set it to your application server. This server should hold the list of valid
transactions to sign. The `external-url` parameter is mandatory on the mainnet to make the production environment more secure.

```
tatum-kms daemon --external-url=http://192.168.57.63
```

Every time a transaction from Tatum is fetched to be signed, it is validated against the external server
using a simple HTTP GET operation: `your_external_url/transaction_id`. If the response is 2xx, the transaction is signed.
Otherwise, the transaction is skipped and is not signed, and you should take the appropriate steps on your end to fix the situation.

### Docker mode
* Docker pull: To run as docker container run the following command to pull tatum-kms image
  ```
  docker pull tatumio/tatum-kms
  ```
* Navigate to home directory
  ```
  cd $HOME
  ```

* Create a .env file in the $HOME directory with the following parameters:
  ```
  # required
  TATUM_API_KEY=XXXXX-YOUR-API-KEY
  # either password, AWS, Azure or VGS fields are required
  # password setup
  TATUM_KMS_PASSWORD=XXXXPASSWORD  
  # AWS setup
  TATUM_KMS_AWS_REGION=us-east-1
  TATUM_KMS_AWS_SECRET_NAME=YOUR_KMS_SECRET_NAME
  TATUM_KMS_AWS_ACCESS_KEY_ID=AKIAYWGKDBVRGMCASWIE
  TATUM_KMS_AWS_SECRET_ACCESS_KEY=ZxDq62BZGyGe2CzwnVjL/IH8NnJG5Fu0isN7wev9
  TATUM_KMS_AWS_SECRET_KEY=pwd
  # VGS setup
  TATUM_KMS_VGS_USERNAME=XXXXUSERNAME
  TATUM_KMS_VGS_PASSWORD=XXXXPASSWORDVGS
  TATUM_KMS_VGS_ALIAS=XXXVSGALIAS
  # Azure setup
  TATUM_KMS_AZURE_SECRETVERSION=XXVERSION
  TATUM_KMS_AZURE_SECRETNAME=XXSECRETNAME
  TATUM_KMS_AZURE_VAULTURL=XXXXVAULTURL

  ```
  Replace the values with your custom settings
  
* Map Volume: map your home folder to map docker volume to local storage.
  refer to docker volume mapping for more details
  https://docs.docker.com/storage/volumes/

* Docker run:
  => Interactive 
  ```
    docker run -it --env-file .env -v $HOME:/root/.tatumrc tatumio/tatum-kms --help
    docker run -it --env-file .env -v $HOME:/root/.tatumrc tatumio/tatum-kms generatemanagedwallet BTC

  ```
  => Daemon
  ```
   docker run -d --env-file .env -v $HOME:/root/.tatumrc tatumio/tatum-kms daemon
  ```


* Example:
  While the above command will run kms as daemon, you can also use docker run to call specific functions such as:
  ```
  docker run -it --env-file .env -v $HOME:/root/.tatumrc tatumio/tatum-kms generatemanagedwallet BTC
  docker run -it --env-file .env -v $HOME:/root/.tatumrc tatumio/tatum-kms storemanagedprivatekey BTC
  ```
  You can shorten the command and use it as follows:
  ```
  docker run ${COMMON_PARAMS} tatumio/tatum-kms generatemanagedwallet BTC
  ```
  Where, COMMON_PARAMS can be exported as all the necessary flags for running the container

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

* `generatemanagedprivatekeybatch chain count` - generate and store "count" number of private keys for a specific blockchain. This operation is usefull, if you wanna pregenerate bigger amount of managed private keys for later use.

    ```
    bash:$ tatum-kms generatemanagedprivatekeybatch BTC 100
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
