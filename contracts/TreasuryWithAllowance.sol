/**
* Copyright (c) 2020-2022 in alphabetical order:
* GFT, HOPU
*
* This program and the accompanying materials are made
* available under the terms of the EUROPEAN UNION PUBLIC LICENCE v. 1.2
* which is available at https://gitlab.com/i3-market/code/wp3/t3.3/tokenization/-/blob/main/LICENSE
*
* License-Identifier: Apache 2.0
*
* Contributors:
*    Luca Marangoni (GFT)
*    German Molina Carrasco (HOPU)
*
*/

pragma solidity >=0.7.0 <0.9.0;
pragma abicoder v2;

import "./Treasury.sol";

contract TreasuryWithAllowance is I3MarketTreasury {
    mapping(address => mapping(address => uint256)) private _allowed;

    constructor() I3MarketTreasury() {

    }

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed _owner, address indexed _spender, uint256 _oldValue, uint256 _value);

    /**
     * @dev Function to check the amount of tokens that an owner allowed to a spender.
     * @param owner address The address which owns the funds.
     * @param spender address The address which will spend the funds.
     * @return A uint256 specifying the amount of tokens still available for the spender.
     */
    function allowance(address owner, address spender) public view returns (uint256)    {
        return _allowed[owner][spender];
    }

    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     * Beware that changing an allowance with this method brings the risk that someone may use both the old
     * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
     * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     */
    function approve(address spender, uint256 currentValue, uint256 value) public returns (bool)
    {
        require(_allowed[msg.sender][spender] == currentValue, 'WRONG CURRENT VALUE');
        require(spender != address(0));

        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, currentValue, value);
        return true;
    }


    /**
     * @dev Transfer tokens from one address to another
     * @param transferId unique id of the transfer
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param value uint256 the amount of tokens to be transferred
     */
    function allowanceTransfer(string memory transferId, address from, address to, uint256 value) public returns (bool)
    {
        require(value <= _allowed[from][msg.sender], 'NOT ENOUGH TOKEN ALLOWED');
        require(to != address(0));

        super._transferFrom(from, to, value);
        _allowed[from][msg.sender] = _allowed[from][msg.sender] - value;

        txs[transferId] = TokenTransfer(transferId, from, to, value, false, "");
        emit TokenTransferred(transferId, "payment", msg.sender, to);
        return true;
    }

    /**
     * @dev See {IERC1155-isApprovedForAll}.
     * @param account address of the owner of the tokens
     * @param account address of the spender of the tokens
     */
    function isApprovedForAll(address account, address operator) public view virtual override returns (bool) {
        return _allowed[account][operator] > 0;
    }

     /**
        @notice Enable or disable approval for a third party ("operator") to manage all of `msg.sender`'s tokens.
        @dev MUST emit the ApprovalForAll event on success.
    */
    function setApprovalForAll(address operator, bool approved) public virtual override  {
        // Do this on the wrapped contract directly. We can't do this here
        revert();
    }
}
