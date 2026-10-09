import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, CheckCircle2, Download, Loader2, Users, Wallet, XCircle, Workflow, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { generatePlan } from "@/lib/planner/planner.functions";
import type { PlannerResult, Requirements } from "@/lib/planner/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agentic AI Technical Workshop Planner" },
      { name: "description", content: "Plan technical workshops with an AI agent that decomposes tasks, validates constraints and replans." },
      { property: "og:title", content: "Agentic AI Technical Workshop Planner" },
      { property: "og:description", content: "AI agent that plans, validates and replans technical workshops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const initial: Requirements = {
  topic: "Building Agentic AI with LangGraph", date: "2026-11-14", startTime: "09:00", durationHours: 6,
  participants: 40, budget: 3000, venue: "University Innovation Lab", facilities: "Projector, Wi-Fi, whiteboards",
  sessions: "Intro to agents, hands-on lab, panel discussion", additional: "Vegetarian lunch, accessibility support",
};

function Index() {
  const run = useServerFn(generatePlan);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlannerResult | null>(null);
  const set = (k: keyof Requirements, num = false) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: num ? Number(e.target.value) : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await run({ data: form });
      if (r.ok) setResult(r.result); else setError(r.error);
    } catch { setError("Please check the form values and try again."); }
    finally { setLoading(false); }
  }

  function download() {
    const blob = new Blob([JSON.stringify({ requirements: form, ...result }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "workshop-plan.json"; a.click();
  }

  const p = result?.final;
  return (
    <div className="min-h-screen bg-hero font-sans lg:flex">
      <aside className="border-b border-sidebar-border bg-sidebar p-6 lg:sticky lg:top-0 lg:h-screen lg:w-96 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Workflow className="h-5 w-5" /></div>
          <div><h1 className="font-display text-lg leading-tight text-sidebar-foreground">Workshop Planner</h1><p className="text-xs text-muted-foreground">Agentic AI</p></div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <F l="Workshop topic"><Input value={form.topic} onChange={set("topic")} required /></F>
          <div className="grid grid-cols-2 gap-2">
            <F l="Date"><Input type="date" value={form.date} onChange={set("date")} required /></F>
            <F l="Start time"><Input type="time" value={form.startTime} onChange={set("startTime")} required /></F>
            <F l="Duration (hrs)"><Input type="number" min={1} max={12} value={form.durationHours} onChange={set("durationHours", true)} /></F>
            <F l="Participants"><Input type="number" min={1} value={form.participants} onChange={set("participants", true)} /></F>
          </div>
          <F l="Budget limit"><Input type="number" min={0} value={form.budget} onChange={set("budget", true)} /></F>
          <F l="Preferred venue"><Input value={form.venue} onChange={set("venue")} /></F>
          <F l="Available facilities"><Textarea rows={2} value={form.facilities} onChange={set("facilities")} /></F>
          <F l="Preferred sessions"><Textarea rows={2} value={form.sessions} onChange={set("sessions")} /></F>
          <F l="Additional requirements"><Textarea rows={2} value={form.additional} onChange={set("additional")} /></F>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" /> Agent is planning…</> : "Generate plan"}
          </Button>
        </form>
      </aside>

      <main className="flex-1 space-y-6 p-6 lg:p-10">
        {error && <div className="card-soft border-destructive p-4 text-destructive">{error}</div>}
        {!result && !loading && !error && (
          <div className="card-soft mx-auto max-w-2xl p-10 text-center">
            <h2 className="font-display text-3xl">Plan your workshop with an AI agent</h2>
            <p className="mt-3 text-muted-foreground">It breaks the event into tasks, drafts a plan, checks budget, capacity and timing, and fixes problems up to two more times.</p>
          </div>
        )}
        {loading && <div className="card-soft p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />Decomposing → planning → validating → replanning if needed…</div>}

        {result && p && (<>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="font-display text-3xl">{p.title}</h2><p className="text-muted-foreground">{form.date} · {p.venue.name}</p></div>
            <Button variant="outline" onClick={download}><Download /> JSON report</Button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <M i={<Wallet />} l="Total cost" v={`${result.totalCost.toLocaleString()} / ${form.budget.toLocaleString()}`} />
            <M i={<Users />} l="Capacity" v={`${p.venue.capacity} for ${form.participants}`} />
            <M i={<CalendarClock />} l="Sessions" v={String(p.timetable.length)} />
            <M i={result.passed ? <CheckCircle2 className="text-success" /> : <XCircle className="text-destructive" />} l="Validation" v={result.passed ? `Passed (attempt ${result.attempts.length})` : "Issues remain"} />
          </div>

          <Card t="Agent workflow">
            <div className="mb-4"><p className="mb-2 text-sm font-medium">Task decomposition</p>
              <ol className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">{result.decomposition.map((d, i) => <li key={i}>{i + 1}. {d}</li>)}</ol></div>
            <div className="space-y-2">{result.attempts.map((a) => (
              <div key={a.attempt} className="rounded-xl bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">Attempt {a.attempt} {a.violations.length ? <Badge variant="destructive">{a.violations.length} violations</Badge> : <Badge>Passed</Badge>}</div>
                {a.violations.length > 0 && <ul className="mt-1 list-disc pl-5 text-muted-foreground">{a.violations.map((v, i) => <li key={i}><b>{v.rule}:</b> {v.message}</li>)}</ul>}
              </div>))}</div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card t="Objectives"><ul className="list-disc space-y-1 pl-5 text-sm">{p.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul></Card>
            <Card t="Participant management"><p className="text-sm whitespace-pre-line">{p.participantPlan}</p></Card>
          </div>

          <Card t="Timetable">
            <div className="space-y-2">{p.timetable.map((s, i) => (
              <div key={i} className="flex gap-4 rounded-xl border p-3 text-sm">
                <span className="w-28 shrink-0 font-medium text-primary">{s.start}–{s.end}</span>
                <div><p className="font-medium">{s.title} <span className="font-normal text-muted-foreground">· {s.owner}</span></p><p className="text-muted-foreground">{s.description}</p></div>
              </div>))}</div>
          </Card>

          <Card t="Tasks & dependencies">
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="py-2">ID</th><th>Task</th><th>Owner</th><th>Depends on</th></tr></thead>
              <tbody>{p.tasks.map((t) => <tr key={t.id} className="border-t"><td className="py-2">{t.id}</td><td>{t.name}</td><td>{t.owner}</td><td>{t.dependencies.join(", ") || "—"}</td></tr>)}</tbody></table></div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card t="Resources"><div className="flex flex-wrap gap-2">{p.resources.map((r, i) => <Badge key={i} variant="secondary">{r}</Badge>)}</div></Card>
            <Card t="Responsibilities"><ul className="space-y-2 text-sm">{p.responsibilities.map((r, i) => <li key={i}><b>{r.role}</b> — <span className="text-muted-foreground">{r.duties}</span></li>)}</ul></Card>
            <Card t="Budget"><ul className="space-y-1 text-sm">{p.budget.map((b, i) => <li key={i} className="flex justify-between"><span>{b.item}</span><span>{b.cost.toLocaleString()}</span></li>)}
              <li className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{result.totalCost.toLocaleString()}</span></li></ul></Card>
          </div>
        </>)}
      </main>
    </div>
  );
}

const F = ({ l, children }: { l: string; children: React.ReactNode }) => <div className="space-y-1"><Label className="text-xs">{l}</Label>{children}</div>;
const M = ({ i, l, v }: { i: React.ReactNode; l: string; v: string }) => (
  <div className="card-soft p-4"><div className="mb-2 text-primary [&_svg]:h-5 [&_svg]:w-5">{i}</div><p className="text-xs text-muted-foreground">{l}</p><p className="font-semibold">{v}</p></div>
);
const Card = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <section className="card-soft p-5"><h3 className="mb-3 flex items-center gap-2 font-display text-lg"><ListChecks className="h-4 w-4 text-primary" />{t}</h3>{children}</section>
);
