import { NextRequest, NextResponse } from "next/server";
import { getBlockForGame } from "@/lib/chain/blockData";
import { generateBeatChart } from "@/lib/game/BlockBeatGenerator";
import { simulateRun } from "@/lib/game/simulateRun";
import type { BotProfile } from "@/lib/game/BotController";

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

    return NextResponse.json({
      mode: "agent-autoplay",
      blockNumber: chart.blockNumber,
      profile,
      runs,
      chartHash: chart.blockHash,
      best,
      runHashInput,
      note: "MVP returns verifiable sim data. Next step is optional onchain submit + ACK kudos attestation.",
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
