const TreasuryWithAllowance = artifacts.require("TreasuryWithAllowance");
const assert = require("assert");
const Console = require("console");

contract('TreasuryWithAllowance', async accounts => {

    let treasury;
    const MARKETPLACE_1_ADDRESS = accounts[0];
    const MARKETPLACE_2_ADDRESS = accounts[1];
    const MARKETPLACE_3_ADDRESS = accounts[2];
    const MARKETPLACE_4_ADDRESS = accounts[3];
    const MARKETPLACE_5_ADDRESS = accounts[4];
    const MARKETPLACE_6_ADDRESS = accounts[5];

    const OWNER_USER_1 = accounts[6];
    const REGULAR_USER_1 = accounts[7];
    const SPENDER_USER_1 = accounts[8];
    const SPENDER_USER_2 = accounts[9];


    console.log("MARKET PLACES")
    console.log("MARKETPLACE_1_ADDRESS: " + MARKETPLACE_1_ADDRESS);
    console.log("MARKETPLACE_2_ADDRESS: " + MARKETPLACE_2_ADDRESS);
    console.log("MARKETPLACE_3_ADDRESS: " + MARKETPLACE_3_ADDRESS);
    console.log("MARKETPLACE_4_ADDRESS: " + MARKETPLACE_4_ADDRESS);
    console.log("MARKETPLACE_5_ADDRESS: " + MARKETPLACE_5_ADDRESS);
    console.log("MARKETPLACE_6_ADDRESS: " + MARKETPLACE_6_ADDRESS);

    console.log("\nUSERS")
    console.log("OWNER_USER_1: " + OWNER_USER_1);
    console.log("SPENDER_USER_1: " + SPENDER_USER_1);

    beforeEach(async () => {
        treasury = await TreasuryWithAllowance.new();
    });


    it("Given an owner and a spender with no approve when allowance is called then return 0", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', OWNER_USER_1, 21, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', SPENDER_USER_1, 22, {from: MARKETPLACE_1_ADDRESS});

        const result = await treasury.allowance(OWNER_USER_1, SPENDER_USER_1);
        assert.strictEqual(result.toNumber(), 0);
    });

    it("Given an spender and an amount when call approve with wrong current value then emmit an event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', OWNER_USER_1, 21, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', SPENDER_USER_1, 22, {from: MARKETPLACE_1_ADDRESS});

        try {
            await treasury.approve.call(SPENDER_USER_1, 1, 21);
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert WRONG CURRENT VALUE'
            );
        }
    });

    it("Given an owner and a spender with 21 tokens approved when allowance is called then return 21", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', OWNER_USER_1, 21, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', SPENDER_USER_1, 22, {from: MARKETPLACE_1_ADDRESS});

        await treasury.approve(SPENDER_USER_1, 0, 21, {from: OWNER_USER_1});
        const result = await treasury.allowance(OWNER_USER_1, SPENDER_USER_1);
        assert.strictEqual(result.toNumber(), 21);
    });


    it("Given an spender and an amount when call approve then return true", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', OWNER_USER_1, 21, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', SPENDER_USER_1, 22, {from: MARKETPLACE_1_ADDRESS});

        const result = await treasury.approve.call(SPENDER_USER_1, 0, 21);
        assert.strictEqual(result, true);
    });


    it("Given an allowed spender when call allowanceTransfer without enough ALLOWED TOKENS then raise an event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', OWNER_USER_1, 21, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', SPENDER_USER_1, 22, {from: MARKETPLACE_1_ADDRESS});

        await treasury.approve(SPENDER_USER_1, 0, 21, {from: OWNER_USER_1});

        try {
            await treasury.allowanceTransfer('dummyTransferId', OWNER_USER_1, REGULAR_USER_1, 22, {from: SPENDER_USER_1});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert NOT ENOUGH TOKEN ALLOWED -- Reason given: NOT ENOUGH TOKEN ALLOWED.'
            );
        }
    });

    it("Given an allowed spender when call allowanceTransfer without enough tokens then raise an event", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', OWNER_USER_1, 21, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', SPENDER_USER_1, 22, {from: MARKETPLACE_1_ADDRESS});

        await treasury.approve(SPENDER_USER_1, 0, 100, {from: OWNER_USER_1});

        try {
            await treasury.allowanceTransfer('dummyTransferId', OWNER_USER_1, REGULAR_USER_1, 30, {from: SPENDER_USER_1});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert NOT ENOUGH TOKENS -- Reason given: NOT ENOUGH TOKENS.'
            );
        }
    });

    it("Given an allowed spender when call allowanceTransfer with enough tokens return true", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', OWNER_USER_1, 21, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', SPENDER_USER_1, 22, {from: MARKETPLACE_1_ADDRESS});
        await treasury.approve(SPENDER_USER_1, 0, 100, {from: OWNER_USER_1});

        const response = await treasury.allowanceTransfer.call('dummyTransferId', OWNER_USER_1, REGULAR_USER_1, 20, {from: SPENDER_USER_1});

        assert.strictEqual(response, true)
    });


    it("Given an allowed spender when call allowanceTransfer then the users has the right amount of tokens", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', OWNER_USER_1, 21, {from: MARKETPLACE_1_ADDRESS});
        await treasury.exchangeIn('dummyTransferId', SPENDER_USER_1, 22, {from: MARKETPLACE_1_ADDRESS});
        await treasury.approve(SPENDER_USER_1, 0, 100, {from: OWNER_USER_1});

        await treasury.allowanceTransfer('dummyTransferId', OWNER_USER_1, SPENDER_USER_1, 20, {from: SPENDER_USER_1});
        const user_balances = await treasury.balanceOfAddress(OWNER_USER_1, {from: OWNER_USER_1})
        const spender_balances = await treasury.balanceOfAddress(SPENDER_USER_1, {from: OWNER_USER_1})

        assert.strictEqual(user_balances[0].toNumber(), 1)
        assert.strictEqual(spender_balances[0].toNumber(), 42)
    });


});