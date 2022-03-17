const assert = require("assert");

exports.getJSON = (_string) => {
    return JSON.stringify(_string);

};

exports.getEvents = (result, _type) => {
    return result.logs.filter(_event => _event.event === _type)

}

exports.assertTokenTransfered = (log, message, _address) => {
    assert.strictEqual(log.args.operation, message);
    assert.strictEqual(log.args._sender, _address);

}

exports.TokenTransfer = {
    transferId: 0,
    fromAddress: 1,
    toAddress: 2,
    tokenAmount: 3,
    isPaid: 4,
    transferCode: 5,
}
