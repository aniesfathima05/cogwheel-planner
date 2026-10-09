import { describe, expect, it } from "vitest";
import { validatePlan, decompose } from "@/lib/planner/validate";
import { runPlanner } from "@/lib/planner/planner.server";
import type { Plan, Requirements } from "@/lib/planner/types";

const req: Requirements = {
  topic: "LLM Agents", date: "2026-11-01", startTime: "09:00", durationHours: 4, participants: 50,
  budget: 1000, venue: "", facilities: "", sessions: "", additional: "",
};
const good: Plan = {
  title: "T", objectives: ["o"], venue: { name: "Hall", capacity: 60 },
  timetable: [
    { title: "A", start: "09:00", end: "10:30", owner: "Lead", description: "" },
    { title: "B", start: "10:30", end: "12:00", owner: "Speaker", description: "" },
  ],
  tasks: [{ id: "t1", name: "Book", owner: "Ops", dependencies: [] }],
  resources: ["Projector"], participantPlan: "p",
  responsibilities: [{ role: "Ops", duties: "d" }], budget: [{ item: "Venue", cost: 800 }],
};

describe("validation", () => {
  it("passes a valid plan", () => expect(validatePlan(good, req)).toEqual([]));
  it("detects all violation types", () => {
    const bad: Plan = {
      ...good, venue: { name: "x", capacity: 10 }, budget: [{ item: "x", cost: 2000 }], resources: [], responsibilities: [],
      timetable: [
        { title: "A", start: "09:00", end: "11:00", owner: "", description: "" },
        { title: "B", start: "10:00", end: "14:00", owner: "X", description: "" },
      ],
    };
    const rules = validatePlan(bad, req).map((v) => v.rule);
    for (const r of ["Budget", "Capacity", "Owner", "Overlap", "Event hours", "Resources", "Responsibilities"]) expect(rules).toContain(r);
  });
  it("decomposes tasks", () => expect(decompose(req).length).toBeGreaterThan(3));
});

describe("agent loop", () => {
  it("replans with feedback until valid", async () => {
    const fb: number[] = [];
    let n = 0;
    const res = await runPlanner(req, async (_r, _t, f) => {
      fb.push(f.length);
      return ++n < 2 ? { ...good, budget: [{ item: "x", cost: 5000 }] } : good;
    });
    expect(res.passed).toBe(true);
    expect(res.attempts).toHaveLength(2);
    expect(fb[1]).toBeGreaterThan(0);
  });
  it("stops after 2 replans", async () => {
    const res = await runPlanner(req, async () => ({ ...good, venue: { name: "x", capacity: 1 } }));
    expect(res.attempts).toHaveLength(3);
    expect(res.passed).toBe(false);
  });
});
