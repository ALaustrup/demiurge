// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DemiurgeNFT
 * @dev Main NFT contract for minting and managing NFTs
 */
contract DemiurgeNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    
    // Mapping from token ID to creator address
    mapping(uint256 => address) public tokenCreators;
    
    // Mapping from token ID to IPFS hash
    mapping(uint256 => string) public tokenIPFSHashes;
    
    // Mapping from token ID to metadata
    mapping(uint256 => NFTMetadata) public tokenMetadata;
    
    // Mapping from user address to their token IDs
    mapping(address => uint256[]) public userTokens;
    
    // Mapping from token ID to soulbound status
    mapping(uint256 => bool) private _soulbound;
    
    // NFT Metadata structure
    struct NFTMetadata {
        string name;
        string description;
        string mediaType; // image, video, audio, etc.
        uint256 createdAt;
        uint256 battlePower; // For NFT WARS
        uint256 level;
    }
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string ipfsHash,
        string tokenURI
    );
    
    constructor(address initialOwner) ERC721("DemiurgeNFT", "DEMI") Ownable(initialOwner) {}
    
    /**
     * @dev Mint a new NFT
     * @param to Address to mint the NFT to
     * @param tokenURI IPFS URI of the token metadata
     * @param ipfsHash IPFS hash for verification
     * @param name NFT name
     * @param description NFT description
     * @param mediaType Type of media (image, video, audio)
     */
    function mintNFT(
        address to,
        string memory tokenURI,
        string memory ipfsHash,
        string memory name,
        string memory description,
        string memory mediaType
    ) public returns (uint256) {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        tokenCreators[newTokenId] = msg.sender;
        tokenIPFSHashes[newTokenId] = ipfsHash;
        tokenMetadata[newTokenId] = NFTMetadata({
            name: name,
            description: description,
            mediaType: mediaType,
            createdAt: block.timestamp,
            battlePower: 100, // Default battle power
            level: 1 // Default level
        });
        
        userTokens[to].push(newTokenId);
        
        emit NFTMinted(newTokenId, msg.sender, ipfsHash, tokenURI);
        
        return newTokenId;
    }
    
    /**
     * @dev Get all token IDs owned by an address
     */
    function getTokensByOwner(address owner) public view returns (uint256[] memory) {
        return userTokens[owner];
    }
    
    /**
     * @dev Get NFT metadata
     */
    function getNFTMetadata(uint256 tokenId) public view returns (NFTMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenMetadata[tokenId];
    }
    
    /**
     * @dev Update NFT battle power (only owner)
     */
    function updateBattlePower(uint256 tokenId, uint256 newPower) public {
        require(_ownerOf(tokenId) == msg.sender, "Not the owner");
        tokenMetadata[tokenId].battlePower = newPower;
    }
    
    /**
     * @dev Update NFT level (only owner)
     */
    function levelUp(uint256 tokenId) public {
        require(_ownerOf(tokenId) == msg.sender, "Not the owner");
        tokenMetadata[tokenId].level += 1;
        tokenMetadata[tokenId].battlePower += 10; // Increase power on level up
    }
    
    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIds;
    }

    /**
     * @dev Set soulbound status for a token (only owner)
     */
    function setSoulbound(uint256 tokenId, bool value) external onlyOwner {
        _soulbound[tokenId] = value;
    }

    /**
     * @dev Check if a token is soulbound
     */
    function isSoulbound(uint256 tokenId) public view returns (bool) {
        return _soulbound[tokenId];
    }

    /**
     * @dev Override _update to prevent transfers of soulbound tokens
     * In OpenZeppelin v5, _update replaces _beforeTokenTransfer
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Prevent transfers of soulbound tokens (allow minting and burning)
        if (from != address(0) && to != address(0) && _soulbound[tokenId]) {
            revert("Soulbound: token is non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
}

