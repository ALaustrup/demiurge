// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DemiurgeSeasonPass
 * @dev ERC721 contract for season passes
 * Season passes grant holders bonus rewards and exclusive access
 */
contract DemiurgeSeasonPass is ERC721, Ownable {
    uint256 private _nextId;
    
    // Mapping tokenId -> seasonId
    mapping(uint256 => uint256) public seasonOf;
    
    // Mapping (seasonId => address => bool) for quick lookup
    mapping(uint256 => mapping(address => bool)) private _hasPass;

    constructor() ERC721("Demiurge Season Pass", "DMPASS") Ownable(msg.sender) {}

    /**
     * @dev Mint a season pass to a user
     * @param to Address to mint to
     * @param seasonId Season ID this pass is for
     * @return tokenId The minted token ID
     */
    function mintPass(address to, uint256 seasonId) external onlyOwner returns (uint256) {
        uint256 tokenId = ++_nextId;
        _safeMint(to, tokenId);
        seasonOf[tokenId] = seasonId;
        _hasPass[seasonId][to] = true;
        return tokenId;
    }

    /**
     * @dev Check if an address has a pass for a specific season
     * @param account Address to check
     * @param seasonId Season ID to check
     * @return bool True if account has a pass for this season
     */
    function hasPass(address account, uint256 seasonId) external view returns (bool) {
        return _hasPass[seasonId][account];
    }

    /**
     * @dev Override _update to update hasPass mapping on transfer
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        uint256 seasonId = seasonOf[tokenId];
        
        // Update hasPass mapping
        if (from != address(0)) {
            _hasPass[seasonId][from] = false;
        }
        if (to != address(0)) {
            _hasPass[seasonId][to] = true;
        }
        
        return super._update(to, tokenId, auth);
    }
}

