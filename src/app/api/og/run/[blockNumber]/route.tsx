import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getBlockForGame } from "@/lib/chain/blockData";
import { generateBeatChart } from "@/lib/game/BlockBeatGenerator";
import { buildFingerprint, fingerprintRects } from "@/lib/game/fingerprint";
import type { LetterGrade, TimingGrade } from "@/lib/game/types";

export const runtime = "edge";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const CHART_WIDTH = 1080;
const CHART_HEIGHT = 300;

// Satori's color parser doesn't reliably resolve oklch() the way browsers
// do, so the OG card gets its own hex mirror of the app's lane/grade
// tokens rather than importing LANE_COLORS/GRADE_COLORS directly.
const OG_COLORS = {
  background: "#0b0c0b",
  panel: "#121311",
  ghost: "#26271f",
  foreground: "#edebe4",
  dim: "#8d918a",
  faint: "#5c605a",
  perfect: "#a89bf2",
  great: "#5cc78f",
  good: "#c7bd5a",
} as const;

const GRADE_TINT: Record<LetterGrade, TimingGrade> = {
  S: "perfect",
  A: "great",
  B: "good",
  C: "good",
  D: "good",
};

const TINT_COLOR: Record<TimingGrade, string> = {
  perfect: OG_COLORS.perfect,
  great: OG_COLORS.great,
  good: OG_COLORS.good,
  miss: OG_COLORS.ghost,
};

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

async function loadFont(path: string): Promise<ArrayBuffer> {
  const res = await fetch(new URL(path, import.meta.url));
  return res.arrayBuffer();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blockNumber: string }> }
) {
  const { blockNumber: blockNumberStr } = await params;

  let blockNumber: bigint;
  try {
    blockNumber = BigInt(blockNumberStr);
    if (blockNumber <= 0n) throw new Error("invalid");
  } catch {
    return new Response("Invalid block number", { status: 400 });
  }

  const search = request.nextUrl.searchParams;
  const score = clamp(Number(search.get("score")), 0, 1_000_000);
  const acc = clamp(Number(search.get("acc")), 0, 1);
  const gradeParam = search.get("grade");
  const grade: LetterGrade = (
    gradeParam && gradeParam in GRADE_TINT ? gradeParam : "D"
  ) as LetterGrade;
  const combo = clamp(Number(search.get("combo") ?? 0), 0, 100_000);
  const by = search.get("by");

  // Rebuild the chart server-side from the block itself — the client only
  // supplies the run summary numbers, never the art.
  const block = await getBlockForGame(blockNumber);
  const chart = generateBeatChart(block);
  const fingerprint = buildFingerprint(chart);
  const tint = GRADE_TINT[grade];
  const paintedColumns = Math.round(acc * fingerprint.columns);

  const painted = {
    ...fingerprint,
    bars: fingerprint.bars.map((bar) =>
      bar.index < paintedColumns ? { ...bar, painted: true, grade: tint } : bar
    ),
  };

  const rects = fingerprintRects(painted, CHART_WIDTH, CHART_HEIGHT, 3);

  const [roobert, avenueMono] = await Promise.all([
    loadFont("../../../../../fonts/Roobert-Bold.ttf"),
    loadFont("../../../../../fonts/Avenue Mono.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "column",
          background: OG_COLORS.background,
          padding: "48px 60px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 14,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: OG_COLORS.dim,
                fontFamily: "Avenue Mono",
              }}
            >
              ABSTRACK
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                color: OG_COLORS.foreground,
                marginTop: 8,
                fontFamily: "Avenue Mono",
                letterSpacing: -2,
              }}
            >
              {blockNumber.toString()}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: OG_COLORS.dim,
                fontFamily: "Avenue Mono",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Score
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 40,
                color: OG_COLORS.foreground,
                fontFamily: "Avenue Mono",
              }}
            >
              {score.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: CHART_WIDTH,
            height: CHART_HEIGHT,
            marginTop: 40,
            display: "flex",
            background: OG_COLORS.panel,
            borderRadius: 6,
          }}
        >
          {rects.map((r, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: r.x,
                top: r.y,
                width: r.width,
                height: r.height,
                background: r.painted
                  ? TINT_COLOR[r.grade ?? tint]
                  : OG_COLORS.ghost,
                borderRadius: 1,
                display: "flex",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <div style={{ display: "flex", gap: 48 }}>
            {[
              { label: "Accuracy", value: `${(acc * 100).toFixed(1)}%` },
              { label: "Grade", value: grade },
              { label: "Max combo", value: String(combo) },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 12,
                    color: OG_COLORS.dim,
                    fontFamily: "Avenue Mono",
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 24,
                    color: OG_COLORS.foreground,
                    fontFamily: "Avenue Mono",
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {by && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 12,
                  color: OG_COLORS.dim,
                  fontFamily: "Avenue Mono",
                  textTransform: "uppercase",
                }}
              >
                Played by
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: OG_COLORS.foreground,
                  fontFamily: "Avenue Mono",
                }}
              >
                {by.slice(0, 6)}&hellip;{by.slice(-4)}
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts: [
        { name: "Roobert", data: roobert, weight: 700, style: "normal" },
        { name: "Avenue Mono", data: avenueMono, weight: 400, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, immutable, max-age=31536000",
      },
    }
  );
}
