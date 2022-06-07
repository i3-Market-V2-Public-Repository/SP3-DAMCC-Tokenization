const treasury = artifacts.require("TreasuryWithAllowance")
//const conflict = artifacts.require("I3MarketConflicts")

module.exports = function (deployer) {
    deployer.deploy(treasury);
//    deployer.deploy(conflict)
}
