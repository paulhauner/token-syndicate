const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");
const TokenSyndicate = artifacts.require("./TokenSyndicate.sol");
const BATokenFactory = artifacts.require("./BAT/BATokenFactory.sol");
const BAToken = artifacts.require("./BAT/BAToken.sol");

const valid = {
    tokenContract: 1,
    tokenExchangeRate: 6400,
    minBountyPerKwei: 250,
    maxPresaleWeiAllowed: 1000000,
};

const calculateTxFee = function(tx, gasPrice) {
    gasPrice = gasPrice.times(5);       // i dont know why this is needed. potentially a testrpc bug?
    return gasPrice.times(tx.receipt.cumulativeGasUsed);
};

contract('TokenSyndicateFactory', function(accounts) {
    const totalInvestmentInWei = 11003;
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
                    valid.maxPresaleWeiAllowed, web3.eth.blockNumber + 1);
            })
            .then(function(tx) {
                // record the new token syndicate address
                const log = tx.logs[0];
                const contractAddress = log.args.newSyndicateAddress;
                syndicateContract = TokenSyndicate.at(contractAddress);
                // buy some presale tokens from investorAccount
                return syndicateContract.createPresaleInvestment(bountyPerKwei, { from: investorAccount, value: totalInvestmentInWei})
            })
            .catch((error) => console.log(error));
    });

    it("should throw if an investment will exceed the maximum investment allowed", function() {
        return syndicateContract.createPresaleInvestment(bountyPerKwei,
                {from: investorAccount, value: valid.maxPresaleWeiAllowed*2})  // *2 is to make sure it's too high
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, 'it should cause an invalid opcode exception.')
            });
    });

    it("should report valid account balances after investment", function() {
        return syndicateContract.balanceOf.call(investorAccount)
            .then(function(balances) {
                const presale = balances[0].toString();
                const bounty = balances[1].toString();
                assert(
                    parseInt(bounty) === Math.floor(totalInvestmentInWei * (bountyPerKwei/1000)),
                    'the account should have an accurate bounty value'
                );
                assert(
                    parseInt(presale) === (totalInvestmentInWei - Math.floor(totalInvestmentInWei * (bountyPerKwei/1000))),
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

    it("should throw if an account which is not the winner tries to withdraw the bounty", function() {
        return syndicateContract.withdrawBounty({from: investorAccount})
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, 'it should cause an invalid opcode exception.')
            });
    });

    it("should allow the winner to withdraw the bounty", function() {
        const accountBalanceBeforeRefund = web3.eth.getBalance(bountyHunterAccount);
        return syndicateContract.withdrawBounty({from: bountyHunterAccount})
            .then(function(tx) {
                const log = tx.logs[0];
                assert(log.event === 'LogWithdrawBounty', 'an event should have been created');
                assert(log.args._to === bountyHunterAccount, 'the event should reference the bounty hunter');
                assert(
                    log.args.bounty.toNumber() === bountyValue,
                    `the bounty value in the event should match our expectation.`
                );
                const accountBalanceAfterRefund = web3.eth.getBalance(bountyHunterAccount);
                const calculatedRefund = accountBalanceAfterRefund.minus(
                    accountBalanceBeforeRefund.minus(calculateTxFee(tx, web3.eth.gasPrice))
                );
                assert(
                    calculatedRefund.toNumber() === bountyValue,
                    'the bounty hunters eth balance should have increased by the bounty value'
                )
            })
    });

    it("should not allow the winner to withdraw the bounty twice", function() {
        return syndicateContract.withdrawBounty({from: bountyHunterAccount})
            .then(assert.fail)
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, 'it should cause an invalid opcode exception.')
            });
    });
});

