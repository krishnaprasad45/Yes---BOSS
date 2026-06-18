import assert from "node:assert";
import { sumTrackMeters, type TrackPoint } from "../src/location/location.service";

/** Build a point at an absolute second offset from a fixed base time. */
const base = new Date("2026-06-18T09:00:00.000Z").getTime();
const at = (lat: number, lng: number, sec: number): TrackPoint => ({
  lat,
  lng,
  recordedAt: new Date(base + sec * 1000),
});

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok - ${name}`);
}

// ~0.001° latitude ≈ 111.2 m. Two 30-s-apart hops north = one continuous track.
check("continuous track sums each hop (~222 m)", () => {
  const m = sumTrackMeters([
    at(12.9700, 77.5946, 0),
    at(12.9710, 77.5946, 30),
    at(12.9720, 77.5946, 60),
  ]);
  assert.ok(Math.abs(m - 222.4) < 2, `expected ~222 m, got ${m}`);
});

// 8-day jump between separate trips must NOT count (gap > 5 min guard).
check("teleport across a day gap is skipped", () => {
  const m = sumTrackMeters([
    at(12.9716, 77.5946, 0), // Bangalore
    { lat: 24.5741, lng: 73.709, recordedAt: new Date(base + 8 * 86400_000) }, // Udaipur, 8d later
  ]);
  assert.strictEqual(m, 0, `expected 0 m, got ${m}`);
});

// Sub-10 m wobble while standing still is jitter, not travel.
check("GPS jitter below 10 m is ignored", () => {
  const m = sumTrackMeters([
    at(12.9700, 77.5946, 0),
    at(12.970005, 77.5946, 5), // ~0.55 m north
  ]);
  assert.strictEqual(m, 0, `expected 0 m, got ${m}`);
});

// A real track followed by a teleport: only the track distance survives.
check("mixed track + teleport counts only the track", () => {
  const m = sumTrackMeters([
    at(12.9700, 77.5946, 0),
    at(12.9710, 77.5946, 30), // +111 m (counts)
    { lat: 24.5741, lng: 73.709, recordedAt: new Date(base + 86400_000) }, // teleport (skipped)
  ]);
  assert.ok(Math.abs(m - 111.2) < 2, `expected ~111 m, got ${m}`);
});

// Single point (stationary capture) yields no distance.
check("single point yields 0", () => {
  assert.strictEqual(sumTrackMeters([at(12.97, 77.59, 0)]), 0);
});

console.log(`\n${passed} passed`);
