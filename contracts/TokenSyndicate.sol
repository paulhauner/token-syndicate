pragma solidity ^0.4.10;
import './SafeMath.sol';


contract TokenSyndicate {
    uint256 public constant kwei = 1000;

    address public tokenContract;
    uint256 public tokensPerEth;
    uint256 public minFeePerKwei;
    uint256 public maxPresaleEthAllowed;
    uint256 public presaleStartBlock;
    uint256 public presaleEndBlock;
    address public winner;

    uint256 public totalPresale;
    uint256 public totalFees;

    mapping(address => uint256) public presaleBalances;
    mapping(address => uint256) public feeBalances;

    event LogCreatePresaleInvestment(address indexed _to, uint256 fee, uint256 presale);
    event LogRefundPresaleInvestment(address indexed _to, uint256 fee, uint256 presale);

    function TokenSyndicate(
    address _tokenContract,
    uint256 _tokensPerEth,
    uint256 _minFeePerKwei,
    uint256 _maxPresaleEthAllowed,
    uint256 _presaleStartBlock,
    uint256 _presaleEndBlock){
        if (_minFeePerKwei >= kwei) throw;  // you may not have a fee of 100% or more.
        if (_minFeePerKwei == 0) throw;     // you must provide a fee.
        if (_maxPresaleEthAllowed == 0) throw;
        if (_tokenContract == address(0)) throw;
        if (_tokensPerEth == 0) throw;
        if(_presaleStartBlock >= _presaleEndBlock) throw;     // the presale must start before it finishes.

        tokenContract = _tokenContract;
        tokensPerEth = _tokensPerEth;
        minFeePerKwei = _minFeePerKwei;
        maxPresaleEthAllowed = _maxPresaleEthAllowed;
        presaleStartBlock = _presaleStartBlock;
        presaleEndBlock = _presaleEndBlock;

        totalPresale = 0;
        totalFees = 0;
        winner = address(0);
    }

    /*
        Invest in this contract in order to have tokens purchased on your behalf when the buyTokens() contract
        is called without a `throw`.
    */
    function createPresaleInvestment(uint256 feePerKwei) payable external {
        if(block.number < presaleStartBlock) throw; // you must call within the block time bounds of the presale.
        if(block.number > presaleEndBlock) throw;   // as above ^
        if(feePerKwei < minFeePerKwei) throw;       // you must provide a fee/kw above or equal to the minimum fee/kw.
        if(msg.value == 0) throw;                   // you must provide some eth.

        /*
            As the EVM does not currently support decimals, we are multiplying both msg.value and the fee
            by 1000 before calculating the fee ratio in order to gain a reasonable degree of precision.
        */
        uint256 feeWithKweiPrecision = SafeMath.div(SafeMath.mul(msg.value, kwei), SafeMath.mul(feePerKwei, kwei));
        uint256 final_fee = SafeMath.div(msg.value, feeWithKweiPrecision);
        uint256 final_presale = SafeMath.sub(msg.value, final_fee);

        feeBalances[msg.sender] += final_fee;
        presaleBalances[msg.sender] += final_presale;
        totalFees += final_fee;
        totalPresale += final_presale;
        LogCreatePresaleInvestment(msg.sender, final_fee, final_presale);       // create an event
    }

    /*
        Get the presaleBalance (ETH) and feeBalance (ETH) for an address.
    */
    function balanceOf(address _owner) constant returns (uint256 presaleBalance, uint256 feeBalance) {
        return (presaleBalances[_owner], feeBalances[_owner]);
    }

    /*
        If the 'winner' address is address(0), there has been no winner yet.
    */
    modifier onlyWithoutWinner() {
        require(winner == address(0));
        _;
    }

    /*
        If the 'winner' address is anything other than address(0), there has been a winner.
    */
    modifier onlyWithWinner() {
        require(winner != address(0));
        _;
    }

    /*
           Attempt to purchase the tokens from the token contract.
           Whichever address manages to successfully purchase/create the tokens will be the 'winner'.
           The 'winner' is allowed to withdraw the fees from this contract.
    */
    function buyTokens() external onlyWithoutWinner {
        winner = msg.sender;
        if(!tokenContract.call.value(totalPresale)(bytes4(sha3("createTokens()")))) throw;
    }

    /*
        Refund a your investment and fee.
        This is only possible if there has not been a 'winner' (ie, if tokens have not been purchased).
    */
    function refundPresaleInvestment() external onlyWithoutWinner {
        uint256 feeValue = feeBalances[msg.sender];
        uint256 presaleValue = presaleBalances[msg.sender];
        uint256 totalValue = SafeMath.add(feeValue, presaleValue);

        if(feeValue == 0) throw;
        if(presaleValue == 0) throw;

        feeBalances[msg.sender] = 0;
        presaleBalances[msg.sender] = 0;
        totalFees = SafeMath.sub(totalFees, feeValue);
        totalPresale = SafeMath.sub(totalPresale, presaleValue);
        msg.sender.transfer(totalValue);
        LogRefundPresaleInvestment(msg.sender, feeValue, presaleValue);
    }
}



