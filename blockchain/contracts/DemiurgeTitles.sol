// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DemiurgeTitles
 * @dev ERC721 contract for title badges (soulbound, non-transferable)
 * Titles represent achievements and rankings in Demiurge seasons
 */
contract DemiurgeTitles is ERC721, Ownable {
    uint256 private _nextId;
    
    // Mapping to track soulbound status
    mapping(uint256 => bool) private _soulbound;
    
    // Optional: Store metadata per token
    mapping(uint256 => string) private _titleNames;
    mapping(uint256 => uint256) private _seasonIds;

    constructor() ERC721("Demiurge Title", "DMTITLE") Ownable(msg.sender) {}

    /**
     * @dev Mint a title badge to a user (soulbound)
     * @param to Address to mint to
     * @return tokenId The minted token ID
     */
    function mintTitle(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = ++_nextId;
        _safeMint(to, tokenId);
        _soulbound[tokenId] = true;
        return tokenId;
    }

    /**
     * @dev Mint a title with metadata
     * @param to Address to mint to
     * @param seasonId Season ID this title is for
     * @param titleName Name of the title
     * @return tokenId The minted token ID
     */
    function mintTitleWithMetadata(address to, uint256 seasonId, string memory titleName) external onlyOwner returns (uint256) {
        uint256 tokenId = ++_nextId;
        _safeMint(to, tokenId);
        _soulbound[tokenId] = true;
        _seasonIds[tokenId] = seasonId;
        _titleNames[tokenId] = titleName;
        return tokenId;
    }

    /**
     * @dev Get title name for a token
     */
    function getTitleName(uint256 tokenId) external view returns (string memory) {
        return _titleNames[tokenId];
    }

    /**
     * @dev Get season ID for a token
     */
    function getSeasonId(uint256 tokenId) external view returns (uint256) {
        return _seasonIds[tokenId];
    }

    /**
     * @dev Override _update to prevent transfers of soulbound tokens
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && _soulbound[tokenId]) {
            revert("DemiurgeTitles: Soulbound token is non-transferable");
        }
        return super._update(to, tokenId, auth);
    }
}

