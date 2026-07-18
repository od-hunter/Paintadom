const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PaintadomGame UUPS", function () {
  async function deployFixture() {
    const [owner, treasury, signer, buyer, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const Factory = await ethers.getContractFactory("PaintadomGame");
    const game = await upgrades.deployProxy(
      Factory,
      [await usdc.getAddress(), treasury.address, signer.address, owner.address],
      { kind: "uups", initializer: "initialize" }
    );
    await game.waitForDeployment();

    await usdc.mint(buyer.address, ethers.parseUnits("100", 6));

    return { game, usdc, owner, treasury, signer, buyer, other };
  }

  it("buys sparks with USDC and credits balance", async function () {
    const { game, usdc, buyer, treasury } = await deployFixture();
    const price = 250_000n; // pack 0
    await usdc.connect(buyer).approve(await game.getAddress(), price);

    await expect(game.connect(buyer).buySparksWithUSDC(0))
      .to.emit(game, "SparksPurchased")
      .withArgs(buyer.address, 0, 100n, price, 100n);

    expect(await game.sparkBalance(buyer.address)).to.equal(100n);
    expect(await usdc.balanceOf(treasury.address)).to.equal(price);
  });

  it("claims sparks with EIP-712 signature", async function () {
    const { game, buyer, signer } = await deployFixture();
    const amount = 50n;
    const nonce = await game.claimNonce(buyer.address);
    const deadline = BigInt((await time.latest()) + 3600);

    const domain = {
      name: "PaintadomGame",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await game.getAddress(),
    };
    const types = {
      Claim: [
        { name: "player", type: "address" },
        { name: "rewardType", type: "uint8" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = {
      player: buyer.address,
      rewardType: 0,
      amount,
      nonce,
      deadline,
    };

    const signature = await signer.signTypedData(domain, types, value);
    await expect(game.connect(buyer).claimReward(0, amount, deadline, signature))
      .to.emit(game, "RewardClaimed");

    expect(await game.sparkBalance(buyer.address)).to.equal(50n);
    expect(await game.claimNonce(buyer.address)).to.equal(1n);
  });

  it("upgrades to V2 preserving storage", async function () {
    const { game, buyer, usdc } = await deployFixture();
    await usdc.connect(buyer).approve(await game.getAddress(), 250_000n);
    await game.connect(buyer).buySparksWithUSDC(0);

    const V2 = await ethers.getContractFactory("PaintadomGameV2");
    const upgraded = await upgrades.upgradeProxy(await game.getAddress(), V2, {
      kind: "uups",
      unsafeAllow: ["missing-initializer", "missing-initializer-call"],
    });
    expect(await upgraded.version()).to.equal("2.0.0");
    expect(await upgraded.sparkBalance(buyer.address)).to.equal(100n);
  });

  it("commits progress", async function () {
    const { game, buyer } = await deployFixture();
    const hash = ethers.id("level-3-progress");
    await expect(game.connect(buyer).commitProgress(3, hash))
      .to.emit(game, "ProgressCommitted")
      .withArgs(buyer.address, 3, hash);
    expect(await game.committedLevel(buyer.address)).to.equal(3n);
  });
});
