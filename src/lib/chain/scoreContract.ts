export const TEMPO_SCORE_REGISTRY_ADDRESS =
  "0x7a803c5da3f9009685cfe95d6337a997025679d4" as const;

export const PAYMASTER_ADDRESS =
  "0x5407B5040dec3D339A9247f3654E59EEccbb6391" as const;

export const TEMPO_SCORE_REGISTRY_ABI = [
  {
    type: "function",
    name: "submitScore",
    inputs: [
      { name: "blockNumber", type: "uint256", internalType: "uint256" },
      { name: "score", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getBlockScores",
    inputs: [
      { name: "blockNumber", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "entries",
        type: "tuple[]",
        internalType: "struct TempoScoreRegistry.ScoreEntry[]",
        components: [
          { name: "player", type: "address", internalType: "address" },
          { name: "blockNumber", type: "uint256", internalType: "uint256" },
          { name: "score", type: "uint256", internalType: "uint256" },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPlayerScores",
    inputs: [
      { name: "player", type: "address", internalType: "address" },
    ],
    outputs: [
      {
        name: "entries",
        type: "tuple[]",
        internalType: "struct TempoScoreRegistry.ScoreEntry[]",
        components: [
          { name: "player", type: "address", internalType: "address" },
          { name: "blockNumber", type: "uint256", internalType: "uint256" },
          { name: "score", type: "uint256", internalType: "uint256" },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getGlobalTopScores",
    inputs: [
      { name: "count", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      {
        name: "entries",
        type: "tuple[]",
        internalType: "struct TempoScoreRegistry.ScoreEntry[]",
        components: [
          { name: "player", type: "address", internalType: "address" },
          { name: "blockNumber", type: "uint256", internalType: "uint256" },
          { name: "score", type: "uint256", internalType: "uint256" },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_SCORE",
    inputs: [],
    outputs: [
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ScoreSubmitted",
    inputs: [
      { name: "player", type: "address", indexed: true, internalType: "address" },
      { name: "blockNumber", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "score", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;
