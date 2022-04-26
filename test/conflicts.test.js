const I3MarketTreasury = artifacts.require("I3MarketTreasury");
const I3MarketConflicts = artifacts.require("I3MarketConflicts");
const assert = require("assert");
const helper = require("./helpers");
const {TokenTransfer, getJSON} = require("./helpers");

contract('I3MarketTreasury', async accounts => {

    let treasury;
    let conflicts;
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
        conflicts = await I3MarketConflicts.new();
    });

    it('Given a transfer id and a recipient when the APPLICANT is the sender in the transaction and call of open conflict the conflict should be opened', async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transferId = exchangeInEvents[0].args.transferId;

        await conflicts.openConflict(transferId, USER_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const conflict = await conflicts.openConflicts(transferId);

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

        await conflicts.openConflict(transferId, MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        const conflict = await conflicts.openConflicts(transferId);

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
        await conflicts.openConflict(transferId, MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        await conflicts.openConflicts(transferId);

        try {
            await conflicts.closeConflict(transferId, {from: USER_2_ADDRESS});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert ONLY APPLICANT CAN CLOSE THE CONFLICT -- Reason given: ONLY APPLICANT CAN CLOSE THE CONFLICT.'
            );
        }
    });

    it("Given an open conflict when the RECIPIENT USER call close conflict then raise a revert", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transferId = exchangeInEvents[0].args.transferId;
        await conflicts.openConflict(transferId, MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        await conflicts.openConflicts(transferId);

        try {
            await conflicts.closeConflict(transferId, {from: MARKETPLACE_1_ADDRESS});
            assert.fail("An Revert exception must be raised");
        } catch (e) {
            assert.strictEqual(
                e.message,
                'Returned error: VM Exception while processing transaction: revert ONLY APPLICANT CAN CLOSE THE CONFLICT -- Reason given: ONLY APPLICANT CAN CLOSE THE CONFLICT.'
            );
        }
    });

    it("Given an open conflict when the APPLICANT USER call close conflict then close the conflict", async () => {
        await treasury.addMarketplace(MARKETPLACE_1_ADDRESS, {from: MARKETPLACE_1_ADDRESS});
        const result = await treasury.exchangeIn('dummyTransferId', USER_1_ADDRESS, 20, {from: MARKETPLACE_1_ADDRESS});
        const exchangeInEvents = helper.getEvents(result, "TokenTransferred");
        const transferId = exchangeInEvents[0].args.transferId;
        await conflicts.openConflict(transferId, MARKETPLACE_1_ADDRESS, {from: USER_1_ADDRESS});
        await conflicts.openConflicts(transferId);

        await conflicts.closeConflict(transferId, {from: USER_1_ADDRESS});
        const conflict = await conflicts.openConflicts(transferId);

        assert.strictEqual(conflict.open, false, "Conflict is not closed");
    });

});
