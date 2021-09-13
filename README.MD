#### Test environment:
- Truffle v5.4.7
- Solidity-coverage 0.7.17
- typescript

Installing truffle
```bash
$ npm install -g truffle
```

Installing dependencies
```bash
$ npm install
```

Executing tests
```bash
$ truffle test
```

Executing with coverage
```bash
$ truffle run coverage --testfiles "test/*.ts"

```

#### Testing remarks:
1. A Marketplace can be added many times (addMarketplace).  
   - **Possible solution** check if the marketplace is currently in the list. 
2. Anyone can be added like a marketplace by itself and mint tokens (addMarketplace).
    - **Possible solution** only contract owner can add marketplaces.
    - **Multiple owner** multisig contract (Gnosis)
3. (Solved) Possible issue in payment method, all marketplace's tokens will have the same value.
    - [Possible approach](https://www.youtube.com/watch?v=yzdh5RRWxAk)
4. (TransferId will be calculated before execute the function)I can not check the transfer id in event because it is generated using directly block.timestamp.
    - **Possible solution** introduce block.timestamp inside a getTime() function that I could mock.
    - **Possible solution** maybe it is good enough without test the transferId on the event.
5. (TransferId will be calculated before execute the function)Maybe in some functions will be interesting to return the transferid as result regarding users interact with setTransferCode, OpenConflict and closeConflict
6. (Natural behaviour) Internal transactions and conflicts seems to have duplicate info in params i.e. Conflict: {"0":"0x54fee33e290b8aaa8329ff66d3564a9e4ea3fac25e0387ee81b0d091640be314","1":"0x627306090abaB3A6e1400e9345bC60c78a8BEf57","2":"0x2191eF87E392377ec08E7c08Eb105Ef5448eCED5","3":true,"transferId":"0x54fee33e290b8aaa8329ff66d3564a9e4ea3fac25e0387ee81b0d091640be314","applicant":"0x627306090abaB3A6e1400e9345bC60c78a8BEf57","recipient":"0x2191eF87E392377ec08E7c08Eb105Ef5448eCED5","open":true}
7. (We will handle this behaviour) Transactions and openConflits of non existind transactionIds return empty objects. 0x0 address pass al the modifiers when it calls some methods like setTransferCode or setPais, should we cover against it?  
