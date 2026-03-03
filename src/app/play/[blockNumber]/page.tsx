"use client";

import React, { useEffect, useRef, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GameEngine } from "@/lib/game/GameEngine";
import type { MusicMode } from "@/lib/game/AudioEngine";
import type { GameEvent } from "@/lib/game/GameEngine";
import type { BeatChart, FinalScore, GamePhase, GameState } from "@/lib/game/types";
import { BotController, type BotProfile } from "@/lib/game/BotController";
import { getBlockForGame } from "@/lib/chain/blockData";
import { generateBeatChart } from "@/lib/game/BlockBeatGenerator";
import { GameCanvas } from "@/components/game/GameCanvas";
import { GameHUD } from "@/components/game/GameHUD";
import { GameLoadingScreen } from "@/components/game/GameLoadingScreen";
import { GameOverScreen } from "@/components/game/GameOverScreen";
import { PauseOverlay } from "@/components/game/PauseOverlay";
import { HowToPlayOverlay, hasSeenHowToPlay, markHowToPlaySeen } from "@/components/game/HowToPlayOverlay";
import { BackgroundEffects } from "@/components/ui/BackgroundEffects";

interface PlayPageProps {
  params: Promise<{ blockNumber: string }>;
}

export default function PlayPage({ params }: PlayPageProps) {
  const { blockNumber: blockNumberStr } = use(params);
  const blockNumber = BigInt(blockNumberStr);
  const router = useRouter();
  const searchParams = useSearchParams();

  const engineRef = useRef<GameEngine | null>(null);
  const botRef = useRef<BotController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(0);

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

  const botEnabled = searchParams.get("bot") === "1";
  const botProfileParam = searchParams.get("profile") as BotProfile | null;
  const botProfile: BotProfile =
    botProfileParam && ["perfect", "great", "good", "chaos"].includes(botProfileParam)
      ? botProfileParam
      : "great";

  // Check if first visit and show how-to-play
  useEffect(() => {
    if (!hasSeenHowToPlay()) {
      setShowHowToPlay(true);
    }
  }, []);

  const startGame = useCallback(async () => {
    // Tear down any previous game (handles React strict mode double-mount)
    botRef.current?.stop();
    botRef.current = null;
    engineRef.current?.destroy();
    engineRef.current = null;

    const epoch = ++epochRef.current;

    try {
      setPhase("loading");
      setFinalScore(null);
      setLoadingStatus("Fetching block data...");

      const blockData = await getBlockForGame(blockNumber);
      // Bail if a newer startGame call has taken over
      if (epochRef.current !== epoch) return;
      setLoadingStatus("Generating beat chart...");

      const generatedChart = generateBeatChart(blockData);
      setChart(generatedChart);
      setLoadingStatus("Initializing audio...");

      const engine = new GameEngine();
      engineRef.current = engine;

      if (botEnabled) {
        botRef.current = new BotController({
          profile: botProfile,
          chart: generatedChart,
          getCurrentTime: () => engine.getCurrentTime(),
          onPress: (lane) => engine.pressLane(lane),
        });
      }

      // Subscribe to engine events (cleanup handled by engine.destroy())
      engine.on((event: GameEvent) => {
        // Ignore events from stale engines
        if (epochRef.current !== epoch) return;

        switch (event.type) {
          case "phaseChange":
            setPhase(event.phase);
            if (event.phase === "playing") {
              botRef.current?.start();
            }
            if (event.phase === "finished") {
              botRef.current?.stop();
            }
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
          if (epochRef.current !== epoch) return;
          await engine.load(generatedChart, containerRef.current ?? undefined);
        };
        // We'll call loadEngine when how-to-play is dismissed
        (window as unknown as Record<string, () => Promise<void>>).__abstrackLoadEngine = loadEngine;
      } else {
        if (epochRef.current !== epoch) return;
        await engine.load(generatedChart, containerRef.current ?? undefined);
      }
    } catch (err) {
      if (epochRef.current !== epoch) return;
      setError(err instanceof Error ? err.message : "Failed to load game");
    }
  }, [blockNumber, botEnabled, botProfile]);

  useEffect(() => {
    startGame();

    return () => {
      botRef.current?.stop();
      botRef.current = null;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [startGame]);

  const handleDismissHowToPlay = useCallback(async () => {
    markHowToPlaySeen();
    setShowHowToPlay(false);

    // If we were waiting, load the engine now
    if (waitingForHowToPlay && engineRef.current && chart) {
      setWaitingForHowToPlay(false);
      const loadEngine = (window as unknown as Record<string, (() => Promise<void>) | undefined>).__abstrackLoadEngine;
      if (loadEngine) {
        await loadEngine();
        delete (window as unknown as Record<string, (() => Promise<void>) | undefined>).__abstrackLoadEngine;
      }
    }
  }, [waitingForHowToPlay, chart]);

  const handlePlayAgain = useCallback(() => {
    botRef.current?.stop();
    botRef.current = null;
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
    botRef.current?.stop();
    botRef.current = null;
    engineRef.current?.destroy();
    engineRef.current = null;
    router.push("/");
  }, [router]);

  const handleVolumeChange = useCallback((db: number) => {
    engineRef.current?.setVolume(db);
  }, []);

  const handleMusicModeChange = useCallback((mode: MusicMode) => {
    engineRef.current?.setMusicMode(mode);
  }, []);

  const handleTempoChange = useCallback((multiplier: number) => {
    engineRef.current?.setTempoMultiplier(multiplier);
  }, []);

  const getCurrentTime = useCallback(() => {
    return engineRef.current?.getCurrentTime() ?? 0;
  }, []);

  // IMPORTANT: Always render the container div so containerRef is available
  // when the GameEngine loads. Previously, early returns during "loading" phase
  // meant the ref was null and touch input was never set up on mobile.
  return (
    <div
      ref={containerRef}
      className={`relative w-full h-dvh bg-black overflow-hidden select-none ${isShaking ? "animate-screen-shake" : ""}`}
      style={{ touchAction: "none" }}
    >
      <BackgroundEffects />

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-white gap-4 px-6 safe-all">
          <p className="text-red-400 text-base sm:text-lg text-center">Error: {error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="h-12 px-6 rounded-full border border-white/20 text-sm hover:bg-white/10 active:bg-white/15"
            >
              Retry
            </button>
            <Link
              href="/"
              className="h-12 px-6 rounded-full border border-white/20 text-sm hover:bg-white/10 active:bg-white/15 flex items-center"
            >
              Home
            </Link>
          </div>
        </div>
      )}

      {/* Loading state — rendered INSIDE the container so ref stays alive */}
      {phase === "loading" && !showHowToPlay && !error && (
        <div className="absolute inset-0 z-40">
          <GameLoadingScreen
            blockNumber={Number(blockNumber)}
            status={loadingStatus}
          />
        </div>
      )}

      {/* Game over state */}
      {phase === "finished" && finalScore && (
        <div className="absolute inset-0 z-40">
          <GameOverScreen
            finalScore={finalScore}
            onPlayAgain={handlePlayAgain}
          />
        </div>
      )}

      {/* Game canvas and HUD — always mounted when chart exists */}
      {chart && (
        <>
          <GameCanvas
            chart={chart}
            getCurrentTime={getCurrentTime}
            isPlaying={phase === "playing"}
          />
          {/* CRT scanline overlay on game canvas */}
          <div className="absolute inset-0 crt-scanlines z-[5]" />
          <GameHUD state={gameState} onVolumeChange={handleVolumeChange} onMusicModeChange={handleMusicModeChange} onTempoChange={handleTempoChange} />
        </>
      )}

      {/* Back button - top-left, below volume — 44px tap target */}
      {phase !== "loading" && phase !== "finished" && !error && (
        <Link
          href="/"
          className="absolute z-20 flex items-center justify-center h-11 px-3 text-white/30 hover:text-white/60 active:text-white/80 transition-colors text-xs font-[family-name:var(--font-roobert)]"
          data-game-ui
          style={{
            touchAction: "auto",
            top: "calc(env(safe-area-inset-top, 0px) + 40px)",
            left: "4px",
          }}
        >
          &larr; Back
        </Link>
      )}

      {botEnabled && phase !== "finished" && (
        <div
          className="absolute right-3 z-20 px-3 py-1 rounded-full border border-[#3EB95F]/30 text-[#3EB95F] text-[10px] uppercase tracking-widest font-[family-name:var(--font-avenue-mono)] bg-black/60"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
          data-game-ui
        >
          Agent Mode · {botProfile}
        </div>
      )}

      {/* Countdown overlay */}
      {phase === "countdown" && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50" data-game-ui>
          <p
            key={countdown}
            className="text-6xl sm:text-9xl font-black text-white animate-countdown-pop"
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

      {/* Mobile pause button — 44px touch target, centered, safe area aware */}
      {phase === "playing" && (
        <button
          onClick={handlePause}
          className="absolute left-1/2 -translate-x-1/2 z-20 md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white/5 border border-white/10 text-white/40 active:bg-white/15 active:text-white/70 transition-colors"
          aria-label="Pause"
          data-game-ui
          style={{
            touchAction: "auto",
            top: "calc(env(safe-area-inset-top, 0px) + 8px)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </button>
      )}
    </div>
  );
}
