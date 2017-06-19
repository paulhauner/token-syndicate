const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");

const valid = {
    tokenContract: 1,
    tokenExchangeRate: 20000,
    bountyPerKwei: 250,
    maxPresaleWeiAllowed: 1000000,
    refundStartBlock: 1000
};

contract('TokenSyndicateFactory (syndicate construction)', function(accounts) {

    const createValidSyndicate = function(factory) {
        return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.bountyPerKwei,
            valid.maxPresaleWeiAllowed, valid.refundStartBlock)
            .then(function() {
                return factory;
            })
            .catch(() => assert.fail('it should be possible to create a valid contract'));
    };

    it("should create new syndicates", function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.bountyPerKwei,
                    valid.maxPresaleWeiAllowed, valid.refundStartBlock);
            })
            .then(function(tx) {
                const log = tx.logs[0];
                assert(log.event === 'LogNewTokenSyndicate', 'a log is created');
                assert(log.args.newSyndicateAddress !== '', 'an address is logged');
            });
    });

    it("should throw if bounties are too high", function() {
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, 1000,
                    valid.maxPresaleWeiAllowed, valid.refundStartBlock);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });

    it("should throw if the bounty rate is too low", function() {
        const invalidBounty = 0;
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, invalidBounty,
                    valid.maxPresaleWeiAllowed, valid.refundStartBlock);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });

    it("should throw if the bounty rate is too high", function() {
        const invalidBounty = 1000;
        return TokenSyndicateFactory.deployed()
            .then((factory) => createValidSyndicate(factory))       // test to ensure a valid syndicate can be deployed
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, invalidBounty,
                    valid.maxPresaleWeiAllowed, valid.refundStartBlock);
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
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.bountyPerKwei,
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
                return factory.createSyndicate(valid.tokenContract, 0, valid.bountyPerKwei,
                    valid.maxPresaleWeiAllowed, valid.refundStartBlock);
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
                return factory.createSyndicate(0, valid.tokenExchangeRate, valid.bountyPerKwei,
                    valid.maxPresaleWeiAllowed, valid.refundStartBlock);
            })
            .then(() => assert.fail('creating a syndicate should not be successful.'))
            .catch(function(error) {
                assert(error.message.indexOf('out of gas') >= 0, error.actual)
            });
    });
});
