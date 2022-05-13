const I3MarketTreasury = artifacts.require("I3MarketTreasury");
const I3MarketConflicts = artifacts.require("I3MarketConflicts");
const assert = require("assert");
const helper = require("./helpers");
const {TokenTransfer, getJSON} = require("./helpers");



contract('I3MarketTreasury', async accounts => {

    let treasury;
    const MARKETPLACE_1_ADDRESS = accounts[0];
    const MARKETPLACE_2_ADDRESS = accounts[1];
    const MARKETPLACE_3_ADDRESS = accounts[2];
    const MARKETPLACE_4_ADDRESS = accounts[3];
    const MARKETPLACE_5_ADDRESS = accounts[4];
    const MARKETPLACE_6_ADDRESS = accounts[5];

    const USER_1_ADDRESS = accounts[6];
    const USER_2_ADDRESS = accounts[7];

    console.log("MARKET PLACES")
    console.log("MARKETPLACE_1_ADDRESS: " + MARKETPLACE_1_ADDRESS);
    console.log("MARKETPLACE_2_ADDRESS: " + MARKETPLACE_2_ADDRESS);
    console.log("MARKETPLACE_3_ADDRESS: " + MARKETPLACE_3_ADDRESS);
    console.log("MARKETPLACE_4_ADDRESS: " + MARKETPLACE_4_ADDRESS);
    console.log("MARKETPLACE_5_ADDRESS: " + MARKETPLACE_5_ADDRESS);
    console.log("MARKETPLACE_6_ADDRESS: " + MARKETPLACE_6_ADDRESS);

    console.log("\nUSERS")
    console.log("USER_1_ADDRESS: " + USER_1_ADDRESS);
    console.log("USER_2_ADDRESS: " + USER_2_ADDRESS);

    beforeEach(async () => {
        treasury = await I3MarketTreasury.new();
    });

    async function balanceOfAddress(contract, address) {
        const balances = new Array();;
        const index = await contract.index();
        for (let i = 0; i < index; ++i) {
                balances[i] = await contract.balanceOf(address, i + 1);
        }
        return balances;
    }

    it("Given a marketplace when try to add it twice return a revert event", async () => {
        try {
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
            assert.fail('An Revert exception must be raised');
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert MP ALREADY ADDED -- Reason given: MP ALREADY ADDED.',
            );
        }
    });

    it("Given a different sender marketplace address when call addMarketplace return a revert event", async () => {
        try {
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
            assert.fail('An Revert exception must be raised');
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert ONLY THE MP CAN ADD ITSELF -- Reason given: ONLY THE MP CAN ADD ITSELF.'
            );
        }
    });

    it("Given a marketplace address when call addMarketplace do not return revert", async () => {
        try {
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
            // Not testeable because the function does not return anything. Should we return something? even the index?
        } catch (e) {
            assert.fail("Raised error: " + e.message);
        }
    });


    it("Given a non exiting marketplace address when call get Marketplace Index return", async () => {
        const index = await treasury.mpIndex(MARKETPLACE_1_ADDRESS);
        assert.strictEqual(index.toNumber(), 0);
    });

    it("Given an added marketplace address when call get Marketplace Index return the Correct index", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});

        const index = await treasury.mpIndex(MARKETPLACE_1_ADDRESS);

        assert.strictEqual(index.toNumber(), 1);
    });

    it("Given many added marketplace address when call get Marketplace Index return the correct index", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_3_ADDRESS, {from: MARKETPLACE_3_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_5_ADDRESS, {from: MARKETPLACE_5_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_6_ADDRESS, {from: MARKETPLACE_6_ADDRESS});

        const index = await treasury.mpIndex(MARKETPLACE_6_ADDRESS);

        assert.strictEqual(index.toNumber(), 6);
    });

    it("Given a marketplace address when it is added twice return the same index", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const firstIndex = await treasury.mpIndex(MARKETPLACE_1_ADDRESS);
        try {
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        } catch (e) {
            const secondIndex = await treasury.mpIndex(MARKETPLACE_1_ADDRESS);
            assert.strictEqual(firstIndex.toNumber(), secondIndex.toNumber());
        }
    });


    it("Given a user address when a NON added marketplace exchange in tokens then Raise an error", async () => {
        try {
            await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});
            assert.fail('An Revert exception must be raised');
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert ADD ISN\'T A MP -- Reason given: ADD ISN\'T A MP.',
            );
        }
    });


    it("Given a user address when a marketplace exchange in tokens then emit the event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});

        const tokenTransferredEvent = result.logs[result.logs.length - 1];
        const event = tokenTransferredEvent.event;
        const operation = tokenTransferredEvent.args[1];
        const _user_address = tokenTransferredEvent.args[2];

        assert.strictEqual(event, "TokenTransferred", "Expected TokenTransferred event")
        assert.strictEqual(operation, "exchange_in", "Expected TokenTransferred event send operation")
        assert.strictEqual(_user_address, MARKETPLACE_1_ADDRESS, "Expected TokenTransferred event send marketplace address")
    });

    it("Given a marketplace address when a marketplace exchange in token to itself return a revert error event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        try {
            await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert MP CANNOT MINT TO ITSELF -- Reason given: MP CANNOT MINT TO ITSELF.'
            )
        }
    });

    it("Given a user with NO balance when call balance of returns an empty array", async () => {
        const balances = await balanceOfAddress(treasury, USER_1_ADDRESS);
        assert.strictEqual(balances.length, 0);
    });

    it("Given a user with one marketplace balance when call balance of returns an array with the balance", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});

        const balances = await balanceOfAddress(treasury, USER_1_ADDRESS);    

        assert.strictEqual(balances.length, 1);
        assert.strictEqual(balances[0].toNumber(), 100);
    });

    it("Given a user with several marketplace balance when call balance of, returns an array with the balances", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_6_ADDRESS, {from: MARKETPLACE_6_ADDRESS});
        await treasury.exchangeIn("dummyTransferId", USER_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn("dummyTransferId", USER_1_ADDRESS, 101, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn("dummyTransferId", USER_1_ADDRESS, 102, {from: MARKETPLACE_4_ADDRESS});
        await treasury.exchangeIn("dummyTransferId", USER_1_ADDRESS, 103, {from: MARKETPLACE_6_ADDRESS});

        const balances = await balanceOfAddress(treasury, USER_1_ADDRESS);

        assert.strictEqual(balances.length, 4);
        assert.strictEqual(balances[0].toNumber(), 100);
        assert.strictEqual(balances[1].toNumber(), 101);
        assert.strictEqual(balances[2].toNumber(), 102);
        assert.strictEqual(balances[3].toNumber(), 103);
    });

    it("Given a user that has been added balance many times when call balance of, returns the correct amount", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn("dummyTransferId", USER_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn("dummyTransferId", USER_1_ADDRESS, 101, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn("dummyTransferId", USER_1_ADDRESS, 102, {from: MARKETPLACE_1_ADDRESS});

        await treasury.exchangeIn("dummyTransferId", USER_1_ADDRESS, 103, {from: MARKETPLACE_1_ADDRESS});
        const balances = await balanceOfAddress(treasury, USER_1_ADDRESS);

        assert.strictEqual(balances[0].toNumber(), 406);
    });

    it("Given a marketplace that has exchange in token with many marketplaces when call clearing, remove the tokens from other marketplaces", async () => {

        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 12, {from: MARKETPLACE_2_ADDRESS});

        balance = await balanceOfAddress(treasury, MARKETPLACE_1_ADDRESS); 
        var clearingItems = new Array();
        balance.forEach(myFunction);       
        function myFunction(value, index, array) {
            if(value!=0){
                clearingItems.push({transferId:index+1,toAdd: MARKETPLACE_2_ADDRESS, tokenAmount:value.words[0]}) 
            }
        } 
        await treasury.clearing(clearingItems, {from: MARKETPLACE_1_ADDRESS});

        const balanceMP1 = await balanceOfAddress(treasury, MARKETPLACE_1_ADDRESS); 
        const balanceMP2 = await balanceOfAddress(treasury, MARKETPLACE_2_ADDRESS); 

        assert.deepStrictEqual(balanceMP1.map(x => x.toNumber()), [0, 0]);
        assert.deepStrictEqual(balanceMP2.map(x => x.toNumber()), [0, 12]);
    });

    it("Given a marketplace that has exchange in token with many marketplaces when call clearing then clearing events should be issued", async () => {

        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 12, {from: MARKETPLACE_2_ADDRESS});

        balance = await balanceOfAddress(treasury, MARKETPLACE_1_ADDRESS); 
        var clearingItems = new Array();
        balance.forEach(myFunction);       
        function myFunction(value, index, array) {
            if(value!=0){
                clearingItems.push({transferId:index+1,toAdd: MARKETPLACE_2_ADDRESS, tokenAmount:value.words[0]}) 
            }
        } 

        const result = await treasury.clearing(clearingItems, {from: MARKETPLACE_1_ADDRESS});

        const tokenTransferredEvents = helper.getEvents(result, 'TokenTransferred');
        console.log("AAAAAAAAAAAAAAAAAAA   "+ tokenTransferredEvents[0]);
        helper.assertTokenTransfered(tokenTransferredEvents[0], "clearing", MARKETPLACE_1_ADDRESS);
    });


    it("Given a data consumer with NO tokens when call payment emit revert event", async () => {
        try {
            await treasury.payment('dummyTransferId', USER_2_ADDRESS, 20, {from: USER_1_ADDRESS});
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert NOT ENOUGH TOKENS -- Reason given: NOT ENOUGH TOKENS.',
            );
        }
    });

    it("Given a data consumer with NO enough tokens when call payment emit revert event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});

        try {
            await treasury.payment('dummyTransferId', USER_2_ADDRESS, 20, {from: USER_1_ADDRESS});
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert THE DATA CONSUMER DOESN\'T HAVE ENOUGH TOKENS -- Reason given: THE DATA CONSUMER DOESN\'T HAVE ENOUGH TOKENS.',
                e.message
            );
        }
    });


    it("Given a data consumer with NO enough tokens in all token wallets when call payment emit the rever event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_3_ADDRESS, {from: MARKETPLACE_3_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});

        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 1, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 2, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 3, {from: MARKETPLACE_3_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 4, {from: MARKETPLACE_4_ADDRESS});

        try {
            await treasury.payment('dummyTransferId', USER_2_ADDRESS, 20, {from: USER_1_ADDRESS});
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert NOT ENOUGH TOKENS -- Reason given: NOT ENOUGH TOKENS.'
            );
        }
    });


    it("Given a data consumer with enough tokens in all token wallets when call payment emit payment event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_3_ADDRESS, {from: MARKETPLACE_3_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 5, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 5, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 5, {from: MARKETPLACE_3_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 5, {from: MARKETPLACE_4_ADDRESS});

        const result = await treasury.payment('dummyTransferId', USER_2_ADDRESS, 20, {from: USER_1_ADDRESS});

        const paymentEvent = helper.getEvents(result, "TokenTransferred");
        helper.assertTokenTransfered(paymentEvent[0], "payment", USER_1_ADDRESS);
    });


    it("Given a data consumer with enough tokens in all token wallets when call payment consumer and provider wallets have the correct amount of tokens", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_3_ADDRESS, {from: MARKETPLACE_3_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 8, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 9, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 7, {from: MARKETPLACE_3_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 5, {from: MARKETPLACE_4_ADDRESS});

        await treasury.payment('dummyTransferId', USER_2_ADDRESS, 20, {from: USER_1_ADDRESS});

        const consumerBalance = await balanceOfAddress(treasury, USER_1_ADDRESS); 
        const providerBalance = await balanceOfAddress(treasury, USER_2_ADDRESS); 

        assert.deepStrictEqual(consumerBalance.map(balance => balance.toNumber()), [0, 0, 4, 5]);
        assert.deepStrictEqual(providerBalance.map(balance => balance.toNumber()), [8, 9, 3, 0]);
    });

    it("Given a data provider with many tokens when call exchange out then emit exchange_out event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});

        const result = await treasury.exchangeOut('dummyTransferId', MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});

        const exchangeOutEvent = helper.getEvents(result, "TokenTransferred");
        helper.assertTokenTransfered(exchangeOutEvent[0], "exchange_out", USER_1_ADDRESS);
    });

    it("Given a data provider with many tokens when call exchange out then send all data provider tokens to the marketplace", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_3_ADDRESS, {from: MARKETPLACE_3_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 8, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 9, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 7, {from: MARKETPLACE_3_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 5, {from: MARKETPLACE_4_ADDRESS});

        await treasury.exchangeOut('dummyTransferId', MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});

        const providerBalance = await balanceOfAddress(treasury, USER_1_ADDRESS);
        const marketplaceBalance = await balanceOfAddress(treasury, MARKETPLACE_1_ADDRESS);

        assert.deepStrictEqual(providerBalance.map(balance => balance.toNumber()), [0, 0, 0, 0]);
        assert.deepStrictEqual(marketplaceBalance.map(balance => balance.toNumber()), [8, 9, 7, 5]);
    });

    it("Given a function that generates a transaction when call get transaction then return the token transfer information", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeOut('dummyTransferId', MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        const exchangeOutEvents = helper.getEvents(result, "TokenTransferred");

        const transaction = await treasury.txs(exchangeOutEvents[0].args.transferId);

        assert.strictEqual(
            helper.getJSON(transaction),
            helper.getJSON({
                0:exchangeOutEvents[0].args.transferId,
                1:USER_1_ADDRESS,
                2:MARKETPLACE_1_ADDRESS,
                3:"0",
                4:false,
                5:"",
                "transferId":"dummyTransferId","fromAdd":"0x7550b44a38E0EB725C526d743cba04b89b1e284B","toAdd":"0xEe201bc01255e0dB399790d3957CFf5E63d2886e","tokenAmount":"0","isPaid":false,"transferCode":""
            })
        );
    });


    it('Given a transfer id when a user that is NOT the token receiver call set paid emit a revert event', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");

        try {
            await treasury.setPaid(exchangeInEvents[0].args.transferId, {from: USER_2_ADDRESS});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert ONLY RECEIVER CAN CHANGE ISPAID -- Reason given: ONLY RECEIVER CAN CHANGE ISPAID.',
            );
        }
    });

    it('Given a transfer id when a user that is the token receiver call set paid change isPaid to true', async () => {

        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeOut('dummyTransferId', MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        const exchangeOutEvent = helper.getEvents(result, "TokenTransferred");

        await treasury.setPaid(exchangeOutEvent[0].args.transferId, {from: MARKETPLACE_1_ADDRESS});

        transaction = await treasury.txs(exchangeOutEvent[0].args.transferId);
        assert.strictEqual(transaction[TokenTransfer.isPaid], true);
    });


    it.skip("Set transfer code to non existing transaction tests", async () => {
        await treasury.setTransferCode("0x00", "Dummy transfer code 0");
        await treasury.setTransferCode("0x01", "Dummy transfer code 1");
        await treasury.setTransferCode("0x02", "Dummy transfer code 2");

        const transaction = await treasury.getTransaction("0x00");
        console.log("Transaction0: " + getJSON(transaction));

        const transaction1 = await treasury.getTransaction("0x02");
        console.log("Transaction1: " + getJSON(transaction1));

        const transaction2 = await treasury.getTransaction("0x03");
        console.log("Transaction2: " + getJSON(transaction2));

        assert.fail("THIS CODE GENERATES NEW TRANSACTIONS")
    })

/*

    it.skip('Given NON EXISTING transfer id when call setTransferCode then raise a revert', async () => {
        try {
            await treasury.setTransferCode("0x12345", "Dummy transfer code");

            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.fail("Should we cover ourself against the 0x0 address")
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert TRANSACTION DOES NOT EXIST OR WRONG TRANSACTION ID -- Reason given: TRANSACTION DOES NOT EXIST OR WRONG TRANSACTION ID.'
            );
        }
    });


    it('Given a transfer id and a transfer code when a NON RECEIVER USER call setTransferCode then raise a revert', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        try {
            await treasury.setTransferCode(exchangeInEvents[0].args.transferId, "Dummy transfer code", {from: MARKETPLACE_1_ADDRESS});

            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert ONLY RECEIVER CAN CHANGE ISPAID -- Reason given: ONLY RECEIVER CAN CHANGE ISPAID.',
            );
        }
    });


    it('Given a transfer id and a transfer code when RECEIVER USER call setTransferCode then set the transfer code', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transactionId = exchangeInEvents[0].args.transferId

        await treasury.setTransferCode(transactionId, "Dummy transfer code", {from: USER_1_ADDRESS});
        const transaction = await treasury.getTransaction(transactionId);

        assert.strictEqual(transaction[TokenTransfer.transferCode], "Dummy transfer code");
    });

*/

});
