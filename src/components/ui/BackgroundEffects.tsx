import React from "react";

/**
 * Synthwave-inspired background with animated perspective grid,
 * horizon glow, and floating star particles.
 */
export function BackgroundEffects() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Deep space gradient — dark blue/purple tint at top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #030308 0%, #06060f 30%, #080812 50%, #0a0a0a 100%)",
        }}
      />

      {/* Upper atmosphere glow — subtle teal nebula */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[40%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(182,255,0,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Horizon glow line */}
      <div className="absolute left-0 right-0" style={{ top: "48%" }}>
        <div
          className="h-[1px] mx-auto"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, rgba(182,255,0,0.5) 30%, rgba(148,216,45,0.6) 50%, rgba(182,255,0,0.5) 70%, transparent 95%)",
            animation: "horizon-pulse 4s ease-in-out infinite",
          }}
        />
        {/* Horizon bloom — soft glow beneath the line */}
        <div
          className="h-16 mx-auto"
          style={{
            background:
              "linear-gradient(to bottom, rgba(182,255,0,0.08) 0%, rgba(148,216,45,0.03) 40%, transparent 100%)",
            filter: "blur(4px)",
          }}
        />
      </div>

      {/* Perspective floor grid (retro web3) */}
      <div
        className="absolute left-[-50%] right-[-50%] bottom-[-60%]"
        style={{
          top: "48%",
          backgroundImage: `
            linear-gradient(to right, rgba(62,185,95,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(62,185,95,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "100px 70px",
          transform: "perspective(520px) rotateX(62deg)",
          transformOrigin: "center top",
          animation: "grid-flow 3.4s linear infinite",
          maskImage:
            "radial-gradient(ellipse 64% 82% at 50% 0%, black 0%, transparent 74%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 64% 82% at 50% 0%, black 0%, transparent 74%)",
        }}
      />

      {/* Rhythm highway overlay (Guitar Hero vibe) */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: "48%",
          width: "min(92vw, 980px)",
          height: "70%",
          transform: "perspective(560px) rotateX(64deg)",
          transformOrigin: "center top",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 8%, rgba(0,0,0,0.15) 78%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 8%, rgba(0,0,0,0.15) 78%, transparent 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(8,12,9,0.05), rgba(8,12,9,0.55) 40%, rgba(8,12,9,0.85))",
            borderLeft: "1px solid rgba(160,231,171,0.18)",
            borderRight: "1px solid rgba(160,231,171,0.18)",
          }}
        />

        {/* lane separators */}
        {[25, 50, 75].map((x) => (
          <div
            key={x}
            className="absolute top-0 bottom-0"
            style={{
              left: `${x}%`,
              width: "1px",
              background: "linear-gradient(to bottom, rgba(160,231,171,0.38), rgba(160,231,171,0.08))",
            }}
          />
        ))}

        {/* center dash flow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[3px]"
          style={{
            backgroundImage: "repeating-linear-gradient(to bottom, rgba(62,185,95,0.7) 0 16px, transparent 16px 34px)",
            animation: "road-scroll 0.9s linear infinite",
            filter: "drop-shadow(0 0 8px rgba(62,185,95,0.35))",
          }}
        />
      </div>

      {/* Secondary accent — gold glow top-right */}
      <div
        className="absolute top-[5%] right-[10%] w-32 h-32 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,215,0,0.04) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Star particles — scattered with twinkle animation */}
      {[
        { top: "8%", left: "15%", size: 2, delay: "0s", duration: "4s" },
        { top: "12%", left: "45%", size: 1.5, delay: "1.2s", duration: "3s" },
        { top: "6%", right: "25%", size: 1, delay: "0.5s", duration: "5s" },
        { top: "20%", left: "70%", size: 2, delay: "2s", duration: "3.5s" },
        { top: "15%", left: "30%", size: 1, delay: "1.8s", duration: "4.5s" },
        { top: "25%", right: "40%", size: 1.5, delay: "0.8s", duration: "3.8s" },
        { top: "10%", right: "60%", size: 1, delay: "3s", duration: "4.2s" },
        { top: "30%", left: "55%", size: 1.5, delay: "1.5s", duration: "3.2s" },
        { top: "18%", left: "85%", size: 1, delay: "2.5s", duration: "4.8s" },
        { top: "35%", left: "10%", size: 2, delay: "0.3s", duration: "5.5s" },
      ].map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
            right: star.right,
            width: star.size,
            height: star.size,
            animation: `twinkle ${star.duration} ease-in-out ${star.delay} infinite`,
          }}
        />
      ))}

      {/* Bottom fade to pure black */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[20%]"
        style={{
          background:
            "linear-gradient(to bottom, transparent, #0a0a0a)",
        }}
      />
    </div>
  );
}
