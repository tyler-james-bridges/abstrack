"use client";

import React, { useEffect, useRef, useState, useCallback, use } from "react";
import { GameEngine } from "@/lib/game/GameEngine";
import type { GameEvent } from "@/lib/game/GameEngine";
import type { BeatChart, FinalScore, GamePhase, HitResult, GameState } from "@/lib/game/types";
import { getBlockForGame } from "@/lib/chain/blockData";
import { generateBeatChart } from "@/lib/game/BlockBeatGenerator";
import { GameCanvas } from "@/components/game/GameCanvas";
import { GameHUD } from "@/components/game/GameHUD";
import { HitFeedback } from "@/components/game/HitFeedback";
import { GameLoadingScreen } from "@/components/game/GameLoadingScreen";
import { GameOverScreen } from "@/components/game/GameOverScreen";

interface PlayPageProps {
  params: Promise<{ blockNumber: string }>;
}

export default function PlayPage({ params }: PlayPageProps) {
  const { blockNumber: blockNumberStr } = use(params);
  const blockNumber = BigInt(blockNumberStr);

  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<GamePhase>("loading");
  const [chart, setChart] = useState<BeatChart | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    phase: "loading",
    chart: null,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: [],
    gradeCounts: { perfect: 0, great: 0, good: 0, miss: 0 },
    elapsedTime: 0,
    countdown: 0,
  });
  const [latestHit, setLatestHit] = useState<HitResult | null>(null);
  const [finalScore, setFinalScore] = useState<FinalScore | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Fetching block data...");
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(async () => {
    try {
      setPhase("loading");
      setFinalScore(null);
      setLoadingStatus("Fetching block data...");

      const blockData = await getBlockForGame(blockNumber);
      setLoadingStatus("Generating beat chart...");

      const generatedChart = generateBeatChart(blockData);
      setChart(generatedChart);
      setLoadingStatus("Initializing audio...");

      const engine = new GameEngine();
      engineRef.current = engine;

      const unsubscribe = engine.on((event: GameEvent) => {
        switch (event.type) {
          case "phaseChange":
            setPhase(event.phase);
            break;
          case "scoreUpdate":
            setGameState(event.state);
            break;
          case "hit":
            setLatestHit(event.result);
            break;
          case "countdown":
            setCountdown(event.value);
            break;
          case "finished":
            setFinalScore(event.finalScore);
            break;
        }
      });

      await engine.load(generatedChart, containerRef.current ?? undefined);

      return () => {
        unsubscribe();
        engine.destroy();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game");
    }
  }, [blockNumber]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    startGame().then((c) => {
      cleanup = c;
    });

    return () => {
      cleanup?.();
      engineRef.current?.destroy();
    };
  }, [startGame]);

  const handlePlayAgain = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
    setChart(null);
    setGameState({
      phase: "loading",
      chart: null,
      score: 0,
      combo: 0,
      maxCombo: 0,
      hits: [],
      gradeCounts: { perfect: 0, great: 0, good: 0, miss: 0 },
      elapsedTime: 0,
      countdown: 0,
    });
    setLatestHit(null);
    startGame();
  }, [startGame]);

  const getCurrentTime = useCallback(() => {
    return engineRef.current?.getCurrentTime() ?? 0;
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <p className="text-red-400 text-lg">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-full border border-white/20 text-sm hover:bg-white/10"
        >
          Retry
        </button>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <GameLoadingScreen
        blockNumber={Number(blockNumber)}
        status={loadingStatus}
      />
    );
  }

  if (phase === "finished" && finalScore) {
    return (
      <GameOverScreen
        finalScore={finalScore}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden select-none"
    >
      {chart && (
        <>
          <GameCanvas
            chart={chart}
            getCurrentTime={getCurrentTime}
            isPlaying={phase === "playing"}
          />
          <GameHUD state={gameState} />
          <HitFeedback latestHit={latestHit} />
        </>
      )}

      {/* Countdown overlay */}
      {phase === "countdown" && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
          <p
            className="text-9xl font-black text-white animate-pulse"
            style={{
              textShadow: "0 0 40px rgba(78, 205, 196, 0.5)",
            }}
          >
            {countdown}
          </p>
        </div>
      )}
    </div>
  );
}
