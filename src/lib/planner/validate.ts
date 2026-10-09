import type { Plan, Requirements, Violation } from "./types";

export const toMin = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
};

export const totalCost = (p: Plan) => p.budget.reduce((s, b) => s + (Number(b.cost) || 0), 0);

export function decompose(r: Requirements): string[] {
  return [
    `Confirm venue for ${r.participants} participants${r.venue ? ` (prefer ${r.venue})` : ""}`,
    `Design agenda on "${r.topic}" within ${r.durationHours}h from ${r.startTime}`,
    "Assign speakers / facilitators to every session",
    "List equipment and facilities needed",
    "Plan registration, check-in and participant communication",
    `Build itemized budget under ${r.budget}`,
    "Define team responsibilities and task dependencies",
  ];
}

export function validatePlan(p: Plan, r: Requirements): Violation[] {
  const v: Violation[] = [];
  const cost = totalCost(p);
  if (cost > r.budget) v.push({ rule: "Budget", message: `Total cost ${cost} exceeds budget ${r.budget}.` });
  if (!(p.venue?.capacity >= r.participants))
    v.push({ rule: "Capacity", message: `Venue capacity ${p.venue?.capacity ?? 0} is below ${r.participants} participants.` });

  const dayStart = toMin(r.startTime);
  const dayEnd = dayStart + r.durationHours * 60;
  const sessions = [...p.timetable].map((s) => ({ ...s, s: toMin(s.start), e: toMin(s.end) }));
  if (sessions.length === 0) v.push({ rule: "Timetable", message: "Timetable has no sessions." });
  for (const s of sessions) {
    if (isNaN(s.s) || isNaN(s.e) || s.e <= s.s)
      v.push({ rule: "Timing", message: `"${s.title}" has invalid times ${s.start}-${s.end}.` });
    else if (s.s < dayStart || s.e > dayEnd)
      v.push({ rule: "Event hours", message: `"${s.title}" (${s.start}-${s.end}) falls outside event hours.` });
    if (!s.owner?.trim()) v.push({ rule: "Owner", message: `"${s.title}" has no responsible person or role.` });
  }
  const sorted = sessions.filter((s) => !isNaN(s.s)).sort((a, b) => a.s - b.s);
  sorted.forEach((cur, i) => {
    const prev = sorted[i - 1];
    if (prev && cur.s < prev.e) v.push({ rule: "Overlap", message: `"${prev.title}" overlaps "${cur.title}".` });
  });

  if (!p.resources?.length) v.push({ rule: "Resources", message: "No required resources listed." });
  if (!p.responsibilities?.length) v.push({ rule: "Responsibilities", message: "No responsibilities listed." });
  return v;
}
