export const ABSTRACK_ADDRESS =
  "0xb42244ed94500318e8cE25b0434fA8973334FC0b" as const;

export const PAYMASTER_ADDRESS =
  "0x9997a706bB267e487458ae85e5A084cDa15C8996" as const;

export const ABSTRACK_ABI = [
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
        internalType: "struct Abstrack.ScoreEntry[]",
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
        internalType: "struct Abstrack.ScoreEntry[]",
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
        internalType: "struct Abstrack.ScoreEntry[]",
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
