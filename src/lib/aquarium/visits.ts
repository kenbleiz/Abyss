/** Visit / streak loop for adopted fish. Wall-clock, nick identity. */

export const WELCOME_AFTER_MS = 18 * 60 * 60 * 1000;
export const STREAK_CONTINUE_MAX_MS = 40 * 60 * 60 * 1000;
export const LONG_ABSENCE_MS = 3 * 24 * 60 * 60 * 1000;

export interface VisitState {
  lastSeenAt: number | null;
  visitStreak: number;
  totalVisits: number;
}

export interface VisitTick extends VisitState {
  lastSeenAt: number;
  /** First counted visit of a new UTC day (or first ever). */
  isNewVisit: boolean;
  /** Returning after ≥18h — overlay welcome, not first-ever adopt. */
  isWelcome: boolean;
  /** Gone ≥3 days: narrative hunger then joy, never egg/death. */
  isLongAbsence: boolean;
  hoursAway: number;
}

export function utcDay(ts: number): number {
  return Math.floor(ts / 86_400_000);
}

export function tickVisit(prev: VisitState, now: number): VisitTick {
  const last =
    typeof prev.lastSeenAt === "number" && prev.lastSeenAt > 0 ? prev.lastSeenAt : null;
  const streak0 = Math.max(0, Math.floor(prev.visitStreak || 0));
  const total0 = Math.max(0, Math.floor(prev.totalVisits || 0));

  if (!last) {
    return {
      lastSeenAt: now,
      visitStreak: 1,
      totalVisits: Math.max(1, total0 || 1),
      isNewVisit: true,
      isWelcome: false,
      isLongAbsence: false,
      hoursAway: 0,
    };
  }

  const gap = Math.max(0, now - last);
  const hoursAway = gap / 3_600_000;

  if (utcDay(now) === utcDay(last)) {
    return {
      lastSeenAt: now,
      visitStreak: Math.max(1, streak0),
      totalVisits: Math.max(1, total0),
      isNewVisit: false,
      isWelcome: false,
      isLongAbsence: false,
      hoursAway,
    };
  }

  const consecutiveDay = utcDay(now) === utcDay(last) + 1;
  const continueStreak = consecutiveDay || gap <= STREAK_CONTINUE_MAX_MS;
  const visitStreak = continueStreak ? Math.max(1, streak0) + 1 : 1;

  return {
    lastSeenAt: now,
    visitStreak,
    totalVisits: total0 + 1,
    isNewVisit: true,
    isWelcome: gap >= WELCOME_AFTER_MS,
    isLongAbsence: gap >= LONG_ABSENCE_MS,
    hoursAway,
  };
}

export function ownerGoneLong(lastSeenAt: number | null, now: number): boolean {
  return Boolean(lastSeenAt && lastSeenAt > 0 && now - lastSeenAt >= LONG_ABSENCE_MS);
}

/** Narrative hunger while the adopter is away a long time — sad, not dying. */
export function longAbsenceHunger(hunger: number): number {
  return Math.min(Math.max(hunger, 14), 26);
}

export function formatAbsence(hours: number): string {
  if (hours >= 48) return `${Math.max(2, Math.round(hours / 24))}j`;
  if (hours >= 1.5) return `${Math.round(hours)}h`;
  return "";
}

export function welcomeCopy(user: string, fishName: string, tick: VisitTick): string {
  const away = formatAbsence(tick.hoursAway);
  if (tick.isLongAbsence) {
    return `${fishName} languissait${away ? ` · ${away}` : ""} · ${user} est de retour`;
  }
  if (tick.visitStreak >= 2) {
    return `${user} est de retour · ${fishName} · série ${tick.visitStreak}`;
  }
  return `${user} est de retour · ${fishName} t'attendait`;
}

export function mineCopy(fishName: string, streak: number, totalVisits: number): string {
  const s = Math.max(1, streak);
  const days = s <= 1 ? "1 jour" : `${s} jours`;
  const visits = totalVisits > s ? ` · ${totalVisits} visites` : "";
  return `${fishName} · série ${days}${visits}`;
}

export function emptyVisit(): VisitState {
  return { lastSeenAt: null, visitStreak: 0, totalVisits: 0 };
}
