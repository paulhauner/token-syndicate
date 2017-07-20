# Token Syndicate

Provides a pre-purchase contract for Ethereum tokens (ie, ERC20).

Prior to the start phase of the target token sale contract, users provide Ether to the syndicate contract. Thier Ether is then split into a 'token' portion and a 'bounty' portion.

Once the target token sale has started, any Ethereum user can call the `buyTokens()` function on the syndicate which will trigger the token purcase from the target token sale contract into the account of the token syndicate contract. Whichever user successfully calls the `buyTokens()` function will be rewarded with the total bounty portion of Ether.

The tokens owned by the token syndicate will be distributed fairly to the users which invested in the contract.

## Environment

This contract was developed in a truffle environment

## Tests

Run `$ truffle test`
