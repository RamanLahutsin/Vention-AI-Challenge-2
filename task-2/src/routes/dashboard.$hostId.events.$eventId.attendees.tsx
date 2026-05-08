import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, X, Users, Download, ScanLine } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  status: "going" | "waitlist" | "cancelled";
  code: string;
  checked_in_at: string | null;
  created_at: string;
  user_id: string;
  profiles: { display_name: string | null; contact_email: string | null } | null;
};

export const Route = createFileRoute("/dashboard/$hostId/events/$eventId/attendees")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({
        to: "/sign-in",
        search: { redirect: `/dashboard/${params.hostId}/events/${params.eventId}/attendees` },
      });
  },
  head: () => ({ meta: [{ title: "Attendees — Gather" }] }),
  component: Attendees,
});

function Attendees() {
  const { hostId, eventId } = useParams({ from: "/dashboard/$hostId/events/$eventId/attendees" });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [eventTitle, setEventTitle] = useState<string>("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const { data: ev } = await supabase.from("events").select("title").eq("id", eventId).maybeSingle();
    if (ev) setEventTitle(ev.title);
    const { data, error } = await supabase
      .from("rsvps")
      .select("id, status, code, checked_in_at, created_at, user_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    const base = (data as Omit<Row, "profiles">[]) ?? [];
    const userIds = Array.from(new Set(base.map((r) => r.user_id)));
    let profileMap: Record<string, { display_name: string | null; contact_email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, contact_email")
        .in("id", userIds);
      profileMap = Object.fromEntries((profs ?? []).map((p) => [p.id, { display_name: p.display_name, contact_email: p.contact_email }]));
    }
    setRows(base.map((r) => ({ ...r, profiles: profileMap[r.user_id] ?? null })));
  }, [eventId]);

  useEffect(() => {
    load();
    // Realtime: refresh when RSVPs change
    const channel = supabase
      .channel(`rsvps-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, eventId]);

  async function setCheckIn(id: string, checked: boolean) {
    const { error } = await supabase
      .from("rsvps")
      .update({ checked_in_at: checked ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(checked ? "Checked in" : "Reverted");
    load();
  }

  async function checkInByCode(code: string) {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;
    const match = (rows ?? []).find((r) => r.code.toLowerCase() === trimmed);
    if (!match) return toast.error("Code not found");
    if (match.status !== "going") return toast.error(`Status: ${match.status} — not allowed in`);
    if (match.checked_in_at) {
      toast(`${match.profiles?.display_name ?? "Guest"} is already checked in`);
      return;
    }
    await setCheckIn(match.id, true);
    toast.success(`✓ ${match.profiles?.display_name ?? "Guest"} checked in`);
  }

  function exportCsv() {
    const header = ["name", "email", "code", "status", "checked_in_at", "rsvp_at"];
    const data = (rows ?? []).map((r) => [
      r.profiles?.display_name ?? "",
      r.profiles?.contact_email ?? "",
      r.code,
      r.status,
      r.checked_in_at ?? "",
      r.created_at,
    ]);
    const csv = [header, ...data]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = (rows ?? []).filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      r.code.toLowerCase().includes(s) ||
      (r.profiles?.display_name ?? "").toLowerCase().includes(s) ||
      (r.profiles?.contact_email ?? "").toLowerCase().includes(s)
    );
  });

  const going = filtered.filter((r) => r.status === "going");
  const waitlist = filtered.filter((r) => r.status === "waitlist");
  const cancelled = filtered.filter((r) => r.status === "cancelled");
  const checkedIn = (rows ?? []).filter((r) => r.checked_in_at).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link to="/dashboard/$hostId" params={{ hostId }}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to dashboard
        </Link>
      </Button>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black">Attendees</h1>
          <p className="text-muted-foreground">{eventTitle}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Stat label="Going" value={going.length} />
          <Stat label="Waitlist" value={waitlist.length} />
          <Stat label="Checked in" value={checkedIn} />
        </div>
      </div>

      <Card className="mt-6 rounded-2xl border-border/70 p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <ScanLine className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium">Door check-in</p>
          <form
            className="flex flex-1 min-w-[200px] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const input = form.elements.namedItem("code") as HTMLInputElement;
              checkInByCode(input.value);
              input.value = "";
            }}
          >
            <Input name="code" placeholder="Enter ticket code…" className="rounded-full" autoComplete="off" />
            <Button type="submit" className="rounded-full">
              <Check className="mr-1 h-4 w-4" /> Check in
            </Button>
          </form>
          <Button onClick={exportCsv} variant="outline" className="rounded-full">
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </Card>

      <div className="mt-6">
        <Input
          placeholder="Search by name, email, or code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-full"
        />
      </div>

      <Section title="Going" rows={going} onCheckIn={setCheckIn} showCheckIn />
      <Section title="Waitlist" rows={waitlist} onCheckIn={setCheckIn} />
      {cancelled.length > 0 && <Section title="Cancelled" rows={cancelled} onCheckIn={setCheckIn} muted />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary px-4 py-2 text-center">
      <div className="font-display text-xl font-bold leading-none">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({
  title,
  rows,
  onCheckIn,
  showCheckIn,
  muted,
}: {
  title: string;
  rows: Row[];
  onCheckIn: (id: string, checked: boolean) => void;
  showCheckIn?: boolean;
  muted?: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold">{title} <span className="text-muted-foreground font-normal">({rows.length})</span></h2>
      {rows.length === 0 ? (
        <Card className="mt-3 rounded-2xl border-dashed p-6 text-center text-sm text-muted-foreground shadow-soft">
          <Users className="mx-auto mb-1 h-5 w-5" /> Nobody here yet.
        </Card>
      ) : (
        <div className="mt-3 grid gap-2">
          {rows.map((r) => (
            <Card key={r.id} className={`rounded-2xl border-border/70 p-3 shadow-soft ${muted ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.profiles?.display_name ?? "Guest"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.profiles?.contact_email ?? "—"} · <span className="font-mono uppercase">{r.code}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.checked_in_at && <Badge variant="outline">Checked in</Badge>}
                  {showCheckIn &&
                    (r.checked_in_at ? (
                      <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onCheckIn(r.id, false)}>
                        <X className="mr-1 h-4 w-4" /> Undo
                      </Button>
                    ) : (
                      <Button size="sm" className="rounded-full" onClick={() => onCheckIn(r.id, true)}>
                        <Check className="mr-1 h-4 w-4" /> Check in
                      </Button>
                    ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
