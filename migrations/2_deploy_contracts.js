const treasury = artifacts.require("I3MarketTreasury")

module.exports = function (deployer) {
    deployer.deploy(treasury)
}