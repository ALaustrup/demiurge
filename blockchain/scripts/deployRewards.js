const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying reward contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const baseUri = process.env.COSMETICS_BASE_URI || "https://demiurge.io/api/cosmetics/";

  // Deploy DemiurgeCosmetics
  console.log("\nDeploying DemiurgeCosmetics...");
  const DemiurgeCosmetics = await hre.ethers.getContractFactory("DemiurgeCosmetics");
  const cosmetics = await DemiurgeCosmetics.deploy(baseUri);
  await cosmetics.waitForDeployment();
  const cosmeticsAddress = await cosmetics.getAddress();
  console.log("DemiurgeCosmetics deployed to:", cosmeticsAddress);

  // Deploy DemiurgeTitles
  console.log("\nDeploying DemiurgeTitles...");
  const DemiurgeTitles = await hre.ethers.getContractFactory("DemiurgeTitles");
  const titles = await DemiurgeTitles.deploy();
  await titles.waitForDeployment();
  const titlesAddress = await titles.getAddress();
  console.log("DemiurgeTitles deployed to:", titlesAddress);

  // Deploy DemiurgeSeasonPass
  console.log("\nDeploying DemiurgeSeasonPass...");
  const DemiurgeSeasonPass = await hre.ethers.getContractFactory("DemiurgeSeasonPass");
  const seasonPass = await DemiurgeSeasonPass.deploy();
  await seasonPass.waitForDeployment();
  const seasonPassAddress = await seasonPass.getAddress();
  console.log("DemiurgeSeasonPass deployed to:", seasonPassAddress);

  console.log("\n=== Reward Contracts Deployment Summary ===");
  console.log("DemiurgeCosmetics:", cosmeticsAddress);
  console.log("DemiurgeTitles:", titlesAddress);
  console.log("DemiurgeSeasonPass:", seasonPassAddress);
  
  // Save deployment addresses
  const fs = require("fs");
  let deploymentInfo = {};
  if (fs.existsSync("./deployments.json")) {
    deploymentInfo = JSON.parse(fs.readFileSync("./deployments.json", "utf8"));
  } else {
    deploymentInfo = {
      network: hre.network.name,
      deployer: deployer.address,
      contracts: {},
      timestamp: new Date().toISOString(),
    };
  }
  
  deploymentInfo.contracts.DemiurgeCosmetics = cosmeticsAddress;
  deploymentInfo.contracts.DemiurgeTitles = titlesAddress;
  deploymentInfo.contracts.DemiurgeSeasonPass = seasonPassAddress;
  deploymentInfo.timestamp = new Date().toISOString();
  
  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to deployments.json");
  console.log("\n⚠️  IMPORTANT: Update backend/src/config/contracts.js with these addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

