// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DemiurgeCosmetics
 * @dev ERC1155 contract for cosmetic items (frames, auras, effects, etc.)
 * Only owner can mint rewards to users
 */
contract DemiurgeCosmetics is ERC1155, Ownable {
    constructor(string memory baseUri) ERC1155(baseUri) Ownable(msg.sender) {}

    /**
     * @dev Mint a single cosmetic reward to a user
     * @param to Address to mint to
     * @param id Cosmetic item ID
     * @param amount Amount to mint
     */
    function mintReward(address to, uint256 id, uint256 amount) external onlyOwner {
        _mint(to, id, amount, "");
    }

    /**
     * @dev Mint multiple cosmetic rewards in a batch
     * @param to Address to mint to
     * @param ids Array of cosmetic item IDs
     * @param amounts Array of amounts (must match ids length)
     */
    function mintBatchReward(address to, uint256[] calldata ids, uint256[] calldata amounts) external onlyOwner {
        require(ids.length == amounts.length, "DemiurgeCosmetics: ids and amounts length mismatch");
        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @dev Update the base URI for metadata
     * @param newuri New base URI
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}

