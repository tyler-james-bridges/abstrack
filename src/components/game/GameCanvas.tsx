"use client";

import React, { useRef, useEffect, useCallback } from "react";
import type { BeatChart } from "@/lib/game/types";
import {
  LANE_COUNT,
  LANE_COLORS,
  LANE_LABELS,
  NOTE_SPEED,
  HIT_ZONE_Y,
  GRADE_COLORS,
  getCanvasPadding,
  getNoteSize,
} from "@/lib/game/constants";
import type { TimingGrade } from "@/lib/game/types";

interface GameCanvasProps {
  chart: BeatChart;
  getCurrentTime: () => number;
  isPlaying: boolean;
}

// Duration of hit zone flash animation (ms)
const HIT_FLASH_DURATION = 200;
// Duration of grade text animation (ms)
const GRADE_TEXT_DURATION = 600;
// How far up the viewport a note must be to start fading in (fraction of hit zone distance)
const FADE_IN_ZONE = 0.2; // fade over the first 20% of travel

export function GameCanvas({ chart, getCurrentTime, isPlaying }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const currentTime = getCurrentTime();
      const now = performance.now();
      // Responsive padding & note size via shared helpers (must match InputHandler)
      const canvasPadding = getCanvasPadding(width);
      const noteSize = getNoteSize(width);
      const laneWidth = (width - canvasPadding * 2) / LANE_COUNT;
      const hitY = height * HIT_ZONE_Y;

      // Clear
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      // Draw lane dividers
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= LANE_COUNT; i++) {
        const x = canvasPadding + i * laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw hit zone line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvasPadding, hitY);
      ctx.lineTo(width - canvasPadding, hitY);
      ctx.stroke();

      // Track per-lane flash state for hit zone ring animation
      const laneFlash: { grade: TimingGrade; age: number }[] = new Array(LANE_COUNT);

      // Scan notes for recent hits to drive hit zone flashes
      for (const note of chart.notes) {
        if (!note.hit || !note.hitTime) continue;
        const age = now - note.hitTime;
        if (age > HIT_FLASH_DURATION) continue;
        const lane = note.lane;
        // Keep the most recent flash per lane
        if (!laneFlash[lane] || age < laneFlash[lane].age) {
          laneFlash[lane] = { grade: note.grade ?? "miss", age };
        }
      }

      // Draw hit zone targets with flash effect
      const labelFontSize = width < 500 ? 11 : 14;
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = canvasPadding + i * laneWidth + laneWidth / 2;
        const flash = laneFlash[i];

        if (flash && flash.grade !== "miss") {
          // Expanding ring flash animation
          const progress = flash.age / HIT_FLASH_DURATION; // 0 → 1
          const eased = 1 - Math.pow(1 - progress, 2); // ease-out quad
          const ringRadius = noteSize / 2 + 4 + eased * 20;
          const ringAlpha = 1 - eased;

          // Bright flash fill
          ctx.globalAlpha = ringAlpha * 0.3;
          ctx.fillStyle = LANE_COLORS[i];
          ctx.beginPath();
          ctx.arc(x, hitY, ringRadius, 0, Math.PI * 2);
          ctx.fill();

          // Flash ring
          ctx.globalAlpha = ringAlpha * 0.8;
          ctx.strokeStyle = LANE_COLORS[i];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, hitY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.globalAlpha = 1;
        }

        // Base target ring (always visible)
        ctx.strokeStyle = LANE_COLORS[i] + "40";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, hitY, noteSize / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Lane label
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.font = `bold ${labelFontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(LANE_LABELS[i], x, hitY + noteSize / 2 + 16);
      }

      // Draw notes with fade-in
      for (const note of chart.notes) {
        const timeDiff = note.time - currentTime;
        const y = hitY - timeDiff * NOTE_SPEED;

        // Skip notes that are off screen
        if (y < -noteSize || y > height + noteSize) continue;

        const x =
          canvasPadding + note.lane * laneWidth + laneWidth / 2;

        if (note.hit) {
          if (note.grade === "miss") {
            // Faded red X
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = "#ff6b6b";
            ctx.font = `bold ${width < 500 ? 16 : 20}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("X", x, y);
            ctx.globalAlpha = 1;
          }
          // Don't render hit notes
          continue;
        }

        // Fade-in: calculate opacity based on distance from top of visible area
        // Notes at y=0 or above are just entering; they should be fading in
        // Notes past the fade zone should be fully opaque
        const distanceFromTop = y + noteSize; // how far into the viewport
        const fadeDistance = hitY * FADE_IN_ZONE;
        const fadeAlpha = Math.min(1, Math.max(0, distanceFromTop / fadeDistance));
        ctx.globalAlpha = fadeAlpha;

        // Note glow
        const gradient = ctx.createRadialGradient(
          x, y, 0,
          x, y, noteSize
        );
        gradient.addColorStop(0, LANE_COLORS[note.lane] + "30");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - noteSize, y - noteSize, noteSize * 2, noteSize * 2);

        // Note body
        ctx.fillStyle = LANE_COLORS[note.lane];
        ctx.shadowColor = LANE_COLORS[note.lane];
        ctx.shadowBlur = width < 500 ? 8 : 12;
        ctx.beginPath();
        ctx.arc(x, y, noteSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Note inner highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(x, y - 3, noteSize / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
      }

      // Draw lane-specific grade text for recent hits (replaces HitFeedback component)
      const gradeFontSize = width < 500 ? 16 : 22;
      for (const note of chart.notes) {
        if (!note.hit || !note.hitTime || !note.grade) continue;
        const age = now - note.hitTime;
        if (age > GRADE_TEXT_DURATION) continue;
        if (note.grade === "miss") continue; // misses show the X on the note itself

        const progress = age / GRADE_TEXT_DURATION; // 0 → 1
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const textAlpha = 1 - eased;
        const textY = hitY - eased * 50;
        const textScale = 1 + eased * 0.2;
        const laneX = canvasPadding + note.lane * laneWidth + laneWidth / 2;

        const color = GRADE_COLORS[note.grade];
        const label = note.grade.toUpperCase();

        ctx.save();
        ctx.globalAlpha = Math.max(0, textAlpha);
        ctx.translate(laneX, textY);
        ctx.scale(textScale, textScale);
        ctx.fillStyle = color;
        ctx.font = `900 ${gradeFontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillText(label, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    },
    [chart, getCurrentTime]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // Use setTransform instead of scale to prevent compounding on resize
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const loop = () => {
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height);
      animRef.current = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      loop();
    } else {
      // Draw once for static view
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [draw, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full absolute inset-0 pointer-events-none"
      style={{ touchAction: "none" }}
    />
  );
}
