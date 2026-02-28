"use client";

import React, { useState, useCallback } from "react";
import { LANE_COUNT, LANE_COLORS, LANE_LABELS } from "@/lib/game/constants";

/**
 * Visual affordance for touch lanes on mobile devices.
 * These are transparent overlay zones that light up when tapped.
 * The actual touch handling is done by InputHandler on the parent container.
 */
export function MobileTouchZones() {
  const [activeLanes, setActiveLanes] = useState<Set<number>>(new Set());

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't prevent default or handle input here — InputHandler does that.
    // This is purely visual.
    const rect = e.currentTarget.getBoundingClientRect();
    const newActive = new Set<number>();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX - rect.left;
      const laneWidth = rect.width / LANE_COUNT;
      const lane = Math.floor(x / laneWidth);
      if (lane >= 0 && lane < LANE_COUNT) {
        newActive.add(lane);
      }
    }
    setActiveLanes(newActive);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newActive = new Set<number>();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX - rect.left;
      const laneWidth = rect.width / LANE_COUNT;
      const lane = Math.floor(x / laneWidth);
      if (lane >= 0 && lane < LANE_COUNT) {
        newActive.add(lane);
      }
    }
    setActiveLanes(newActive);
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-28 z-10 md:hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      <div className="relative w-full h-full flex">
        {Array.from({ length: LANE_COUNT }).map((_, i) => {
          const isActive = activeLanes.has(i);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-center border-t transition-colors duration-75"
              style={{
                borderColor: LANE_COLORS[i] + "40",
                backgroundColor: isActive
                  ? LANE_COLORS[i] + "25"
                  : LANE_COLORS[i] + "08",
              }}
            >
              <span
                className="text-sm font-bold font-mono opacity-40"
                style={{ color: LANE_COLORS[i] }}
              >
                {LANE_LABELS[i]}
              </span>
              <span className="text-[10px] text-white/20 mt-0.5">TAP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
