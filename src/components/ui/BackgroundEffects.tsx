import React from "react";

/**
 * Blockspace-inspired ambient backdrop. The interface owns the readable data;
 * this layer only establishes depth, network flow, and the Abstract palette.
 */
export function BackgroundEffects() {
  const packets = [
    { top: "13%", left: "8%", width: 54, color: "#2f7f6a", delay: "0s" },
    { top: "20%", left: "34%", width: 34, color: "#3EB95F", delay: "1.1s" },
    { top: "10%", right: "15%", width: 68, color: "#f2c94c", delay: "0.4s" },
    { top: "31%", right: "5%", width: 42, color: "#ff6b5f", delay: "1.8s" },
    { top: "42%", left: "17%", width: 78, color: "#3EB95F", delay: "2.2s" },
    { top: "58%", right: "22%", width: 48, color: "#2f7f6a", delay: "0.8s" },
  ];

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, #020503 0%, #06100b 42%, #020503 100%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            "linear-gradient(rgba(160,231,171,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(160,231,171,0.035) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 85% 72% at 50% 25%, black, transparent 82%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 72% at 50% 25%, black, transparent 82%)",
        }}
      />

      <div
        className="absolute -top-[20%] left-[5%] h-[55%] w-[62%]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(62,185,95,0.09), transparent 68%)",
          filter: "blur(28px)",
        }}
      />
      <div
        className="absolute right-[-18%] top-[8%] h-[52%] w-[55%]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(242,201,76,0.035), transparent 66%)",
          filter: "blur(34px)",
        }}
      />

      {/* Quiet chain rail in the distance. */}
      <div className="absolute left-[-4%] right-[-4%] top-[49%] hidden items-center md:flex">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3EB95F]/15 to-[#3EB95F]/8" />
        {Array.from({ length: 6 }, (_, i) => (
          <React.Fragment key={i}>
            <div
              className="grid h-16 w-16 shrink-0 grid-cols-4 gap-1 rounded-md border border-[#3EB95F]/10 bg-[#041009]/45 p-2 opacity-45"
              style={{ transform: `translateY(${i % 2 === 0 ? -5 : 5}px)` }}
            >
              {Array.from({ length: 12 }, (_, cell) => (
                <span
                  key={cell}
                  className="rounded-[1px] border border-[#3EB95F]/10 bg-[#3EB95F]/5"
                />
              ))}
            </div>
            <div className="h-px min-w-8 flex-1 bg-[#3EB95F]/10" />
          </React.Fragment>
        ))}
      </div>

      {packets.map((packet, i) => (
        <span
          key={i}
          className="absolute h-2 rounded-[2px] border opacity-28"
          style={{
            top: packet.top,
            left: packet.left,
            right: packet.right,
            width: packet.width,
            color: packet.color,
            borderColor: `${packet.color}55`,
            background: `${packet.color}12`,
            animation: `packet-drift 7s ease-in-out ${packet.delay} infinite`,
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 72% 62% at 50% 34%, transparent 0%, rgba(2,5,3,0.28) 64%, #020503 100%)",
        }}
      />
    </div>
  );
}
