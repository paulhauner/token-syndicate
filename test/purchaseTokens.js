const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");
const TokenSyndicate = artifacts.require("./TokenSyndicate.sol");
const BATokenFactory = artifacts.require("./BAT/BATokenFactory.sol");
const BAToken = artifacts.require("./BAT/BAToken.sol");

const valid = {
    tokenContract: 1,
    tokenExchangeRate: 20000,
    minBountyPerKwei: 250,
    maxPresaleEthAllowed: 1000000,
    presaleStartBlock: 0,
    presaleEndBlock: 10000
};

contract('TokenSyndicateFactory', function(accounts) {
    const totalInvestmentInWei = 1100;
    const bountyPerKwei = 250;
    const bountyValue = Math.floor(totalInvestmentInWei*(bountyPerKwei/1000));
    const presaleValue = totalInvestmentInWei - bountyValue;
    const batContractExchangeRate = 6400;
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
                // buy some presale tokens from accounts[0]
                return syndicateContract.createPresaleInvestment(bountyPerKwei, { from: accounts[0], value: totalInvestmentInWei})
            });
    });

    it("should report valid account balances after investment", function() {
        return syndicateContract.balanceOf.call(accounts[0])
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
        return syndicateContract.buyTokens({from: accounts[1]})
            .then(function() {
                return tokenContract.balanceOf.call(syndicateContract.address)
            })
            .then(function(balance) {
                const expectedTokenBalance = presaleValue * batContractExchangeRate;
                assert(
                    balance.toNumber() === expectedTokenBalance,
                    `we should have an accurate token balance. expected ${expectedTokenBalance} !== balance ${balance}`
                );
            })
    });

    it("should throw if an investor attempts to withdraw after a winner has been determined", function() {
        return syndicateContract.refundPresaleInvestment({from: accounts[1]})
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, 'it should cause an invalid opcode exception.')
            });
    });

    it("should allow an account to transfer their token entitlement to an address", function() {
        return syndicateContract.refundPresaleInvestment({from: accounts[1]})
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, 'it should cause an invalid opcode exception.')
            });
    });
});

