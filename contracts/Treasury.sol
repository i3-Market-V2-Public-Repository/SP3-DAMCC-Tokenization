pragma solidity >=0.7.0 <0.9.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract I3MarketTreasury is ERC1155 {
    
    event TokenTransferred(string transferId, string operation, address _sender);
    event LogD(uint256 log);
    
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

    mapping(string => Conflict) public openConflicts;
    mapping(string => TokenTransfer) public transactions;
    mapping(address => uint) public marketplacesIndex;
    address[] public marketplaces;
    uint public index = 0;


    modifier onlyMarketplace(address _marketplaceAddress) {
        require(msg.sender == _marketplaceAddress, "ONLY THE MARKETPLACE CAN ADD ITSELF TO THE LIST OF THE AVAILABLE MARKETPLACES");
        _;
    }

    modifier validDestination(address _to) {
        require(msg.sender != _to, "MARKETPLACE CANNOT MINT TO ITSELF");
        _;
    }

    modifier onlyTheTokenReceiver(string memory _transferId) {
        require(transactions[_transferId].toAddress == msg.sender, "ONLY THE TOKEN RECEIVER CAN SET THE ISPAID TO TRUE");
        _;
    }
    
    modifier onlyTheApplicant(string memory _transferId) {
        require(openConflicts[_transferId].applicant == msg.sender, "ONLY THE ORIGINAL APPLICANT CAN CLOSE THE CONFICT");
        _;
    }

    modifier onlyNewMarketplaceAddress(address _marketplaceAddress) {
        require(marketplacesIndex[_marketplaceAddress] == 0, "MARKETPLACE WAS ALREADY ADDED");
        _;
    }
    
    modifier onlyPartiesOfTransaction(string memory _transferId, address recipient) {
        require(msg.sender == transactions[_transferId].toAddress || msg.sender == transactions[_transferId].fromAddress, "THE CONFLICT APPLICANT MUST BE ONE OF THE TRANSACTION PARTIES");
        require(recipient == transactions[_transferId].toAddress || recipient == transactions[_transferId].fromAddress, "THE CONFLICT RECIPIENT MUST BE ONE OF THE TRANSACTION PARTIES");
        _;
    }

    constructor() ERC1155("https://i3market.com/marketplace/{id}.json") {
    }

    /*
    * add a new Data Marketplace in the platform
    */
    function addMarketplace(address _marketplaceAddress) external onlyMarketplace(_marketplaceAddress) onlyNewMarketplaceAddress(_marketplaceAddress) {
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
        
        require(marketplacesIndex[msg.sender] != 0, "THIS ADDRESS IS NOT A REGULAR MARKETPLACE AND DOESN'T HAVE A TOKEN TYPE");
        //mint token from Data Marketplace to Data Consumer
        _mint(_userAddress, marketplacesIndex[msg.sender], _tokensAmount, "");
        //create transaction with isPaid param to True as Fiat money payment is already done
        transactions[transferId] = TokenTransfer(transferId, msg.sender, _userAddress, _tokensAmount, true, "");
        emit TokenTransferred(transferId, "exchange_in", _userAddress);
    }

    /*
    * clearing function of a Data Marketplace
    */
    function clearing(string memory transferId) external payable { 
        
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
    }

    /*
    * payment function between a Data Consumer and a Data Provider
    */
    function payment(string memory transferId, address _dataProvider, uint256 amount) external payable { 
        
        uint256[] memory _ids = new uint256[](index);
        uint256[] memory _amounts = new uint256[](index);

        //obtains the tokens needed to pay the amount
        (_ids,_amounts) = configurePayment(amount);
        super.safeBatchTransferFrom(msg.sender,_dataProvider,_ids,_amounts,"0x0");
        transactions[transferId] = TokenTransfer(transferId, msg.sender, _dataProvider, getSum(_amounts), false, "");
        emit TokenTransferred(transferId, "payment", _dataProvider);
    }

    /*
    * exchange out function between a Data Provider and a Data Marketplace
    */
    function exchangeOut(string memory transferId, address _marketplaceAddress) external payable{ 
        
        uint256[] memory _ids = new uint256[](index);
        for (uint i = 0; i < index; ++i) {
            _ids[i] = i + 1;
        }
        uint256[] memory _amounts = new uint256[](index);
        //exchange out all the token available in the balance
        _amounts = balanceOfAddress(msg.sender);

        super.safeBatchTransferFrom(msg.sender,_marketplaceAddress, _ids, _amounts, "0x0");
        transactions[transferId] = TokenTransfer(transferId, msg.sender, _marketplaceAddress, getSum(_amounts), false, "");
        emit TokenTransferred(transferId, "exchange_out", _marketplaceAddress);
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
    function configurePayment(uint256 amount) private view returns (uint256[] memory ids, uint256[] memory amounts){

        uint256[] memory ids_ = new uint256[](index);
        uint256[] memory amounts_ = new uint256[](index);

        for (uint256 i = 0; i < index; ++i) {
            uint256 balance = super.balanceOf(msg.sender, i + 1);
            if (balance != 0) {
                if (amount > balance) {
                    ids_[i] = i + 1;
                    amounts_[i] = balance;
                    amount = amount - balance;
                } else if (amount <= balance) {
                    ids_[i] = i + 1;
                    amounts_[i] = amount;
                    amount = 0;
                    break;
                }
            }
        }
        require(amount == 0, "THE DATA CONSUMER DOESN'T HAVE ENOUGH TOKENS");
        return (ids_, amounts_);
    }

    /*
    * Returns the sum of the elements in an array
    */
    function getSum(uint256[] memory _amounts) private pure returns (uint256){
        uint i;
        uint256 sum = 0;

        for (i = 0; i < _amounts.length; i++) {
            sum = sum + _amounts[i];
        }
        return sum;
    }

    /*
    * in the TokenTransfer object of a transaction, set the isPaid param to true if the payment was also made with fiat money
    */ 
    function setPaid(string memory _transferId) external payable onlyTheTokenReceiver(_transferId){ 
        transactions[_transferId].isPaid = true;
    }

    /*
    * in the TokenTransfer object of a transaction, set the transfer code param 
    */ 
    function setTransferCode(string memory _transferId, string memory transferCode) external payable onlyTheTokenReceiver(_transferId){ 
        transactions[_transferId].transferCode = transferCode;
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

}