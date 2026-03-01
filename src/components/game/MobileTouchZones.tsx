"use client";

import React, { useState, useCallback } from "react";
import {
  LANE_COUNT,
  LANE_COLORS,
  LANE_LABELS,
  getCanvasPadding,
} from "@/lib/game/constants";

/**
 * Visual affordance for touch lanes on mobile devices.
 *
 * Key design decisions:
 * - Covers the bottom 40% of the screen so fingers have a generous tap area
 *   that naturally overlaps the hit zone at 85%.
 * - Uses the same canvasPadding-aware lane width that GameCanvas and
 *   InputHandler use so the visual lanes perfectly align with the notes.
 * - Shows subtle lane highlights on tap.  Actual game input is handled
 *   by InputHandler on the parent container, so this component is
 *   purely decorative — it must NOT preventDefault or stop propagation.
 */
export function MobileTouchZones() {
  const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());

  const computeActiveLanes = useCallback(
    (e: React.TouchEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const padding = getCanvasPadding(rect.width);
      const laneAreaWidth = rect.width - padding * 2;
      const laneWidth = laneAreaWidth / LANE_COUNT;

      const newActive = new Set<number>();
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const x = touch.clientX - rect.left;
        // Map touch to padded lane area (same as InputHandler)
        const laneAreaX = x - padding;
        let lane: number;
        if (laneAreaX < 0) {
          lane = 0; // snap left edge to lane 0
        } else if (laneAreaX >= laneAreaWidth) {
          lane = LANE_COUNT - 1; // snap right edge to last lane
        } else {
          lane = Math.floor(laneAreaX / laneWidth);
        }
        if (lane >= 0 && lane < LANE_COUNT) {
          newActive.add(lane);
        }
      }
      setActiveLanes(newActive);
    },
    []
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setActiveLanes(new Set());
      return;
    }
    computeActiveLanes(e);
  }, [computeActiveLanes]);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 md:hidden"
      style={{
        /* Cover the bottom 40% of the viewport — gives a tall, forgiving tap
           area that spans from below the hit zone (85%) all the way to the
           phone home indicator.  Combined with safe-area padding below, this
           ensures nothing is cut off. */
        height: "40%",
        touchAction: "none",
        /* Safe area: push content above the home indicator */
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      onTouchStart={computeActiveLanes}
      onTouchMove={computeActiveLanes}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="relative w-full h-full flex">
        {Array.from({ length: LANE_COUNT }).map((_, i) => {
          const isActive = activeLanes.has(i);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end transition-colors duration-75"
              style={{
                /* Gradient fade-in from transparent at the top to the lane
                   color at the bottom — draws the eye toward the hit zone
                   without obscuring the falling notes. */
                background: isActive
                  ? `linear-gradient(to bottom, transparent 0%, ${LANE_COLORS[i]}30 60%, ${LANE_COLORS[i]}50 100%)`
                  : `linear-gradient(to bottom, transparent 0%, ${LANE_COLORS[i]}08 60%, ${LANE_COLORS[i]}15 100%)`,
                borderLeft:
                  i > 0 ? `1px solid ${LANE_COLORS[i]}20` : undefined,
              }}
            >
              {/* Lane label at the bottom — large and clear */}
              <div
                className="flex flex-col items-center pb-3 sm:pb-4"
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
              >
                <span
                  className="text-base font-bold font-mono"
                  style={{
                    color: LANE_COLORS[i],
                    opacity: isActive ? 0.9 : 0.35,
                    transition: "opacity 75ms",
                  }}
                >
                  {LANE_LABELS[i]}
                </span>
                <span
                  className="text-[9px] uppercase tracking-wider mt-0.5"
                  style={{
                    color: LANE_COLORS[i],
                    opacity: isActive ? 0.6 : 0.15,
                    transition: "opacity 75ms",
                  }}
                >
                  tap
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
