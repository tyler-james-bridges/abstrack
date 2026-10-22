/**
 * Run with:  pnpm test
 * Node's type stripper does not add extensions, so the script registers a
 * resolver for extensionless .ts imports. Node 22+. No new dependencies.
 *
 * These tests protect the one property everything else depends on:
 * the fingerprint is a pure function of the block.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { generateBeatChart } from "./BlockBeatGenerator";
import type { BlockData } from "../chain/blockData";
import {
  buildFingerprint,
  paintFingerprint,
  fingerprintRects,
  furthestPainted,
  FINGERPRINT_VERSION,
} from "./fingerprint";

const BLOCK: BlockData = {
  number: 14902331n,
  hash: "0x8f3c9a21b74e0d5cc1a6f0e93b7d2481a5c0e7f39b64d2c8a10fe5b73c9d0a91",
  gasUsed: 12_400_000n,
  timestamp: 1_754_870_400n,
  transactions: Array.from(
    { length: 184 },
    (_, i) => `0x${(i + 1).toString(16).padStart(64, "a")}` as `0x${string}`
  ),
};

test("same block produces an identical fingerprint", () => {
  const a = buildFingerprint(generateBeatChart(BLOCK));
  const b = buildFingerprint(generateBeatChart(BLOCK));
  assert.deepEqual(a.bars, b.bars);
  assert.equal(a.version, FINGERPRINT_VERSION);
});

test("a different block produces a different fingerprint", () => {
  const other: BlockData = {
    ...BLOCK,
    number: 14902332n,
    hash: "0x1d70e4b2af88c3591e0b62d7ac4f10938e5c7b21d0af69c34e8d1720bf53ca6e",
  };
  const a = buildFingerprint(generateBeatChart(BLOCK));
  const b = buildFingerprint(generateBeatChart(other));
  assert.notDeepEqual(a.bars, b.bars);
});

test("column count is respected and heights stay in range", () => {
  const fp = buildFingerprint(generateBeatChart(BLOCK), 48);
  assert.equal(fp.columns, 48);
  assert.equal(fp.bars.length, 48);
  for (const bar of fp.bars) {
    assert.ok(bar.height > 0 && bar.height <= 1, `height ${bar.height}`);
    assert.ok(bar.lane >= 0 && bar.lane <= 3);
  }
});

test("an unplayed fingerprint is entirely unpainted", () => {
  const fp = buildFingerprint(generateBeatChart(BLOCK));
  assert.equal(fp.progress, 0);
  assert.equal(furthestPainted(fp), -1);
  assert.ok(fp.bars.every((b) => !b.painted));
});

test("a perfect run paints every playable column", () => {
  const chart = generateBeatChart(BLOCK);
  const fp = buildFingerprint(chart);
  const notes = chart.notes.map((n) => ({
    ...n,
    hit: true,
    grade: "perfect" as const,
  }));
  const painted = paintFingerprint(fp, notes);
  assert.equal(painted.progress, 1);
  assert.ok(painted.bars.some((b) => b.grade === "perfect"));
});

test("a missed note leaves its column grey", () => {
  const chart = generateBeatChart(BLOCK);
  const fp = buildFingerprint(chart);
  const notes = chart.notes.map((n, i) => ({
    ...n,
    hit: true,
    grade: (i === 0 ? "miss" : "great") as "miss" | "great",
  }));
  const painted = paintFingerprint(fp, notes);
  assert.ok(painted.progress < 1);
  assert.ok(painted.bars.some((b) => !b.painted));
});

test("rects fill the box and never exceed it", () => {
  const fp = buildFingerprint(generateBeatChart(BLOCK), 96);
  const rects = fingerprintRects(fp, 1200, 360);
  assert.equal(rects.length, 96);
  for (const r of rects) {
    assert.ok(r.x >= 0 && r.x + r.width <= 1200.001);
    assert.ok(r.y >= 0 && r.y + r.height <= 360.001);
  }
});
