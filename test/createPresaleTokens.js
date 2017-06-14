const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");
const TokenSyndicate = artifacts.require("./TokenSyndicate.sol");

const valid = {
    tokenContract: 1,
    tokensPerEth: 20000,
    minFeePerKwei: 250,
    maxPresaleEthAllowed: 1000000,
    presaleStartBlock: 0,
    presaleEndBlock: 10000
};

contract('TokenSyndicateFactory', function(accounts) {
    let contract = null;

    /**
     * Create a token factory, use it to create a new syndicate and set the `contract`
     * variable to be a `TokenSyndicate` instance.
     */
    before(function() {
        return TokenSyndicateFactory.deployed()
            .then(function(factory) {
                return factory.createSyndicate(valid.tokenContract, valid.tokensPerEth, valid.minFeePerKwei,
                    valid.maxPresaleEthAllowed, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(function(tx) {
                const log = tx.logs[0];
                const contractAddress = log.args.newSyndicateAddress;
                contract = TokenSyndicate.at(contractAddress);
            })
    });

    const totalInvestmentInWei = 1100;
    const feePerKwei = 250;

    it("should allow presale investment if supplied enough eth and a valid fee", function() {
        return contract.createPresaleInvestment(feePerKwei, { from: accounts[0], value: totalInvestmentInWei})
            .then(function(tx) {
                assert(tx.logs[0].event === 'LogCreatePresaleInvestment', 'an event should be created');
            })
    });

    it("should report valid account balances", function() {
        return contract.balanceOf.call(accounts[0])
            .then(function(balances) {
                const presale = balances[0].toString();
                const fee = balances[1].toString();
                assert(
                    parseInt(fee) === (totalInvestmentInWei * (feePerKwei/1000)),
                    'the account should have an accurate fee value'
                );
                assert(
                    parseInt(presale) === (totalInvestmentInWei - (totalInvestmentInWei * (feePerKwei/1000))),
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

                let gasPrice = web3.eth.gasPrice;
                gasPrice = gasPrice.dividedBy(2);       // for some reason this is necessary.. testrpc bug?
                gasPrice = gasPrice.times(10);          // this is also necessary.. need to figure out it's about
                const txFee = gasPrice.times(tx.receipt.cumulativeGasUsed);
                const predictedBalance = accountBalanceBeforeRefund.minus(txFee).plus(totalInvestmentInWei);
                assert(
                    accountBalanceAfterRefund.equals(predictedBalance),
                    'the account balance of the investor should be credited the fee+investment'
                )
            })
    });

});

