// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Abstrack} from "../src/Abstrack.sol";

contract AbstrackTest is Test {
    Abstrack public registry;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public carol = address(0xCA801);

    function setUp() public {
        registry = new Abstrack();
    }

    // -------------------------------------------------------------------------
    // submitScore basics
    // -------------------------------------------------------------------------

    function test_SubmitScore() public {
        vm.prank(alice);
        registry.submitScore(100, 500_000);

        Abstrack.ScoreEntry[] memory scores = registry.getPlayerScores(alice);
        assertEq(scores.length, 1);
        assertEq(scores[0].player, alice);
        assertEq(scores[0].blockNumber, 100);
        assertEq(scores[0].score, 500_000);
    }

    function test_SubmitScore_EmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit Abstrack.ScoreSubmitted(alice, 100, 750_000);
        registry.submitScore(100, 750_000);
    }

    // -------------------------------------------------------------------------
    // Score range validation
    // -------------------------------------------------------------------------

    function test_SubmitScore_MaxScoreAllowed() public {
        vm.prank(alice);
        registry.submitScore(1, 1_000_000);

        Abstrack.ScoreEntry[] memory scores = registry.getPlayerScores(alice);
        assertEq(scores[0].score, 1_000_000);
    }

    function test_SubmitScore_ZeroScoreAllowed() public {
        vm.prank(alice);
        registry.submitScore(1, 0);

        Abstrack.ScoreEntry[] memory scores = registry.getPlayerScores(alice);
        assertEq(scores[0].score, 0);
    }

    function test_RevertWhen_ScoreExceedsMax() public {
        vm.prank(alice);
        vm.expectRevert("Score exceeds maximum");
        registry.submitScore(1, 1_000_001);
    }

    // -------------------------------------------------------------------------
    // One score per player per block (overwrite only if higher)
    // -------------------------------------------------------------------------

    function test_OverwriteScore_OnlyIfHigher() public {
        vm.startPrank(alice);

        registry.submitScore(100, 300_000);
        registry.submitScore(100, 600_000); // higher -- should succeed

        Abstrack.ScoreEntry[] memory scores = registry.getPlayerScores(alice);
        assertEq(scores.length, 1);
        assertEq(scores[0].score, 600_000);

        vm.stopPrank();
    }

    function test_RevertWhen_OverwriteWithLowerScore() public {
        vm.startPrank(alice);

        registry.submitScore(100, 600_000);

        vm.expectRevert("New score must be higher than existing score");
        registry.submitScore(100, 300_000);

        vm.stopPrank();
    }

    function test_RevertWhen_OverwriteWithEqualScore() public {
        vm.startPrank(alice);

        registry.submitScore(100, 500_000);

        vm.expectRevert("New score must be higher than existing score");
        registry.submitScore(100, 500_000);

        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // getBlockScores
    // -------------------------------------------------------------------------

    function test_GetBlockScores() public {
        vm.prank(alice);
        registry.submitScore(42, 100_000);

        vm.prank(bob);
        registry.submitScore(42, 200_000);

        vm.prank(carol);
        registry.submitScore(42, 300_000);

        Abstrack.ScoreEntry[] memory scores = registry.getBlockScores(42);
        assertEq(scores.length, 3);
        assertEq(scores[0].player, alice);
        assertEq(scores[0].score, 100_000);
        assertEq(scores[1].player, bob);
        assertEq(scores[1].score, 200_000);
        assertEq(scores[2].player, carol);
        assertEq(scores[2].score, 300_000);
    }

    function test_GetBlockScores_Empty() public view {
        Abstrack.ScoreEntry[] memory scores = registry.getBlockScores(999);
        assertEq(scores.length, 0);
    }

    function test_GetBlockScores_UpdatedAfterOverwrite() public {
        vm.startPrank(alice);
        registry.submitScore(42, 100_000);
        registry.submitScore(42, 900_000);
        vm.stopPrank();

        Abstrack.ScoreEntry[] memory scores = registry.getBlockScores(42);
        assertEq(scores.length, 1);
        assertEq(scores[0].score, 900_000);
    }

    // -------------------------------------------------------------------------
    // getPlayerScores
    // -------------------------------------------------------------------------

    function test_GetPlayerScores() public {
        vm.startPrank(alice);
        registry.submitScore(10, 100_000);
        registry.submitScore(20, 200_000);
        registry.submitScore(30, 300_000);
        vm.stopPrank();

        Abstrack.ScoreEntry[] memory scores = registry.getPlayerScores(alice);
        assertEq(scores.length, 3);
        assertEq(scores[0].blockNumber, 10);
        assertEq(scores[0].score, 100_000);
        assertEq(scores[1].blockNumber, 20);
        assertEq(scores[1].score, 200_000);
        assertEq(scores[2].blockNumber, 30);
        assertEq(scores[2].score, 300_000);
    }

    function test_GetPlayerScores_Empty() public view {
        Abstrack.ScoreEntry[] memory scores = registry.getPlayerScores(alice);
        assertEq(scores.length, 0);
    }

    // -------------------------------------------------------------------------
    // Top-10 ranking insertion
    // -------------------------------------------------------------------------

    function test_TopScores_SingleEntry() public {
        vm.prank(alice);
        registry.submitScore(1, 500_000);

        Abstrack.ScoreEntry[] memory top = registry.getGlobalTopScores(10);
        assertEq(top.length, 1);
        assertEq(top[0].player, alice);
        assertEq(top[0].score, 500_000);
    }

    function test_TopScores_SortedDescending() public {
        vm.prank(alice);
        registry.submitScore(1, 300_000);

        vm.prank(bob);
        registry.submitScore(2, 900_000);

        vm.prank(carol);
        registry.submitScore(3, 600_000);

        Abstrack.ScoreEntry[] memory top = registry.getGlobalTopScores(10);
        assertEq(top.length, 3);
        assertEq(top[0].score, 900_000);
        assertEq(top[0].player, bob);
        assertEq(top[1].score, 600_000);
        assertEq(top[1].player, carol);
        assertEq(top[2].score, 300_000);
        assertEq(top[2].player, alice);
    }

    function test_TopScores_LimitedToTen() public {
        // Submit 12 scores from 12 different addresses.
        for (uint256 i = 1; i <= 12; i++) {
            address player = address(uint160(i));
            vm.prank(player);
            registry.submitScore(i, i * 50_000);
        }

        Abstrack.ScoreEntry[] memory top = registry.getGlobalTopScores(10);
        assertEq(top.length, 10);

        // The top entry should be the highest score: 12 * 50_000 = 600_000.
        assertEq(top[0].score, 600_000);
        // The lowest entry in the top-10 should be score #3 = 150_000.
        assertEq(top[9].score, 150_000);
    }

    // -------------------------------------------------------------------------
    // Top-10 displacement
    // -------------------------------------------------------------------------

    function test_TopScores_DisplacementByHigherScore() public {
        // Fill the top-10 list with scores 100k .. 1_000k.
        for (uint256 i = 1; i <= 10; i++) {
            address player = address(uint160(i));
            vm.prank(player);
            registry.submitScore(i, i * 100_000);
        }

        Abstrack.ScoreEntry[] memory topBefore = registry.getGlobalTopScores(10);
        assertEq(topBefore.length, 10);
        // Lowest entry is 100_000.
        assertEq(topBefore[9].score, 100_000);

        // A new player submits a score that displaces the lowest entry.
        address newPlayer = address(uint160(99));
        vm.prank(newPlayer);
        registry.submitScore(99, 550_000);

        Abstrack.ScoreEntry[] memory topAfter = registry.getGlobalTopScores(10);
        assertEq(topAfter.length, 10);

        // The old lowest (100_000) should be gone; new lowest is 200_000.
        assertEq(topAfter[9].score, 200_000);

        // 550_000 should be in position 5 (between 600k and 500k).
        assertEq(topAfter[4].score, 600_000);
        assertEq(topAfter[5].score, 550_000);
        assertEq(topAfter[5].player, newPlayer);
        assertEq(topAfter[6].score, 500_000);
    }

    function test_TopScores_NotDisplacedByLowScore() public {
        // Fill the top-10 with scores 100k .. 1_000k.
        for (uint256 i = 1; i <= 10; i++) {
            address player = address(uint160(i));
            vm.prank(player);
            registry.submitScore(i, i * 100_000);
        }

        // A new player submits a score lower than the current bottom.
        address newPlayer = address(uint160(99));
        vm.prank(newPlayer);
        registry.submitScore(99, 50_000);

        Abstrack.ScoreEntry[] memory top = registry.getGlobalTopScores(10);
        assertEq(top.length, 10);
        // The bottom should still be 100_000.
        assertEq(top[9].score, 100_000);
    }

    function test_TopScores_OverwriteUpdatesRanking() public {
        vm.prank(alice);
        registry.submitScore(1, 100_000);

        vm.prank(bob);
        registry.submitScore(2, 200_000);

        // Alice overwrites with a higher score, should move up in ranking.
        vm.prank(alice);
        registry.submitScore(1, 500_000);

        Abstrack.ScoreEntry[] memory top = registry.getGlobalTopScores(10);
        assertEq(top.length, 2);
        assertEq(top[0].score, 500_000);
        assertEq(top[0].player, alice);
        assertEq(top[1].score, 200_000);
        assertEq(top[1].player, bob);
    }

    // -------------------------------------------------------------------------
    // getGlobalTopScores count parameter
    // -------------------------------------------------------------------------

    function test_GetGlobalTopScores_CountLessThanAvailable() public {
        vm.prank(alice);
        registry.submitScore(1, 100_000);

        vm.prank(bob);
        registry.submitScore(2, 200_000);

        vm.prank(carol);
        registry.submitScore(3, 300_000);

        Abstrack.ScoreEntry[] memory top = registry.getGlobalTopScores(2);
        assertEq(top.length, 2);
        assertEq(top[0].score, 300_000);
        assertEq(top[1].score, 200_000);
    }

    function test_GetGlobalTopScores_CountGreaterThanAvailable() public {
        vm.prank(alice);
        registry.submitScore(1, 100_000);

        Abstrack.ScoreEntry[] memory top = registry.getGlobalTopScores(100);
        assertEq(top.length, 1);
    }

    // -------------------------------------------------------------------------
    // Fuzz testing
    // -------------------------------------------------------------------------

    function testFuzz_SubmitAndRetrieveScore(uint256 blockNum, uint256 rawScore) public {
        // Bound score to the valid range.
        uint256 score = bound(rawScore, 0, 1_000_000);
        // Bound blockNumber to something reasonable to avoid collision with other tests.
        blockNum = bound(blockNum, 1, type(uint128).max);

        vm.prank(alice);
        registry.submitScore(blockNum, score);

        // Verify player scores.
        Abstrack.ScoreEntry[] memory pScores = registry.getPlayerScores(alice);
        assertEq(pScores.length, 1);
        assertEq(pScores[0].score, score);
        assertEq(pScores[0].blockNumber, blockNum);
        assertEq(pScores[0].player, alice);

        // Verify block scores.
        Abstrack.ScoreEntry[] memory bScores = registry.getBlockScores(blockNum);
        assertEq(bScores.length, 1);
        assertEq(bScores[0].score, score);
        assertEq(bScores[0].player, alice);

        // Verify top scores contain this entry.
        Abstrack.ScoreEntry[] memory top = registry.getGlobalTopScores(10);
        assertGe(top.length, 1);
        assertEq(top[0].score, score);
    }

    function testFuzz_ScoreExceedingMaxReverts(uint256 rawScore) public {
        uint256 score = bound(rawScore, 1_000_001, type(uint256).max);

        vm.prank(alice);
        vm.expectRevert("Score exceeds maximum");
        registry.submitScore(1, score);
    }
}
