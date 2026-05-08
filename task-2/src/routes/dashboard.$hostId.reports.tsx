import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Report = {
  id: string;
  subject_type: "event" | "host";
  subject_id: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
};

type EventInfo = { id: string; title: string; is_hidden: boolean };

export const Route = createFileRoute("/dashboard/$hostId/reports")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({ to: "/sign-in", search: { redirect: `/dashboard/${params.hostId}/reports` } });
  },
  head: () => ({ meta: [{ title: "Reports — Gather" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { hostId } = useParams({ from: "/dashboard/$hostId/reports" });
  const [reports, setReports] = useState<Report[] | null>(null);
  const [eventMap, setEventMap] = useState<Record<string, EventInfo>>({});
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    // host's events
    const { data: evs } = await supabase
      .from("events")
      .select("id, title, is_hidden")
      .eq("host_id", hostId);
    const eventsList = (evs as EventInfo[]) ?? [];
    const map: Record<string, EventInfo> = {};
    eventsList.forEach((e) => (map[e.id] = e));
    setEventMap(map);

    const eventIds = eventsList.map((e) => e.id);
    // RLS handles authorization; query both subject types
    const { data: r } = await supabase
      .from("reports")
      .select("*")
      .or(
        `and(subject_type.eq.host,subject_id.eq.${hostId})${
          eventIds.length > 0 ? `,and(subject_type.eq.event,subject_id.in.(${eventIds.join(",")}))` : ""
        }`
      )
      .order("created_at", { ascending: false });
    setReports((r as Report[]) ?? []);
  }, [hostId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: "reviewed" | "dismissed") {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  }

  async function toggleHide(eventId: string, hide: boolean) {
    const { error } = await supabase.from("events").update({ is_hidden: hide }).eq("id", eventId);
    if (error) return toast.error(error.message);
    toast.success(hide ? "Event hidden" : "Event unhidden");
    load();
  }

  const filtered = (reports ?? []).filter((r) => filter === "all" || r.status === "open");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link to="/dashboard/$hostId" params={{ hostId }}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
      </Button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-black">Reports</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "open" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFilter("open")}
          >
            Open
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      {reports === null ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="mt-8 rounded-3xl border-dashed p-12 text-center text-muted-foreground shadow-soft">
          Nothing to review. 🎉
        </Card>
      ) : (
        <div className="mt-6 grid gap-3">
          {filtered.map((r) => {
            const ev = r.subject_type === "event" ? eventMap[r.subject_id] : null;
            return (
              <Card key={r.id} className="rounded-2xl border-border/70 p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{r.subject_type}</Badge>
                      <Badge
                        variant={r.status === "open" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                      {ev?.is_hidden && <Badge variant="outline" className="gap-1"><EyeOff className="h-3 w-3" /> Hidden</Badge>}
                    </div>
                    {ev ? (
                      <Link
                        to="/e/$eventId"
                        params={{ eventId: ev.id }}
                        className="mt-2 block font-display text-lg font-bold hover:underline"
                      >
                        {ev.title}
                      </Link>
                    ) : (
                      <p className="mt-2 font-display text-lg font-bold">Host profile</p>
                    )}
                    <p className="mt-2 whitespace-pre-wrap text-sm">{r.reason}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ev && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => toggleHide(ev.id, !ev.is_hidden)}
                      >
                        {ev.is_hidden ? (
                          <><Eye className="mr-1 h-4 w-4" /> Unhide</>
                        ) : (
                          <><EyeOff className="mr-1 h-4 w-4" /> Hide</>
                        )}
                      </Button>
                    )}
                    {r.status === "open" && (
                      <>
                        <Button size="sm" className="rounded-full" onClick={() => setStatus(r.id, "reviewed")}>
                          Mark reviewed
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setStatus(r.id, "dismissed")}>
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
