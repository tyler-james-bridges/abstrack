// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {TempoScoreRegistry} from "../src/TempoScoreRegistry.sol";

contract TempoScoreRegistryScript is Script {
    TempoScoreRegistry public registry;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        registry = new TempoScoreRegistry();

        vm.stopBroadcast();
    }
}
