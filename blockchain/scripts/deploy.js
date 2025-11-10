const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy DemiurgeNFT
  console.log("\nDeploying DemiurgeNFT...");
  const DemiurgeNFT = await hre.ethers.getContractFactory("DemiurgeNFT");
  const nft = await DemiurgeNFT.deploy(deployer.address);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("DemiurgeNFT deployed to:", nftAddress);

  // Deploy NFTMarketplace
  console.log("\nDeploying NFTMarketplace...");
  const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy(nftAddress, deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("NFTMarketplace deployed to:", marketplaceAddress);

  // Deploy NFTWars
  console.log("\nDeploying NFTWars...");
  const NFTWars = await hre.ethers.getContractFactory("NFTWars");
  const wars = await NFTWars.deploy(nftAddress, deployer.address);
  await wars.waitForDeployment();
  const warsAddress = await wars.getAddress();
  console.log("NFTWars deployed to:", warsAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("DemiurgeNFT:", nftAddress);
  console.log("NFTMarketplace:", marketplaceAddress);
  console.log("NFTWars:", warsAddress);
  
  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      DemiurgeNFT: nftAddress,
      NFTMarketplace: marketplaceAddress,
      NFTWars: warsAddress,
    },
    timestamp: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

