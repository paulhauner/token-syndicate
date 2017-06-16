const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");
const TokenSyndicate = artifacts.require("./TokenSyndicate.sol");
const BATokenFactory = artifacts.require("./BAT/BATokenFactory.sol");
const BAToken = artifacts.require("./BAT/BAToken.sol");

const valid = {
    tokenContract: 1,
    tokenExchangeRate: 6400,
    minBountyPerKwei: 250,
    maxPresaleEthAllowed: 1000000,
    presaleStartBlock: 0,
    presaleEndBlock: 1000000000
};

contract('TokenSyndicateFactory', function(accounts) {
    const totalInvestmentInWei = 1100;
    const bountyPerKwei = 250;
    const bountyValue = Math.floor(totalInvestmentInWei*(bountyPerKwei/1000));
    const presaleValue = totalInvestmentInWei - bountyValue;
    const batContractExchangeRate = valid.tokenExchangeRate;
    const tokensExpected = presaleValue * batContractExchangeRate;
    const investorAccount = accounts[0];
    const bountyHunterAccount = accounts[1];
    const unassociatedAccount = accounts[2];
    let tokenContract = null;
    let tokenContractAddress = null;
    let syndicateContract = null;

    /**
     * Create a token factory, use it to create a new syndicate and set the `contract`
     * variable to be a `TokenSyndicate` instance.
     */
    before(function() {
        // create a new bat token factory
        return BATokenFactory.deployed()
            .then(function(batFactory) {
                // create a new bat token contact
                return batFactory.createBATokenContract(1, 1, 0, 1000);    // starts at block 0 and ends at 1000
            })
            .then(function(tx) {
                // record the new bat token contract address
                const log = tx.logs[0];
                tokenContractAddress = log.args.newContractAddress;
                tokenContract = BAToken.at(tokenContractAddress);
                // deploy a the token syndicate factory
                return TokenSyndicateFactory.deployed()
            })
            .then(function(factory) {
                // create a new token syndicate
                return factory.createSyndicate(tokenContractAddress, valid.tokenExchangeRate, valid.minBountyPerKwei,
                    valid.maxPresaleEthAllowed, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(function(tx) {
                // record the new token syndicate address
                const log = tx.logs[0];
                const contractAddress = log.args.newSyndicateAddress;
                syndicateContract = TokenSyndicate.at(contractAddress);
                // buy some presale tokens from investorAccount
                return syndicateContract.createPresaleInvestment(bountyPerKwei, { from: investorAccount, value: totalInvestmentInWei})
            });
    });

    it("should report valid account balances after investment", function() {
        return syndicateContract.balanceOf.call(investorAccount)
            .then(function(balances) {
                const presale = balances[0].toString();
                const bounty = balances[1].toString();
                assert(
                    parseInt(bounty) === (totalInvestmentInWei * (bountyPerKwei/1000)),
                    'the account should have an accurate bounty value'
                );
                assert(
                    parseInt(presale) === (totalInvestmentInWei - (totalInvestmentInWei * (bountyPerKwei/1000))),
                    'the account should have an accurate presale value'
                );
            });
    });

    it("should execute a token purchase when permitted by the token contract", function() {
        return syndicateContract.buyTokens({from: bountyHunterAccount})
            .then(function() {
                return tokenContract.balanceOf.call(syndicateContract.address)
            })
            .then(function(balance) {
                assert(
                    balance.toNumber() === tokensExpected,
                    `we should have an accurate token balance. expected ${tokensExpected} !== balance ${balance}`
                );
            })
    });

    it("should throw if an investor attempts to refund after a winner has been determined", function() {
        return syndicateContract.refundPresaleInvestment({from: investorAccount})
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, 'it should cause an invalid opcode exception.')
            });
    });

    it("should throw if an account which has not invested attempts to withdraw", function() {
        return syndicateContract.withdrawTokens({from: unassociatedAccount})
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, 'it should cause an invalid opcode exception.')
            });
    });

    it("should allow an investor to withdraw their tokens after a valid token purchase", function() {
        return syndicateContract.withdrawTokens({from: investorAccount})
            .then(function(tx) {
                // do some assertions on the log created
                const log = tx.logs[0];
                assert(log.event === 'LogWithdrawTokens', 'an event should have been created');
                assert(log.args._to === investorAccount, 'the event should reference the investor');
                assert(
                    log.args.tokens.toNumber() === tokensExpected,
                    `the tokens value in the event should match our expectation.`
                );
                // get the balance of the investor in the real token contract (not our presale contract)
                return tokenContract.balanceOf(investorAccount)
            })
            .then(function(balance) {
                assert(
                    balance.toNumber() === tokensExpected,
                    'the investor should now own the tokens they paid for in the presale');
            });
    });

    it("should throw if an investor attempts to withdraw a second time", function() {
        return syndicateContract.withdrawTokens({from: investorAccount})
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, 'it should cause an invalid opcode exception.')
            });
    });
});

