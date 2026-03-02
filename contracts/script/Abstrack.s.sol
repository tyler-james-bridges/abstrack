// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Abstrack} from "../src/Abstrack.sol";

contract AbstrackScript is Script {
    Abstrack public registry;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        registry = new Abstrack();

        vm.stopBroadcast();
    }
}
