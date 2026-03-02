import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { abstract } from "viem/chains";
import { getBlockForGame } from "@/lib/chain/blockData";
import { generateBeatChart } from "@/lib/game/BlockBeatGenerator";
import { simulateRun } from "@/lib/game/simulateRun";
import type { BotProfile } from "@/lib/game/BotController";
import { ABSTRACK_ABI, ABSTRACK_ADDRESS } from "@/lib/chain/scoreContract";

const BOT_PROFILES: BotProfile[] = ["perfect", "great", "good", "chaos"];

async function verifyAgentWallet(agentWallet?: string): Promise<boolean> {
  if (!agentWallet) return true;

  try {
    const res = await fetch(`https://ack-onchain.dev/api/reputation/${agentWallet}`);
    return res.ok;
  } catch {
    return false;
  }
}

function canAutoSubmit(): boolean {
  return process.env.AGENT_AUTOSUBMIT_ENABLED === "true";
}

async function submitScoreOnchain(blockNumber: bigint, score: number): Promise<`0x${string}`> {
  const key = process.env.AGENT_SUBMITTER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) {
    throw new Error("AGENT_SUBMITTER_PRIVATE_KEY is missing");
  }

  const account = privateKeyToAccount(key);
  const walletClient = createWalletClient({
    account,
    chain: abstract,
    transport: http(),
  });
  const publicClient = createPublicClient({
    chain: abstract,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: ABSTRACK_ADDRESS,
    abi: ABSTRACK_ABI,
    functionName: "submitScore",
    args: [blockNumber, BigInt(score)],
    account,
    chain: abstract,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blockNumber = BigInt(body.blockNumber);
    const runs = Math.max(1, Math.min(Number(body.runs ?? 1), 20));
    const profile: BotProfile = BOT_PROFILES.includes(body.profile)
      ? body.profile
      : "great";

    const agentOk = await verifyAgentWallet(body.agentWallet);
    if (!agentOk) {
      return NextResponse.json(
        { error: "Agent wallet not recognized by ACK reputation API" },
        { status: 400 }
      );
    }

    const block = await getBlockForGame(blockNumber);
    const chart = generateBeatChart(block);

    let best = simulateRun({ chart, profile });
    for (let i = 1; i < runs; i++) {
      const next = simulateRun({ chart, profile });
      if (next.totalScore > best.totalScore) best = next;
    }

    const runHashInput = `${chart.blockHash}:${profile}:${runs}:${best.totalScore}:${best.maxCombo}`;

    const wantsSubmit = body.submitOnchain === true;
    const shouldSubmit = wantsSubmit && canAutoSubmit();

    let submitTxHash: `0x${string}` | null = null;
    let submitError: string | null = null;

    if (shouldSubmit) {
      try {
        submitTxHash = await submitScoreOnchain(blockNumber, best.totalScore);
      } catch (err) {
        submitError = err instanceof Error ? err.message : "Unknown onchain submit error";
      }
    }

    return NextResponse.json({
      mode: "agent-autoplay",
      blockNumber: chart.blockNumber,
      profile,
      runs,
      chartHash: chart.blockHash,
      best,
      runHashInput,
      onchain: {
        requested: wantsSubmit,
        enabled: canAutoSubmit(),
        submitted: submitTxHash !== null,
        txHash: submitTxHash,
        error: submitError,
      },
      note:
        "Set AGENT_AUTOSUBMIT_ENABLED=true + AGENT_SUBMITTER_PRIVATE_KEY to enable autonomous onchain score submission.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to simulate agent run",
      },
      { status: 500 }
    );
  }
}
