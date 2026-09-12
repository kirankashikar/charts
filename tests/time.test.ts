import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { relativeTime } from "../src/lib/time";

describe("time lib", () => {
  it("formats very recent timestamps as just now", () => {
    const now = new Date();
    assert.equal(relativeTime(now, now), "just now");
    assert.equal(relativeTime(new Date(now.getTime() - 30 * 1000), now), "just now");
  });

  it("formats minute differences", () => {
    const now = new Date();
    assert.equal(relativeTime(new Date(now.getTime() - 15 * 60 * 1000), now), "15m ago");
    assert.equal(relativeTime(new Date(now.getTime() - 45 * 60 * 1000), now), "45m ago");
  });

  it("formats hour differences", () => {
    const now = new Date();
    assert.equal(relativeTime(new Date(now.getTime() - 3 * 60 * 60 * 1000), now), "3h ago");
    assert.equal(relativeTime(new Date(now.getTime() - 20 * 60 * 60 * 1000), now), "20h ago");
  });

  it("formats days and weeks", () => {
    const now = new Date();
    assert.equal(relativeTime(new Date(now.getTime() - 24 * 60 * 60 * 1000), now), "yesterday");
    assert.equal(relativeTime(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), now), "3d ago");
    assert.equal(relativeTime(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), now), "last week");
  });

  it("parses ISO date strings correctly", () => {
    const now = new Date("2026-09-12T12:00:00Z");
    const past = "2026-09-12T11:50:00Z";
    assert.equal(relativeTime(past, now), "10m ago");
  });
});
