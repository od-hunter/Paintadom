// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PaintadomGame
 * @notice Upgradeable (UUPS) game economy on Celo: USDC spark packs + signed reward claims.
 * @dev Proxy address stays fixed across upgrades. Deploy via OpenZeppelin upgrades plugin.
 */
contract PaintadomGame is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    EIP712Upgradeable
{
    using SafeERC20 for IERC20;

    /// @dev ERC-7201 style reentrancy status (1 = entered, 0 = not)
    uint256 private _reentrancyStatus;

    modifier nonReentrant() {
        require(_reentrancyStatus == 0, "reentrant");
        _reentrancyStatus = 1;
        _;
        _reentrancyStatus = 0;
    }

    /// @notice EIP-712 typehash for off-chain reward claims
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256(
            "Claim(address player,uint8 rewardType,uint256 amount,uint256 nonce,uint256 deadline)"
        );

    uint8 public constant REWARD_SPARKS = 0;

    struct Pack {
        uint256 sparks;
        uint256 usdcPrice; // 6 decimals (USDC)
        bool active;
    }

    IERC20 public usdc;
    address public treasury;
    address public rewardSigner;

    mapping(uint8 => Pack) public packs;
    mapping(address => uint256) public sparkBalance;
    mapping(address => uint256) public claimNonce;

    /// Optional light progress commit (phase 5)
    mapping(address => uint256) public committedLevel;
    mapping(address => bytes32) public progressHash;

    event PackUpdated(uint8 indexed packId, uint256 sparks, uint256 usdcPrice, bool active);
    event SparksPurchased(
        address indexed buyer,
        uint8 indexed packId,
        uint256 sparks,
        uint256 usdcPaid,
        uint256 newBalance
    );
    event RewardClaimed(
        address indexed player,
        uint8 indexed rewardType,
        uint256 amount,
        uint256 nonce,
        uint256 newBalance
    );
    event SparksSpent(address indexed player, uint256 amount, uint256 newBalance);
    event ProgressCommitted(address indexed player, uint256 level, bytes32 dataHash);
    event TreasuryUpdated(address indexed treasury);
    event RewardSignerUpdated(address indexed signer);
    event UsdcUpdated(address indexed usdc);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address usdc_,
        address treasury_,
        address rewardSigner_,
        address owner_
    ) external initializer {
        require(usdc_ != address(0), "usdc");
        require(treasury_ != address(0), "treasury");
        require(rewardSigner_ != address(0), "signer");
        require(owner_ != address(0), "owner");

        __Ownable_init(owner_);
        __EIP712_init("PaintadomGame", "1");

        usdc = IERC20(usdc_);
        treasury = treasury_;
        rewardSigner = rewardSigner_;

        // Match apps/web Spark Shop packs
        _setPack(0, 100, 250_000, true); // $0.25
        _setPack(1, 500, 1_000_000, true); // $1.00
        _setPack(2, 1500, 2_500_000, true); // $2.50
    }

    function buySparksWithUSDC(uint8 packId) external nonReentrant {
        Pack memory pack = packs[packId];
        require(pack.active && pack.sparks > 0, "pack");

        usdc.safeTransferFrom(msg.sender, treasury, pack.usdcPrice);

        uint256 newBal = sparkBalance[msg.sender] + pack.sparks;
        sparkBalance[msg.sender] = newBal;

        emit SparksPurchased(msg.sender, packId, pack.sparks, pack.usdcPrice, newBal);
    }

    /**
     * @notice Claim sparks (or future reward types) with a backend EIP-712 signature.
     */
    function claimReward(
        uint8 rewardType,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        require(block.timestamp <= deadline, "expired");
        require(amount > 0, "amount");
        require(rewardType == REWARD_SPARKS, "type");

        uint256 nonce = claimNonce[msg.sender];
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, msg.sender, rewardType, amount, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == rewardSigner, "sig");

        claimNonce[msg.sender] = nonce + 1;

        uint256 newBal = sparkBalance[msg.sender] + amount;
        sparkBalance[msg.sender] = newBal;

        emit RewardClaimed(msg.sender, rewardType, amount, nonce, newBal);
    }

    function spendSparks(uint256 amount) external nonReentrant {
        require(amount > 0, "amount");
        uint256 bal = sparkBalance[msg.sender];
        require(bal >= amount, "balance");
        uint256 newBal = bal - amount;
        sparkBalance[msg.sender] = newBal;
        emit SparksSpent(msg.sender, amount, newBal);
    }

    function commitProgress(uint256 level, bytes32 dataHash) external {
        committedLevel[msg.sender] = level;
        progressHash[msg.sender] = dataHash;
        emit ProgressCommitted(msg.sender, level, dataHash);
    }

    function setPack(
        uint8 packId,
        uint256 sparks,
        uint256 usdcPrice,
        bool active
    ) external onlyOwner {
        _setPack(packId, sparks, usdcPrice, active);
    }

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "treasury");
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setRewardSigner(address signer_) external onlyOwner {
        require(signer_ != address(0), "signer");
        rewardSigner = signer_;
        emit RewardSignerUpdated(signer_);
    }

    function setUsdc(address usdc_) external onlyOwner {
        require(usdc_ != address(0), "usdc");
        usdc = IERC20(usdc_);
        emit UsdcUpdated(usdc_);
    }

    function withdrawStuckERC20(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    function domainSeparatorV4() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _setPack(
        uint8 packId,
        uint256 sparks,
        uint256 usdcPrice,
        bool active
    ) internal {
        packs[packId] = Pack({sparks: sparks, usdcPrice: usdcPrice, active: active});
        emit PackUpdated(packId, sparks, usdcPrice, active);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
