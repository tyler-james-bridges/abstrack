import React from "react";

const PACKET_COLORS = ["#2f7f6a", "#3EB95F", "#f2c94c", "#ff6b5f"];

interface BlockMosaicProps {
  seed: number | bigint;
  fill?: number;
  cells?: number;
  className?: string;
}

export function BlockMosaic({
  seed,
  fill = 1,
  cells = 32,
  className = "",
}: BlockMosaicProps) {
  const numericSeed = Number(BigInt(seed) % 997n);
  const filledCells = Math.round(Math.max(0, Math.min(fill, 1)) * cells);

  return (
    <div
      className={`grid grid-cols-8 gap-1 rounded-md border border-white/8 bg-black/40 p-2.5 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: cells }, (_, i) => {
        const color =
          PACKET_COLORS[(i * 3 + numericSeed) % PACKET_COLORS.length];
        const weight = ((numericSeed * 17 + i * 29) % 5) + 1;

        return (
          <span
            key={i}
            className="h-3 rounded-[2px] border"
            style={{
              gridColumn: weight === 5 && i % 9 === 0 ? "span 2" : undefined,
              borderColor:
                i < filledCells ? `${color}8a` : "rgba(255,255,255,0.065)",
              background:
                i < filledCells
                  ? `${color}${weight >= 4 ? "9c" : "62"}`
                  : "rgba(255,255,255,0.025)",
              boxShadow:
                i < filledCells && weight >= 4
                  ? `0 0 8px ${color}16`
                  : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
