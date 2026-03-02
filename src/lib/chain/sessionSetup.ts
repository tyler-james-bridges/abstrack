import { toFunctionSelector, parseEther } from "viem";
import {
  LimitType,
  LimitUnlimited,
  type SessionConfig,
  type CallPolicy,
} from "@abstract-foundation/agw-client/sessions";
import {
  ABSTRACK_ADDRESS,
  PAYMASTER_ADDRESS,
} from "./scoreContract";

/**
 * Session key duration: 1 hour (in seconds).
 */
const SESSION_DURATION_SECONDS = 60 * 60;

/**
 * Build a CallPolicy scoped to submitScore(uint256,uint256) on the Abstrack contract.
 * - No ETH value required (the function is nonpayable, gas is sponsored).
 * - No parameter constraints -- any blockNumber/score combination is allowed.
 */
function buildSubmitScoreCallPolicy(): CallPolicy {
  return {
    target: ABSTRACK_ADDRESS,
    selector: toFunctionSelector("submitScore(uint256,uint256)"),
    maxValuePerUse: 0n,
    valueLimit: LimitUnlimited,
    constraints: [],
  };
}

/**
 * Build a full SessionConfig for the given session signer address.
 * The session is scoped exclusively to `submitScore` and expires after 1 hour.
 *
 * When restoring a persisted session, pass the original `expiresAt` so the
 * config hash matches what was registered on-chain.
 */
export function buildAbstrackSessionConfig(
  signerAddress: `0x${string}`,
  existingExpiresAt?: bigint
): SessionConfig {
  const expiresAt =
    existingExpiresAt ??
    BigInt(Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS);

  return {
    signer: signerAddress,
    expiresAt,
    feeLimit: {
      limitType: LimitType.Lifetime,
      limit: parseEther("0.1"), // generous lifetime gas budget (sponsored anyway)
      period: 0n,
    },
    callPolicies: [buildSubmitScoreCallPolicy()],
    transferPolicies: [],
  };
}

/**
 * Paymaster address used for gas sponsorship when creating the session.
 */
export { PAYMASTER_ADDRESS as SESSION_PAYMASTER };

/**
 * Duration constant exported for UI display purposes.
 */
export const SESSION_DURATION_DISPLAY = "1 hour";
