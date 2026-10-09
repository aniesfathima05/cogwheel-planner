import { createServerFn } from "@tanstack/react-start";
import { requirementsSchema, type PlannerResult } from "./types";

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requirementsSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; result: PlannerResult } | { ok: false; error: string }> => {
    const { runPlanner, llmPlan, GatewayError } = await import("./planner.server");
    try {
      return { ok: true, result: await runPlanner(data, llmPlan) };
    } catch (e) {
      console.error(e);
      return { ok: false, error: e instanceof GatewayError ? e.message : "Planning failed. Please try again." };
    }
  });
