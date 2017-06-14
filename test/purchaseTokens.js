const TokenSyndicateFactory = artifacts.require("./TokenSyndicateFactory.sol");
const TokenSyndicate = artifacts.require("./TokenSyndicate.sol");
const BATokenFactory = artifacts.require("./BAT/BATokenFactory.sol");
const BAToken = artifacts.require("./BAT/BAToken.sol");

const valid = {
    tokenContract: 1,
    tokensPerEth: 20000,
    minFeePerKwei: 250,
    maxPresaleEthAllowed: 1000000,
    presaleStartBlock: 0,
    presaleEndBlock: 10000
};

contract('TokenSyndicateFactory', function(accounts) {
    const totalInvestmentInWei = 1100;
    const feePerKwei = 250;
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
                return factory.createSyndicate(tokenContractAddress, valid.tokensPerEth, valid.minFeePerKwei,
                    valid.maxPresaleEthAllowed, valid.presaleStartBlock, valid.presaleEndBlock);
            })
            .then(function(tx) {
                // record the new token syndicate address
                const log = tx.logs[0];
                const contractAddress = log.args.newSyndicateAddress;
                syndicateContract = TokenSyndicate.at(contractAddress);
                // buy some presale tokens from accounts[0]
                return syndicateContract.createPresaleInvestment(feePerKwei, { from: accounts[0], value: totalInvestmentInWei})
            });
    });

    it("should report valid account balances after investment", function() {
        return syndicateContract.balanceOf.call(accounts[0])
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

    it("should execute a token purchase when permitted by the token contract", function() {
        return syndicateContract.buyTokens({from: accounts[1]})
    });

    it("should have a valid token balance in the token contract", function() {
        return tokenContract.balanceOf.call(syndicateContract.address)
            .then(function(balance) {
                console.log(balance);
                assert(balance.toNumber() > 0, 'the balance should be above zero');
                assert(false, 'this test is not finished');
            })
    });
});

