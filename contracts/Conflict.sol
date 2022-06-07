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


contract I3MarketConflicts {

    modifier onlyTheApplicant(string memory _transferId) {
        require(openConflicts[_transferId].applicant == msg.sender, "ONLY APPLICANT CAN CLOSE THE CONFLICT");
        _;
    }

    mapping(string => Conflict) public openConflicts;

    struct Conflict {  
        string transferId;
        address applicant;
        address recipient;
        bool open;
    }

    /*
    * open conflict on a specific transaction 
    */ 
    function openConflict( string memory _transferId, address recipient) public returns (bool) /*onlyPartiesOfTransaction(_transferId, recipient)*/{ 
        openConflicts[_transferId] = Conflict(_transferId, msg.sender, recipient, true);
        return true;
    }

    /*
    * resolve conflict for a specific transaction 
    */ 
    function closeConflict(string memory _transferId) external payable onlyTheApplicant(_transferId){ 
        openConflicts[_transferId].open = false;
    }
}