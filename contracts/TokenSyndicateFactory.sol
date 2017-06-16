pragma solidity ^0.4.10;
import './TokenSyndicate.sol';


contract TokenSyndicateFactory {

    event LogNewTokenSyndicate(address newSyndicateAddress);

    function TokenSyndicateFactory(){
    }

    function createSyndicate (
    address _tokenContract,
    uint256 _tokenExchangeRate,
    uint256 _minBountyPerKwei,
    uint256 _maxPresaleEthAllowed,
    uint256 _refundStartBlock) returns (address newSyndicateAddress){
        TokenSyndicate newSyndicate = (new TokenSyndicate(
            _tokenContract,
            _tokenExchangeRate,
            _minBountyPerKwei,
            _maxPresaleEthAllowed,
            _refundStartBlock));
        LogNewTokenSyndicate(address(newSyndicate));
        return newSyndicate;
    }
}
