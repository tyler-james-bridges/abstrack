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

const HIT_FLASH_DURATION = 220;
const GRADE_TEXT_DURATION = 600;
const FADE_IN_ZONE = 0.28;

export function GameCanvas({ chart, getCurrentTime, isPlaying }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const currentTime = getCurrentTime();
      const now = performance.now();
      const canvasPadding = getCanvasPadding(width);
      const baseNoteSize = getNoteSize(width);
      const hitY = height * HIT_ZONE_Y;

      const topY = Math.max(72, height * 0.16);
      const centerX = width / 2;
      const highwayBottomWidth = width - canvasPadding * 2;
      const highwayTopWidth = Math.max(120, highwayBottomWidth * 0.26);

      const laneBoundsAtY = (yRaw: number) => {
        const y = Math.max(topY, Math.min(hitY, yRaw));
        const t = (y - topY) / Math.max(1, hitY - topY);
        const laneAreaWidth = highwayTopWidth + (highwayBottomWidth - highwayTopWidth) * t;
        const left = centerX - laneAreaWidth / 2;
        const laneWidth = laneAreaWidth / LANE_COUNT;
        return { left, laneWidth, t };
      };

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#050806");
      bg.addColorStop(0.45, "#070b08");
      bg.addColorStop(1, "#090909");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Highway body
      const topLeft = centerX - highwayTopWidth / 2;
      const topRight = centerX + highwayTopWidth / 2;
      const bottomLeft = centerX - highwayBottomWidth / 2;
      const bottomRight = centerX + highwayBottomWidth / 2;

      const bodyGrad = ctx.createLinearGradient(0, topY, 0, hitY + (height - hitY));
      bodyGrad.addColorStop(0, "rgba(8,12,9,0.35)");
      bodyGrad.addColorStop(0.5, "rgba(10,16,12,0.55)");
      bodyGrad.addColorStop(1, "rgba(8,12,10,0.9)");

      ctx.beginPath();
      ctx.moveTo(topLeft, topY);
      ctx.lineTo(topRight, topY);
      ctx.lineTo(bottomRight, height);
      ctx.lineTo(bottomLeft, height);
      ctx.closePath();
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Highway edge glow
      ctx.strokeStyle = "rgba(160,231,171,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(topLeft, topY);
      ctx.lineTo(bottomLeft, height);
      ctx.moveTo(topRight, topY);
      ctx.lineTo(bottomRight, height);
      ctx.stroke();

      // Moving horizontal sweep lines (Guitar Hero motion feel)
      const speedPxPerSec = 78;
      const offset = (currentTime * speedPxPerSec) % 52;
      for (let y = topY + offset; y < height; y += 52) {
        const { left, laneWidth, t } = laneBoundsAtY(y);
        const alpha = 0.14 - t * 0.09;
        if (alpha <= 0) continue;
        ctx.strokeStyle = `rgba(160,231,171,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + laneWidth * LANE_COUNT, y);
        ctx.stroke();
      }

      // Lane dividers (perspective)
      ctx.strokeStyle = "rgba(160,231,171,0.18)";
      for (let i = 0; i <= LANE_COUNT; i++) {
        const tx = topLeft + (highwayTopWidth / LANE_COUNT) * i;
        const bx = bottomLeft + (highwayBottomWidth / LANE_COUNT) * i;
        ctx.beginPath();
        ctx.moveTo(tx, topY);
        ctx.lineTo(bx, height);
        ctx.stroke();
      }

      // Hit line
      const hitBounds = laneBoundsAtY(hitY);
      ctx.strokeStyle = "rgba(160,231,171,0.8)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hitBounds.left, hitY);
      ctx.lineTo(hitBounds.left + hitBounds.laneWidth * LANE_COUNT, hitY);
      ctx.stroke();

      // Flash state
      const laneFlash: { grade: TimingGrade; age: number }[] = new Array(LANE_COUNT);
      for (const note of chart.notes) {
        if (!note.hit || !note.hitTime) continue;
        const age = now - note.hitTime;
        if (age > HIT_FLASH_DURATION) continue;
        const lane = note.lane;
        if (!laneFlash[lane] || age < laneFlash[lane].age) {
          laneFlash[lane] = { grade: note.grade ?? "miss", age };
        }
      }

      const isMobile = width < 500;

      // Hit targets + labels
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = hitBounds.left + i * hitBounds.laneWidth + hitBounds.laneWidth / 2;
        const flash = laneFlash[i];
        const targetR = baseNoteSize * 0.62;

        if (flash && flash.grade !== "miss") {
          const progress = flash.age / HIT_FLASH_DURATION;
          const eased = 1 - Math.pow(1 - progress, 2);
          const ringRadius = targetR + 8 + eased * 24;
          const ringAlpha = 1 - eased;

          ctx.globalAlpha = ringAlpha * 0.28;
          ctx.fillStyle = LANE_COLORS[i];
          ctx.beginPath();
          ctx.arc(x, hitY, ringRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = ringAlpha * 0.95;
          ctx.strokeStyle = LANE_COLORS[i];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, hitY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = LANE_COLORS[i] + (isMobile ? "88" : "66");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, hitY, targetR, 0, Math.PI * 2);
        ctx.stroke();

        if (!isMobile) {
          ctx.fillStyle = "rgba(255,255,255,0.28)";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(LANE_LABELS[i], x, hitY + targetR + 16);
        }
      }

      // Notes
      for (const note of chart.notes) {
        const timeDiff = note.time - currentTime;
        const y = hitY - timeDiff * NOTE_SPEED;
        if (y < topY - baseNoteSize || y > height + baseNoteSize) continue;

        if (note.hit) {
          if (note.grade === "miss") {
            const missBounds = laneBoundsAtY(y);
            const x = missBounds.left + note.lane * missBounds.laneWidth + missBounds.laneWidth / 2;
            ctx.globalAlpha = 0.38;
            ctx.fillStyle = "#ff6b6b";
            ctx.font = `bold ${width < 500 ? 16 : 20}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("X", x, y);
            ctx.globalAlpha = 1;
          }
          continue;
        }

        const bounds = laneBoundsAtY(y);
        const x = bounds.left + note.lane * bounds.laneWidth + bounds.laneWidth / 2;

        const distanceFromTop = y - topY + baseNoteSize;
        const fadeDistance = (hitY - topY) * FADE_IN_ZONE;
        const fadeAlpha = Math.min(1, Math.max(0, distanceFromTop / Math.max(1, fadeDistance)));
        const sizeScale = 0.62 + bounds.t * 0.7;
        const noteSize = baseNoteSize * sizeScale;

        ctx.globalAlpha = fadeAlpha;

        const glow = ctx.createRadialGradient(x, y, 0, x, y, noteSize * 1.2);
        glow.addColorStop(0, LANE_COLORS[note.lane] + "45");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(x - noteSize * 1.2, y - noteSize * 1.2, noteSize * 2.4, noteSize * 2.4);

        ctx.fillStyle = LANE_COLORS[note.lane];
        ctx.shadowColor = LANE_COLORS[note.lane];
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, noteSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255,255,255,0.30)";
        ctx.beginPath();
        ctx.arc(x, y - noteSize * 0.12, noteSize / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
      }

      // Grade text
      const gradeFontSize = width < 500 ? 16 : 22;
      for (const note of chart.notes) {
        if (!note.hit || !note.hitTime || !note.grade) continue;
        const age = now - note.hitTime;
        if (age > GRADE_TEXT_DURATION || note.grade === "miss") continue;

        const progress = age / GRADE_TEXT_DURATION;
        const eased = 1 - Math.pow(1 - progress, 3);
        const textAlpha = 1 - eased;
        const textY = hitY - eased * 56;
        const textScale = 1 + eased * 0.24;

        const bounds = laneBoundsAtY(hitY);
        const laneX = bounds.left + note.lane * bounds.laneWidth + bounds.laneWidth / 2;
        const color = GRADE_COLORS[note.grade];

        ctx.save();
        ctx.globalAlpha = Math.max(0, textAlpha);
        ctx.translate(laneX, textY);
        ctx.scale(textScale, textScale);
        ctx.fillStyle = color;
        ctx.font = `900 ${gradeFontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fillText(note.grade.toUpperCase(), 0, 0);
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
