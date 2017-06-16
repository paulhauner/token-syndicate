const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");

const valid = {
    tokenContract: 1,
    tokenExchangeRate: 20000,
    minBountyPerKwei: 250,
    maxPresaleEthAllowed: 1000000,
    refundStartBlock: 1000
};

contract('TokenSyndicateFactory', function(accounts) {

    const createValidSyndicate = function(factory) {
        return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.minBountyPerKwei,
            valid.maxPresaleEthAllowed, valid.refundStartBlock)
            .then(function() {
                return factory;
            })
            .catch(() => assert.fail('it should be possible to create a valid contract'));
    };

    it("should create new syndicates", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.minBountyPerKwei,
                    valid.maxPresaleEthAllowed, valid.refundStartBlock);
            })
            .then(function(tx) {
                const log = tx.logs[0];
                assert(log.event === 'LogNewTokenSyndicate', 'a log is created');
                assert(log.args.newSyndicateAddress !== '', 'an address is logged');
            });
    });

    it("should throw if syndicates finish before they start", function() {
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.minBountyPerKwei,
                    valid.maxPresaleEthAllowed, web3.eth.blockNumber - 1);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });

    it("should throw if bounties are too high", function() {
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, 1000,
                    valid.maxPresaleEthAllowed, valid.refundStartBlock);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });

    it("should throw if bounties are too low", function() {
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, 0,
                    valid.maxPresaleEthAllowed, valid.refundStartBlock);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });

    it("should throw if there is no eth allowed for presale", function() {
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.minBountyPerKwei,
                    0, valid.refundStartBlock);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });

    it("should throw if tokens per eth is zero", function() {
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, 0, valid.minBountyPerKwei,
                    valid.maxPresaleEthAllowed, valid.refundStartBlock);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });

    it("should throw if the token contract address is zero", function() {
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(0, valid.tokenExchangeRate, valid.minBountyPerKwei,
                    valid.maxPresaleEthAllowed, valid.refundStartBlock);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });
});
