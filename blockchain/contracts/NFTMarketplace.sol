// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./DemiurgeNFT.sol";

/**
 * @title NFTMarketplace
 * @dev Marketplace contract for trading NFTs
 */
contract NFTMarketplace is ReentrancyGuard, Ownable {
    DemiurgeNFT public nftContract;
    
    // Marketplace fee percentage (basis points, e.g., 250 = 2.5%)
    uint256 public marketplaceFee = 250;
    
    // Listing structure
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool active;
        uint256 listedAt;
    }
    
    // Mapping from token ID to listing
    mapping(uint256 => Listing) public listings;
    
    // Mapping from seller address to their listings
    mapping(address => uint256[]) public sellerListings;
    
    // Array of all active listings
    uint256[] public activeListings;
    
    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    
    constructor(address _nftContract, address initialOwner) Ownable(initialOwner) {
        nftContract = DemiurgeNFT(_nftContract);
    }
    
    /**
     * @dev List an NFT for sale
     */
    function listNFT(uint256 tokenId, uint256 price) public {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(!listings[tokenId].active, "Already listed");
        
        // Transfer NFT to marketplace contract
        nftContract.transferFrom(msg.sender, address(this), tokenId);
        
        listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            active: true,
            listedAt: block.timestamp
        });
        
        sellerListings[msg.sender].push(tokenId);
        activeListings.push(tokenId);
        
        emit NFTListed(tokenId, msg.sender, price);
    }
    
    /**
     * @dev Buy an NFT
     */
    function buyNFT(uint256 tokenId) public payable nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        
        uint256 fee = (listing.price * marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - fee;
        
        // Transfer NFT to buyer
        nftContract.transferFrom(address(this), msg.sender, tokenId);
        
        // Transfer payment to seller
        payable(listing.seller).transfer(sellerAmount);
        
        // Refund excess payment
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        
        // Update listing
        listing.active = false;
        
        // Remove from active listings
        _removeFromActiveListings(tokenId);
        
        emit NFTSold(tokenId, listing.seller, msg.sender, listing.price);
    }
    
    /**
     * @dev Cancel a listing
     */
    function cancelListing(uint256 tokenId) public {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(listing.seller == msg.sender, "Not the seller");
        
        // Transfer NFT back to seller
        nftContract.transferFrom(address(this), msg.sender, tokenId);
        
        listing.active = false;
        _removeFromActiveListings(tokenId);
        
        emit ListingCancelled(tokenId, msg.sender);
    }
    
    /**
     * @dev Get all active listings
     */
    function getActiveListings() public view returns (uint256[] memory) {
        return activeListings;
    }
    
    /**
     * @dev Get listing details
     */
    function getListing(uint256 tokenId) public view returns (Listing memory) {
        return listings[tokenId];
    }
    
    /**
     * @dev Get seller's listings
     */
    function getSellerListings(address seller) public view returns (uint256[] memory) {
        return sellerListings[seller];
    }
    
    /**
     * @dev Update marketplace fee (only owner)
     */
    function setMarketplaceFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = newFee;
    }
    
    /**
     * @dev Withdraw marketplace fees (only owner)
     */
    function withdrawFees() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Remove token ID from active listings array
     */
    function _removeFromActiveListings(uint256 tokenId) private {
        for (uint256 i = 0; i < activeListings.length; i++) {
            if (activeListings[i] == tokenId) {
                activeListings[i] = activeListings[activeListings.length - 1];
                activeListings.pop();
                break;
            }
        }
    }
}

