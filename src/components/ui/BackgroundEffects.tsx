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
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(78,205,196,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Horizon glow line */}
      <div className="absolute left-0 right-0" style={{ top: "48%" }}>
        <div
          className="h-[1px] mx-auto"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, rgba(78,205,196,0.5) 30%, rgba(69,183,209,0.6) 50%, rgba(78,205,196,0.5) 70%, transparent 95%)",
            animation: "horizon-pulse 4s ease-in-out infinite",
          }}
        />
        {/* Horizon bloom — soft glow beneath the line */}
        <div
          className="h-16 mx-auto"
          style={{
            background:
              "linear-gradient(to bottom, rgba(78,205,196,0.08) 0%, rgba(69,183,209,0.03) 40%, transparent 100%)",
            filter: "blur(4px)",
          }}
        />
      </div>

      {/* Perspective grid floor */}
      <div
        className="absolute left-[-50%] right-[-50%] bottom-[-60%]"
        style={{
          top: "48%",
          backgroundImage: `
            linear-gradient(to right, rgba(78,205,196,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(78,205,196,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "80px 60px",
          transform: "perspective(400px) rotateX(55deg)",
          transformOrigin: "center top",
          animation: "grid-flow 3s linear infinite",
          maskImage:
            "radial-gradient(ellipse 60% 80% at 50% 0%, black 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 80% at 50% 0%, black 0%, transparent 70%)",
        }}
      />

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
