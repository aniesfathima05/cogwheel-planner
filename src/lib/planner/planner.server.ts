import { planJsonSchema, type Attempt, type Plan, type PlannerResult, type Requirements, type Violation } from "./types";
import { decompose, totalCost, validatePlan } from "./validate";

const MAX_REPLANS = 2;

export type PlanFn = (r: Requirements, tasks: string[], feedback: Violation[], prev?: Plan) => Promise<Plan>;

/** Agent graph: decompose -> plan -> validate -> (replan on violations, max 2) -> done */
export async function runPlanner(r: Requirements, plan: PlanFn): Promise<PlannerResult> {
  const decomposition = decompose(r);
  const attempts: Attempt[] = [];
  let feedback: Violation[] = [];
  let prev: Plan | undefined;
  for (let i = 0; i <= MAX_REPLANS; i++) {
    const p = await plan(r, decomposition, feedback, prev);
    const violations = validatePlan(p, r);
    attempts.push({ attempt: i + 1, plan: p, violations });
    if (violations.length === 0) break;
    feedback = violations;
    prev = p;
  }
  const last = attempts[attempts.length - 1]!;
  return { decomposition, attempts, final: last.plan, passed: last.violations.length === 0, totalCost: totalCost(last.plan) };
}

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const llmPlan: PlanFn = async (r, tasks, feedback, prev) => {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(401, "AI is not configured.");
  const sys = "You are an expert technical workshop planner. Produce realistic, complete plans that strictly satisfy every constraint. Times are HH:MM 24h.";
  let user = `Requirements:\n${JSON.stringify(r, null, 2)}\n\nEvent hours: ${r.startTime} for ${r.durationHours} hours. Sessions must not overlap and must fit within these hours. Every session needs an owner. Total budget items must not exceed ${r.budget}. Venue capacity must be >= ${r.participants}.\n\nSubtasks to cover:\n- ${tasks.join("\n- ")}`;
  if (feedback.length && prev)
    user += `\n\nYour previous plan FAILED validation:\n${feedback.map((f) => `- [${f.rule}] ${f.message}`).join("\n")}\n\nPrevious plan:\n${JSON.stringify(prev)}\n\nFix every violation.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: sys,
      input: [{ role: "user", content: user }],
      text: { format: { type: "json_schema", name: "workshop_plan", strict: true, schema: planJsonSchema } },
    }),
  });
  if (!res.ok || !res.body) {
    let msg = `AI request failed (${res.status}).`;
    try { const j = await res.json(); msg = j?.error?.message || j?.message || msg; } catch {}
    if (res.status === 429) msg = "Rate limited. Please wait a moment and try again.";
    if (res.status === 402) msg = msg || "AI credits exhausted.";
    throw new GatewayError(res.status, msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") text += ev.delta;
        if (ev.type === "response.failed" || ev.type === "error") throw new GatewayError(500, ev.error?.message || "AI generation failed.");
      } catch (e) { if (e instanceof GatewayError) throw e; }
    }
  }
  if (!text) throw new GatewayError(500, "The AI returned no plan.");
  return JSON.parse(text) as Plan;
};
