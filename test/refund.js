const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");
const TokenSyndicate = artifacts.require("./TokenSyndicate.sol");

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

contract('TokenSyndicate (refunds)', function(accounts) {
    let contract = null;

    /**
     * Create a token factory, use it to create a new syndicate and set the `contract`
     * variable to be a `TokenSyndicate` instance.
     */
    before(function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.minBountyPerKwei,
                    valid.maxPresaleWeiAllowed, web3.eth.blockNumber + 1);
            })
            .then(function(tx) {
                const log = tx.logs[0];
                const contractAddress = log.args.newSyndicateAddress;
                contract = TokenSyndicate.at(contractAddress);
            })
    });

    const totalInvestmentInWei = 1100;
    const bountyPerKwei = 250;

    it("should allow presale investment if supplied enough eth and a valid bounty", function() {
        return contract.createPresaleInvestment(bountyPerKwei, { from: accounts[0], value: totalInvestmentInWei})
            .then(function(tx) {
                assert(tx.logs[0].event === 'LogCreatePresaleInvestment', 'an event should be created');
            })
    });

    it("should report valid account balances", function() {
        return contract.balanceOf.call(accounts[0])
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

    it("should allow a full refund for an investor if there has been no winner", function() {
        const accountBalanceBeforeRefund = web3.eth.getBalance(accounts[0]);

        return contract.refundPresaleInvestment({from: accounts[0]})
            .then(function(tx) {
                assert(tx.logs[0].event === 'LogRefundPresaleInvestment', 'an event should be created');

                const accountBalanceAfterRefund = web3.eth.getBalance(accounts[0]);
                const txCalced = accountBalanceAfterRefund.minus(accountBalanceBeforeRefund.plus(totalInvestmentInWei));

                const txFee = calculateTxFee(tx, web3.eth.gasPrice);
                const predictedBalance = accountBalanceBeforeRefund.minus(txFee).plus(totalInvestmentInWei);
                assert(
                    accountBalanceAfterRefund.equals(predictedBalance),
                    'the account balance of the investor should be credited the bounty+investment'
                )
            })
    });

    it("should throw if an account attempts to withdraw before the withdraw block", function() {
        const refundBlock = web3.eth.blockNumber + 100000;      // it is an arbitrary number which just needs to be high

        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokenExchangeRate, valid.minBountyPerKwei,
                    valid.maxPresaleWeiAllowed, refundBlock);
            })
            .then(function(tx) {
                const log = tx.logs[0];
                const contractAddress = log.args.newSyndicateAddress;
                return TokenSyndicate.at(contractAddress);
            })
            .then(function(syndicate) {
                return syndicate.createPresaleInvestment(bountyPerKwei, { from: accounts[1], value: totalInvestmentInWei})
                    .then(function(tx) {
                        assert(tx.logs[0].event === 'LogCreatePresaleInvestment', 'an event should be created');
                        return syndicate;
                    })
            })
            .then(function(syndicate) {
                assert(
                    web3.eth.blockNumber < refundBlock,
                    'this test requires the block number to be lower than the refund start block'
                );
                return syndicate.refundPresaleInvestment({from: accounts[1]});
            })
            .then(() => assert.fail('it should not be possible to refund before the refund start block'))
            .catch(function(error) {
                assert(error.message.indexOf('invalid opcode') >= 0, error.actual)
            });
    });

});

