const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/** Native Tether USDT on Celo — 6 decimals */
const USDT = {
  celo: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  celoSepolia: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
  hardhat: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = network.name;
  const usdt = process.env.USDT_ADDRESS || USDT[net];
  if (!usdt) throw new Error(`No USDT address for network ${net}`);

  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const rewardSigner = process.env.REWARD_SIGNER_ADDRESS || deployer.address;
  const owner = process.env.OWNER_ADDRESS || deployer.address;

  console.log(`Deploying PaintadomGame (UUPS) on ${net}`);
  console.log(`  deployer: ${deployer.address}`);
  console.log(`  usdt:     ${usdt}`);
  console.log(`  treasury: ${treasury}`);
  console.log(`  signer:   ${rewardSigner}`);
  console.log(`  owner:    ${owner}`);

  const Factory = await ethers.getContractFactory("PaintadomGame");
  const proxy = await upgrades.deployProxy(
    Factory,
    [usdt, treasury, rewardSigner, owner],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  let implAddress = "(unknown)";
  try {
    implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  } catch (e) {
    console.warn(
      "  warn: could not read implementation via upgrades helper; proxy may still be valid"
    );
    console.warn(" ", e instanceof Error ? e.message : e);
  }

  console.log(`  proxy:    ${proxyAddress}`);
  console.log(`  impl:     ${implAddress}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const record = {
    network: net,
    chainId: network.config.chainId,
    proxy: proxyAddress,
    implementation: implAddress,
    usdc: usdt,
    usdt,
    paymentToken: "USDT",
    treasury,
    rewardSigner,
    owner,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(outDir, `${net}.json`),
    JSON.stringify(record, null, 2)
  );
  console.log(`Wrote deployments/${net}.json`);
  console.log(`\nSet NEXT_PUBLIC_PAINTADOM_GAME_ADDRESS=${proxyAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
