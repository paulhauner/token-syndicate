pragma solidity ^0.4.10;
import './SafeMath.sol';


contract TokenSyndicate {
    uint256 public constant kwei = 1000;

    address public tokenContract;
    uint256 public tokenExchangeRate;
    uint256 public minBountyPerKwei;
    uint256 public maxPresaleEthAllowed;
    uint256 public presaleStartBlock;
    uint256 public presaleEndBlock;
    address public winner;

    uint256 public totalPresale;
    uint256 public totalBounties;

    mapping(address => uint256) public presaleBalances;
    mapping(address => uint256) public bountyBalances;

    event LogCreatePresaleInvestment(address indexed _to, uint256 bounty, uint256 presale);
    event LogRefundPresaleInvestment(address indexed _to, uint256 bounty, uint256 presale);

    function TokenSyndicate(
    address _tokenContract,
    uint256 _tokenExchangeRate,
    uint256 _minBountyPerKwei,
    uint256 _maxPresaleEthAllowed,
    uint256 _presaleStartBlock,
    uint256 _presaleEndBlock){
        if (_minBountyPerKwei >= kwei) throw;  // you may not have a bounty of 100% or more.
        if (_minBountyPerKwei == 0) throw;     // you must provide a bounty.
        if (_maxPresaleEthAllowed == 0) throw;
        if (_tokenContract == address(0)) throw;
        if (_tokenExchangeRate == 0) throw;
        if(_presaleStartBlock >= _presaleEndBlock) throw;     // the presale must start before it finishes.

        tokenContract = _tokenContract;
        tokenExchangeRate = _tokenExchangeRate;
        minBountyPerKwei = _minBountyPerKwei;
        maxPresaleEthAllowed = _maxPresaleEthAllowed;
        presaleStartBlock = _presaleStartBlock;
        presaleEndBlock = _presaleEndBlock;

        totalPresale = 0;
        totalBounties = 0;
        winner = address(0);
    }

    /*
        Invest in this contract in order to have tokens purchased on your behalf when the buyTokens() contract
        is called without a `throw`.
    */
    function createPresaleInvestment(uint256 bountyPerKwei) payable external {
        if(block.number < presaleStartBlock) throw; // you must call within the block time bounds of the presale.
        if(block.number > presaleEndBlock) throw;   // as above ^
        if(bountyPerKwei < minBountyPerKwei) throw;       // you must provide a bounty/kw above or equal to the minimum bounty/kw.
        if(msg.value == 0) throw;                   // you must provide some eth.

        /*
            As the EVM does not currently support decimals, we are multiplying both msg.value and the bounty
            by 1000 before calculating the bounty ratio in order to gain a reasonable degree of precision.
        */
        uint256 bountyWithKweiPrecision = SafeMath.div(SafeMath.mul(msg.value, kwei), SafeMath.mul(bountyPerKwei, kwei));
        uint256 final_bounty = SafeMath.div(msg.value, bountyWithKweiPrecision);
        uint256 final_presale = SafeMath.sub(msg.value, final_bounty);

        bountyBalances[msg.sender] += final_bounty;
        presaleBalances[msg.sender] += final_presale;
        totalBounties += final_bounty;
        totalPresale += final_presale;
        LogCreatePresaleInvestment(msg.sender, final_bounty, final_presale);       // create an event
    }

    /*
        Get the presaleBalance (ETH) and bountyBalance (ETH) for an address.
    */
    function balanceOf(address _owner) constant returns (uint256 presaleBalance, uint256 bountyBalance) {
        return (presaleBalances[_owner], bountyBalances[_owner]);
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
           The 'winner' is allowed to withdraw the bounties from this contract.
    */
    function buyTokens() external onlyWithoutWinner {
        winner = msg.sender;
        if(!tokenContract.call.value(totalPresale)(bytes4(sha3("createTokens()")))) throw;
    }

    /*
        Refund a your investment and bounty.
        This is only possible if there has not been a 'winner' (ie, if tokens have not been purchased).
    */
    function refundPresaleInvestment() external onlyWithoutWinner {
        uint256 bountyValue = bountyBalances[msg.sender];
        uint256 presaleValue = presaleBalances[msg.sender];
        uint256 totalValue = SafeMath.add(bountyValue, presaleValue);

        if(bountyValue == 0) throw;
        if(presaleValue == 0) throw;

        bountyBalances[msg.sender] = 0;
        presaleBalances[msg.sender] = 0;
        totalBounties = SafeMath.sub(totalBounties, bountyValue);
        totalPresale = SafeMath.sub(totalPresale, presaleValue);
        msg.sender.transfer(totalValue);
        LogRefundPresaleInvestment(msg.sender, bountyValue, presaleValue);
    }
}



