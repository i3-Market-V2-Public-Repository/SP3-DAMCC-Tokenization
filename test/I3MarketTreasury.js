const I3MarketTreasury = artifacts.require("I3MarketTreasury");
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

    it("Given a marketplace when try to add it twice return a revert event", async () => {
        try {
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
            assert.fail('An Revert exception must be raised');
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert MARKETPLACE WAS ALREADY ADDED -- Reason given: MARKETPLACE WAS ALREADY ADDED.',
                e.message
            );
        }
    });

    it("Given a different sender marketplace address when call addMarketplace return a revert event", async () => {
        try {
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
            assert.fail('An Revert exception must be raised');
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert ONLY THE MARKETPLACE CAN ADD ITSELF TO THE LIST OF THE AVAILABLE MARKETPLACES -- Reason given: ONLY THE MARKETPLACE CAN ADD ITSELF TO THE LIST OF THE AVAILABLE MARKETPLACES.',
                e.message
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


    it("Given a non exiting marketplace address when call getMarketplaceIndex return", async () => {
        const index = await treasury.getMarketplaceIndex(MARKETPLACE_1_ADDRESS);
        assert.strictEqual(index.toNumber(), 0);
    });

    it("Given an added marketplace address when call getMarketplaceIndex return the Correct index", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});

        const index = await treasury.getMarketplaceIndex(MARKETPLACE_1_ADDRESS);

        assert.strictEqual(index.toNumber(), 1);
    });

    it("Given many added marketplace address when call getMarketplaceIndex return the correct index", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_3_ADDRESS, {from: MARKETPLACE_3_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_5_ADDRESS, {from: MARKETPLACE_5_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_6_ADDRESS, {from: MARKETPLACE_6_ADDRESS});

        const index = await treasury.getMarketplaceIndex(MARKETPLACE_6_ADDRESS);

        assert.strictEqual(index.toNumber(), 6);
    });

    it("Given a marketplace address when it is added twice return the same index", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const firstIndex = await treasury.getMarketplaceIndex(MARKETPLACE_1_ADDRESS);
        try {
            await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        } catch (e) {
            const secondIndex = await treasury.getMarketplaceIndex(MARKETPLACE_1_ADDRESS);
            assert.strictEqual(firstIndex.toNumber(), secondIndex.toNumber());
        }
    });


    it("Given a user address when a NON added marketplace exchange in tokens then Raise an error", async () => {
        try {
            await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});
            assert.fail('An Revert exception must be raised');
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert THIS ADDRESS IS NOT A REGULAR MARKETPLACE AND DOESN\'T HAVE A TOKEN TYPE -- Reason given: THIS ADDRESS IS NOT A REGULAR MARKETPLACE AND DOESN\'T HAVE A TOKEN TYPE.',
                e.message
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
        assert.strictEqual(_user_address, USER_1_ADDRESS, "Expected TokenTransferred event send user_address")
    });

    it("Given a marketplace address when a marketplace exchange in token to itself return a revert error event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        try {
            await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual('Returned error: VM Exception while processing transaction: revert MARKETPLACE CANNOT MINT TO ITSELF -- Reason given: MARKETPLACE CANNOT MINT TO ITSELF.', e.message)
        }
    });

    it("Given a user with NO balance when call balance of returns an empty array", async () => {
        const balances = await treasury.balanceOfAddress(USER_1_ADDRESS);
        assert.strictEqual(balances.length, 0);
    });

    it("Given a user with one marketplace balance when call balance of returns an array with the balance", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 100, {from: MARKETPLACE_1_ADDRESS});

        const balances = await treasury.balanceOfAddress(USER_1_ADDRESS);

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

        const balances = await treasury.balanceOfAddress(USER_1_ADDRESS);

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
        const balances = await treasury.balanceOfAddress(USER_1_ADDRESS);

        assert.strictEqual(balances[0].toNumber(), 406);
    });

    it("Given a marketplace that has exchange in token with many marketplaces when call clearing, remove the tokens from other marketplaces", async () => {

        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_3_ADDRESS, {from: MARKETPLACE_3_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 2, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 3, {from: MARKETPLACE_3_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 4, {from: MARKETPLACE_4_ADDRESS});

        await treasury.clearing({from: MARKETPLACE_1_ADDRESS})
        const balanceMP1 = await treasury.balanceOfAddress(MARKETPLACE_1_ADDRESS);
        const balanceMP2 = await treasury.balanceOfAddress(MARKETPLACE_2_ADDRESS);
        const balanceMP3 = await treasury.balanceOfAddress(MARKETPLACE_3_ADDRESS);
        const balanceMP4 = await treasury.balanceOfAddress(MARKETPLACE_4_ADDRESS);

        assert.deepStrictEqual(balanceMP1.map(x => x.toNumber()), [0, 0, 0, 0]);
        assert.deepStrictEqual(balanceMP2.map(x => x.toNumber()), [0, 2, 0, 0]);
        assert.deepStrictEqual(balanceMP3.map(x => x.toNumber()), [0, 0, 3, 0]);
        assert.deepStrictEqual(balanceMP4.map(x => x.toNumber()), [0, 0, 0, 4]);
    });

    it("Given a marketplace that has exchange in token with many marketplaces when call clearing then clearing events should be issued", async () => {

        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_2_ADDRESS, {from: MARKETPLACE_2_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_3_ADDRESS, {from: MARKETPLACE_3_ADDRESS});
        await treasury.addMarketplace(MARKETPLACE_4_ADDRESS, {from: MARKETPLACE_4_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 2, {from: MARKETPLACE_2_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 3, {from: MARKETPLACE_3_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', MARKETPLACE_1_ADDRESS, 4, {from: MARKETPLACE_4_ADDRESS});

        const result = await treasury.clearing({from: MARKETPLACE_1_ADDRESS});

        const tokenTransferredEvents = helper.getEvents(result, 'TokenTransferred');
        helper.assertTokenTransfered(tokenTransferredEvents[0], "clearing", MARKETPLACE_2_ADDRESS);
        helper.assertTokenTransfered(tokenTransferredEvents[1], "clearing", MARKETPLACE_3_ADDRESS);
        helper.assertTokenTransfered(tokenTransferredEvents[2], "clearing", MARKETPLACE_4_ADDRESS);
    });


    it("Given a data consumer with NO tokens when call payment emit revert event", async () => {
        try {
            await treasury.payment('dummyTransferId', USER_2_ADDRESS, 20, {from: USER_1_ADDRESS});
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert THE DATA CONSUMER DOESN\'T HAVE ENOUGH TOKENS -- Reason given: THE DATA CONSUMER DOESN\'T HAVE ENOUGH TOKENS.',
                e.message
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
                'Returned error: VM Exception while processing transaction: revert THE DATA CONSUMER DOESN\'T HAVE ENOUGH TOKENS -- Reason given: THE DATA CONSUMER DOESN\'T HAVE ENOUGH TOKENS.',
                e.message
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
        helper.assertTokenTransfered(paymentEvent[0], "payment", USER_2_ADDRESS);
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

        const consumerBalance = await treasury.balanceOfAddress(USER_1_ADDRESS);
        const providerBalance = await treasury.balanceOfAddress(USER_2_ADDRESS);

        assert.deepStrictEqual(consumerBalance.map(balance => balance.toNumber()), [0, 0, 4, 5]);
        assert.deepStrictEqual(providerBalance.map(balance => balance.toNumber()), [8, 9, 3, 0]);
    });

    it("Given a data provider with many tokens when call exchange out then emit exchange_out event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});

        const result = await treasury.exchangeOut('dummyTransferId', MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});

        const exchangeOutEvent = helper.getEvents(result, "TokenTransferred");
        helper.assertTokenTransfered(exchangeOutEvent[0], "exchange_out", MARKETPLACE_1_ADDRESS);
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

        const providerBalance = await treasury.balanceOfAddress(USER_1_ADDRESS);
        const marketplaceBalance = await treasury.balanceOfAddress(MARKETPLACE_1_ADDRESS);

        assert.deepStrictEqual(providerBalance.map(balance => balance.toNumber()), [0, 0, 0, 0]);
        assert.deepStrictEqual(marketplaceBalance.map(balance => balance.toNumber()), [8, 9, 7, 5]);
    });

    it("Given a function that generates a transaction when call get transaction then return the token transfer information", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeOut('dummyTransferId', MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        const exchangeOutEvents = helper.getEvents(result, "TokenTransferred");

        const transaction = await treasury.getTransaction(exchangeOutEvents[0].args.transferId);

        assert.strictEqual(
            helper.getJSON(transaction),
            helper.getJSON([
                exchangeOutEvents[0].args.transferId,
                USER_1_ADDRESS,
                MARKETPLACE_1_ADDRESS,
                "0",
                false,
                ""
            ])
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
                'Returned error: VM Exception while processing transaction: revert ONLY THE TOKEN RECEIVER CAN SET THE ISPAID TO TRUE -- Reason given: ONLY THE TOKEN RECEIVER CAN SET THE ISPAID TO TRUE.',
                e.message
            );
        }
    });

    it('Given a transfer id when a user that is the token receiver call set paid change isPaid to true', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");

        await treasury.setPaid(exchangeInEvents[0].args.transferId, {from: USER_1_ADDRESS});

        transaction = await treasury.getTransaction(exchangeInEvents[0].args.transferId);
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

    it.skip('Given NON EXISTING transfer id when call setTransferCode then raise a revert', async () => {
        try {
            await treasury.setTransferCode("0x12345", "Dummy transfer code");

            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.fail("Should we cover ourself against the 0x0 address")
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert TRANSACTION DOES NOT EXIST OR WRONG TRANSACTION ID -- Reason given: TRANSACTION DOES NOT EXIST OR WRONG TRANSACTION ID.',
                e.message
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
                'Returned error: VM Exception while processing transaction: revert ONLY THE TOKEN RECEIVER CAN SET THE ISPAID TO TRUE -- Reason given: ONLY THE TOKEN RECEIVER CAN SET THE ISPAID TO TRUE.',
                e.message
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

    it('Given a transfer id and a recipient when a NONE PARTIES are in the transaction and call of open conflict emit a revert event', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");

        try {
            await treasury.openConflict(exchangeInEvents[0].args.transferId, MARKETPLACE_2_ADDRESS, {from: USER_2_ADDRESS});

            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert THE CONFLICT APPLICANT MUST BE ONE OF THE TRANSACTION PARTIES -- Reason given: THE CONFLICT APPLICANT MUST BE ONE OF THE TRANSACTION PARTIES.',
                e.message
            );
        }
    });

    it('Given a transfer id and a recipient when the RECIPIENT IS NOT in the transaction and call of open conflict emit a revert event', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");

        try {
            await treasury.openConflict(exchangeInEvents[0].args.transferId, MARKETPLACE_2_ADDRESS, {from: USER_1_ADDRESS});

            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert THE CONFLICT RECIPIENT MUST BE ONE OF THE TRANSACTION PARTIES -- Reason given: THE CONFLICT RECIPIENT MUST BE ONE OF THE TRANSACTION PARTIES.',
                e.message
            );
        }
    });

    it('Given a transfer id and a recipient when the APPLICANT IS NOT in the transaction and call of open conflict emit a revert event', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");

        try {
            await treasury.openConflict(exchangeInEvents[0].args.transferId, USER_1_ADDRESS, {from: USER_2_ADDRESS});

            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert THE CONFLICT APPLICANT MUST BE ONE OF THE TRANSACTION PARTIES -- Reason given: THE CONFLICT APPLICANT MUST BE ONE OF THE TRANSACTION PARTIES.',
                e.message
            );
        }
    });

    it('Given a transfer id and a recipient when the APPLICANT is the sender in the transaction and call of open conflict the conflict should be opened', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transferId = exchangeInEvents[0].args.transferId;

        await treasury.openConflict(transferId, USER_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const conflict = await treasury.openConflicts(transferId);

        assert.strictEqual(conflict.transferId, transferId, "Different transfer id")
        assert.strictEqual(conflict.applicant, MARKETPLACE_1_ADDRESS, "Different applicant")
        assert.strictEqual(conflict.recipient, USER_1_ADDRESS, "Different recipient")
        assert.strictEqual(conflict.open, true, "Conflict is not open")
    });

    it('Given a transfer id and a recipient when the APPLICANT is the receiver in the transaction and call of open conflict the conflict should be opened', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transferId = exchangeInEvents[0].args.transferId;

        await treasury.openConflict(transferId, MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        const conflict = await treasury.openConflicts(transferId);

        assert.strictEqual(conflict.transferId, transferId, "Different transfer id");
        assert.strictEqual(conflict.applicant, USER_1_ADDRESS, "Different applicant");
        assert.strictEqual(conflict.recipient, MARKETPLACE_1_ADDRESS, "Different recipient");
        assert.strictEqual(conflict.open, true, "Conflict is not open");
    });


    it("Given an open conflict when a NON party USER call close conflict then raise a revert", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transferId = exchangeInEvents[0].args.transferId;
        await treasury.openConflict(transferId, MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        await treasury.openConflicts(transferId);

        try {
            await treasury.closeConflict(transferId, {from: USER_2_ADDRESS});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert ONLY THE ORIGINAL APPLICANT CAN CLOSE THE CONFICT -- Reason given: ONLY THE ORIGINAL APPLICANT CAN CLOSE THE CONFICT.',
                e.message
            );
        }
    });

    it("Given an open conflict when the RECIPIENT USER call close conflict then raise a revert", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transferId = exchangeInEvents[0].args.transferId;
        await treasury.openConflict(transferId, MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        await treasury.openConflicts(transferId);

        try {
            await treasury.closeConflict(transferId, {from: MARKETPLACE_1_ADDRESS});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                'Returned error: VM Exception while processing transaction: revert ONLY THE ORIGINAL APPLICANT CAN CLOSE THE CONFICT -- Reason given: ONLY THE ORIGINAL APPLICANT CAN CLOSE THE CONFICT.',
                e.message
            );
        }
    });

    it("Given an open conflict when the APPLICANT USER call close conflict then close the conflict", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transferId = exchangeInEvents[0].args.transferId;
        await treasury.openConflict(transferId, MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        await treasury.openConflicts(transferId);

        await treasury.closeConflict(transferId, {from: USER_1_ADDRESS});
        const conflict = await treasury.openConflicts(transferId);

        assert.strictEqual(conflict.open, false, "Conflict is not closed");
    });

});