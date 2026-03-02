// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// @title Abstrack
/// @notice On-chain score registry for the Abstrack rhythm game.
///         Stores per-player, per-block scores and maintains a global top-10 leaderboard.
contract Abstrack {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Maximum allowed score value (inclusive).
    uint256 public constant MAX_SCORE = 1_000_000;

    /// @notice Maximum number of entries kept in the global top scores list.
    uint256 public constant MAX_TOP_SCORES = 10;

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    /// @notice A single recorded score entry.
    struct ScoreEntry {
        address player;
        uint256 blockNumber;
        uint256 score;
        uint256 timestamp;
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted every time a score is successfully submitted (or updated).
    event ScoreSubmitted(
        address indexed player,
        uint256 indexed blockNumber,
        uint256 score
    );

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @dev blockNumber => list of ScoreEntry submitted for that block.
    mapping(uint256 => ScoreEntry[]) private _blockScores;

    /// @dev player => list of ScoreEntry submitted by that player.
    mapping(address => ScoreEntry[]) private _playerScores;

    /// @dev player => blockNumber => index+1 into _playerScores (0 means no entry).
    ///      Used to enforce one-score-per-player-per-block and to allow overwrites.
    mapping(address => mapping(uint256 => uint256)) private _playerBlockIndex;

    /// @dev player => blockNumber => index+1 into _blockScores (0 means no entry).
    mapping(address => mapping(uint256 => uint256)) private _playerBlockScoreIndex;

    /// @dev Sorted array of top scores (descending order). Length <= MAX_TOP_SCORES.
    ScoreEntry[] private _topScores;

    // -------------------------------------------------------------------------
    // External / Public Functions
    // -------------------------------------------------------------------------

    /// @notice Submit a score for a given block number.
    /// @param blockNumber The block number the score corresponds to.
    /// @param score       The player's score (0 .. MAX_SCORE inclusive).
    function submitScore(uint256 blockNumber, uint256 score) external {
        require(score <= MAX_SCORE, "Score exceeds maximum");

        address player = msg.sender;
        uint256 playerIdx = _playerBlockIndex[player][blockNumber];

        if (playerIdx == 0) {
            // ----- First submission for this (player, block) pair -----
            ScoreEntry memory entry = ScoreEntry({
                player: player,
                blockNumber: blockNumber,
                score: score,
                timestamp: block.timestamp
            });

            // Append to player scores and record 1-based index.
            _playerScores[player].push(entry);
            _playerBlockIndex[player][blockNumber] = _playerScores[player].length;

            // Append to block scores and record 1-based index.
            _blockScores[blockNumber].push(entry);
            _playerBlockScoreIndex[player][blockNumber] = _blockScores[blockNumber].length;

            // Update top scores.
            _insertTopScore(entry);

            emit ScoreSubmitted(player, blockNumber, score);
        } else {
            // ----- Overwrite only if the new score is strictly higher -----
            uint256 existingScore = _playerScores[player][playerIdx - 1].score;
            require(score > existingScore, "New score must be higher than existing score");

            ScoreEntry memory entry = ScoreEntry({
                player: player,
                blockNumber: blockNumber,
                score: score,
                timestamp: block.timestamp
            });

            // Update in player scores array.
            _playerScores[player][playerIdx - 1] = entry;

            // Update in block scores array.
            uint256 blockIdx = _playerBlockScoreIndex[player][blockNumber];
            _blockScores[blockNumber][blockIdx - 1] = entry;

            // Remove old top-score entry for this (player, block) if present,
            // then re-insert the updated one.
            _removeTopScore(player, blockNumber);
            _insertTopScore(entry);

            emit ScoreSubmitted(player, blockNumber, score);
        }
    }

    /// @notice Get all scores submitted for a specific block.
    /// @param blockNumber The block number to query.
    /// @return entries Array of ScoreEntry structs for that block.
    function getBlockScores(uint256 blockNumber)
        external
        view
        returns (ScoreEntry[] memory entries)
    {
        return _blockScores[blockNumber];
    }

    /// @notice Get all scores submitted by a specific player.
    /// @param player The player address to query.
    /// @return entries Array of ScoreEntry structs for that player.
    function getPlayerScores(address player)
        external
        view
        returns (ScoreEntry[] memory entries)
    {
        return _playerScores[player];
    }

    /// @notice Get the top N global scores, sorted descending by score.
    /// @param count Maximum number of entries to return.
    /// @return entries Array of up to `count` ScoreEntry structs.
    function getGlobalTopScores(uint256 count)
        external
        view
        returns (ScoreEntry[] memory entries)
    {
        uint256 len = _topScores.length;
        if (count > len) {
            count = len;
        }
        entries = new ScoreEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            entries[i] = _topScores[i];
        }
    }

    // -------------------------------------------------------------------------
    // Internal Helpers
    // -------------------------------------------------------------------------

    /// @dev Insert a ScoreEntry into the sorted _topScores array (descending).
    ///      Uses insertion sort. The array never exceeds MAX_TOP_SCORES entries;
    ///      the lowest entry is evicted when the list is full.
    function _insertTopScore(ScoreEntry memory entry) internal {
        uint256 len = _topScores.length;

        // Find the insertion position (first index where entry.score > existing score).
        uint256 insertAt = len; // default: append at end
        for (uint256 i = 0; i < len; i++) {
            if (entry.score > _topScores[i].score) {
                insertAt = i;
                break;
            }
        }

        if (len < MAX_TOP_SCORES) {
            // List is not full yet -- grow by one and shift elements right.
            _topScores.push(); // extend storage array by 1
            uint256 newLen = _topScores.length;
            for (uint256 j = newLen - 1; j > insertAt; j--) {
                _topScores[j] = _topScores[j - 1];
            }
            _topScores[insertAt] = entry;
        } else if (insertAt < MAX_TOP_SCORES) {
            // List is full but the new entry qualifies -- shift and overwrite.
            for (uint256 j = MAX_TOP_SCORES - 1; j > insertAt; j--) {
                _topScores[j] = _topScores[j - 1];
            }
            _topScores[insertAt] = entry;
        }
        // Otherwise the score is too low to enter the top list -- do nothing.
    }

    /// @dev Remove an entry matching (player, blockNumber) from _topScores, if present.
    function _removeTopScore(address player, uint256 blockNumber) internal {
        uint256 len = _topScores.length;
        for (uint256 i = 0; i < len; i++) {
            if (
                _topScores[i].player == player &&
                _topScores[i].blockNumber == blockNumber
            ) {
                // Shift left to fill the gap.
                for (uint256 j = i; j < len - 1; j++) {
                    _topScores[j] = _topScores[j + 1];
                }
                _topScores.pop();
                return;
            }
        }
    }
}
