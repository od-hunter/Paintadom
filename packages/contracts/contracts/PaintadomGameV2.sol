// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {PaintadomGame} from "./PaintadomGame.sol";

/**
 * @title PaintadomGameV2
 * @notice Example upgrade target — same storage layout + a version() marker.
 * @dev Upgrade with:
 *   upgrades.upgradeProxy(proxy, PaintadomGameV2, {
 *     kind: "uups",
 *     unsafeAllow: ["missing-initializer", "missing-initializer-call"],
 *   })
 * Parent initializers already ran in V1; do not re-init Ownable/EIP712.
 */
contract PaintadomGameV2 is PaintadomGame {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
