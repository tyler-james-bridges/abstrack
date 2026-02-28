import React from "react";

export function BackgroundEffects() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f0f_1px,transparent_1px),linear-gradient(to_bottom,#0f0f0f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Aurora gradients - teal/blue theme for TEMPO */}
      <div className="absolute top-0 left-0 right-0 h-[70vh] bg-gradient-to-b from-[#4ecdc4] to-transparent opacity-10 blur-[100px]" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-[#45b7d1] to-transparent opacity-8 blur-3xl" />
      <div className="absolute top-1/3 left-0 w-1/3 h-1/3 bg-gradient-to-br from-[#ffd700] to-transparent opacity-5 blur-3xl" />
    </div>
  );
}
