"use client";

import React, { useEffect, useRef, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameEngine } from "@/lib/game/GameEngine";
import type { GameEvent } from "@/lib/game/GameEngine";
import type { BeatChart, FinalScore, GamePhase, GameState } from "@/lib/game/types";
import { getBlockForGame } from "@/lib/chain/blockData";
import { generateBeatChart } from "@/lib/game/BlockBeatGenerator";
import { GameCanvas } from "@/components/game/GameCanvas";
import { GameHUD } from "@/components/game/GameHUD";
import { GameLoadingScreen } from "@/components/game/GameLoadingScreen";
import { GameOverScreen } from "@/components/game/GameOverScreen";
import { PauseOverlay } from "@/components/game/PauseOverlay";
import { HowToPlayOverlay, hasSeenHowToPlay, markHowToPlaySeen } from "@/components/game/HowToPlayOverlay";
import { MobileTouchZones } from "@/components/game/MobileTouchZones";

interface PlayPageProps {
  params: Promise<{ blockNumber: string }>;
}

export default function PlayPage({ params }: PlayPageProps) {
  const { blockNumber: blockNumberStr } = use(params);
  const blockNumber = BigInt(blockNumberStr);
  const router = useRouter();

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
  const [finalScore, setFinalScore] = useState<FinalScore | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Fetching block data...");
  const [error, setError] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [waitingForHowToPlay, setWaitingForHowToPlay] = useState(false);

  // Check if first visit and show how-to-play
  useEffect(() => {
    if (!hasSeenHowToPlay()) {
      setShowHowToPlay(true);
    }
  }, []);

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
          case "miss":
            // Trigger screen shake on miss
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 300);
            break;
          case "countdown":
            setCountdown(event.value);
            break;
          case "finished":
            setFinalScore(event.finalScore);
            break;
        }
      });

      // If first visit, wait for how-to-play dismissal before loading engine
      if (!hasSeenHowToPlay()) {
        setWaitingForHowToPlay(true);
        // Store the engine load for later
        const loadEngine = async () => {
          await engine.load(generatedChart, containerRef.current ?? undefined);
        };
        // We'll call loadEngine when how-to-play is dismissed
        (window as unknown as Record<string, () => Promise<void>>).__tempoLoadEngine = loadEngine;
      } else {
        await engine.load(generatedChart, containerRef.current ?? undefined);
      }

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

  const handleDismissHowToPlay = useCallback(async () => {
    markHowToPlaySeen();
    setShowHowToPlay(false);

    // If we were waiting, load the engine now
    if (waitingForHowToPlay && engineRef.current && chart) {
      setWaitingForHowToPlay(false);
      const loadEngine = (window as unknown as Record<string, (() => Promise<void>) | undefined>).__tempoLoadEngine;
      if (loadEngine) {
        await loadEngine();
        delete (window as unknown as Record<string, (() => Promise<void>) | undefined>).__tempoLoadEngine;
      }
    }
  }, [waitingForHowToPlay, chart]);

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
    startGame();
  }, [startGame]);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const handleQuit = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
    router.push("/");
  }, [router]);

  const handleVolumeChange = useCallback((db: number) => {
    engineRef.current?.setVolume(db);
  }, []);

  const getCurrentTime = useCallback(() => {
    return engineRef.current?.getCurrentTime() ?? 0;
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <p className="text-red-400 text-lg">Error: {error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-full border border-white/20 text-sm hover:bg-white/10"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-6 py-2 rounded-full border border-white/20 text-sm hover:bg-white/10"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "loading" && !showHowToPlay) {
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
      className={`relative w-full h-dvh bg-black overflow-hidden select-none ${isShaking ? "animate-screen-shake" : ""}`}
      style={{ touchAction: "none" }}
    >
      {chart && (
        <>
          <GameCanvas
            chart={chart}
            getCurrentTime={getCurrentTime}
            isPlaying={phase === "playing"}
          />
          <GameHUD state={gameState} onVolumeChange={handleVolumeChange} />
          <MobileTouchZones />
        </>
      )}

      {/* Back button - top-left, below volume */}
      <Link
        href="/"
        className="absolute top-10 left-3 sm:top-12 sm:left-4 z-20 text-white/20 hover:text-white/60 transition-colors text-xs font-[family-name:var(--font-roobert)]"
        data-game-ui
        style={{ touchAction: "auto" }}
      >
        &larr; Back
      </Link>

      {/* Countdown overlay */}
      {phase === "countdown" && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50" data-game-ui>
          <p
            key={countdown}
            className="text-7xl sm:text-9xl font-black text-white animate-countdown-pop"
            style={{
              textShadow: "0 0 40px rgba(78, 205, 196, 0.5)",
            }}
          >
            {countdown}
          </p>
        </div>
      )}

      {/* Pause overlay */}
      {phase === "paused" && (
        <PauseOverlay onResume={handleResume} onQuit={handleQuit} />
      )}

      {/* How to Play overlay (first visit) */}
      {showHowToPlay && (
        <HowToPlayOverlay onDismiss={handleDismissHowToPlay} />
      )}

      {/* Mobile pause button */}
      {phase === "playing" && (
        <button
          onClick={handlePause}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 md:hidden p-2 rounded-full bg-white/5 border border-white/10 text-white/40"
          aria-label="Pause"
          data-game-ui
          style={{ touchAction: "auto" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </button>
      )}
    </div>
  );
}
