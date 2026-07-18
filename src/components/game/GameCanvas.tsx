"use client";

import React, { useRef, useEffect, useCallback } from "react";
import type { BeatChart, TimingGrade } from "@/lib/game/types";
import {
  LANE_COUNT,
  LANE_COLORS,
  LANE_LABELS,
  LANE_NAMES,
  HIT_ZONE_Y,
  GRADE_COLORS,
  getCanvasPadding,
  getNoteSize,
} from "@/lib/game/constants";

interface GameCanvasProps {
  chart: BeatChart;
  getCurrentTime: () => number;
  isPlaying: boolean;
}

const HIT_FLASH_DURATION = 280;
const PACKET_TRANSFER_DURATION = 440;
const GRADE_TEXT_DURATION = 620;
const FADE_IN_ZONE = 0.24;

const GRADE_FEEDBACK: Record<Exclude<TimingGrade, "miss">, string> = {
  perfect: "SEALED",
  great: "VALID",
  good: "LATE",
};

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function GameCanvas({
  chart,
  getCurrentTime,
  isPlaying,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const currentTime = getCurrentTime();
      const flowTime = Math.max(0, currentTime);
      const now = performance.now();
      const canvasPadding = getCanvasPadding(width);
      const baseNoteSize = getNoteSize(width);
      const hitY = height * HIT_ZONE_Y;
      const isMobile = width < 500;

      const topY = Math.max(isMobile ? 92 : 108, height * 0.16);
      const centerX = width / 2;
      const highwayBottomWidth = width - canvasPadding * 2;
      const highwayTopWidth = Math.max(
        isMobile ? 104 : 150,
        highwayBottomWidth * 0.24
      );

      const laneBoundsAtY = (yRaw: number) => {
        const y = Math.max(topY, Math.min(hitY, yRaw));
        const t = (y - topY) / Math.max(1, hitY - topY);
        const laneAreaWidth =
          highwayTopWidth + (highwayBottomWidth - highwayTopWidth) * t;
        const left = centerX - laneAreaWidth / 2;
        const laneWidth = laneAreaWidth / LANE_COUNT;
        return { left, laneWidth, t };
      };

      const processedCount = chart.notes.reduce(
        (count, note) =>
          count + (note.hit && note.grade !== "miss" ? 1 : 0),
        0
      );
      const inclusionRatio =
        chart.notes.length > 0 ? processedCount / chart.notes.length : 0;

      // Deep blockspace background.
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#07100c");
      bg.addColorStop(0.44, "#050a08");
      bg.addColorStop(1, "#020403");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // A restrained congestion heatmap behind the transaction queue.
      const heat = ctx.createRadialGradient(
        centerX,
        topY,
        0,
        centerX,
        topY,
        width * 0.54
      );
      heat.addColorStop(0, "rgba(62,185,95,0.13)");
      heat.addColorStop(0.56, "rgba(242,201,76,0.025)");
      heat.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = heat;
      ctx.fillRect(0, 0, width, height * 0.58);

      // Pending mempool packets drift across the horizon.
      const queueY = topY - (isMobile ? 24 : 34);
      const queueWidth = Math.min(width * 0.72, 660);
      const queueStart = centerX - queueWidth / 2;
      const queueOffset = (flowTime * 24) % 74;
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = -1; i < 11; i++) {
        const packetWidth = 34 + ((i + chart.blockNumber) % 4) * 10;
        const x = queueStart + i * 68 + queueOffset;
        if (x > queueStart + queueWidth || x + packetWidth < queueStart) {
          continue;
        }
        const color = LANE_COLORS[(i + 8) % LANE_COUNT];
        roundedRectPath(
          ctx,
          x,
          queueY + ((i + 8) % 2) * 7,
          packetWidth,
          isMobile ? 8 : 10,
          2
        );
        ctx.fillStyle = `${color}22`;
        ctx.fill();
        ctx.strokeStyle = `${color}55`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = "rgba(160,231,171,0.4)";
      ctx.font = `700 ${isMobile ? 8 : 9}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("PENDING TRANSACTION QUEUE", centerX, queueY - 8);

      // Sequencer pipeline body.
      const topLeft = centerX - highwayTopWidth / 2;
      const topRight = centerX + highwayTopWidth / 2;
      const bottomLeft = centerX - highwayBottomWidth / 2;
      const bottomRight = centerX + highwayBottomWidth / 2;

      const bodyGrad = ctx.createLinearGradient(0, topY, 0, height);
      bodyGrad.addColorStop(0, "rgba(9,24,16,0.42)");
      bodyGrad.addColorStop(0.52, "rgba(6,15,10,0.78)");
      bodyGrad.addColorStop(1, "rgba(3,8,5,0.98)");

      ctx.beginPath();
      ctx.moveTo(topLeft, topY);
      ctx.lineTo(topRight, topY);
      ctx.lineTo(bottomRight, height);
      ctx.lineTo(bottomLeft, height);
      ctx.closePath();
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Fee-band washes make lane meaning readable without heavy chrome.
      for (let i = 0; i < LANE_COUNT; i++) {
        const topLaneLeft = topLeft + (highwayTopWidth / LANE_COUNT) * i;
        const topLaneRight =
          topLeft + (highwayTopWidth / LANE_COUNT) * (i + 1);
        const bottomLaneLeft =
          bottomLeft + (highwayBottomWidth / LANE_COUNT) * i;
        const bottomLaneRight =
          bottomLeft + (highwayBottomWidth / LANE_COUNT) * (i + 1);
        const laneGradient = ctx.createLinearGradient(0, topY, 0, height);
        laneGradient.addColorStop(0, `${LANE_COLORS[i]}0d`);
        laneGradient.addColorStop(1, `${LANE_COLORS[i]}03`);
        ctx.beginPath();
        ctx.moveTo(topLaneLeft, topY);
        ctx.lineTo(topLaneRight, topY);
        ctx.lineTo(bottomLaneRight, height);
        ctx.lineTo(bottomLaneLeft, height);
        ctx.closePath();
        ctx.fillStyle = laneGradient;
        ctx.fill();
      }

      // Pipeline edges and lane dividers.
      ctx.strokeStyle = "rgba(160,231,171,0.34)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(topLeft, topY);
      ctx.lineTo(bottomLeft, height);
      ctx.moveTo(topRight, topY);
      ctx.lineTo(bottomRight, height);
      ctx.stroke();

      for (let i = 1; i < LANE_COUNT; i++) {
        const tx = topLeft + (highwayTopWidth / LANE_COUNT) * i;
        const bx = bottomLeft + (highwayBottomWidth / LANE_COUNT) * i;
        ctx.strokeStyle = "rgba(160,231,171,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, topY);
        ctx.lineTo(bx, height);
        ctx.stroke();
      }

      // Moving ledger rows communicate flow toward the commit boundary.
      const rowOffset = (flowTime * 92) % 58;
      for (let y = topY + rowOffset; y < height; y += 58) {
        const { left, laneWidth, t } = laneBoundsAtY(y);
        const alpha = Math.max(0.025, 0.12 - t * 0.075);
        ctx.setLineDash([Math.max(4, 12 * t), Math.max(5, 8 * t)]);
        ctx.strokeStyle = `rgba(160,231,171,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + laneWidth * LANE_COUNT, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Fee-band labels live at the quiet horizon, out of the action zone.
      const topBounds = laneBoundsAtY(topY);
      for (let i = 0; i < LANE_COUNT; i++) {
        const x =
          topBounds.left + i * topBounds.laneWidth + topBounds.laneWidth / 2;
        ctx.fillStyle = `${LANE_COLORS[i]}aa`;
        ctx.font = `700 ${isMobile ? 6 : 8}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(isMobile ? String(i + 1) : LANE_NAMES[i], x, topY + 8);
      }

      // Commit boundary.
      const hitBounds = laneBoundsAtY(hitY);
      const commitGlow = ctx.createLinearGradient(
        hitBounds.left,
        0,
        hitBounds.left + hitBounds.laneWidth * LANE_COUNT,
        0
      );
      commitGlow.addColorStop(0, "rgba(62,185,95,0.1)");
      commitGlow.addColorStop(0.5, "rgba(160,231,171,0.96)");
      commitGlow.addColorStop(1, "rgba(255,107,95,0.1)");
      ctx.strokeStyle = commitGlow;
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(62,185,95,0.55)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(hitBounds.left, hitY);
      ctx.lineTo(
        hitBounds.left + hitBounds.laneWidth * LANE_COUNT,
        hitY
      );
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(160,231,171,0.52)";
      ctx.font = `700 ${isMobile ? 7 : 9}px monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("COMMIT", hitBounds.left + 4, hitY - 7);

      // Most recent lane hit flash.
      const laneFlash: { grade: TimingGrade; age: number }[] = new Array(
        LANE_COUNT
      );
      for (const note of chart.notes) {
        if (!note.hit || !note.hitTime) continue;
        const age = now - note.hitTime;
        if (age > HIT_FLASH_DURATION) continue;
        if (!laneFlash[note.lane] || age < laneFlash[note.lane].age) {
          laneFlash[note.lane] = {
            grade: note.grade ?? "miss",
            age,
          };
        }
      }

      // Commit gates and key bindings.
      for (let i = 0; i < LANE_COUNT; i++) {
        const x =
          hitBounds.left +
          i * hitBounds.laneWidth +
          hitBounds.laneWidth / 2;
        const flash = laneFlash[i];
        const gateWidth = Math.min(
          hitBounds.laneWidth * 0.68,
          baseNoteSize * 1.22
        );
        const gateHeight = isMobile ? 24 : 30;

        if (flash && flash.grade !== "miss") {
          const progress = flash.age / HIT_FLASH_DURATION;
          const eased = 1 - Math.pow(1 - progress, 2);
          ctx.globalAlpha = (1 - eased) * 0.9;
          roundedRectPath(
            ctx,
            x - gateWidth / 2 - eased * 12,
            hitY - gateHeight / 2 - eased * 5,
            gateWidth + eased * 24,
            gateHeight + eased * 10,
            4
          );
          ctx.strokeStyle = LANE_COLORS[i];
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        roundedRectPath(
          ctx,
          x - gateWidth / 2,
          hitY - gateHeight / 2,
          gateWidth,
          gateHeight,
          4
        );
        ctx.fillStyle = `${LANE_COLORS[i]}0e`;
        ctx.fill();
        ctx.strokeStyle = `${LANE_COLORS[i]}99`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = `${LANE_COLORS[i]}dd`;
        ctx.font = `800 ${isMobile ? 10 : 12}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(LANE_LABELS[i], x, hitY);
      }

      // Block assembler at the horizon on larger screens.
      if (width >= 720) {
        const blockX = width - 116;
        const blockY = topY - 2;
        const blockWidth = 82;
        const blockHeight = 112;
        roundedRectPath(
          ctx,
          blockX,
          blockY,
          blockWidth,
          blockHeight,
          6
        );
        ctx.fillStyle = "rgba(5,13,9,0.88)";
        ctx.fill();
        ctx.strokeStyle = "rgba(160,231,171,0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "rgba(160,231,171,0.52)";
        ctx.font = "700 8px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText("BLOCK ASSEMBLY", blockX, blockY - 7);

        const slots = 20;
        const filledSlots = Math.round(inclusionRatio * slots);
        for (let i = 0; i < slots; i++) {
          const col = i % 4;
          const row = 4 - Math.floor(i / 4);
          const cellX = blockX + 8 + col * 17;
          const cellY = blockY + 9 + row * 18;
          const cellColor = LANE_COLORS[(i + chart.blockNumber) % LANE_COUNT];
          roundedRectPath(ctx, cellX, cellY, 13, 13, 2);
          ctx.fillStyle =
            i < filledSlots ? `${cellColor}b8` : "rgba(255,255,255,0.035)";
          ctx.fill();
          ctx.strokeStyle =
            i < filledSlots
              ? `${cellColor}cc`
              : "rgba(255,255,255,0.08)";
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(255,255,255,0.46)";
        ctx.font = "700 8px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `${processedCount}/${chart.notes.length}`,
          blockX + blockWidth / 2,
          blockY + blockHeight - 10
        );

        // Successful packets visibly transfer from the gate into the block.
        for (const note of chart.notes) {
          if (
            !note.hit ||
            !note.hitTime ||
            note.grade === "miss" ||
            now - note.hitTime > PACKET_TRANSFER_DURATION
          ) {
            continue;
          }
          const progress = (now - note.hitTime) / PACKET_TRANSFER_DURATION;
          const eased = 1 - Math.pow(1 - progress, 3);
          const sourceX =
            hitBounds.left +
            note.lane * hitBounds.laneWidth +
            hitBounds.laneWidth / 2;
          const sourceY = hitY;
          const targetX = blockX + blockWidth / 2;
          const targetY = blockY + blockHeight / 2;
          const x = sourceX + (targetX - sourceX) * eased;
          const y =
            sourceY +
            (targetY - sourceY) * eased -
            Math.sin(progress * Math.PI) * 72;
          ctx.globalAlpha = Math.max(0, 1 - progress);
          roundedRectPath(ctx, x - 12, y - 5, 24, 10, 2);
          ctx.fillStyle = LANE_COLORS[note.lane];
          ctx.shadowColor = LANE_COLORS[note.lane];
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }

      // Pending transaction packets.
      for (const note of chart.notes) {
        const timeDiff = note.time - currentTime;
        const y = hitY - timeDiff * note.noteSpeed;
        if (y < topY - baseNoteSize || y > height + baseNoteSize) {
          continue;
        }

        if (note.hit) {
          if (note.grade === "miss") {
            const missBounds = laneBoundsAtY(y);
            const x =
              missBounds.left +
              note.lane * missBounds.laneWidth +
              missBounds.laneWidth / 2;
            const missWidth = Math.min(
              missBounds.laneWidth * 0.66,
              baseNoteSize * 1.2
            );
            ctx.save();
            ctx.globalAlpha = 0.42;
            ctx.setLineDash([4, 4]);
            roundedRectPath(
              ctx,
              x - missWidth / 2,
              y - 8,
              missWidth,
              16,
              3
            );
            ctx.strokeStyle = "#ff6b5f";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#ff8b82";
            ctx.font = `800 ${isMobile ? 7 : 8}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("RETURNED", x, y);
            ctx.restore();
          }
          continue;
        }

        const bounds = laneBoundsAtY(y);
        const x =
          bounds.left +
          note.lane * bounds.laneWidth +
          bounds.laneWidth / 2;

        const distanceFromTop = y - topY + baseNoteSize;
        const fadeDistance = (hitY - topY) * FADE_IN_ZONE;
        const fadeAlpha = Math.min(
          1,
          Math.max(0, distanceFromTop / Math.max(1, fadeDistance))
        );
        const sizeScale = 0.62 + bounds.t * 0.62;
        const maxPacketWidth = bounds.laneWidth * 0.76;
        const packetWidth = Math.max(
          isMobile ? 22 : 30,
          Math.min(
            maxPacketWidth,
            baseNoteSize * (0.82 + note.packetWeight * 0.78) * sizeScale
          )
        );
        const packetHeight = Math.max(
          isMobile ? 12 : 14,
          baseNoteSize * 0.39 * sizeScale
        );
        const color = LANE_COLORS[note.lane];

        ctx.save();
        ctx.globalAlpha = fadeAlpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        roundedRectPath(
          ctx,
          x - packetWidth / 2,
          y - packetHeight / 2,
          packetWidth,
          packetHeight,
          Math.max(2, packetHeight * 0.2)
        );
        ctx.fillStyle = `${color}d9`;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `${color}ff`;
        ctx.lineWidth = 1;
        ctx.stroke();

        const priorityWidth = Math.max(
          3,
          (packetWidth - 8) * ((note.priority + 1) / 4)
        );
        roundedRectPath(
          ctx,
          x - packetWidth / 2 + 4,
          y - packetHeight / 2 + 3,
          priorityWidth,
          Math.max(2, packetHeight * 0.12),
          1
        );
        ctx.fillStyle = "rgba(255,255,255,0.62)";
        ctx.fill();

        if (!isMobile && packetWidth > 42 && bounds.t > 0.28) {
          ctx.fillStyle = "rgba(0,0,0,0.58)";
          ctx.font = `700 ${Math.max(7, packetHeight * 0.28)}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `0x${note.txHash.slice(-4).toUpperCase()}`,
            x,
            y + packetHeight * 0.12
          );
        }
        ctx.restore();
      }

      // Confirmation feedback.
      const gradeFontSize = isMobile ? 13 : 18;
      for (const note of chart.notes) {
        if (
          !note.hit ||
          !note.hitTime ||
          !note.grade ||
          note.grade === "miss"
        ) {
          continue;
        }
        const age = now - note.hitTime;
        if (age > GRADE_TEXT_DURATION) continue;

        const progress = age / GRADE_TEXT_DURATION;
        const eased = 1 - Math.pow(1 - progress, 3);
        const textAlpha = 1 - eased;
        const textY = hitY - 30 - eased * 42;
        const laneX =
          hitBounds.left +
          note.lane * hitBounds.laneWidth +
          hitBounds.laneWidth / 2;
        const color = GRADE_COLORS[note.grade];

        ctx.save();
        ctx.globalAlpha = Math.max(0, textAlpha);
        ctx.translate(laneX, textY);
        ctx.fillStyle = color;
        ctx.font = `900 ${gradeFontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fillText(GRADE_FEEDBACK[note.grade], 0, 0);
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
