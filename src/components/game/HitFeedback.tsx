"use client";

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!latestHit) return;

    const item: FeedbackItem = {
      id: feedbackCounter++,
      result: latestHit,
      createdAt: Date.now(),
    };

    setItems((prev) => [...prev.slice(-4), item]);

    const timer = setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }, 600);

    return () => clearTimeout(timer);
  }, [latestHit]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {items.map((item) => {
        const age = (Date.now() - item.createdAt) / 600;
        const opacity = 1 - age;
        const translateY = -age * 40;
        const color = GRADE_COLORS[item.result.grade];
        const label = item.result.grade.toUpperCase();

        return (
          <div
            key={item.id}
            className="absolute left-1/2 -translate-x-1/2 text-center font-black text-2xl tracking-wider"
            style={{
              top: "78%",
              color,
              opacity: Math.max(0, opacity),
              transform: `translateX(-50%) translateY(${translateY}px) scale(${1 + age * 0.2})`,
              textShadow: `0 0 20px ${color}`,
              transition: "none",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
