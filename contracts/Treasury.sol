/**
* SPDX-License-Identifier: Apache-2.0
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

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";


contract I3MarketTreasury is ERC1155 {

    event TokenTransferred(string transferId, string operation, address fromAdd, address toAdd);
    event FiatMoneyPayment(string transferId, string operation, address fromAdd);

    struct TokenTransfer {
        string transferId;
        address fromAdd;
        address toAdd;
        uint tokenAmount;
        bool isPaid;
        string transferCode;
    }

    struct ClearingOperation{
        string transferId;
        address toAdd;
        uint tokenAmount;
    }

    // transactions array
    mapping(string => TokenTransfer) public txs;

    // marketplace index array
    mapping(address => uint) public mpIndex;
    uint public index = 0;

    // marketplaces address array
    address[] public marketplaces;

    // variable that define the minimum amount accettable to start a clearing operation
    uint private minimumClearingThreshold;

    // address that represent the Community wallet - edits to this variable should be regulated
    address public communityWallet;

    // Community fee percentage 
    uint public communityFee;

    modifier onlySameAdd(address _mpAdd) {
        require(msg.sender == _mpAdd, "ONLY THE MP CAN ADD ITSELF");
        _;
    }

    modifier onlyMp(address _mpAdd) {
        isMarketplace(_mpAdd,"ADD ISN'T A MP");
        _;
    }

    modifier validDestination(address _to) {
        require(msg.sender != _to, "MP CANNOT MINT TO ITSELF");
        _;
    }

    modifier onlyTheTokenReceiver(string memory _transferId) {
        require(txs[_transferId].toAdd == msg.sender, "ONLY RECEIVER CAN CHANGE ISPAID");
        _;
    }

    modifier onlyNewMpAdd(address _mpAdd) {
        require(mpIndex[_mpAdd] == 0, "MP ALREADY ADDED");
        _;
    }

    constructor() ERC1155("https://i3market.com/marketplace/{id}.json") {
    }

    /*
    * add a new Data Marketplace in the platform
    */
    function addMarketplace(address _mpAdd) external onlySameAdd(_mpAdd) onlyNewMpAdd(_mpAdd) {
        index += 1;
        marketplaces.push(_mpAdd);
        mpIndex[_mpAdd] = index;
    }

    /*
    * exchange in function between a Data Marketplace and a Data Consumer
    */
    function exchangeIn(string memory transferId, address _userAdd, uint _tokensAmount) external payable validDestination(_userAdd) {

        isMarketplace(msg.sender,"ADD ISN'T A MP");
        //mint token from Data Marketplace to Data Consumer
        _mint(_userAdd, mpIndex[msg.sender], _tokensAmount, "");
        //create transaction with isPaid param to True as Fiat money payment is already done
        txs[transferId] = TokenTransfer(transferId, msg.sender, _userAdd, _tokensAmount, true, "");
        emit TokenTransferred(transferId, "exchange_in",  msg.sender, _userAdd);
    }

    /*
    * clearing function of a Data Marketplace
    */
    function clearing(ClearingOperation[] memory _clearingOps) external payable onlyMp(msg.sender){

        //clearing for each marketplace contained
        for (uint i = 0; i < _clearingOps.length; ++i){
            uint amount = _clearingOps[i].tokenAmount;
            address toMp = _clearingOps[i].toAdd;
            isMarketplace(toMp,"ADD ISN'T A MP");
            if(amount > minimumClearingThreshold) {
                super.safeTransferFrom(msg.sender,toMp,mpIndex[toMp], amount, "0x0");

                //create transaction with isPaid param to False as Fiat money payment is not completed yet
                txs[_clearingOps[i].transferId] = TokenTransfer(_clearingOps[i].transferId, msg.sender, toMp, amount, false, "");
                emit TokenTransferred(_clearingOps[i].transferId, "clearing", msg.sender, toMp);
            }
        }
    }

    /*  
    * payment function between a Data Consumer and a Data Provider  
    */
    function payment(string memory transferId, address _dataProvider, uint256 _amount) external payable {
        _transferFrom(msg.sender, _dataProvider, _amount);
        txs[transferId] = TokenTransfer(transferId, msg.sender, _dataProvider, _amount, false, "");
        emit TokenTransferred(transferId, "payment", msg.sender, _dataProvider);
    }

    /*  
    * token transfer function 
    */
    function _transferFrom(address _from, address _to, uint256 _amount) internal {
        uint256[] memory _ids = new uint256[](index);
        uint256[] memory _amounts = new uint256[](index);
        //obtains the tokens needed to pay the amount   
        (_ids, _amounts) = configurePayment(_from, _amount);
        super.safeBatchTransferFrom(_from, _to, _ids, _amounts, "0x0");
    }

    /*  
    * fees payment function from a Data Consumer to the Community Wallet and the Data Provider Marketplace  
    */
    function feePayment(string memory _transferIdCommunity, string memory _transferIdMp, address _dataProviderMp, uint256 _feeAmount) external payable {

        uint _amountCommunity = _feeAmount * communityFee / 100;
        uint _amountMarketplace = _feeAmount - _amountCommunity;

        // tranfer token to the Community wallet
        _transferFrom(msg.sender, communityWallet, _amountCommunity);
        txs[_transferIdCommunity] = TokenTransfer(_transferIdCommunity, msg.sender, communityWallet, _amountCommunity, false, "");
        emit TokenTransferred(_transferIdCommunity, "fee_payment", msg.sender, communityWallet);

        // transfer token to the Data Provider Host Marketplace
        _transferFrom(msg.sender, _dataProviderMp, _amountMarketplace);
        txs[_transferIdMp] = TokenTransfer(_transferIdMp, msg.sender, _dataProviderMp, _amountMarketplace, false, "");
        emit TokenTransferred(_transferIdMp, "fee_payment", msg.sender, _dataProviderMp);
    }


    /*
    * exchange out function between a Data Provider and a Data Marketplace
    */
    function exchangeOut(string memory _transferId, address _mpAdd) external payable{

        uint256[] memory _ids = new uint256[](index);
        for (uint i = 0; i < index; ++i) {
            _ids[i] = i + 1;
        }
        uint256[] memory _amounts = new uint256[](index);
        //exchange out all the token available in the balance
        _amounts = balanceOfAddress(msg.sender);

        super.safeBatchTransferFrom(msg.sender,_mpAdd, _ids, _amounts, "0x0");
        txs[_transferId] = TokenTransfer(_transferId, msg.sender, _mpAdd, getSum(_amounts), false, "");
        emit TokenTransferred(_transferId, "exchange_out", msg.sender, _mpAdd);
    }

    /*
    * Returns the TokenTransfer informations associated with the transferId identifier
    */
    function getTransaction(string memory _transferId) public view returns (TokenTransfer memory tokenTransfer) {
        return txs[_transferId];
    }

    /*
    * Returns a pair with the token ids and the respective amounts to cover the amount required for payment. 
    * Tokens are taken starting from the first token type until the sum is reached
    */
    function configurePayment(address from, uint256 amount) private view returns (uint256[] memory ids, uint256[] memory amounts) {
        uint256[] memory mpIds = new uint256[](index);
        uint256[] memory mpTokens = new uint256[](index);
        for (uint256 i = 0; i < index && amount != 0; ++i) {
            uint256 mpBalance = super.balanceOf(from, i + 1);
            if (mpBalance != 0) {
                mpIds[i] = i + 1;
                mpTokens[i] = getMarketplaceNeededTokens(mpBalance, amount);
                amount = amount - mpTokens[i];
            }
        }
        require(amount == 0, "NOT ENOUGH TOKENS");
        return (mpIds, mpTokens);
    }

    function getMarketplaceNeededTokens(uint256 balance, uint256 amount) private pure returns (uint256) {
        if (amount > balance) {
            return balance;
        }
        return amount;
    }

    /*  
    * Returns the sum of the elements in an array   
    */
    function getSum(uint256[] memory _amounts) private pure returns (uint256){
        uint256 sum = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            sum = sum + _amounts[i];
        }
        return sum;
    }

    /*
    * in the TokenTransfer object of a transaction, set the isPaid param to true if the payment was also made with fiat money
    */
    function setPaid(string memory _transferId, string memory _transferCode) external payable onlyTheTokenReceiver(_transferId){
        txs[_transferId].isPaid = true;
        txs[_transferId].transferCode = _transferCode;
        emit FiatMoneyPayment(_transferId, "set_paid", msg.sender);
    }

    /*
    * in the TokenTransfer object of a transaction, set the transfer code param 
    */
    //function setTransferCode(string memory _transferId, string memory _transferCode) external payable onlyTheTokenReceiver(_transferId){ 
    //    txs[_transferId].transferCode = _transferCode;
    //}

    /*
    * return the overall balance of all the tokens owned by _owner
    */
    function balanceOfAddress(address _owner) public view returns (uint256[] memory) {
        uint256[] memory balances_ = new uint256[](index);

        for (uint256 i = 0; i < index; ++i) {
            balances_[i] = super.balanceOf(_owner, i + 1);
        }
        return balances_;
    }

    /*
    * Set Community fee rate and address
    */
    function setCommunityWalletAndCommunityFee(address _communityWallett, uint _feeRate) external payable onlyMp(msg.sender){
        communityWallet = _communityWallett;
        communityFee = _feeRate;
    }

    /*
    * Set minimum CLearing threshold
    */
    function setMinimumClearingThreshold(uint _clearingThreshold) external payable onlyMp(msg.sender){
        minimumClearingThreshold = _clearingThreshold;
    }

    /*
    * Check if address is a regular marketplace
    */
    function isMarketplace(address _mpAdd, string memory message) public view {
        require(mpIndex[_mpAdd] != 0, message);
    }

}
