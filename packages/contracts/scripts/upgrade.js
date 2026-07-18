const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Missing ${deploymentPath}. Deploy first or set PROXY_ADDRESS env.`
    );
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const proxyAddress = process.env.PROXY_ADDRESS || deployment.proxy;
  const contractName = process.env.UPGRADE_TO || "PaintadomGameV2";

  console.log(`Upgrading ${proxyAddress} → ${contractName} on ${network.name}`);

  const Factory = await ethers.getContractFactory(contractName);
  const upgraded = await upgrades.upgradeProxy(proxyAddress, Factory, {
    kind: "uups",
    unsafeAllow: ["missing-initializer", "missing-initializer-call"],
  });
  await upgraded.waitForDeployment();

  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`  new impl: ${implAddress}`);

  deployment.implementation = implAddress;
  deployment.upgradedTo = contractName;
  deployment.upgradedAt = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`Updated deployments/${network.name}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
