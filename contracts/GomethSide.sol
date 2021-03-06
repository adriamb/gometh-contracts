/* Copyright (c) 2018 adria@codecontext.io / MIT LICENSE */

pragma solidity ^0.4.18;

import "./OfflineMultisig.sol";
import "./WETH.sol";

contract GomethSide is OfflineMultisig {

    event LogBurn(uint256 epoch, address from, uint value);
    event LogBurnMultisigned(bytes32 txid, address from, uint value);
    event LogMintMultisigned(bytes32 txid, address to, uint value);
    event LogStateChangeMultisigned(bytes32 txid, uint256 blockNo, bytes32 rootState);

    WETH public weth;

    function GomethSide(address[] _signers) public 
    OfflineMultisig(_signers) {
    }

    function init(address _weth) public {
      weth = WETH(_weth);
    }

    function burn(uint _amount) public {
       weth.burn(msg.sender,_amount);
       LogBurn(epochs.length-1,msg.sender,_amount);
    }

    function toLocalEther(uint _amount) public {
      address[] storage signers = epochs[epochs.length-1];
      uint share = _amount / signers.length;

      // split the amount between the current PoAs
      for (uint i = 0;i<signers.length;i++) {
        weth.transfer(msg.sender,signers[i],share);
      }

      // send the ethers to the current signers
      msg.sender.transfer(share*signers.length);
    }

    /* ---- multisig functions --------------------------------------- */

    function _mintmultisigned(address _to, uint _amount) public {

       require(msg.sender == address(this));

       weth.mint(_to,_amount);

       // send a litte of ether to call toLocalEther
       // if (_to.balance < 0.01 ether ) {
       //  _to.transfer(0.01 ether - _to.balance);
       // }

       LogMintMultisigned(txidcontext,_to,_amount);
    }

    // this function is called via partialExecuteOff, this means that all
    //     offline transactions will be available, this means that this calls
    //     can be called also into the parent chain

    function _statechangemultisigned(uint256 blockNo, bytes32 rootState) public {
       require(msg.sender == address(this));      
       LogStateChangeMultisigned(txidcontext, blockNo, rootState);
    }

    function _burnmultisigned(address from, uint value) public {
       require(msg.sender == address(this));      
       LogBurnMultisigned(txidcontext, from, value);
    }

}