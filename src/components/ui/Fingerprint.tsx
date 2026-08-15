import React, { useMemo } from "react";
import {
  fingerprintRects,
  type Fingerprint as FingerprintData,
} from "@/lib/game/fingerprint";
import { LANE_COLORS, GRADE_COLORS } from "@/lib/game/constants";

const VIEW_WIDTH = 1000;

interface FingerprintProps {
  /** The block's chart-derived fingerprint. Null renders the ghost skeleton. */
  fingerprint: FingerprintData | null;
  /** Rendered height in px. Width always fills the container. */
  height: number;
  gap?: number;
  className?: string;
  /**
   * When true, columns with `painted === false` render in the flat ghost
   * tone instead of their lane hue — used for a specific run's progress
   * (something was or wasn't cleared). When false, every column renders in
   * its lane hue regardless of paint state — used for the block's static
   * artifact preview (ticker thumbnails, unplayed blocks with no run yet).
   */
  ghostUnpainted?: boolean;
  /** Column index of the furthest painted bar — draws the playhead mark. */
  playheadColumn?: number;
}

export function Fingerprint({
  fingerprint,
  height,
  gap = 2,
  className = "",
  ghostUnpainted = true,
  playheadColumn,
}: FingerprintProps) {
  const rects = useMemo(
    () =>
      fingerprint ? fingerprintRects(fingerprint, VIEW_WIDTH, height, gap) : null,
    [fingerprint, height, gap]
  );

  if (!fingerprint || !rects) {
    const cols = 48;
    const barWidth = Math.max(1, VIEW_WIDTH / cols - gap);
    return (
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="none"
        className={`w-full ${className}`}
        style={{ height }}
        aria-hidden="true"
      >
        {Array.from({ length: cols }, (_, i) => {
          const h = height * 0.22;
          return (
            <rect
              key={i}
              x={i * (VIEW_WIDTH / cols)}
              y={height - h}
              width={barWidth}
              height={h}
              rx={1}
              fill="var(--abstrack-ghost)"
            />
          );
        })}
      </svg>
    );
  }

  const playheadX =
    typeof playheadColumn === "number" && playheadColumn >= 0
      ? ((playheadColumn + 1) / fingerprint.columns) * VIEW_WIDTH
      : null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={`Fingerprint for block ${fingerprint.blockNumber}`}
    >
      {rects.map((r) => {
        const isGhost = ghostUnpainted && !r.painted;
        const fill = isGhost
          ? "var(--abstrack-ghost)"
          : r.grade
            ? GRADE_COLORS[r.grade]
            : LANE_COLORS[r.lane];
        return (
          <rect
            key={r.x}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx={Math.min(1.5, r.width / 4)}
            fill={fill}
            opacity={isGhost ? 0.9 : 1}
          />
        );
      })}
      {playheadX !== null && (
        <line
          x1={playheadX}
          x2={playheadX}
          y1={0}
          y2={height}
          stroke="var(--abstrack-dim)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}
    </svg>
  );
}
