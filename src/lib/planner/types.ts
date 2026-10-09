import { z } from "zod";

export const requirementsSchema = z.object({
  topic: z.string().min(2).max(200),
  date: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(1).max(12),
  participants: z.number().int().min(1).max(5000),
  budget: z.number().min(0).max(10_000_000),
  venue: z.string().max(200),
  facilities: z.string().max(1000),
  sessions: z.string().max(2000),
  additional: z.string().max(2000),
});
export type Requirements = z.infer<typeof requirementsSchema>;

export type Session = { title: string; start: string; end: string; owner: string; description: string };
export type Task = { id: string; name: string; owner: string; dependencies: string[] };
export type BudgetItem = { item: string; cost: number };
export type Responsibility = { role: string; duties: string };

export type Plan = {
  title: string;
  objectives: string[];
  venue: { name: string; capacity: number };
  timetable: Session[];
  tasks: Task[];
  resources: string[];
  participantPlan: string;
  responsibilities: Responsibility[];
  budget: BudgetItem[];
};

export type Violation = { rule: string; message: string };
export type Attempt = { attempt: number; plan: Plan; violations: Violation[] };
export type PlannerResult = {
  decomposition: string[];
  attempts: Attempt[];
  final: Plan;
  passed: boolean;
  totalCost: number;
};

const str = { type: "string" };
export const planJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "objectives", "venue", "timetable", "tasks", "resources", "participantPlan", "responsibilities", "budget"],
  properties: {
    title: str,
    objectives: { type: "array", items: str },
    venue: {
      type: "object", additionalProperties: false, required: ["name", "capacity"],
      properties: { name: str, capacity: { type: "integer" } },
    },
    timetable: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["title", "start", "end", "owner", "description"],
        properties: { title: str, start: { type: "string", description: "HH:MM 24h" }, end: { type: "string", description: "HH:MM 24h" }, owner: str, description: str },
      },
    },
    tasks: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["id", "name", "owner", "dependencies"],
        properties: { id: str, name: str, owner: str, dependencies: { type: "array", items: str } },
      },
    },
    resources: { type: "array", items: str },
    participantPlan: str,
    responsibilities: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["role", "duties"], properties: { role: str, duties: str } },
    },
    budget: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["item", "cost"], properties: { item: str, cost: { type: "number" } } },
    },
  },
} as const;
