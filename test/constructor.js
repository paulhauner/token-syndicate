const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");

const valid = {
    tokenContract: 1,
    tokensPerEth: 20000,
    minFeePerKwei: 250,
    maxPresaleEthAllowed: 1000000,
    presaleStartBlock: 0,
    presaleEndBlock: 100
};

contract('TokenSyndicateFactory', function(accounts) {
    it("should create new syndicates", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokensPerEth, valid.minFeePerKwei,
                    valid.maxPresaleEthAllowed, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(function(tx) {
                const log = tx.logs[0];
                assert(log.event === 'LogNewTokenSyndicate', 'a log is created');
                assert(log.args.newSyndicateAddress !== '', 'an address is logged');
            });
    });

    it("should throw if syndicates finish before they start", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokensPerEth, valid.minFeePerKwei,
                    valid.maxPresaleEthAllowed, 1, 0);
            })
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, 'invalid contracts should not be created.')
            });
    });

    it("should throw if fees are too high", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokensPerEth, 1000,
                    valid.maxPresaleEthAllowed, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, 'invalid contracts should throw an out of gas.')
            });
    });

    it("should throw if fees are too low", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokensPerEth, 0,
                    valid.maxPresaleEthAllowed, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, 'invalid contracts should throw an out of gas.')
            });
    });

    it("should throw if there is no eth allowed for presale", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokensPerEth, valid.minFeePerKwei,
                    0, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, 'invalid contracts should throw an out of gas.')
            });
    });

    it("should throw if tokens per eth is zero", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, 0, valid.minFeePerKwei,
                    valid.maxPresaleEthAllowed, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, 'invalid contracts should throw an out of gas.')
            });
    });

    it("should throw if the token contract address is zero", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(0, valid.tokensPerEth, valid.minFeePerKwei,
                    valid.maxPresaleEthAllowed, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, 'invalid contracts should throw an out of gas.')
            });
    });
});
