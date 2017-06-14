pragma solidity ^0.4.10;
import './TokenSyndicate.sol';


contract TokenSyndicateFactory {

    event LogNewTokenSyndicate(address newSyndicateAddress);

    function TokenSyndicateFactory(){
    }

    function createSyndicate (
    address _tokenContract,
    uint256 _tokenExchangeRate,
    uint256 _minFeePerKwei,
    uint256 _maxPresaleEthAllowed,
    uint256 _presaleStartBlock,
    uint256 _presaleEndBlock) returns (address newSyndicateAddress){
        TokenSyndicate newSyndicate = (new TokenSyndicate(
            _tokenContract,
            _tokenExchangeRate,
            _minFeePerKwei,
            _maxPresaleEthAllowed,
            _presaleStartBlock,
            _presaleEndBlock));
        LogNewTokenSyndicate(address(newSyndicate));
        return newSyndicate;
    }
}
