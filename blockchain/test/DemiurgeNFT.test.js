const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DemiurgeNFT", function () {
  let demiurgeNFT;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const DemiurgeNFT = await ethers.getContractFactory("DemiurgeNFT");
    demiurgeNFT = await DemiurgeNFT.deploy(owner.address);
    await demiurgeNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await demiurgeNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await demiurgeNFT.name()).to.equal("DemiurgeNFT");
      expect(await demiurgeNFT.symbol()).to.equal("DEMI");
    });
  });

  describe("Minting", function () {
    it("Should mint NFT successfully", async function () {
      const tokenURI = "https://ipfs.io/ipfs/test123";
      const ipfsHash = "test123";
      const name = "Test NFT";
      const description = "Test Description";
      const mediaType = "image";

      await expect(
        demiurgeNFT.mintNFT(
          addr1.address,
          tokenURI,
          ipfsHash,
          name,
          description,
          mediaType
        )
      )
        .to.emit(demiurgeNFT, "NFTMinted")
        .withArgs(1, owner.address, ipfsHash, tokenURI);

      expect(await demiurgeNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await demiurgeNFT.tokenURI(1)).to.equal(tokenURI);
    });

    it("Should track token creator", async function () {
      const tokenURI = "https://ipfs.io/ipfs/test123";
      await demiurgeNFT.mintNFT(
        addr1.address,
        tokenURI,
        "test123",
        "Test NFT",
        "Test Description",
        "image"
      );

      expect(await demiurgeNFT.tokenCreators(1)).to.equal(owner.address);
    });

    it("Should update user tokens list", async function () {
      const tokenURI = "https://ipfs.io/ipfs/test123";
      await demiurgeNFT.mintNFT(
        addr1.address,
        tokenURI,
        "test123",
        "Test NFT",
        "Test Description",
        "image"
      );

      const tokens = await demiurgeNFT.getTokensByOwner(addr1.address);
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(1);
    });
  });

  describe("Metadata", function () {
    it("Should store NFT metadata correctly", async function () {
      const tokenURI = "https://ipfs.io/ipfs/test123";
      await demiurgeNFT.mintNFT(
        addr1.address,
        tokenURI,
        "test123",
        "Test NFT",
        "Test Description",
        "image"
      );

      const metadata = await demiurgeNFT.getNFTMetadata(1);
      expect(metadata.name).to.equal("Test NFT");
      expect(metadata.description).to.equal("Test Description");
      expect(metadata.mediaType).to.equal("image");
      expect(metadata.battlePower).to.equal(100);
      expect(metadata.level).to.equal(1);
    });
  });

  describe("Level Up", function () {
    it("Should allow owner to level up NFT", async function () {
      const tokenURI = "https://ipfs.io/ipfs/test123";
      await demiurgeNFT.mintNFT(
        addr1.address,
        tokenURI,
        "test123",
        "Test NFT",
        "Test Description",
        "image"
      );

      await demiurgeNFT.connect(addr1).levelUp(1);

      const metadata = await demiurgeNFT.getNFTMetadata(1);
      expect(metadata.level).to.equal(2);
      expect(metadata.battlePower).to.equal(110);
    });

    it("Should prevent non-owner from leveling up", async function () {
      const tokenURI = "https://ipfs.io/ipfs/test123";
      await demiurgeNFT.mintNFT(
        addr1.address,
        tokenURI,
        "test123",
        "Test NFT",
        "Test Description",
        "image"
      );

      await expect(
        demiurgeNFT.connect(addr2).levelUp(1)
      ).to.be.revertedWith("Not the owner");
    });
  });
});

