const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "PaintadomGame.sol",
  "PaintadomGame.json"
);

const outDir = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "apps",
  "web",
  "src",
  "lib",
  "contracts"
);

function main() {
  if (!fs.existsSync(artifactPath)) {
    console.warn("Artifact missing — run hardhat compile first");
    process.exit(0);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });

  const abiPath = path.join(outDir, "paintadom-game-abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));

  // Keep a minimal hand-maintained wrapper in sync note
  console.log(`Exported ABI → ${abiPath}`);
}

main();
