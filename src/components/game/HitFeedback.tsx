"use client";

import React, { useEffect, useState, useRef } from "react";
import type { HitResult } from "@/lib/game/types";
import { GRADE_COLORS } from "@/lib/game/constants";

interface FeedbackItem {
  id: number;
  result: HitResult;
  createdAt: number;
}

interface HitFeedbackProps {
  latestHit: HitResult | null;
}

let feedbackCounter = 0;

export function HitFeedback({ latestHit }: HitFeedbackProps) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!latestHit) return;

    const item: FeedbackItem = {
      id: feedbackCounter++,
      result: latestHit,
      createdAt: performance.now(),
    };

    setItems((prev) => [...prev.slice(-4), item]);

    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }, 800);

    return () => clearTimeout(timer);
  }, [latestHit]);

  // Use requestAnimationFrame for smooth animation updates
  useEffect(() => {
    if (items.length === 0) return;

    const tick = () => {
      // Force a re-render for smooth animation
      setItems((prev) => [...prev]);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animRef.current);
  }, [items.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {items.map((item) => {
        const age = (performance.now() - item.createdAt) / 800;
        const clampedAge = Math.min(age, 1);
        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - clampedAge, 3);
        const opacity = 1 - eased;
        const translateY = -eased * 50;
        const scale = 1 + eased * 0.3;
        const color = GRADE_COLORS[item.result.grade];
        const label = item.result.grade.toUpperCase();

        return (
          <div
            key={item.id}
            className="absolute left-1/2 -translate-x-1/2 text-center font-black text-xl sm:text-2xl tracking-wider"
            style={{
              top: "76%",
              color,
              opacity: Math.max(0, opacity),
              transform: `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
              textShadow: `0 0 20px ${color}, 0 0 40px ${color}40`,
              willChange: "transform, opacity",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
