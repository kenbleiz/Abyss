import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LONG_ABSENCE_MS,
  STREAK_CONTINUE_MAX_MS,
  WELCOME_AFTER_MS,
  emptyVisit,
  formatAbsence,
  longAbsenceHunger,
  mineCopy,
  ownerGoneLong,
  tickVisit,
  utcDay,
  welcomeCopy,
} from "./visits.ts";

const HOUR = 3_600_000;
const DAY = 86_400_000;

describe("tickVisit", () => {
  it("first presence starts a streak without welcome-back", () => {
    const t0 = Date.UTC(2026, 8, 4, 12, 0, 0);
    const tick = tickVisit(emptyVisit(), t0);
    assert.equal(tick.visitStreak, 1);
    assert.equal(tick.totalVisits, 1);
    assert.equal(tick.lastSeenAt, t0);
    assert.equal(tick.isNewVisit, true);
    assert.equal(tick.isWelcome, false);
    assert.equal(tick.isLongAbsence, false);
  });

  it("same UTC day does not increment or welcome", () => {
    const t0 = Date.UTC(2026, 8, 4, 10, 0, 0);
    const later = t0 + 8 * HOUR;
    const tick = tickVisit({ lastSeenAt: t0, visitStreak: 3, totalVisits: 5 }, later);
    assert.equal(tick.visitStreak, 3);
    assert.equal(tick.totalVisits, 5);
    assert.equal(tick.lastSeenAt, later);
    assert.equal(tick.isNewVisit, false);
    assert.equal(tick.isWelcome, false);
  });

  it("next evening after 20h continues streak and welcomes", () => {
    const t0 = Date.UTC(2026, 8, 4, 22, 0, 0);
    const next = t0 + 20 * HOUR;
    const tick = tickVisit({ lastSeenAt: t0, visitStreak: 2, totalVisits: 2 }, next);
    assert.equal(utcDay(next), utcDay(t0) + 1);
    assert.equal(tick.visitStreak, 3);
    assert.equal(tick.totalVisits, 3);
    assert.equal(tick.isNewVisit, true);
    assert.equal(tick.isWelcome, true);
    assert.equal(tick.isLongAbsence, false);
    assert.ok(next - t0 >= WELCOME_AFTER_MS);
  });

  it("midnight crossing under 18h bumps the day streak without welcome", () => {
    const t0 = Date.UTC(2026, 8, 4, 23, 30, 0);
    const next = t0 + 2 * HOUR;
    const tick = tickVisit({ lastSeenAt: t0, visitStreak: 1, totalVisits: 1 }, next);
    assert.equal(tick.visitStreak, 2);
    assert.equal(tick.isNewVisit, true);
    assert.equal(tick.isWelcome, false);
  });

  it("gap beyond the continue window resets streak but still welcomes", () => {
    const t0 = Date.UTC(2026, 8, 1, 18, 0, 0);
    const next = t0 + STREAK_CONTINUE_MAX_MS + HOUR;
    const tick = tickVisit({ lastSeenAt: t0, visitStreak: 8, totalVisits: 12 }, next);
    assert.equal(tick.visitStreak, 1);
    assert.equal(tick.totalVisits, 13);
    assert.equal(tick.isWelcome, true);
    assert.equal(tick.isLongAbsence, false);
  });

  it("three-plus days is a long absence, streak resets to 1", () => {
    const t0 = Date.UTC(2026, 8, 1, 12, 0, 0);
    const next = t0 + LONG_ABSENCE_MS + DAY;
    const tick = tickVisit({ lastSeenAt: t0, visitStreak: 6, totalVisits: 9 }, next);
    assert.equal(tick.visitStreak, 1);
    assert.equal(tick.isWelcome, true);
    assert.equal(tick.isLongAbsence, true);
    assert.ok(tick.hoursAway >= 72);
  });
});

describe("absence helpers", () => {
  it("floors narrative hunger without starving to egg range", () => {
    assert.equal(longAbsenceHunger(4), 14);
    assert.equal(longAbsenceHunger(90), 26);
    assert.equal(longAbsenceHunger(20), 20);
  });

  it("ownerGoneLong is false under 3 days", () => {
    const now = Date.UTC(2026, 8, 4);
    assert.equal(ownerGoneLong(now - 2 * DAY, now), false);
    assert.equal(ownerGoneLong(now - LONG_ABSENCE_MS, now), true);
    assert.equal(ownerGoneLong(null, now), false);
  });

  it("formats absence and overlay copy in French", () => {
    assert.equal(formatAbsence(5), "5h");
    assert.equal(formatAbsence(72), "3j");
    assert.equal(
      welcomeCopy("Ken", "Nemo", {
        lastSeenAt: 1,
        visitStreak: 4,
        totalVisits: 4,
        isNewVisit: true,
        isWelcome: true,
        isLongAbsence: false,
        hoursAway: 22,
      }),
      "Ken est de retour · Nemo · série 4",
    );
    assert.match(
      welcomeCopy("Ken", "Nemo", {
        lastSeenAt: 1,
        visitStreak: 1,
        totalVisits: 8,
        isNewVisit: true,
        isWelcome: true,
        isLongAbsence: true,
        hoursAway: 80,
      }),
      /languissait/,
    );
    assert.equal(mineCopy("Nemo", 1, 1), "Nemo · série 1 jour");
    assert.equal(mineCopy("Nemo", 5, 12), "Nemo · série 5 jours · 12 visites");
  });
});
