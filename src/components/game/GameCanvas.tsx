"use client";

import React, { useRef, useEffect, useCallback } from "react";
import type { BeatChart } from "@/lib/game/types";
import {
  LANE_COUNT,
  LANE_COLORS,
  LANE_LABELS,
  NOTE_SPEED,
  HIT_ZONE_Y,
  NOTE_SIZE,
  CANVAS_PADDING,
} from "@/lib/game/constants";

interface GameCanvasProps {
  chart: BeatChart;
  getCurrentTime: () => number;
  isPlaying: boolean;
}

export function GameCanvas({ chart, getCurrentTime, isPlaying }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const currentTime = getCurrentTime();
      const laneWidth = (width - CANVAS_PADDING * 2) / LANE_COUNT;
      const hitY = height * HIT_ZONE_Y;

      // Clear
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      // Draw lane dividers
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= LANE_COUNT; i++) {
        const x = CANVAS_PADDING + i * laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw hit zone line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_PADDING, hitY);
      ctx.lineTo(width - CANVAS_PADDING, hitY);
      ctx.stroke();

      // Draw hit zone targets
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = CANVAS_PADDING + i * laneWidth + laneWidth / 2;
        ctx.strokeStyle = LANE_COLORS[i] + "40";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, hitY, NOTE_SIZE / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Lane label
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(LANE_LABELS[i], x, hitY + NOTE_SIZE / 2 + 20);
      }

      // Draw notes
      for (const note of chart.notes) {
        const timeDiff = note.time - currentTime;
        const y = hitY - timeDiff * NOTE_SPEED;

        // Skip notes that are off screen
        if (y < -NOTE_SIZE || y > height + NOTE_SIZE) continue;

        const x =
          CANVAS_PADDING + note.lane * laneWidth + laneWidth / 2;

        if (note.hit) {
          if (note.grade === "miss") {
            // Faded red X
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = "#ff6b6b";
            ctx.font = "bold 20px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("X", x, y);
            ctx.globalAlpha = 1;
          }
          // Don't render hit notes
          continue;
        }

        // Note glow
        const gradient = ctx.createRadialGradient(
          x, y, 0,
          x, y, NOTE_SIZE
        );
        gradient.addColorStop(0, LANE_COLORS[note.lane] + "30");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - NOTE_SIZE, y - NOTE_SIZE, NOTE_SIZE * 2, NOTE_SIZE * 2);

        // Note body
        ctx.fillStyle = LANE_COLORS[note.lane];
        ctx.shadowColor = LANE_COLORS[note.lane];
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, y, NOTE_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Note inner highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(x, y - 3, NOTE_SIZE / 4, 0, Math.PI * 2);
        ctx.fill();
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
      ctx.scale(dpr, dpr);
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
      className="w-full h-full absolute inset-0"
      style={{ touchAction: "none" }}
    />
  );
}
