import { TEMPO_SCORE_REGISTRY_ADDRESS } from "./scoreContract";

/**
 * Session key configuration for TEMPO.
 * Scoped to submitScore() only, 1-hour expiry.
 * Used with AGW session keys to enable popup-free score submission.
 */
export const SESSION_KEY_CONFIG = {
  contractAddress: TEMPO_SCORE_REGISTRY_ADDRESS,
  functionSelector: "0x53f9b436" as const, // submitScore(uint256,uint256)
  expirySeconds: 3600, // 1 hour
};
