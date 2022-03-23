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

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract I3MarketTreasury is ERC1155 {
    
    event TokenTransferred(string transferId, string operation, address fromAddress, address toAddress);
    event FiatMoneyPayment(string transferId, string operation, address fromAddress);
    
    struct TokenTransfer {  
        string transferId;
        address fromAddress;
        address toAddress;
        uint tokenAmount;
        bool isPaid;
        string transferCode;
    }
    
    struct Conflict {  
        string transferId;
        address applicant;
        address recipient;
        bool open;
    }

    struct ClearingOperation{
        string transferId;
        address toAddress;
        uint tokenAmount;
    }


    mapping(string => Conflict) public openConflicts;
    mapping(string => TokenTransfer) public transactions;
    mapping(address => uint) public marketplacesIndex;
    address[] public marketplaces;
    uint public index = 0;

    // variable that define the minimum amount accettable to start a clearing operation
    uint minimumClearingThreshold = 10;

    // address that represent the Community wallet - edits to this variable should be regulated
    address public communityWallet;

    // fees 
    uint public communityFee;
    uint public marketplaceFee;

    modifier onlySameAddress(address _marketplaceAddress) {
        require(msg.sender == _marketplaceAddress, "ONLY THE MP CAN ADD ITSELF");
        _;
    }

    modifier onlyMarketplace(address _marketplaceAddress) {
        isMarketplace(_marketplaceAddress,"ADDRESS ISN'T A MP");
        _;
    }

    modifier validDestination(address _to) {
        require(msg.sender != _to, "MP CANNOT MINT TO ITSELF");
        _;
    }

    modifier onlyTheTokenReceiver(string memory _transferId) {
        require(transactions[_transferId].toAddress == msg.sender, "ONLY RECEIVER CAN CHANGE ISPAID");
        _;
    }
    
    modifier onlyTheApplicant(string memory _transferId) {
        require(openConflicts[_transferId].applicant == msg.sender, "ONLY APPLICANT CAN CLOSE THE CONFLICT");
        _;
    }

    modifier onlyNewMarketplaceAddress(address _marketplaceAddress) {
        require(marketplacesIndex[_marketplaceAddress] == 0, "MP ALREADY ADDED");
        _;
    }
    
    modifier onlyPartiesOfTransaction(string memory _transferId, address recipient) {
        require(msg.sender == transactions[_transferId].toAddress || msg.sender == transactions[_transferId].fromAddress, "APPLICANT MUST BE ON TRANSACTION");
        require(recipient == transactions[_transferId].toAddress || recipient == transactions[_transferId].fromAddress, "APPLICANT MUST BE ON TRANSACTION");
        _;
    }

    constructor() ERC1155("https://i3market.com/marketplace/{id}.json") {
    }

    /*
    * add a new Data Marketplace in the platform
    */
    function addMarketplace(address _marketplaceAddress) external onlySameAddress(_marketplaceAddress) onlyNewMarketplaceAddress(_marketplaceAddress) {
        index += 1;
        marketplaces.push(_marketplaceAddress);
        marketplacesIndex[_marketplaceAddress] = index;
    }

    /*
    * get a Data Marketplace uint identifier
    */
    function getMarketplaceIndex(address _marketplaceAddress) public view returns (uint) {
        return marketplacesIndex[_marketplaceAddress];
    }

    /*
    * exchange in function between a Data Marketplace and a Data Consumer
    */
    function exchangeIn(string memory transferId, address _userAddress, uint _tokensAmount) external payable validDestination(_userAddress) { 
        
        isMarketplace(msg.sender,"ADDRESS ISN'T A MP");
        //mint token from Data Marketplace to Data Consumer
        _mint(_userAddress, marketplacesIndex[msg.sender], _tokensAmount, "");
        //create transaction with isPaid param to True as Fiat money payment is already done
        transactions[transferId] = TokenTransfer(transferId, msg.sender, _userAddress, _tokensAmount, true, "");
        emit TokenTransferred(transferId, "exchange_in", _userAddress, address(0));
    }

    /*
    * clearing function of a Data Marketplace - OLD VERSION
    */
    /*function clearing(string memory transferId) external payable { 
        
        for (uint i = 0; i < marketplaces.length; ++i){
            //clearing for every token type present in the marketplace balance apart from the token it owns
            if(marketplaces[i]!=msg.sender){
                uint amount = super.balanceOf(msg.sender,i+1);
                super.safeTransferFrom(msg.sender,marketplaces[i],i+1, amount, "0x0");

                //create transaction with isPaid param to False as Fiat money payment is not completed yet
                transactions[transferId] = TokenTransfer(transferId, msg.sender, marketplaces[i], amount, false, "");
                emit TokenTransferred(transferId, "clearing", marketplaces[i]);
            }
        }
    }*/


    /*
    * clearing function of a Data Marketplace
    */
    function clearing(ClearingOperation[] memory _clearingOperations) external payable onlyMarketplace(msg.sender){ 
        
        //clearing for each marketplace contained
        for (uint i = 0; i < _clearingOperations.length; ++i){
            uint amount = _clearingOperations[i].tokenAmount;
            address toMarketplace = _clearingOperations[i].toAddress;
            isMarketplace(toMarketplace,"ADDRESS ISN'T A MP");
            if(amount > minimumClearingThreshold) {
                super.safeTransferFrom(msg.sender,toMarketplace,marketplacesIndex[toMarketplace], amount, "0x0");

                //create transaction with isPaid param to False as Fiat money payment is not completed yet
                transactions[_clearingOperations[i].transferId] = TokenTransfer(_clearingOperations[i].transferId, msg.sender, toMarketplace, amount, false, "");
                emit TokenTransferred(_clearingOperations[i].transferId, "clearing", msg.sender, toMarketplace);
            }
        }
    }

    /*  
    * payment function between a Data Consumer and a Data Provider  
    */  
    function payment(string memory transferId, address _dataProvider, uint256 _amount) external payable {    
        _transferFrom(msg.sender, _dataProvider, _amount);   
        transactions[transferId] = TokenTransfer(transferId, msg.sender, _dataProvider, _amount, false, ""); 
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
    function feePayment(string memory _transferIdCommunity, string memory _transferIdMarketplace, address _dataProviderMarketplace, uint256 _feeAmount) external payable {  

        uint _amountCommunity = mulDiv(_feeAmount, communityFee, 100);
        uint _amountMarketplace = _feeAmount - _amountCommunity;
          
        // tranfer token to the Community wallet
        _transferFrom(msg.sender, communityWallet, _amountCommunity);
        transactions[_transferIdCommunity] = TokenTransfer(_transferIdCommunity, msg.sender, communityWallet, _amountCommunity, false, "");
        emit TokenTransferred(_transferIdCommunity, "feePayment", msg.sender, communityWallet);    

        // transfer token to the Data Provider Host Marketplace
        _transferFrom(msg.sender, _dataProviderMarketplace, _amountMarketplace);
        transactions[_transferIdMarketplace] = TokenTransfer(_transferIdMarketplace, msg.sender, _dataProviderMarketplace, _amountMarketplace, false, ""); 
        emit TokenTransferred(_transferIdMarketplace, "feePayment", msg.sender, _dataProviderMarketplace);    
    }   


    /*
    * exchange out function between a Data Provider and a Data Marketplace
    */
    function exchangeOut(string memory _transferId, address _marketplaceAddress) external payable{ 
        
        uint256[] memory _ids = new uint256[](index);
        for (uint i = 0; i < index; ++i) {
            _ids[i] = i + 1;
        }
        uint256[] memory _amounts = new uint256[](index);
        //exchange out all the token available in the balance
        _amounts = balanceOfAddress(msg.sender);

        super.safeBatchTransferFrom(msg.sender,_marketplaceAddress, _ids, _amounts, "0x0");
        transactions[_transferId] = TokenTransfer(_transferId, msg.sender, _marketplaceAddress, getSum(_amounts), false, "");
        emit TokenTransferred(_transferId, "exchange_out", msg.sender, _marketplaceAddress);
    }

    /*
    * Returns the TokenTransfer informations associated with the _transferId identifier
    */
    function getTransaction(string memory _transferId) public view returns (TokenTransfer memory tokenTransfer) { 
        return transactions[_transferId];
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
        transactions[_transferId].isPaid = true;    
        transactions[_transferId].transferCode = _transferCode; 
        emit FiatMoneyPayment(_transferId, "set_paid", msg.sender);
    }

    /*
    * in the TokenTransfer object of a transaction, set the transfer code param 
    */ 
    function setTransferCode(string memory _transferId, string memory _transferCode) external payable onlyTheTokenReceiver(_transferId){ 
        transactions[_transferId].transferCode = _transferCode;
    }

    /*
    * open conflict on a specific transaction 
    */ 
    function openConflict(string memory _transferId, address recipient) external payable onlyPartiesOfTransaction(_transferId, recipient){ 
        openConflicts[_transferId] = Conflict(_transferId, msg.sender, recipient, true);
    }

    /*
    * resolve conflict for a specific transaction 
    */ 
    function closeConflict(string memory _transferId) external payable onlyTheApplicant(_transferId){ 
        openConflicts[_transferId].open = false;
    }
    
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
    * Check if address is a regular marketplace
    */
    function isMarketplace(address marketplace, string memory message) public view {
        require(marketplacesIndex[marketplace] != 0, message);
    }

    // cost efficient proportion calculation
    function mulDiv(
        uint256 a,
        uint256 b,
        uint256 denominator
    ) internal pure returns (uint256 result) {
        // 512-bit multiply [prod1 prod0] = a * b
        // Compute the product mod 2**256 and mod 2**256 - 1
        // then use the Chinese Remainder Theorem to reconstruct
        // the 512 bit result. The result is stored in two 256
        // variables such that product = prod1 * 2**256 + prod0
        uint256 prod0; // Least significant 256 bits of the product
        uint256 prod1; // Most significant 256 bits of the product
        assembly {
            let mm := mulmod(a, b, not(0))
            prod0 := mul(a, b)
            prod1 := sub(sub(mm, prod0), lt(mm, prod0))
        }

        // Handle non-overflow cases, 256 by 256 division
        if (prod1 == 0) {
            require(denominator > 0);
            assembly {
                result := div(prod0, denominator)
            }
            return result;
        }

        // Make sure the result is less than 2**256.
        // Also prevents denominator == 0
        require(denominator > prod1);

        ///////////////////////////////////////////////
        // 512 by 256 division.
        ///////////////////////////////////////////////

        // Make division exact by subtracting the remainder from [prod1 prod0]
        // Compute remainder using mulmod
        uint256 remainder;
        assembly {
            remainder := mulmod(a, b, denominator)
        }
        // Subtract 256 bit number from 512 bit number
        assembly {
            prod1 := sub(prod1, gt(remainder, prod0))
            prod0 := sub(prod0, remainder)
        }

        // Factor powers of two out of denominator
        // Compute largest power of two divisor of denominator.
        // Always >= 1.
        uint256 twos = denominator & (~denominator + 1);
        // Divide denominator by power of two
        assembly {
            denominator := div(denominator, twos)
        }

        // Divide [prod1 prod0] by the factors of two
        assembly {
            prod0 := div(prod0, twos)
        }
        // Shift in bits from prod1 into prod0. For this we need
        // to flip `twos` such that it is 2**256 / twos.
        // If twos is zero, then it becomes one
        assembly {
            twos := add(div(sub(0, twos), twos), 1)
        }
        prod0 |= prod1 * twos;

        // Invert denominator mod 2**256
        // Now that denominator is an odd number, it has an inverse
        // modulo 2**256 such that denominator * inv = 1 mod 2**256.
        // Compute the inverse by starting with a seed that is correct
        // correct for four bits. That is, denominator * inv = 1 mod 2**4
        uint256 inv = (3 * denominator) ^ 2;
        // Now use Newton-Raphson iteration to improve the precision.
        // Thanks to Hensel's lifting lemma, this also works in modular
        // arithmetic, doubling the correct bits in each step.
        inv *= 2 - denominator * inv; // inverse mod 2**8
        inv *= 2 - denominator * inv; // inverse mod 2**16
        inv *= 2 - denominator * inv; // inverse mod 2**32
        inv *= 2 - denominator * inv; // inverse mod 2**64
        inv *= 2 - denominator * inv; // inverse mod 2**128
        inv *= 2 - denominator * inv; // inverse mod 2**256

        // Because the division is now exact we can divide by multiplying
        // with the modular inverse of denominator. This will give us the
        // correct result modulo 2**256. Since the precoditions guarantee
        // that the outcome is less than 2**256, this is the final result.
        // We don't need to compute the high bits of the result and prod1
        // is no longer required.
        result = prod0 * inv;
        return result;
    }

}
