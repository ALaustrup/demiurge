// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DemiurgeNFT.sol";

/**
 * @title NFTWars
 * @dev Battle system for NFT WARS
 */
contract NFTWars is Ownable {
    DemiurgeNFT public nftContract;
    
    // Battle structure
    struct Battle {
        uint256 battleId;
        uint256 attackerTokenId;
        uint256 defenderTokenId;
        address attacker;
        address defender;
        uint256 attackerPower;
        uint256 defenderPower;
        bool completed;
        address winner;
        uint256 bitsReward;
        uint256 timestamp;
    }
    
    // Mapping from battle ID to battle
    mapping(uint256 => Battle) public battles;
    
    // Mapping from user address to their battle history
    mapping(address => uint256[]) public userBattles;
    
    // Battle counter
    uint256 private _battleCounter;
    
    // Bits reward per battle
    uint256 public bitsPerBattle = 10;
    uint256 public bitsPerWin = 50;
    
    event BattleCreated(
        uint256 indexed battleId,
        uint256 indexed attackerTokenId,
        uint256 indexed defenderTokenId,
        address attacker,
        address defender
    );
    
    event BattleCompleted(
        uint256 indexed battleId,
        address indexed winner,
        uint256 bitsReward
    );
    
    constructor(address _nftContract, address initialOwner) Ownable(initialOwner) {
        nftContract = DemiurgeNFT(_nftContract);
    }
    
    /**
     * @dev Initiate a battle
     */
    function initiateBattle(uint256 attackerTokenId, uint256 defenderTokenId) public returns (uint256) {
        require(nftContract.ownerOf(attackerTokenId) == msg.sender, "Not the owner of attacker NFT");
        require(attackerTokenId != defenderTokenId, "Cannot battle own NFT");
        
        address defender = nftContract.ownerOf(defenderTokenId);
        require(defender != address(0), "Defender NFT does not exist");
        
        _battleCounter++;
        uint256 battleId = _battleCounter;
        
        DemiurgeNFT.NFTMetadata memory attackerMetadata = nftContract.getNFTMetadata(attackerTokenId);
        DemiurgeNFT.NFTMetadata memory defenderMetadata = nftContract.getNFTMetadata(defenderTokenId);
        
        Battle memory battle = Battle({
            battleId: battleId,
            attackerTokenId: attackerTokenId,
            defenderTokenId: defenderTokenId,
            attacker: msg.sender,
            defender: defender,
            attackerPower: attackerMetadata.battlePower,
            defenderPower: defenderMetadata.battlePower,
            completed: false,
            winner: address(0),
            bitsReward: 0,
            timestamp: block.timestamp
        });
        
        battles[battleId] = battle;
        userBattles[msg.sender].push(battleId);
        userBattles[defender].push(battleId);
        
        emit BattleCreated(battleId, attackerTokenId, defenderTokenId, msg.sender, defender);
        
        return battleId;
    }
    
    /**
     * @dev Complete a battle (determine winner)
     */
    function completeBattle(uint256 battleId) public {
        Battle storage battle = battles[battleId];
        require(!battle.completed, "Battle already completed");
        require(
            msg.sender == battle.attacker || msg.sender == battle.defender,
            "Not a participant"
        );
        
        // Determine winner based on battle power (with some randomness)
        uint256 randomFactor = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, battleId))) % 20;
        uint256 attackerTotalPower = battle.attackerPower + randomFactor;
        uint256 defenderTotalPower = battle.defenderPower + (20 - randomFactor);
        
        address winner;
        uint256 bitsReward;
        
        if (attackerTotalPower > defenderTotalPower) {
            winner = battle.attacker;
            bitsReward = bitsPerBattle + bitsPerWin;
        } else {
            winner = battle.defender;
            bitsReward = bitsPerBattle;
        }
        
        battle.completed = true;
        battle.winner = winner;
        battle.bitsReward = bitsReward;
        
        emit BattleCompleted(battleId, winner, bitsReward);
    }
    
    /**
     * @dev Get battle details
     */
    function getBattle(uint256 battleId) public view returns (Battle memory) {
        return battles[battleId];
    }
    
    /**
     * @dev Get user's battle history
     */
    function getUserBattles(address user) public view returns (uint256[] memory) {
        return userBattles[user];
    }
    
    /**
     * @dev Set bits rewards (only owner)
     */
    function setBitsRewards(uint256 perBattle, uint256 perWin) public onlyOwner {
        bitsPerBattle = perBattle;
        bitsPerWin = perWin;
    }
}

