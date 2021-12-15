# Treasury Smart Contract

This repository contains te smart contact that define and maintains the token strategy for the i3-market ecosystem.

![Token strategy](images/token-strategy.png)

The smart contract is based on the ERC1155 standard in order to deploy a gas-efficient token contract.   
The Treasury smart contract is used to represent multiple marketplaces tokens at once.

## Getting started

Users have to deploy an instance of the Treasury smart contract to interact with the functions defined inside it. 
The instructions of how to deploy it in a development environment is described in the section [How to build and deploy](##how-to-build-and-deploy)

In this section is assumed that al the commands are running using truffle on develop chain:

Start the chain:

Run truffle develop chain.
```shell
$ truffle develop
```

Compile and deploy the Treasury smart contract in develop network.
```shell
truffle(develop)> migrate
```

Getting addresses of the wallet. 
```shell
let accounts = await web3.eth.getAccounts()
let FROM_ADDRESS = accounts[0]
```

Getting a Treasury smart contract instance.
```shell
truffle(develop)> let instance = await I3MarketTreasury.deployed()
```

Execute methods
There is two ways for executing methods:  

- **Transactions**: Change the status of the network, the are executed in an asynchronous way and only return a 
transaction id.  
  ```shell
  truffle(develop)> var result = instance.addMarketplace(FROM_ADDRESS, {'from': FROM_ADDRESS})
  ```
  result content:
  ```javascript
  { 
    tx: '0xbb1d245eb694a875c298ba9c386c114f62cca6296ed08b554fa3e19c280602c0',
    receipt: { 
      transactionHash: '0xbb1d245eb694a875c298ba9c386c114f62cca6296ed08b554fa3e19c280602c0',
      transactionIndex: 0,
      blockHash: '0x854f2fe8fbcad1ddca30eed669d3ccf912447e697342bbe3b11950ae0cdd1050',
      blockNumber: 5,
      from: '0xd1433f7f80ec5801efa9a0e4779e178b302d09ba',
      to: '0x3fc8ddf8396bb2fdb1df064e77a9b6b1a50a6fbb',
      gasUsed: 106593,
      cumulativeGasUsed: 106593,
      contractAddress: null,
      logs: [],
      status: true,
      logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      rawLogs: [] 
    },
    logs: [] 
  }
  ```
- **Calls**: They execute code that do not change the status of the network, they are free and receive the return 
value immediately.  
  Example:
  ```shell
  truffle(develop)> var marketplaceIndex = await instance.getMarketplaceIndex(FROM_ADDRESS, {'from': FROM_ADDRESS})
  truffle(develop)> marketplaceIndex.toNumber()
  ```  
  marketplaceIndex content:
  ```javascript
  1
  ```
  
For more information about how to use the truffle interface please see the official truffle 
[README](https://github.com/trufflesuite/truffle/tree/master/packages/contract).

The public methods exposed by the Treasury smart contact are:

| Method | Type | Parameters | Description |
|--------|------|------------|-------------|
| addMarketplace | Transaction | marketplaceAddress | Add a new marketplace to the system |
| getMarketplaceIndex | Call | marketplaceAddress | Get a Data Marketplace uint identifier            |
| exchangeIn | Transaction | transferId, userAddress, tokensAmount | Exchange in function between a Data Marketplace and a Data Consumer |
| clearing | Transaction | transferId | Clearing function of a Data Marketplace |
| payment | Transaction |  transferId, dataProvider, amount | Payment between a Data Consumer and a Data Provider |
| exchangeOut | Transaction |  transferId, marketplaceAddress | Exchange out function between a Data Provider and a Data Marketplace |
| getTransaction | Call |  transferId | Returns the TokenTransfer information associated with the transferId identifier |
| configurePayment | Transaction |  amount | Returns a pair with the token ids and the respective amounts to cover the amount required for payment. Tokens are taken starting from the first token type until the sum is reached  |
| getSum | Call |  amounts | Returns the sum of the elements in an array |
| setPaid | Transaction |  transferId | In the TokenTransfer object of a transaction, set the isPaid param to true if the payment was also made with fiat money |
| setTransferCode | Transaction |  transferId | In the TokenTransfer object of a transaction, set the transfer code param  |
| openConflict | Transaction |  transferId | Open conflict on a specific transaction  |
| closeConflict | Transaction |  transferId | Resolve conflict for a specific transaction |
| balanceOfAddress | Call |  transferId | Return the overall balance of all the tokens owned by owner |

## How to build and deploy

This section explains step by step how to deploy anf interact with the Treasury smart contract deployed in a Truffle 
test network. The step by step guide is intended to be run on an Ubuntu 20.04 system.

## Build
This section explains 

### Requirements
- Git
- Nodejs
- Truffle


#### Installing git

```shell
$ sudo apt update
$ sudo apt install git
```

Verify the installation 
```shell
$ git --version
```

#### Installing Nodejs environment

This section explains how to install and use the Node Version Manager tool (nvm) to manage the needed Nodejs 
environment and dependencies.  

Installing nvm v0.39.0, to install the latest version check the
[official documentation.](https://github.com/nvm-sh/nvm#installing-and-updating)
```shell
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
$ wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

Initializing in current shell
```shell
$ source ~/.bashrc
```

Installing node  
```shell
$ nvm install lts/gallium
```


#### Installing Truffle

Truffle creates a development and testing environment for Ethereum network for more information visit the official site
of [truffle suite](https://trufflesuite.com/)

```shell
$ npm install -g truffle
```

### Cloning the repository
```shell
$ git clone https://gitlab.com/i3-market/code/wp3/t3.3/tokenization.git
$ cd tokenization
```

### Installing Nodejs dependencies
```bash
$ npm install
```

## Deploy in develop network
This section contains how to deploy the smart contracts in a private eht chain created by the truffle framework.

Run truffle develop chain.
```shell
$ truffle develop
```

Compile and deploy the Treasury smart contract in develop network.
```shell
truffle(develop)> migrate
```

## Testing

To test the Treasury smart contract is needed to have the 
[**_Requirements described in the Build section_**](###requirements) installed. Once that the requirements are 
installed. The Treasure smart contract can be tested using the Truffle framework. To do that, inside the project folder
init the Truffle framework.

```shell
$ truffle develop
```

Run the test command
```shell
truffle(develop)> test
```
The framework will compile, test and show the summary of testing the smart contracts.


## Credits

This repository has been created by:

Luca Marangoni (GFT) <Luca.Marangoni@gft.com>  
Germán Molina (HOPU) <german@hopu.org>


## License

```

This is free and unencumbered software released into the public domain.



Anyone is free to copy, modify, publish, use, compile, sell, or

distribute this software, either in source code form or as a compiled

binary, for any purpose, commercial or non-commercial, and by any

means.



In jurisdictions that recognize copyright laws, the author or authors

of this software dedicate any and all copyright interest in the

software to the public domain. We make this dedication for the benefit

of the public at large and to the detriment of our heirs and

successors. We intend this dedication to be an overt act of

relinquishment in perpetuity of all present and future rights to this

software under copyright law.



THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,

EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF

MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR

OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,

ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR

OTHER DEALINGS IN THE SOFTWARE.



For more information, please refer to <http://unlicense.org/>

```

 
