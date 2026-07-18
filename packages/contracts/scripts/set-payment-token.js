const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config({ path: [".env.local", ".env"] });

/** Native Tether USDT on Celo */
const USDT = {
  celo: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  celoSepolia: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
};

async function main() {
  const net = hre.network.name;
  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "..", "deployments", `${net}.json`);
  const deployment = fs.existsSync(deploymentPath)
    ? JSON.parse(fs.readFileSync(deploymentPath, "utf8"))
    : {};
  const proxy = process.env.PROXY_ADDRESS || deployment.proxy;
  const token = process.env.USDT_ADDRESS || USDT[net];
  if (!proxy) throw new Error(`No proxy for ${net}`);
  if (!token) throw new Error(`No USDT for ${net}`);

  const [signer] = await ethers.getSigners();
  console.log(`Setting payment token on ${proxy} → ${token} (${net})`);
  console.log(`  from: ${signer.address}`);

  const game = await ethers.getContractAt("PaintadomGame", proxy);
  const tx = await game.setUsdc(token);
  console.log(`  tx: ${tx.hash}`);
  await tx.wait();
  const current = await game.usdc();
  console.log(`  payment token now: ${current}`);

  deployment.usdt = token;
  deployment.usdc = token;
  deployment.paymentToken = "USDT";
  deployment.paymentTokenUpdatedAt = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
