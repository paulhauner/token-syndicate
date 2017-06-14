var TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");
var BATokenFactory = artifacts.require("./BAT/BATokenFactory.sol");

module.exports = function(deployer) {
    deployer.deploy(TokenSyndicateFactory);
    deployer.deploy(BATokenFactory);
};

